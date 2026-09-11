import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { getClientForModel } from "../../common/agent/openai.client.js";
import { extractPdf } from "../../common/pdf/pdf_python_bridge.js";
import { env } from "../../env.js";

const VisionExtractionZodSchema = z.object({
    text: z.string(),
    tables: z.array(
        z.object({
            header: z.array(z.string()).nullable(),
            rows: z.array(z.array(z.string())),
        })
    ),
    lists: z.array(z.object({ items: z.array(z.string()) })),
});

export interface PdfLabTable {
    bbox: number[];
    header: string[] | null;
    rows: (string | null)[][];
}

export interface PdfLabList {
    items: string[];
}

export interface PdfLabImage {
    index: number;
    ext: string;
    width: number | null;
    height: number | null;
    dataUrl: string;
}

export interface PdfLabPage {
    page: number;
    // Which extraction path produced text/tables/lists for this page —
    // PyMuPDF's own layout analysis when a text layer exists, or the vision
    // model fallback when it doesn't (e.g. a scanned page). Embedded images
    // are always extracted directly by PyMuPDF regardless of this flag.
    source: "pymupdf" | "vision";
    hasTextLayer: boolean;
    text: string;
    lists: PdfLabList[];
    tables: PdfLabTable[];
    images: PdfLabImage[];
    pageRenderDataUrl: string | null;
}

export interface PdfLabResult {
    pages: PdfLabPage[];
}

const EXT_TO_MIME: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
};

async function fileToDataUrl(filePath: string, ext: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const mime = EXT_TO_MIME[ext.toLowerCase()] || "application/octet-stream";
    return `data:${mime};base64,${buffer.toString("base64")}`;
}

const VISION_EXTRACTION_PROMPT = `You are transcribing a single scanned/image-only exam page. Read the page image carefully and return a JSON object with:
- "text": the full plain text of the page, in natural reading order, exactly as written (do not summarize or translate).
- "tables": any tables on the page, each as { "header": [...] or null, "rows": [[...], ...] } with cell text as strings.
- "lists": any bulleted or numbered lists on the page, each as { "items": [...] } with the marker removed.
If the page has no tables, return an empty array for "tables"; same for "lists" if there are none.`;

async function runVisionExtraction(pageRenderDataUrl: string): Promise<{
    text: string;
    tables: PdfLabTable[];
    lists: PdfLabList[];
}> {
    const client = await getClientForModel(env.PDF_VISION_MODEL);
    const response = await client.chat.completions.create({
        model: env.PDF_VISION_MODEL,
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: VISION_EXTRACTION_PROMPT },
                    { type: "image_url", image_url: { url: pageRenderDataUrl } },
                ],
            },
        ],
        response_format: zodResponseFormat(VisionExtractionZodSchema, "vision_page_extraction"),
    });

    const content = response.choices[0]?.message.content || "{}";
    const parsed = VisionExtractionZodSchema.parse(JSON.parse(content));

    return {
        text: parsed.text,
        tables: parsed.tables.map((t) => ({ bbox: [], header: t.header, rows: t.rows })),
        lists: parsed.lists,
    };
}

/**
 * Runs the full PyMuPDF extraction on an uploaded PDF, then falls back to a
 * vision model for text/tables/lists on any page with no usable text layer
 * (typically a scanned page). Embedded images are always taken verbatim from
 * PyMuPDF. Everything is written to/read from a throwaway temp dir that is
 * removed before returning.
 */
export async function runPdfLabExtraction(fileBuffer: Buffer): Promise<PdfLabResult> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "pdf-lab-"));
    const pdfPath = path.join(tmpDir, "input.pdf");
    const outputDir = path.join(tmpDir, "out");

    try {
        await fs.writeFile(pdfPath, fileBuffer);
        const extracted = await extractPdf(pdfPath, outputDir);

        const pages: PdfLabPage[] = [];
        for (const page of extracted.pages) {
            const images = await Promise.all(
                page.images.map(async (img): Promise<PdfLabImage> => ({
                    index: img.index,
                    ext: img.ext,
                    width: img.width,
                    height: img.height,
                    dataUrl: await fileToDataUrl(img.path, img.ext),
                }))
            );

            const pageRenderDataUrl = page.renderPath ? await fileToDataUrl(page.renderPath, "png") : null;

            if (page.hasTextLayer) {
                pages.push({
                    page: page.page,
                    source: "pymupdf",
                    hasTextLayer: true,
                    text: page.text,
                    lists: page.lists,
                    tables: page.tables,
                    images,
                    pageRenderDataUrl,
                });
                continue;
            }

            const vision = pageRenderDataUrl
                ? await runVisionExtraction(pageRenderDataUrl)
                : { text: "", tables: [], lists: [] };

            pages.push({
                page: page.page,
                source: "vision",
                hasTextLayer: false,
                text: vision.text,
                lists: vision.lists,
                tables: vision.tables,
                images,
                pageRenderDataUrl,
            });
        }

        return { pages };
    } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
    }
}

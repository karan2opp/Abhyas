import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { z } from "zod";

const execFileAsync = promisify(execFile);

const ExtractedImageZodSchema = z.object({
    index: z.number(),
    xref: z.number(),
    ext: z.string(),
    width: z.number().nullable(),
    height: z.number().nullable(),
    path: z.string(),
    bbox: z.array(z.number()).nullable(),
});

const ExtractedLineZodSchema = z.object({
    text: z.string(),
    bbox: z.array(z.number()),
});

const ExtractedTableZodSchema = z.object({
    bbox: z.array(z.number()),
    header: z.array(z.string()).nullable(),
    rows: z.array(z.array(z.string().nullable())),
});

const ExtractedListZodSchema = z.object({
    items: z.array(z.string()),
});

const ExtractedPageZodSchema = z.object({
    page: z.number(),
    hasTextLayer: z.boolean(),
    text: z.string(),
    lists: z.array(ExtractedListZodSchema),
    tables: z.array(ExtractedTableZodSchema),
    images: z.array(ExtractedImageZodSchema),
    lines: z.array(ExtractedLineZodSchema),
    renderPath: z.string().nullable(),
});

const ExtractPdfResultZodSchema = z.object({
    pages: z.array(ExtractedPageZodSchema),
});

export type ExtractedImage = z.infer<typeof ExtractedImageZodSchema>;
export type ExtractedTable = z.infer<typeof ExtractedTableZodSchema>;
export type ExtractedList = z.infer<typeof ExtractedListZodSchema>;
export type ExtractedLine = z.infer<typeof ExtractedLineZodSchema>;
export type ExtractedPage = z.infer<typeof ExtractedPageZodSchema>;
export type ExtractPdfResult = z.infer<typeof ExtractPdfResultZodSchema>;

const PYTHON_BIN = process.env.PYTHON_BIN || "python3";
const SCRIPT_PATH = path.join(process.cwd(), "python", "pdf_extractor", "extract.py");

/**
 * Parses a PDF page-by-page (text, tables, embedded images, naive lists,
 * digital-vs-scanned flag) via a one-shot PyMuPDF subprocess — no persistent
 * Python process, no network hop, bundled in the same deploy as the Node
 * server. `outputDir` receives extracted image files and page renders; the
 * caller owns uploading/cleaning those up.
 */
export async function extractPdf(pdfPath: string, outputDir: string): Promise<ExtractPdfResult> {
    let stdout: string;
    try {
        const result = await execFileAsync(PYTHON_BIN, [SCRIPT_PATH, pdfPath, outputDir], {
            maxBuffer: 50 * 1024 * 1024,
            timeout: 120_000,
        });
        stdout = result.stdout;
    } catch (err: any) {
        const stderr = err?.stderr?.toString?.() || "";
        throw new Error(`PDF extraction failed: ${stderr || err.message}`);
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(stdout);
    } catch {
        throw new Error(`PDF extraction returned invalid JSON: ${stdout.slice(0, 500)}`);
    }

    return ExtractPdfResultZodSchema.parse(parsed);
}

import api from "@/utils/axios";

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

export async function extractPdfLab(file: File): Promise<PdfLabResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post("/pdf-lab/extract", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data as PdfLabResult;
}

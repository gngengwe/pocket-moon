import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import path from "node:path";
import { pathToFileURL } from "node:url";

interface RenderedPage {
  pageNumber: number;
  png: Buffer;
}

export async function renderPdfPages(pdfData: Uint8Array): Promise<RenderedPage[]> {
  const standardFontDataUrl = `${pathToFileURL(path.resolve(process.cwd(), "node_modules", "pdfjs-dist", "standard_fonts")).href}/`;
  const loadingTask = pdfjs.getDocument({
    data: pdfData,
    isEvalSupported: false,
    useSystemFonts: true,
    standardFontDataUrl
  });
  const document = await loadingTask.promise;
  const pages: RenderedPage[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height)) as any;
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context, viewport } as never).promise;
    pages.push({ pageNumber, png: Buffer.from(canvas.toBuffer("image/png")) });
    page.cleanup();
  }

  await document.destroy();
  return pages;
}

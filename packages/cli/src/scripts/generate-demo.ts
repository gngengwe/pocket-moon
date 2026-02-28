import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../../../..");
const demoInputDir = path.join(repoRoot, "demo", "input");

function svgCard(title: string, subtitle: string, colorA: string, colorB: string): Buffer {
  const svg = `
  <svg width="1080" height="1440" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${colorA}"/>
        <stop offset="100%" stop-color="${colorB}"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="1440" fill="url(#g)"/>
    <circle cx="540" cy="430" r="220" fill="#ffffff" fill-opacity="0.35"/>
    <circle cx="760" cy="320" r="80" fill="#ffffff" fill-opacity="0.25"/>
    <circle cx="340" cy="980" r="120" fill="#ffffff" fill-opacity="0.2"/>
    <text x="540" y="760" text-anchor="middle" fill="#14213d" font-size="92" font-family="Georgia">${title}</text>
    <text x="540" y="840" text-anchor="middle" fill="#1f3b63" font-size="42" font-family="Georgia">${subtitle}</text>
  </svg>`;
  return Buffer.from(svg);
}

async function writeImage(name: string, title: string, subtitle: string, a: string, b: string): Promise<void> {
  await sharp(svgCard(title, subtitle, a, b)).png().toFile(path.join(demoInputDir, name));
}

async function writePdf(name: string): Promise<void> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const pages = [
    { label: "Pocket Moon PDF", tint: rgb(0.85, 0.92, 1) },
    { label: "Page Two", tint: rgb(0.95, 0.9, 0.82) },
    { label: "Page Three", tint: rgb(0.88, 0.96, 0.9) }
  ];

  for (const item of pages) {
    const page = pdf.addPage([612, 792]);
    page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: item.tint });
    page.drawText(item.label, { x: 72, y: 640, size: 44, font, color: rgb(0.12, 0.18, 0.28) });
    page.drawText("Generated locally by Pocket Moon", { x: 72, y: 592, size: 20, font, color: rgb(0.2, 0.27, 0.35) });
    page.drawCircle({ x: 500, y: 180, size: 78, color: rgb(1, 1, 1), opacity: 0.4 });
  }

  const bytes = await pdf.save();
  await fs.writeFile(path.join(demoInputDir, name), bytes);
}

async function main(): Promise<void> {
  await fs.mkdir(demoInputDir, { recursive: true });
  await writeImage("01-title-card.png", "Pocket Moon", "Flipbook studio", "#fdfcf8", "#dbe9ff");
  await writeImage("02-shapes.png", "Calm Layout", "Generated demo page", "#f5f9ff", "#e4f3f3");
  await writeImage("03-gradient.png", "Page Motion", "Fade, slide, flip, drift", "#fff8ef", "#e5ecff");
  await writeImage("04-minimal.png", "Light Theme", "Clean and quiet interface", "#f9fbff", "#eff5ff");
  await writePdf("05-demo-book.pdf");
  console.log(`[demo] Demo input generated at ${demoInputDir}`);
}

void main();

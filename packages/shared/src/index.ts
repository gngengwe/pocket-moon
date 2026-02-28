export type TransitionName = "fade" | "slide" | "flip" | "drift";

export interface PocketMoonConfig {
  inputDir: string;
  outputDir: string;
  exportDir: string;
  frame: {
    width: number;
    height: number;
    background: string;
  };
  thumbnail: {
    longEdge: number;
  };
  transitions: {
    default: TransitionName;
    available: TransitionName[];
  };
  demoMode: boolean;
}

export interface ManifestPage {
  id: string;
  order: number;
  type: "image";
  source: {
    kind: "pdf" | "image";
    file: string;
    page: number | null;
  };
  image: {
    src: string;
    width: number;
    height: number;
  };
  thumb: {
    src: string;
    width: number;
    height: number;
  };
  meta: {
    label?: string;
    notes?: string;
  };
}

export interface PocketMoonManifest {
  version: 1;
  title: string;
  generatedAt: string;
  frame: {
    width: number;
    height: number;
    background: string;
  };
  pages: ManifestPage[];
  demo: {
    mode: boolean;
    captions: Record<string, string>;
  };
}

export const DEFAULT_CONFIG: PocketMoonConfig = {
  inputDir: "./pocketmoon/input",
  outputDir: "./pocketmoon/output",
  exportDir: "./pocketmoon/export",
  frame: { width: 1080, height: 1440, background: "#ffffff" },
  thumbnail: { longEdge: 240 },
  transitions: {
    default: "drift",
    available: ["fade", "slide", "flip", "drift"]
  },
  demoMode: true
};

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export const naturalSort = (a: string, b: string): number => collator.compare(a, b);

export const padPageId = (index: number): string => `p${String(index).padStart(4, "0")}`;

export const supportedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".webp"] as const;

export const imageExtensions = [".png", ".jpg", ".jpeg", ".webp"] as const;
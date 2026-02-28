"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TouchEvent } from "react";
import type { PocketMoonManifest, TransitionName } from "@pocketmoon/shared";

const transitionOptions: TransitionName[] = ["fade", "slide", "flip", "drift"];
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function withBasePath(assetPath: string): string {
  if (!assetPath.startsWith("/")) {
    return `${basePath}/${assetPath}`;
  }
  return `${basePath}${assetPath}`;
}

function variants(name: TransitionName, reduced: boolean) {
  if (reduced) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 1 }
    };
  }

  switch (name) {
    case "fade":
      return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
    case "slide":
      return { initial: { opacity: 0, x: 38 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -38 } };
    case "flip":
      return {
        initial: { opacity: 0, rotateY: -18, transformPerspective: 1400 },
        animate: { opacity: 1, rotateY: 0, transformPerspective: 1400 },
        exit: { opacity: 0, rotateY: 18, transformPerspective: 1400 }
      };
    default:
      return {
        initial: { opacity: 0, x: 16, y: 12, scale: 0.988 },
        animate: { opacity: 1, x: 0, y: 0, scale: 1 },
        exit: { opacity: 0, x: -14, y: -8, scale: 1.01 }
      };
  }
}

async function loadManifest(): Promise<PocketMoonManifest> {
  const response = await fetch(withBasePath("/manifest.json"), { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load manifest.json. Run `pocketmoon build` first.");
  }
  return (await response.json()) as PocketMoonManifest;
}

function useSwipe(onLeft: () => void, onRight: () => void) {
  const touchStartX = useRef<number | null>(null);

  return {
    onTouchStart: (event: TouchEvent) => {
      touchStartX.current = event.touches[0]?.clientX ?? null;
    },
    onTouchEnd: (event: TouchEvent) => {
      if (touchStartX.current === null) {
        return;
      }
      const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
      if (delta < -42) {
        onLeft();
      } else if (delta > 42) {
        onRight();
      }
      touchStartX.current = null;
    }
  };
}

export function ViewerStudio() {
  const [manifest, setManifest] = useState<PocketMoonManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [transition, setTransition] = useState<TransitionName>("drift");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [demoMode, setDemoMode] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(false);

  useEffect(() => {
    loadManifest()
      .then((value) => {
        setManifest(value);
        setTransition(value.pages.length ? "drift" : "fade");
        setDemoMode(value.demo.mode);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const pages = manifest?.pages ?? [];
  const frame = manifest?.frame;

  const goPrev = useCallback(() => setIndex((value) => Math.max(0, value - 1)), []);
  const goNext = useCallback(() => setIndex((value) => Math.min(pages.length - 1, value + 1)), [pages.length]);

  const swipeHandlers = useSwipe(goNext, goPrev);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        goNext();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  useEffect(() => {
    if (!autoAdvance) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % Math.max(1, pages.length));
    }, 2500);
    return () => window.clearInterval(timer);
  }, [autoAdvance, pages.length]);

  useEffect(() => {
    if (!manifest || !pages.length) {
      return;
    }
    const next = pages[index + 1];
    const prev = pages[index - 1];
    const preload = [next, prev].filter(Boolean);
    for (const item of preload) {
      const image = new Image();
      image.src = withBasePath(item!.image.src);
    }
  }, [index, manifest, pages]);

  const currentPage = pages[index];
  const caption = currentPage && manifest?.demo.captions[currentPage.id];
  const atStart = index <= 0;
  const atEnd = index >= pages.length - 1;

  const motionVariants = useMemo(() => variants(transition, reducedMotion), [transition, reducedMotion]);

  if (error) {
    return <main className="p-8 text-ink">{error}</main>;
  }

  if (!manifest || !frame) {
    return <main className="p-8 text-ink">Loading Pocket Moon...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[1300px] flex-col gap-4 px-4 py-4 md:px-6">
      <header className="rounded-2xl bg-card/90 p-4 shadow-soft backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <strong className="mr-auto text-base text-ink">{manifest.title}</strong>
          <span>
            {pages.length ? index + 1 : 0} / {pages.length}
          </span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-1"
            value={transition}
            onChange={(event) => setTransition(event.target.value as TransitionName)}
          >
            {transitionOptions.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
          <button className="rounded-lg border border-slate-200 bg-white px-2 py-1" onClick={() => setDemoMode((value) => !value)}>
            Demo {demoMode ? "on" : "off"}
          </button>
          <button className="rounded-lg border border-slate-200 bg-white px-2 py-1" onClick={() => setReducedMotion((value) => !value)}>
            Reduced motion {reducedMotion ? "on" : "off"}
          </button>
          <button className="rounded-lg border border-slate-200 bg-white px-2 py-1" onClick={() => setAutoAdvance((value) => !value)}>
            Auto-advance {autoAdvance ? "pause" : "play"}
          </button>
          <button className="rounded-lg border border-slate-200 bg-white px-2 py-1" onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}>
            +
          </button>
          <button className="rounded-lg border border-slate-200 bg-white px-2 py-1" onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}>
            -
          </button>
          <button className="rounded-lg border border-slate-200 bg-white px-2 py-1" onClick={() => setZoom(1)}>
            fit
          </button>
        </div>
      </header>

      <section className="grid flex-1 grid-rows-[1fr_auto] gap-4">
        <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-surface p-4 shadow-soft" {...swipeHandlers}>
          <div className="relative w-full max-w-[880px]">
            <div style={{ aspectRatio: `${frame.width}/${frame.height}` }} className="relative overflow-hidden rounded-xl bg-white">
              <AnimatePresence mode="wait">
                {currentPage ? (
                  <motion.img
                    key={currentPage.id}
                    src={withBasePath(currentPage.image.src)}
                    alt={`Page ${currentPage.order}`}
                    loading="lazy"
                    className="h-full w-full object-contain"
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={motionVariants}
                    transition={{ duration: 0.42, ease: "easeOut" }}
                    style={{ transform: `scale(${zoom})` }}
                  />
                ) : null}
              </AnimatePresence>
              <button
                type="button"
                aria-label="Previous page"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xl leading-none text-ink shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
                onClick={goPrev}
                disabled={atStart}
              >
                {"<"}
              </button>
              <button
                type="button"
                aria-label="Next page"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xl leading-none text-ink shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
                onClick={goNext}
                disabled={atEnd}
              >
                {">"}
              </button>
            </div>
            {demoMode && caption ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-4 left-1/2 max-w-[80%] -translate-x-1/2 rounded-full bg-white/92 px-4 py-2 text-center text-sm text-ink shadow"
              >
                {caption}
              </motion.div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl bg-card/85 p-3 shadow-soft backdrop-blur-sm">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {pages.map((page, pageIndex) => (
              <button
                key={page.id}
                className={`relative h-[106px] w-[80px] shrink-0 overflow-hidden rounded-lg border ${
                  pageIndex === index ? "border-accent" : "border-slate-200"
                }`}
                onClick={() => setIndex(pageIndex)}
                aria-label={`Go to page ${page.order}`}
              >
                <img
                  src={withBasePath(page.thumb.src)}
                  alt={`Thumbnail ${page.order}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

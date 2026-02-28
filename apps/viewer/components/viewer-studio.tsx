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
    <main className="mx-auto flex min-h-screen max-w-[1360px] flex-col gap-3 px-3 py-3 md:gap-4 md:px-6 md:py-4">
      <header className="rounded-2xl bg-card/90 p-3 shadow-soft backdrop-blur-sm md:p-4">
        <div className="grid grid-cols-1 gap-3 text-sm text-muted md:flex md:flex-wrap md:items-center">
          <div className="flex items-center justify-between gap-3">
            <strong className="text-base text-ink md:mr-auto">{manifest.title}</strong>
            <span className="rounded-md bg-white px-2 py-1 text-xs md:text-sm">
              {pages.length ? index + 1 : 0} / {pages.length}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:flex md:flex-wrap md:items-center md:gap-3">
            <select
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm md:min-h-0 md:px-2 md:py-1"
              value={transition}
              onChange={(event) => setTransition(event.target.value as TransitionName)}
            >
              {transitionOptions.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
            <button className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm md:min-h-0 md:px-2 md:py-1" onClick={() => setDemoMode((value) => !value)}>
              Demo {demoMode ? "on" : "off"}
            </button>
            <button className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm md:min-h-0 md:px-2 md:py-1" onClick={() => setReducedMotion((value) => !value)}>
              Motion {reducedMotion ? "off" : "on"}
            </button>
            <button className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm md:min-h-0 md:px-2 md:py-1" onClick={() => setAutoAdvance((value) => !value)}>
              Auto {autoAdvance ? "pause" : "play"}
            </button>
            <button className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm md:min-h-0 md:px-2 md:py-1" onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}>
              Zoom +
            </button>
            <button className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm md:min-h-0 md:px-2 md:py-1" onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}>
              Zoom -
            </button>
            <button className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm md:min-h-0 md:px-2 md:py-1" onClick={() => setZoom(1)}>
              Fit
            </button>
          </div>

          <span className="hidden text-xs text-slate-500 md:inline">Keys: left, right, space</span>
        </div>
      </header>

      <section className="grid flex-1 grid-rows-[1fr_auto] gap-3 md:gap-4">
        <div
          className="relative flex min-h-[58vh] items-center justify-center overflow-hidden rounded-2xl bg-surface p-2 shadow-soft sm:p-3 md:min-h-[62vh] md:p-4"
          {...swipeHandlers}
        >
          <div className="relative w-full max-w-[920px]">
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
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-lg leading-none text-ink shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 md:left-3 md:text-xl"
                onClick={goPrev}
                disabled={atStart}
              >
                {"<"}
              </button>
              <button
                type="button"
                aria-label="Next page"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-lg leading-none text-ink shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 md:right-3 md:text-xl"
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
                className="absolute bottom-3 left-1/2 max-w-[86%] -translate-x-1/2 rounded-full bg-white/92 px-3 py-2 text-center text-xs text-ink shadow sm:text-sm md:bottom-4 md:max-w-[80%] md:px-4"
              >
                {caption}
              </motion.div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl bg-card/85 p-2 shadow-soft backdrop-blur-sm md:p-3">
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 md:pb-2">
            {pages.map((page, pageIndex) => (
              <button
                key={page.id}
                className={`relative h-[96px] w-[72px] shrink-0 snap-start overflow-hidden rounded-lg border transition md:h-[106px] md:w-[80px] ${
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
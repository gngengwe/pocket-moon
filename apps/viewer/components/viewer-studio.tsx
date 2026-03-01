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
  const [started, setStarted] = useState(false);

  useEffect(() => {
    loadManifest()
      .then((value) => {
        setManifest(value);
        setTransition(value.pages.length ? "drift" : "fade");
        setDemoMode(value.demo.mode);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const getDefaultZoom = useCallback((): number => {
    if (typeof window === "undefined") {
      return 1;
    }
    if (window.innerWidth < 640) {
      return 0.9;
    }
    if (window.innerWidth < 1280) {
      return 1;
    }
    return 1.08;
  }, []);

  useEffect(() => {
    setZoom(getDefaultZoom());
  }, [getDefaultZoom]);

  const pages = manifest?.pages ?? [];
  const frame = manifest?.frame;

  const goPrev = useCallback(() => setIndex((value) => Math.max(0, value - 1)), []);
  const goNext = useCallback(() => setIndex((value) => Math.min(pages.length - 1, value + 1)), [pages.length]);

  const swipeHandlers = useSwipe(goNext, goPrev);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !started) {
        setStarted(true);
        return;
      }
      if (!started) {
        return;
      }
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
  }, [goNext, goPrev, started]);

  useEffect(() => {
    if (!autoAdvance || !started) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % Math.max(1, pages.length));
    }, 2500);
    return () => window.clearInterval(timer);
  }, [autoAdvance, pages.length, started]);

  useEffect(() => {
    if (!manifest || !pages.length || !started) {
      return;
    }
    const next = pages[index + 1];
    const prev = pages[index - 1];
    const preload = [next, prev].filter(Boolean);
    for (const item of preload) {
      const image = new Image();
      image.src = withBasePath(item!.image.src);
    }
  }, [index, manifest, pages, started]);

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
    <main className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-3 py-4 md:px-6 md:py-5">
      <AnimatePresence>
        {!started ? (
          <motion.section
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_25%_18%,rgba(243,246,255,0.98),rgba(207,218,247,0.92)_48%,rgba(162,178,223,0.94)_100%)] p-6"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.45 } }}
          >
            <motion.div
              className="relative z-10 w-full max-w-[560px] rounded-[28px] border border-[#d6def3] bg-[#fbfdff]/92 p-6 text-center shadow-[0_24px_80px_rgba(52,70,128,0.22)] backdrop-blur-sm md:p-8"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <motion.img
                src={withBasePath("/pocket-moon-splash.png")}
                alt="Pocket Moon logo"
                className="mx-auto mb-5 w-full max-w-[320px] rounded-2xl border border-[#d8e0f7] shadow-[0_14px_38px_rgba(37,58,118,0.22)]"
                animate={{ y: [0, -6, 0], scale: [1, 1.02, 1] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <h1 className="text-2xl tracking-[0.05em] text-[#1c2a57] md:text-3xl">Pocket Moon</h1>
              <p className="mx-auto mt-3 max-w-[42ch] text-sm text-[#3a4f86] md:text-base">Click to start the Pocket Moon story.</p>
              <motion.button
                type="button"
                className="mt-6 rounded-full border border-[#d1dbf4] bg-[#eef3ff] px-6 py-3 text-sm font-semibold tracking-[0.03em] text-[#24356a] shadow-[0_12px_26px_rgba(48,66,121,0.2)] transition hover:bg-[#e2ebff]"
                onClick={() => setStarted(true)}
                whileTap={{ scale: 0.97 }}
              >
                Start Story
              </motion.button>
            </motion.div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      <div className="mx-auto flex w-full max-w-[920px] flex-1 flex-col gap-3 md:gap-4">
        <header className="rounded-2xl border border-[#cfd6ec] bg-card/92 p-3 shadow-soft backdrop-blur-sm md:p-4">
          <div className="mx-auto grid w-full max-w-[860px] grid-cols-1 gap-3 text-sm text-muted">
            <div className="grid justify-items-center gap-2 text-center">
              <strong className="text-base tracking-[0.02em] text-ink">{manifest.title}</strong>
              <span className="rounded-md border border-[#d9dfef] bg-white px-2 py-1 text-xs text-[#3b4e80] md:text-sm">
                {pages.length ? index + 1 : 0} / {pages.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <select
                className="min-h-10 min-w-[120px] rounded-lg border border-[#d2d8eb] bg-white px-3 py-2 text-sm text-[#2c3f70]"
                value={transition}
                onChange={(event) => setTransition(event.target.value as TransitionName)}
              >
                {transitionOptions.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
              <button className="min-h-10 rounded-lg border border-[#d2d8eb] bg-white px-3 py-2 text-sm text-[#2c3f70]" onClick={() => setDemoMode((value) => !value)}>
                Demo {demoMode ? "on" : "off"}
              </button>
              <button className="min-h-10 rounded-lg border border-[#d2d8eb] bg-white px-3 py-2 text-sm text-[#2c3f70]" onClick={() => setReducedMotion((value) => !value)}>
                Motion {reducedMotion ? "off" : "on"}
              </button>
              <button className="min-h-10 rounded-lg border border-[#d2d8eb] bg-white px-3 py-2 text-sm text-[#2c3f70]" onClick={() => setAutoAdvance((value) => !value)}>
                Auto {autoAdvance ? "pause" : "play"}
              </button>
              <button className="min-h-10 rounded-lg border border-[#d2d8eb] bg-white px-3 py-2 text-sm text-[#2c3f70]" onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}>
                Zoom +
              </button>
              <button className="min-h-10 rounded-lg border border-[#d2d8eb] bg-white px-3 py-2 text-sm text-[#2c3f70]" onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}>
                Zoom -
              </button>
              <button className="min-h-10 rounded-lg border border-[#d2d8eb] bg-white px-3 py-2 text-sm text-[#2c3f70]" onClick={() => setZoom(getDefaultZoom())}>
                Fit
              </button>
              <span className="flex items-center px-2 text-xs text-[#4f6091]">Keys: left, right, space</span>
            </div>
          </div>
        </header>

        <section className="grid flex-1 grid-rows-[1fr_auto] gap-3 md:gap-4">
          <div
            className="relative flex min-h-[58vh] items-center justify-center overflow-hidden rounded-2xl border border-[#d2d9ed] bg-surface p-2 shadow-soft sm:p-3 md:min-h-[62vh] md:p-4"
            {...swipeHandlers}
          >
            <div className="relative w-full max-w-[860px]">
              <div className="pointer-events-none absolute -left-5 -top-6 h-24 w-24 rounded-full bg-[#f2c98c]/35 blur-2xl" />
              <div className="pointer-events-none absolute -right-6 top-10 h-28 w-28 rounded-full bg-[#cfd8ff]/45 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-8 left-1/3 h-20 w-20 rounded-full bg-[#f5dfbd]/35 blur-2xl" />
              <div style={{ aspectRatio: `${frame.width}/${frame.height}` }} className="relative overflow-hidden rounded-xl bg-white">
                <AnimatePresence mode="wait">
                  {currentPage ? (
                    <motion.div key={currentPage.id} initial="initial" animate="animate" exit="exit" variants={motionVariants} transition={{ duration: 0.42, ease: "easeOut" }} className="h-full w-full">
                      <div className="h-full w-full" style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
                        <img src={withBasePath(currentPage.image.src)} alt={`Page ${currentPage.order}`} loading="lazy" className="h-full w-full object-contain" />
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <button
                  type="button"
                  aria-label="Previous page"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-[#d4d9ea] bg-white/95 px-3 py-2 text-lg leading-none text-[#1f2f5f] shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 md:left-3 md:text-xl"
                  onClick={goPrev}
                  disabled={atStart}
                >
                  {"<"}
                </button>
                <button
                  type="button"
                  aria-label="Next page"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-[#d4d9ea] bg-white/95 px-3 py-2 text-lg leading-none text-[#1f2f5f] shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35 md:right-3 md:text-xl"
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
                  className="absolute bottom-3 left-1/2 max-w-[86%] -translate-x-1/2 rounded-full border border-[#f1d4a9] bg-[#fffbf4]/95 px-3 py-2 text-center text-xs text-[#2d3d72] shadow sm:text-sm md:bottom-4 md:max-w-[80%] md:px-4"
                >
                  {caption}
                </motion.div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-[#d2d8ed] bg-card/88 p-2 shadow-soft backdrop-blur-sm md:p-3">
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 md:pb-2">
              {pages.map((page, pageIndex) => (
                <button
                  key={page.id}
                  className={`relative h-[96px] w-[72px] shrink-0 snap-start overflow-hidden rounded-lg border transition md:h-[106px] md:w-[80px] ${
                    pageIndex === index ? "border-accent" : "border-[#d7ddef]"
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
      </div>
    </main>
  );
}

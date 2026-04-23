"use client";

import { useEffect } from "react";

export function BookletEffects() {
  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const cleanups: Array<() => void> = [];

    // 1. Reveal on scroll
    const revealTargets = document.querySelectorAll<HTMLElement>(
      "[data-reveal]",
    );
    if (reduceMotion) {
      revealTargets.forEach((el) => el.classList.add("is-revealed"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-revealed");
              io.unobserve(entry.target);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
      );
      revealTargets.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    }

    // 2. Progress bar
    const bar = document.getElementById("booklet-progress-bar");
    function updateProgress() {
      if (!bar) return;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const ratio = max > 0 ? doc.scrollTop / max : 0;
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
    }
    updateProgress();

    // 3. Parallax on [data-parallax]
    const parallaxRoots = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]"),
    );

    let rafId = 0;
    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        updateProgress();
        if (reduceMotion) return;
        const vh = window.innerHeight;
        for (const root of parallaxRoots) {
          const rect = root.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > vh) continue;
          const center = rect.top + rect.height / 2;
          const ratio = (center - vh / 2) / vh; // -1 .. 1
          const translate = Math.max(-24, Math.min(24, -ratio * 40));
          const img = root.querySelector<HTMLElement>("[data-parallax-img]");
          if (img) {
            img.style.transform = `translate3d(0, ${translate}px, 0) scale(1.12)`;
          }
        }
      });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    cleanups.push(() => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    });

    return () => {
      for (const fn of cleanups) fn();
    };
  }, []);

  return null;
}

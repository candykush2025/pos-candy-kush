"use client";

import { useEffect } from "react";

export default function ViewportScaler() {
  useEffect(() => {
    function scaleViewport() {
      const width = window.innerWidth;
      let scale = 1;

      if (width <= 640) {
        scale = 0.5;
      } else if (width <= 768) {
        scale = 0.6;
      } else if (width <= 1024) {
        scale = 0.7;
      } else if (width <= 1280) {
        scale = 0.8;
      } else if (width <= 1536) {
        scale = 0.9;
      }

      // Apply to html for viewport clipping
      document.documentElement.style.width = "100vw";
      document.documentElement.style.height = "100vh";
      document.documentElement.style.overflow = "hidden";

      // Apply transform to body with compensated dimensions
      document.body.style.transform = `scale(${scale})`;
      document.body.style.transformOrigin = "top left";
      document.body.style.width = `${100 / scale}vw`;
      document.body.style.height = `${100 / scale}vh`;
      document.body.style.overflow = "auto";
      document.body.style.position = "absolute";
      document.body.style.top = "0";
      document.body.style.left = "0";
    }

    scaleViewport();
    window.addEventListener("resize", scaleViewport);

    return () => window.removeEventListener("resize", scaleViewport);
  }, []);

  return null;
}

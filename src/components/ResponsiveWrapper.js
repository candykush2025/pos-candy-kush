"use client";

import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { useEffect, useState } from "react";

export default function ResponsiveWrapper({ children }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calculateScale = () => {
      const width = window.innerWidth;
      let newScale = 1;

      if (width <= 640) {
        newScale = 0.5;
      } else if (width <= 768) {
        newScale = 0.6;
      } else if (width <= 1024) {
        newScale = 0.7;
      } else if (width <= 1280) {
        newScale = 0.8;
      } else if (width <= 1536) {
        newScale = 0.9;
      }

      setScale(newScale);
    };

    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, []);

  return (
    <TransformWrapper
      initialScale={scale}
      minScale={scale}
      maxScale={scale}
      centerOnInit={false}
      disabled={true}
      wheel={{ disabled: true }}
      panning={{ disabled: true }}
      doubleClick={{ disabled: true }}
    >
      <TransformComponent
        wrapperStyle={{
          width: "100vw",
          height: "100vh",
          overflow: "auto",
        }}
        contentStyle={{
          width: "100%",
          height: "100%",
        }}
      >
        {children}
      </TransformComponent>
    </TransformWrapper>
  );
}

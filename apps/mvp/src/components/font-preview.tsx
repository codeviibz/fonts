"use client";

import { useEffect, useId, useState } from "react";

interface Props {
  previewPath: string;
  familyName: string;
  text: string;
  className?: string;
  weight?: number;
  style?: "normal" | "italic";
  fontSize?: string;
}

const loadedFonts = new Set<string>();

export function FontPreview({
  previewPath,
  familyName,
  text,
  className = "",
  weight = 400,
  style = "normal",
  fontSize,
}: Props) {
  const id = useId();
  const fontFamily = `preview-${previewPath.replace(/[^a-zA-Z0-9]/g, "-")}`;
  const [loaded, setLoaded] = useState(loadedFonts.has(fontFamily));

  useEffect(() => {
    if (loadedFonts.has(fontFamily)) {
      setLoaded(true);
      return;
    }

    const url = `/fonts/previews/${previewPath}`;
    const face = new FontFace(fontFamily, `url(${url})`, {
      weight: String(weight),
      style,
      display: "swap",
    });

    face
      .load()
      .then((loadedFace) => {
        document.fonts.add(loadedFace);
        loadedFonts.add(fontFamily);
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(false);
      });
  }, [fontFamily, previewPath, weight, style]);

  return (
    <p
      id={id}
      className={className}
      style={{
        fontFamily: loaded ? `"${fontFamily}", sans-serif` : "inherit",
        fontWeight: weight,
        fontStyle: style,
        fontSize: fontSize ?? undefined,
        opacity: loaded ? 1 : 0.5,
        transition: "opacity 200ms ease",
      }}
      title={`${familyName} preview`}
    >
      {text}
    </p>
  );
}

"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

type Variant = "orb" | "caption";

const FONT_STACK =
  '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, h / 2, w / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function buildTexture(text: string, variant: Variant, color: string) {
  const fontSize = 64;
  const font = `800 ${fontSize}px ${FONT_STACK}`;
  const probe = document.createElement("canvas").getContext("2d");
  if (probe) probe.font = font;
  const textW = Math.max(1, probe ? probe.measureText(text).width : text.length * fontSize * 0.6);
  const padX = variant === "orb" ? 34 : 18;
  const padY = variant === "orb" ? 20 : 12;
  const w = Math.ceil(textW + padX * 2);
  const h = Math.ceil(fontSize + padY * 2);

  const canvas = document.createElement("canvas");
  const dpr = 2;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(dpr, dpr);
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (variant === "orb") {
      ctx.fillStyle = "rgba(5,10,22,0.9)";
      rounded(ctx, 2, 2, w - 4, h - 4, h / 2);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      rounded(ctx, 2, 2, w - 4, h - 4, h / 2);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, w / 2, h / 2 + 2);
    } else {
      ctx.lineWidth = 11;
      ctx.strokeStyle = "rgba(5,10,22,0.95)";
      ctx.strokeText(text, w / 2, h / 2 + 2);
      ctx.fillStyle = color;
      ctx.fillText(text, w / 2, h / 2 + 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: w / h };
}

export function LabelBillboard({
  text,
  position = [0, 0, 0],
  scale = 1,
  variant = "orb",
  color = "#ffffff",
  maxWidth = 3,
  maxChars = 20,
}: {
  text: string;
  position?: [number, number, number];
  scale?: number;
  variant?: Variant;
  color?: string;
  maxWidth?: number;
  maxChars?: number;
}) {
  const label = text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
  const { texture, aspect } = useMemo(
    () => buildTexture(label, variant, color),
    [label, variant, color],
  );

  useEffect(() => () => texture.dispose(), [texture]);

  const capH = variant === "orb" ? 0.9 : 0.6;
  const planeH = Math.min(capH, (maxWidth * scale) / aspect);
  const planeW = planeH * aspect;

  return (
    <mesh position={position}>
      <planeGeometry args={[planeW, planeH]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

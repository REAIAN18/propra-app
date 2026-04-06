"use client";

import s from "./Skeleton.module.css";
import { CSSProperties } from "react";

interface SkeletonProps {
  height?: number | string;
  width?: number | string;
  borderRadius?: number | string;
  style?: CSSProperties;
}

export function Skeleton({ height = 16, width = "100%", borderRadius = 6, style }: SkeletonProps) {
  return (
    <div
      className={s.skel}
      style={{ height, width, borderRadius, flexShrink: 0, ...style }}
    />
  );
}

"use client";

import { cn } from "@/lib/utils";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import React, { MouseEvent, ReactNode } from "react";

interface MagicCardProps {
  children: ReactNode;
  className?: string;
  gradientColor?: string;
}

export function MagicCard({
  children,
  className,
  gradientColor = "#D9D9D955",
}: MagicCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({
    currentTarget,
    clientX,
    clientY,
  }: MouseEvent<HTMLDivElement>) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const backgroundImage = useMotionTemplate`radial-gradient(300px at ${mouseX}px ${mouseY}px, ${gradientColor} 0%, transparent 100%)`;

  return (
    <div
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-background",
        className
      )}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: backgroundImage,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
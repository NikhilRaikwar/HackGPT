"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import React from "react";

interface PointerProps {
  children?: React.ReactNode;
  className?: string;
}

export function Pointer({ children, className }: PointerProps) {
  return (
    <motion.div
      className={cn(
        "pointer-events-none absolute z-50",
        className
      )}
      style={{
        left: "var(--pointer-x)",
        top: "var(--pointer-y)",
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children || (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="fill-primary"
        >
          <path
            d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
            stroke="currentColor"
          />
        </svg>
      )}
    </motion.div>
  );
}
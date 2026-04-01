"use client";
import React from "react";
import { cn } from "../lib/utils";

type ButtonProps = {
  borderRadius?: string;
  children: React.ReactNode;
  as?: React.ElementType;
  containerClassName?: string;
  duration?: number;
  className?: string;
} & Record<string, unknown>;

export function Button({
  borderRadius = "1.75rem",
  children,
  as: Component = "button",
  containerClassName,
  duration = 3000,
  className,
  ...otherProps
}: ButtonProps) {
  return (
    <Component
      className={cn(
        "bg-transparent relative p-[1px] overflow-hidden flex items-center justify-center group/btn",
        containerClassName
      )}
      style={{
        borderRadius: borderRadius,
      }}
      {...otherProps}
    >
      {/* Animated Gradient Background */}
      <div
        className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite]"
        style={{
          background: "conic-gradient(from 90deg at 50% 50%, transparent 0%, transparent 40%, #a3ff12 50%, transparent 60%, transparent 100%)",
          animationDuration: `${duration}ms`
        }}
      />

      {/* Content Container */}
      <div
        className={cn(
          "relative bg-black text-white flex items-center justify-center antialiased w-full h-full",
          className
        )}
        style={{
          borderRadius: `calc(${borderRadius} - 1px)`,
        }}
      >
        {children}
      </div>
    </Component>
  );
}

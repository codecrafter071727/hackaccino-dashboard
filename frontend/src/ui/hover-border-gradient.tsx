import React, { forwardRef } from "react";
import { cn } from "../lib/utils";

type Props = {
  as?: React.ElementType;
  className?: string;
  containerClassName?: string;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLElement>;
  type?: "button" | "submit";
};

export const HoverBorderGradient = forwardRef<HTMLElement, Props>(function HoverBorderGradient(
  { as = "button", className = "", containerClassName = "", children, onClick, type },
  ref
) {
  const Tag = as as any;
  return (
    <div
      className={cn(
        "relative inline-flex p-[2px] rounded-full overflow-visible transition-all hover:shadow-[0_0_30px_rgba(163,255,18,0.4)]",
        "bg-[linear-gradient(90deg,rgba(163,255,18,0.8),rgba(163,255,18,0.4),rgba(163,255,18,0.8))]",
        containerClassName
      )}
    >
      <Tag
        ref={ref as any}
        onClick={onClick}
        type={type}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full bg-neon-green text-black text-sm font-bold hover:opacity-95 transition-all",
          className
        )}
      >
        {children}
      </Tag>
      <span
        aria-hidden="true"
        className={
          "pointer-events-none absolute -bottom-6 left-0 right-0 h-12 rounded-full " +
          "blur-[28px] " +
          "bg-[radial-gradient(ellipse_at_center,rgba(163,255,18,0.55)_0%,rgba(163,255,18,0)_65%)]"
        }
      />
    </div>
  );
});

"use client";
import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { cn } from "../lib/utils";
import logo from "../assets/hackaccino_logo.svg";

export const Navbar = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (current) => {
    if (typeof current === "number") {
      const prev = scrollY.getPrevious() ?? 0;
      const direction = current - prev;

      if (current < 50) {
        setVisible(true);
        setScrolled(false);
      } else {
        setScrolled(true);
        if (direction < 0) {
          setVisible(true);
        } else {
          setVisible(false);
        }
      }
    }
  });

  return (
    <AnimatePresence mode="wait">
      <motion.nav
        initial={{
          opacity: 1,
          y: -100,
        }}
        animate={{
          y: visible ? 0 : -100,
          opacity: visible ? 1 : 0,
        }}
        transition={{
          duration: 0.2,
        }}
        className={cn(
          "fixed top-8 inset-x-0 mx-auto z-[5000] px-4 w-full max-w-6xl transition-all duration-300",
          className
        )}
      >
        <div
          className={cn(
            "w-full rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-2xl transition-all duration-500",
            "shadow-[0_0_1px_rgba(255,255,255,0.1)_inset,0_20px_40px_-15px_rgba(0,0,0,0.5)]",
            scrolled ? "py-2.5 px-6" : "py-4 px-8"
          )}
        >
          {children}
        </div>
      </motion.nav>
    </AnimatePresence>
  );
};

export const NavBody = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 w-full",
        className
      )}
    >
      {children}
    </div>
  );
};

export const NavItems = ({
  items,
  className,
}: {
  items: { name: string; link: string }[];
  className?: string;
}) => {
  return (
    <div className={cn("hidden md:flex items-center gap-8", className)}>
      {items.map((item, idx) => (
        <a
          key={`nav-link-${idx}`}
          href={item.link}
          className="text-sm font-medium text-gray-400 hover:text-neon-green transition-colors"
        >
          {item.name}
        </a>
      ))}
    </div>
  );
};

export const NavbarLogo = ({ onClick }: { onClick?: () => void }) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 cursor-pointer group translate-y-[1px]"
    >
      <img src={logo} alt="Hackaccino Logo" className="w-7 h-7 object-contain" />
      <span 
        className="font-['Array-Bold'] font-black text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.5)] m-0 tracking-[1px] w-fit text-lg group-hover:text-neon-green transition-colors uppercase"
      >
        HACKACCINO
      </span>
      <div className="ml-1 px-2 py-0.5 bg-white/10 border border-white/10 rounded-full flex items-center justify-center translate-y-[0.5px]">
        <span className="text-[10px] font-black text-white tracking-widest">4.0</span>
      </div>
    </div>
  );
};

export const NavbarButton = ({
  children,
  variant = "primary",
  className,
  onClick,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  onClick?: () => void;
}) => {
  if (variant === "ghost") {
    return (
      <button
        onClick={onClick}
        className={cn(
          "px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-all",
          className
        )}
      >
        {children}
      </button>
    );
  }

  if (variant === "secondary") {
    return (
      <button
        onClick={onClick}
        className={cn(
          "relative px-5 py-2 text-xs font-bold uppercase tracking-widest text-gray-300 bg-white/5 border border-white/10 rounded-full transition-all duration-300 overflow-hidden group",
          "hover:text-white hover:border-neon-green/40 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(163,255,18,0.1)]",
          className
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group/btn bg-neon-green text-black px-6 py-2 rounded-full text-xs font-bold transition-all",
        "shadow-[0_0_15px_rgba(163,255,18,0.3)] hover:shadow-[0_0_25px_rgba(163,255,18,0.5)] hover:-translate-y-[1px] active:scale-[0.98]",
        className
      )}
    >
      <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export const MobileNav = ({ children }: { children: React.ReactNode }) => {
  return <div className="flex md:hidden items-center justify-between w-full">{children}</div>;
};

export const MobileNavHeader = ({ children }: { children: React.ReactNode }) => {
  return <div className="flex items-center justify-between w-full">{children}</div>;
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className="p-2 text-gray-400 hover:text-white transition-colors"
    >
      {isOpen ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      )}
    </button>
  );
};

export const MobileNavMenu = ({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: React.ReactNode;
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 flex flex-col gap-6 overflow-hidden z-[5001]"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

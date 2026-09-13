"use client";

import Link from "next/link";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  href?: string;
  inverted?: boolean;
}

export default function Logo({ className = "", iconOnly = false, href = "/", inverted = false }: LogoProps) {
  const textColor = inverted ? "text-white" : "text-[#1A1A1A]";
  const dotColor = "text-[#C4727F]";

  return (
    <Link href={href} className={`flex items-center gap-2.5 group ${className}`}>
      {/* Elegant A lettermark */}
      <div className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-400 overflow-hidden group-hover:scale-105 ${inverted ? 'bg-white/10' : 'bg-[#1A1A1A]'}`}>
        <span className="text-base font-bold tracking-tight text-white font-heading select-none">M</span>
        {/* Subtle rose dot accent */}
        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#C4727F]" />
      </div>

      {/* Brand text */}
      {!iconOnly && (
        <span className={`text-xl font-semibold tracking-tight select-none font-heading flex items-baseline ${textColor}`}>
          <span>MITYRA</span>
          
        </span>
      )}
    </Link>
  );
}

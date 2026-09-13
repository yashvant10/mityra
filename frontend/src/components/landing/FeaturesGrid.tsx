"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, useInView } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { Scissors, Wand2, LayoutDashboard, Palette, TrendingUp, Sparkles, ArrowRight } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   REDUCED MOTION HOOK
   ═══════════════════════════════════════════════════════════ */

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/* ═══════════════════════════════════════════════════════════
   FEATURE DATA
   ═══════════════════════════════════════════════════════════ */

const features = [
  {
    id: "01",
    title: "Virtual Try-On",
    description: "Try any outfit instantly with hyper-realistic AI virtual fitting.",
    icon: Scissors,
    stickerSrc: "/images/features/sticker-virtual-tryon.png",
    stickerAlt: "Phone showing virtual try-on interface",
  },
  {
    id: "02",
    title: "AI Fashion Stylist",
    description: "Get personalized outfit ideas curated by ARIA, your AI fashion advisor.",
    icon: Wand2,
    stickerSrc: "/images/features/sticker-ai-stylist.png",
    stickerAlt: "Curated outfit board",
  },
  {
    id: "03",
    title: "Smart Wardrobe",
    description: "Digitize your closet, organize by category, and discover new outfit combinations.",
    icon: LayoutDashboard,
    stickerSrc: "/images/features/sticker-smart-wardrobe.png",
    stickerAlt: "Organized wardrobe",
  },
  {
    id: "04",
    title: "Color Intelligence",
    description: "AI-driven color matching for your skin tone, season, and personal style palette.",
    icon: Palette,
    stickerSrc: "/images/features/sticker-color-intelligence.png",
    stickerAlt: "Premium fabric swatches",
  },
  {
    id: "05",
    title: "Style Analytics",
    description: "Understand your style, track trends, and dress smarter with data.",
    icon: TrendingUp,
    stickerSrc: "/images/features/sticker-style-analytics.png",
    stickerAlt: "Tablet showing style score",
  },
  {
    id: "06",
    title: "Instant Recommendations",
    description: "Get AI-powered outfit suggestions tailored to you, instantly.",
    icon: Sparkles,
    stickerSrc: "/images/features/sticker-instant-recommendations-final.jpg",
    stickerAlt: "AI recommendations interface",
  },
];

/* ═══════════════════════════════════════════════════════════
   FEATURE CARD COMPONENT
   ═══════════════════════════════════════════════════════════ */

interface FeatureCardProps {
  feature: (typeof features)[0];
  index: number;
  prefersReducedMotion: boolean;
}

function FeatureCard({ feature, index, prefersReducedMotion }: FeatureCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(wrapperRef, { once: true, margin: "-50px" });

  const [isHovered, setIsHovered] = useState(false);
  const [stickerHovered, setStickerHovered] = useState(false);

  // Timing values
  const revealDelayS = index * 0.1;

  const IconComponent = feature.icon;

  return (
    <div
      ref={wrapperRef}
      className="relative pt-8 sm:pt-12 w-full"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView
          ? "translateY(0)"
          : "translateY(15px)",
        transition: prefersReducedMotion
          ? "opacity 0.3s ease"
          : `opacity 0.5s ease ${revealDelayS}s, transform 0.5s ease ${revealDelayS}s`,
      }}
    >
      <div
        className="relative w-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setStickerHovered(false);
        }}
      >
        {/* Card hover lift wrapper */}
        <div
          className="w-full h-full"
          style={{
            transform: isHovered ? "translateY(-4px)" : "translateY(0)",
            transition: "transform 0.35s ease-out",
          }}
        >
          {/* Card body - dynamic equal heights matching reference */}
          <div
            className={`bg-[#FFFFFF] border border-[#E8E0D8] rounded-[20px] p-6 lg:p-7 relative flex flex-col h-full w-full min-h-[240px] ${
              isHovered
                ? "shadow-[0_12px_24px_rgba(0,0,0,0.06),0_4px_12px_rgba(196,114,127,0.04)]"
                : "shadow-[0_4px_12px_rgba(0,0,0,0.03)]"
            }`}
            style={{
              transition: "box-shadow 0.35s ease-out",
            }}
          >
            {/* Content constraints - strict percentage width to keep text left-aligned and readable */}
            <div className="w-[65%] lg:w-[60%] relative z-20 flex flex-col h-full">
              
              {/* Top Bar: Icon + Label */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-[24px] h-[24px] rounded-full bg-[#F2E0E3] flex items-center justify-center text-[#C4727F] shrink-0">
                  <IconComponent strokeWidth={2.5} size={12} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C4727F] font-body select-none">
                  {feature.id} / FEATURE
                </span>
              </div>

              {/* Feature Title */}
              <h3 className="text-[1.2rem] lg:text-[1.35rem] font-bold font-heading text-[#1A1A1A] leading-tight mb-2">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-[13px] text-[#6B6B6B] leading-[1.6] mb-5 font-body flex-grow">
                {feature.description}
              </p>

              {/* Explore Button - Solid Pill */}
              <div className="mt-auto">
                <Link
                  href="/signup"
                  className="group/explore inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#C4727F] text-white text-[11.5px] font-semibold font-body transition-all duration-300 hover:bg-[#A85B67]"
                >
                  Explore <span className="translate-y-[0.5px]">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Sticker visual ─── */}
        {/* Sticker container: dynamically sized, floating above top-right corner */}
        <div
          className={`absolute z-30 pointer-events-auto ${
            feature.id === "06"
              ? "-top-[35px] -right-[5px] lg:-top-[55px] lg:-right-[10px] w-[150px] sm:w-[170px] lg:w-[190px]"
              : feature.id === "04" || feature.id === "05"
              ? "-top-[60px] -right-[20px] lg:-top-[90px] lg:-right-[30px] w-[200px] sm:w-[220px] lg:w-[250px]"
              : "-top-[45px] -right-[15px] lg:-top-[65px] lg:-right-[20px] w-[150px] sm:w-[170px] lg:w-[190px]"
          }`}
          onMouseEnter={() => setStickerHovered(true)}
          onMouseLeave={() => setStickerHovered(false)}
        >
          {/* Sticker interaction wrapper */}
          <div
            style={{
              transform: stickerHovered 
                ? "translateY(-6px) rotate(1.5deg) scale(1.03)" 
                : "translateY(0) rotate(0) scale(1)",
              transition: "transform 0.35s ease-out, filter 0.35s ease-out",
              filter: stickerHovered 
                ? "drop-shadow(0 16px 24px rgba(0,0,0,0.15))" 
                : "drop-shadow(0 8px 16px rgba(0,0,0,0.08))",
            }}
          >
            {/* The actual image - NO CSS HACKS */}
            <div className="w-full aspect-[4/5] relative">
              <Image
                src={feature.stickerSrc}
                alt={feature.stickerAlt}
                fill
                sizes="(max-width: 640px) 200px, (max-width: 1024px) 220px, 280px"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FEATURES GRID (DEFAULT EXPORT)
   ═══════════════════════════════════════════════════════════ */

export default function FeaturesGrid() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section
      id="features"
      className="relative py-16 sm:py-24 bg-[#FAF8F5] overflow-visible"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── Section Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="text-[10px] font-bold text-[#C4727F] uppercase tracking-[0.15em] font-body">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-3 mb-4 font-heading text-[#1A1A1A]">
            Everything You Need
          </h2>
          <p className="text-[#6B6B6B] max-w-xl mx-auto text-[14px] leading-relaxed font-body">
            A complete AI fashion ecosystem — from virtual fitting rooms to
            intelligent wardrobe management.
          </p>
        </motion.div>

        {/* ─── Features Grid ─── */}
        {/* Strict 3x2 grid on desktop, consistent spacing exactly mirroring the reference */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 w-full items-stretch">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={index}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";

const steps = [
  {
    number: "01",
    title: "Find Outfit",
    description: "Search or paste a product URL from your favorite store.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#C4727F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="14" cy="14" r="8" />
        <path d="M20 20l6 6" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Upload Photo",
    description: "Add a clear front-facing photo of yourself.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#C4727F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="24" height="24" rx="4" />
        <circle cx="16" cy="13" r="4" />
        <path d="M4 24l6-6a2 2 0 012.8 0l6.2 6.2" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "AI Processing",
    description: "Our AI prepares the virtual try-on in seconds.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#C4727F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4v4M16 24v4M4 16h4M24 16h4" />
        <circle cx="16" cy="16" r="6" />
        <path d="M7.5 7.5l2.8 2.8M21.7 21.7l2.8 2.8M7.5 24.5l2.8-2.8M21.7 10.3l2.8-2.8" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "See Results",
    description: "View and compare your look with the original.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#C4727F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 16s4-8 12-8 12 8 12 8-4 8-12 8-12-8-12-8z" />
        <circle cx="16" cy="16" r="3" />
      </svg>
    ),
  },
  {
    number: "05",
    title: "Shop Now",
    description: "Continue to the selected store and purchase.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#C4727F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 10h16l-2 14H10z" />
        <path d="M12 10V8a4 4 0 018 0v2" />
        <circle cx="13" cy="27" r="1.5" fill="#C4727F" />
        <circle cx="21" cy="27" r="1.5" fill="#C4727F" />
      </svg>
    ),
  },
];

function StepCard({ step, index }: { step: typeof steps[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.12, ease: [0.33, 1, 0.68, 1] }}
      className="relative text-center"
    >
      {/* Icon circle */}
      <motion.div
        animate={isInView ? { scale: [0.92, 1.03, 1] } : {}}
        transition={{ duration: 0.6, delay: index * 0.12 + 0.2, ease: [0.33, 1, 0.68, 1] }}
        className="w-[72px] h-[72px] rounded-2xl bg-white border border-[#E8E0D8] flex items-center justify-center mx-auto mb-5 relative z-10 shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
      >
        {step.icon}
      </motion.div>

      {/* Step number */}
      <span className="inline-block text-xs font-semibold text-[#C4727F] bg-[#F2E0E3] rounded-full px-2.5 py-0.5 mb-3">
        {step.number}
      </span>

      {/* Title */}
      <h3 className="text-base font-semibold text-[#1A1A1A] mb-2">{step.title}</h3>

      {/* Description */}
      <p className="text-sm text-[#6B6B6B] leading-relaxed max-w-[200px] mx-auto">
        {step.description}
      </p>
    </motion.div>
  );
}

export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" className="section-spacing bg-[#F5F0EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" ref={sectionRef}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
          className="text-center mb-16"
        >
          <p className="text-xs tracking-[0.2em] uppercase text-[#9B9B9B] font-medium mb-3">
            Simple Process
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold font-heading text-[#1A1A1A]">
            How it works
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-4 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden lg:block absolute top-9 left-[10%] right-[10%] h-px overflow-hidden">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.4, delay: 0.4, ease: [0.33, 1, 0.68, 1] }}
              className="h-full border-t-2 border-dashed border-[#D4949E]/25 origin-left"
            />
          </div>

          {steps.map((step, index) => (
            <StepCard key={step.number} step={step} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion, useReducedMotion, TargetAndTransition, Variant } from "motion/react";
import React, { useRef } from "react";

type RevealVariant = "fade-up" | "fade-in" | "scale-in" | "slide-left" | "slide-right" | "editorial";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  once?: boolean;
  margin?: string;
  /** Stagger delay for use inside parent stagger containers */
  staggerIndex?: number;
  staggerDelay?: number;
}

const variantMap: Record<RevealVariant, any> = {
  "fade-up": {
    hidden: { opacity: 0, y: 30, filter: "blur(2px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
  },
  "fade-in": {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  "scale-in": {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },
  "slide-left": {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0 },
  },
  "slide-right": {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0 },
  },
  "editorial": {
    hidden: { opacity: 0, y: 40, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
};

export function ScrollReveal({
  children,
  className = "",
  variant = "fade-up",
  delay = 0,
  duration = 0.6,
  once = true,
  margin = "-80px",
  staggerIndex,
  staggerDelay = 0.1,
}: ScrollRevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const computedDelay = delay + (staggerIndex != null ? staggerIndex * staggerDelay : 0);

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const { hidden, visible } = variantMap[variant];

  return (
    <motion.div
      initial={hidden}
      whileInView={{
        ...visible,
        transition: {
          duration,
          delay: computedDelay,
          ease: [0.22, 1, 0.36, 1],
        },
      }}
      viewport={{ once, margin }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Stagger container — wraps children and applies staggered reveal */
export function ScrollRevealStagger({
  children,
  className = "",
  staggerDelay = 0.08,
  once = true,
  margin = "-60px",
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  once?: boolean;
  margin?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin }}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Individual item inside a ScrollRevealStagger container */
export function ScrollRevealItem({
  children,
  className = "",
  variant = "fade-up",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: RevealVariant;
}) {
  const { hidden, visible } = variantMap[variant];

  return (
    <motion.div
      variants={{
        hidden,
        visible: {
          ...visible,
          transition: {
            duration: 0.5,
            ease: [0.22, 1, 0.36, 1],
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

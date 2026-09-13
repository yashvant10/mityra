"use client";

import { motion, useReducedMotion } from "motion/react";
import React, { ElementType } from "react";

interface AnimatedTextProps {
  text: string;
  className?: string;
  el?: ElementType;
  once?: boolean;
  delay?: number;
}

export function AnimatedText({
  text,
  className = "",
  el: Wrapper = "p",
  once = true,
  delay = 0,
}: AnimatedTextProps) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.split(" ");

  if (shouldReduceMotion) {
    return <Wrapper className={className}>{text}</Wrapper>;
  }

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.09, delayChildren: delay * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring" as const,
        damping: 20,
        stiffness: 70,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      filter: "blur(2px)",
    },
  };

  return (
    <Wrapper className={className}>
      <motion.span
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once, margin: "-10% 0px" }}
        className="inline-block"
      >
        {words.map((word, index) => (
          <motion.span
            variants={child}
            className="inline-block mr-[0.25em]"
            key={index}
          >
            {word}
          </motion.span>
        ))}
      </motion.span>
    </Wrapper>
  );
}

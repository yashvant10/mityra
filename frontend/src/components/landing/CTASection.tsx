"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-[#1A1A1A]">
      {/* Subtle decorative elements with gentle motion */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ x: [0, 15, 0], y: [0, -8, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/4 w-[300px] h-[300px] rounded-full bg-[#C4727F]/5 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -10, 0], y: [0, 10, 0] }}
          transition={{ duration: 32, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-[#E8D5C4]/5 blur-[120px]"
        />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Decorative editorial line */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
          className="w-12 h-px bg-[#D4949E] mx-auto mb-10 origin-center"
        />

        <motion.h2
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
          className="text-3xl sm:text-4xl lg:text-5xl font-semibold font-heading text-white mb-4 leading-tight"
        >
          Ready to see it
          <br />
          <span className="text-[#D4949E] italic">on you?</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.33, 1, 0.68, 1] }}
          className="text-white/40 text-base sm:text-lg mb-12 max-w-md mx-auto"
        >
          Discover your next look with MITYRA.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.33, 1, 0.68, 1] }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/try-on"
            className="btn-rose !py-4 !px-10 !text-base inline-flex items-center gap-2.5 !rounded-xl group"
          >
            Try Your Look Now
            <ArrowRight className="w-4 h-4 transition-transform duration-400 group-hover:translate-x-1" />
          </Link>
          <a
            href="#discover"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium text-white/60 hover:text-white border border-white/10 hover:border-white/25 rounded-xl transition-all duration-500"
          >
            Explore Collections
          </a>
        </motion.div>
      </div>
    </section>
  );
}


"use client";

import { motion } from "motion/react";

const values = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#C4727F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="6" width="20" height="16" rx="3" />
        <circle cx="14" cy="14" r="4" />
        <path d="M4 10h20" />
      </svg>
    ),
    title: "Realistic Try-On",
    description: "True-to-life virtual try-on that shows how outfits actually look on you.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#C4727F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 4l3 6h6l-5 4 2 6-6-4-6 4 2-6-5-4h6z" />
      </svg>
    ),
    title: "High Accuracy",
    description: "Better fit visualization with precise body and garment matching.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#C4727F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="4" width="18" height="20" rx="3" />
        <path d="M10 10h8M10 14h5" />
        <circle cx="14" cy="19" r="2" />
      </svg>
    ),
    title: "Privacy First",
    description: "Your photos are handled securely and never shared with anyone.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#C4727F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 4a10 10 0 110 20 10 10 0 010-20z" />
        <path d="M14 10v4l3 3" />
      </svg>
    ),
    title: "Lightning Fast",
    description: "Results in seconds, not minutes. Fast and clear processing.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#C4727F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="6" width="10" height="16" rx="2" />
        <rect x="15" y="6" width="10" height="16" rx="2" />
        <path d="M8 20h0M20 20h0" />
      </svg>
    ),
    title: "Compare & Shop",
    description: "Compare looks side-by-side and continue to your favorite store.",
  },
];

export default function TrustSection() {
  return (
    <section className="section-spacing bg-[#FAF8F5]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-semibold font-heading text-[#1A1A1A]">
            Why choose <span className="text-[#C4727F]">MITYRA</span>?
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 lg:gap-4">
          {values.map((val, index) => (
            <motion.div
              key={val.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.08, ease: [0.33, 1, 0.68, 1] }}
              className="text-center group cursor-default"
            >
              <div className="bg-white border border-[#E8E0D8] rounded-2xl p-5 transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-[0_6px_24px_rgba(0,0,0,0.05)] group-hover:border-[#D4949E]">
                <div className="w-14 h-14 rounded-xl bg-[#F2E0E3] flex items-center justify-center mx-auto mb-4 transition-all duration-500 group-hover:scale-105">
                  {val.icon}
                </div>
                <h3 className="text-sm font-semibold text-[#1A1A1A] mb-2">{val.title}</h3>
                <p className="text-xs text-[#6B6B6B] leading-relaxed">{val.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

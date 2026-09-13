"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

export default function WardrobeShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const phoneY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section ref={sectionRef} id="wardrobe" className="section-spacing section-dark overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-4"
          >
            <h2 className="text-3xl sm:text-4xl font-semibold font-heading mb-3 text-white leading-tight">
              Your style.
              <br />
              Anytime. Anywhere.
              <br />
              <span className="text-[#D4949E] italic">Made simple with AI.</span>
            </h2>
            <p className="text-white/50 mb-8 leading-relaxed max-w-sm">
              Download the MITYRA app and try looks on the go.
            </p>

            {/* App store badges */}
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 px-4 bg-white/10 border border-white/10 rounded-lg flex items-center gap-2 text-white/80 text-xs font-medium cursor-pointer hover:bg-white/15 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                App Store
              </div>
              <div className="h-10 px-4 bg-white/10 border border-white/10 rounded-lg flex items-center gap-2 text-white/80 text-xs font-medium cursor-pointer hover:bg-white/15 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.35l2.473 1.431c.646.374.646 1.05 0 1.424l-2.473 1.431-2.537-2.537 2.537-2.75zM5.864 2.658L16.8 8.99l-2.302 2.302-8.635-8.635z"/></svg>
                Google Play
              </div>
            </div>
          </motion.div>

          {/* Center: Phone mockup with parallax */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-4 flex justify-center"
          >
            <motion.div className="relative w-[240px] sm:w-[260px]" style={{ y: phoneY }}>
              {/* Phone frame */}
              <div className="bg-[#2A2A2A] rounded-[32px] p-2 shadow-2xl shadow-black/40 border border-white/10">
                {/* Screen */}
                <div className="bg-[#FAF8F5] rounded-[26px] overflow-hidden">
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-5 pt-3 pb-2 bg-[#FAF8F5]">
                    <span className="text-[9px] font-semibold text-[#1A1A1A]">9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-2 border border-[#1A1A1A] rounded-sm"><div className="w-1.5 h-full bg-[#1A1A1A] rounded-sm" /></div>
                    </div>
                  </div>

                  {/* App header */}
                  <div className="px-4 pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-[#1A1A1A] font-heading">MITYRA</span>
                      <div className="w-6 h-6 rounded-full bg-[#F2E0E3] flex items-center justify-center">
                        <span className="text-[8px] font-bold text-[#C4727F]">P</span>
                      </div>
                    </div>

                    {/* Tab bar */}
                    <div className="flex gap-1 bg-[#F5F0EB] rounded-lg p-0.5 mb-3">
                      {["For you", "Casual", "Party"].map((tab, i) => (
                        <div
                          key={tab}
                          className={`flex-1 text-center py-1.5 rounded-md text-[9px] font-medium ${
                            i === 0
                              ? "bg-white text-[#1A1A1A] shadow-sm"
                              : "text-[#9B9B9B]"
                          }`}
                        >
                          {tab}
                        </div>
                      ))}
                    </div>

                    {/* Product cards */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { color: "#E8D5C4", label: "Linen Shirt", price: "₹1,999" },
                        { color: "#D4E4D9", label: "Sage Dress", price: "₹2,499" },
                        { color: "#F2E0E3", label: "Rose Blazer", price: "₹3,799" },
                        { color: "#E0D4C8", label: "Beige Co-ord", price: "₹2,299" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-lg overflow-hidden border border-[#E8E0D8]">
                          <div className="aspect-square" style={{ background: item.color }} />
                          <div className="p-1.5">
                            <p className="text-[8px] font-medium text-[#1A1A1A] truncate">{item.label}</p>
                            <p className="text-[8px] text-[#C4727F] font-semibold">{item.price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom nav */}
                  <div className="flex items-center justify-around py-2 border-t border-[#E8E0D8] bg-white">
                    {["Home", "Try On", "Saved", "Profile"].map((nav, i) => (
                      <div key={nav} className="flex flex-col items-center gap-0.5">
                        <div className={`w-4 h-4 rounded-full ${i === 0 ? "bg-[#C4727F]" : "bg-[#E8E0D8]"}`} />
                        <span className={`text-[7px] ${i === 0 ? "text-[#C4727F] font-semibold" : "text-[#9B9B9B]"}`}>{nav}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Subtle glow behind phone */}
              <div className="absolute -inset-8 bg-[#C4727F]/5 rounded-full blur-3xl -z-10" />
            </motion.div>
          </motion.div>

          {/* Right: QR Code */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-4 flex items-center justify-center lg:justify-start"
          >
            <div className="flex items-center gap-4 bg-white/10 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <div className="w-20 h-20 bg-white rounded-xl p-2 flex items-center justify-center">
                {/* QR Code Placeholder SVG */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-[#1A1A1A]">
                  <rect x="10" y="10" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="65" y="10" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="10" y="65" width="25" height="25" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="16" y="16" width="13" height="13" fill="currentColor" />
                  <rect x="71" y="16" width="13" height="13" fill="currentColor" />
                  <rect x="16" y="71" width="13" height="13" fill="currentColor" />
                  
                  <rect x="45" y="10" width="10" height="10" fill="currentColor" />
                  <rect x="45" y="25" width="10" height="10" fill="currentColor" />
                  <rect x="10" y="45" width="10" height="10" fill="currentColor" />
                  <rect x="25" y="45" width="10" height="10" fill="currentColor" />
                  <rect x="45" y="45" width="10" height="10" fill="currentColor" />
                  
                  <rect x="65" y="45" width="25" height="10" fill="currentColor" />
                  <rect x="80" y="60" width="10" height="30" fill="currentColor" />
                  <rect x="65" y="80" width="10" height="10" fill="currentColor" />
                  <rect x="45" y="65" width="10" height="25" fill="currentColor" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Scan to download</p>
                <p className="text-sm text-white/70">the app now</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

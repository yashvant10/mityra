"use client";

import { motion } from "motion/react";
import { Upload, ArrowLeftRight, Sparkles } from "lucide-react";

export default function TryOnDemo() {
  return (
    <section id="try-on" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 mesh-gradient opacity-50" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text side */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="text-sm font-medium text-neon-purple-light uppercase tracking-widest">
              Virtual Try-On
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold mt-4 mb-6">
              See It On{" "}
              <span className="gradient-text">Yourself</span>
            </h2>
            <p className="text-white/40 text-lg mb-8 leading-relaxed">
              Upload your photo and instantly preview any outfit on your body.
              Our AI creates photorealistic previews so you can shop with
              confidence.
            </p>

            {/* Steps */}
            <div className="space-y-5">
              {[
                {
                  step: "01",
                  icon: Upload,
                  title: "Upload Your Photo",
                  desc: "Take a selfie or upload a full-body image",
                },
                {
                  step: "02",
                  icon: ArrowLeftRight,
                  title: "Select Clothing",
                  desc: "Browse items or upload clothing you want to try",
                },
                {
                  step: "03",
                  icon: Sparkles,
                  title: "AI Magic",
                  desc: "See the outfit on you in seconds — like magic",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-neon-purple-light" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      {item.title}
                    </h4>
                    <p className="text-sm text-white/40">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Demo visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="glass-card rounded-3xl p-8 neon-glow">
              {/* Before/After comparison mockup */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-neon-purple/10 flex items-center justify-center mx-auto mb-3">
                      <Upload className="w-7 h-7 text-neon-purple/50" />
                    </div>
                    <p className="text-xs text-white/30">Your Photo</p>
                  </div>
                </div>
                <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-neon-purple/5 to-electric-blue/5 border border-neon-purple/20 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-neon-purple/10 flex items-center justify-center mx-auto mb-3 animate-glow-pulse">
                      <Sparkles className="w-7 h-7 text-neon-purple" />
                    </div>
                    <p className="text-xs text-white/30">AI Result</p>
                  </div>
                </div>
              </div>

              {/* Loading bar */}
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: "0%" }}
                  whileInView={{ width: "100%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 2, delay: 0.5, ease: "easeInOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-neon-purple to-electric-blue"
                />
              </div>
              <p className="text-center text-xs text-white/30 mt-3">
                AI processing — generating photorealistic preview...
              </p>
            </div>

            {/* Decorative glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-neon-purple/5 blur-[60px]" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-electric-blue/5 blur-[60px]" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

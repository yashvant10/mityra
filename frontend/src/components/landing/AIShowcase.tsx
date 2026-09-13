"use client";

import { motion } from "motion/react";
import { Sparkles, ArrowRight, Eye, Brain, TrendingUp } from "lucide-react";

const showcaseItems = [
  {
    icon: Eye,
    title: "See Before You Buy",
    description:
      "Our AI virtually places any clothing item on your photo with photorealistic accuracy.",
    stat: "98%",
    statLabel: "Accuracy",
  },
  {
    icon: Brain,
    title: "AI That Learns You",
    description:
      "ARIA learns your style preferences, body shape, and color palette to give increasingly personalized advice.",
    stat: "10K+",
    statLabel: "Style Combos",
  },
  {
    icon: TrendingUp,
    title: "Stay Ahead of Trends",
    description:
      "Real-time fashion trend analysis powered by AI, keeping you always on the cutting edge.",
    stat: "24/7",
    statLabel: "Trend Updates",
  },
];

export default function AIShowcase() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald/3 blur-[150px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald/20 bg-emerald/5 mb-6">
            <Sparkles className="w-3.5 h-3.5 text-emerald" />
            <span className="text-xs text-emerald-light font-medium uppercase tracking-wider">
              AI-Powered Fashion
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 font-heading">
            Fashion Intelligence
            <br />
            <span className="gradient-text">Reimagined</span>
          </h2>
          <p className="text-white/40 max-w-xl mx-auto text-lg">
            Experience the convergence of artificial intelligence and high fashion.
          </p>
        </motion.div>

        {/* Showcase Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {showcaseItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="glass-card-hover rounded-3xl p-8 relative group"
            >
              {/* Stat badge */}
              <div className="absolute top-6 right-6">
                <div className="text-right">
                  <span className="text-2xl font-bold gradient-text">
                    {item.stat}
                  </span>
                  <p className="text-xs text-white/30 mt-0.5">
                    {item.statLabel}
                  </p>
                </div>
              </div>

              <div className="w-12 h-12 rounded-xl bg-emerald/10 flex items-center justify-center mb-6 group-hover:bg-emerald/20 transition-colors duration-300">
                <item.icon className="w-6 h-6 text-emerald-light" />
              </div>

              <h3 className="text-xl font-semibold text-white mb-3 font-heading">
                {item.title}
              </h3>
              <p className="text-sm text-white/40 leading-relaxed mb-6">
                {item.description}
              </p>

              <div className="flex items-center gap-2 text-sm text-emerald-light group-hover:gap-3 transition-all duration-300 cursor-pointer">
                <span>Learn more</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

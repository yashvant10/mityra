"use client";

import { motion } from "motion/react";
import { MessageSquare, Send } from "lucide-react";

const sampleConversation = [
  {
    role: "user" as const,
    text: "What should I wear for a summer wedding?",
  },
  {
    role: "assistant" as const,
    text: "For a summer wedding, I'd suggest a light linen suit in beige or soft blue. Pair with a pastel shirt, no-show socks with loafers, and a pocket square for elegance. ✨",
  },
  {
    role: "user" as const,
    text: "What about accessories?",
  },
  {
    role: "assistant" as const,
    text: "A minimalist gold watch, tortoiseshell sunglasses, and a slim leather belt would complete the look perfectly. Keep jewelry subtle — less is more for daytime events.",
  },
];

export default function StylistDemo() {
  return (
    <section id="stylist" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Chat demo */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="order-2 lg:order-1"
          >
            <div className="glass-card rounded-3xl overflow-hidden neon-glow">
              {/* Chat header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-neon-purple to-electric-blue flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    ARIA — AI Stylist
                  </h4>
                  <p className="text-xs text-green-400">Online</p>
                </div>
              </div>

              {/* Messages */}
              <div className="p-6 space-y-4 max-h-80 overflow-y-auto">
                {sampleConversation.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-neon-purple/20 text-white border border-neon-purple/20"
                          : "bg-white/5 text-white/80 border border-white/5"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Input bar */}
              <div className="px-6 pb-6">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-sm text-white/30 flex-1">
                    Ask ARIA anything about fashion...
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-neon-purple flex items-center justify-center cursor-pointer hover:bg-neon-purple-dark transition-colors">
                    <Send className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Text side */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="order-1 lg:order-2"
          >
            <span className="text-sm font-medium text-neon-purple-light uppercase tracking-widest">
              AI Stylist
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold mt-4 mb-6">
              Meet{" "}
              <span className="gradient-text">ARIA</span>
            </h2>
            <p className="text-white/40 text-lg mb-8 leading-relaxed">
              Your personal AI fashion stylist that knows every trend, color
              theory, and style rule — and when to break them. Available 24/7.
            </p>

            {/* Prompt suggestions */}
            <div className="flex flex-wrap gap-2">
              {[
                "Wedding outfit ideas",
                "Luxury streetwear",
                "Colors for dark skin",
                "Minimalist capsule",
              ].map((prompt) => (
                <span
                  key={prompt}
                  className="px-4 py-2 rounded-full text-xs text-white/50 border border-white/10 hover:border-neon-purple/30 hover:text-neon-purple-light transition-all duration-300 cursor-pointer"
                >
                  {prompt}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

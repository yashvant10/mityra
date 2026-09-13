"use client";

import { motion } from "motion/react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    name: "Neha Sharma",
    role: "Verified Buyer",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
    rating: 5,
    text: "The try-on results are so realistic! MITYRA helps me shop with confidence every single time.",
  },
  {
    name: "Ritika Verma",
    role: "Fashion Influencer",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80",
    rating: 5,
    text: "Finally a try-on app that actually gets the fit and look right. Super easy to use!",
  },
  {
    name: "Ananya Iyer",
    role: "Verified Buyer",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    rating: 5,
    text: "I love how I can try outfits from different stores in one place. Total time saver!",
  },
];

export default function Testimonials() {
  return (
    <section className="section-spacing bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
          className="text-center mb-14"
        >
          <span className="text-xs tracking-[0.2em] uppercase text-[#9B9B9B] font-medium block mb-3">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl font-semibold font-heading text-[#1A1A1A] mb-3">
            Loved by thousands
          </h2>
          <p className="text-sm text-[#6B6B6B] max-w-md mx-auto">
            People love MITYRA for realistic try-ons and amazing experience.
          </p>
        </motion.div>

        {/* Testimonials */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: i * 0.12, ease: [0.33, 1, 0.68, 1] }}
                className="relative bg-white border border-[#E8E0D8] rounded-2xl p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:border-[#D4949E] editorial-quote"
              >
                {/* Stars */}
                <div className="flex items-center gap-1 mb-5">
                  {Array.from({ length: t.rating }).map((_, si) => (
                    <Star
                      key={si}
                      className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-sm text-[#1A1A1A] leading-relaxed mb-6 min-h-[48px] pl-1">
                  {t.text}
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent transition-all duration-300 group-hover:ring-[#F2E0E3]"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{t.name}</p>
                    <p className="text-xs text-[#6B6B6B]">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Navigation Arrows */}
          <div className="hidden lg:flex items-center justify-between absolute top-1/2 -translate-y-1/2 left-0 right-0 -mx-16 pointer-events-none">
            <button className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center text-[#1A1A1A] pointer-events-auto hover:bg-[#E8E0D8] transition-all duration-300 hover:scale-105">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 rounded-full bg-[#F5F0EB] flex items-center justify-center text-[#1A1A1A] pointer-events-auto hover:bg-[#E8E0D8] transition-all duration-300 hover:scale-105">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="mt-16 pt-10 border-t border-[#E8E0D8]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 text-center">
            {[
              { value: "500K+", label: "Users" },
              { value: "2M+", label: "Looks created" },
              { value: "150+", label: "Brands" },
              { value: "5.0", label: "Average rating", hasStar: true },
            ].map((stat, si) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: si * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="text-2xl font-bold font-heading text-[#1A1A1A] mb-1 flex justify-center items-center gap-1">
                  {stat.value} {stat.hasStar && <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />}
                </p>
                <p className="text-xs text-[#9B9B9B] uppercase tracking-wider font-bold">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-1.5 mt-8 hidden">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#E8E0D8]" />
          <div className="w-1.5 h-1.5 rounded-full bg-[#E8E0D8]" />
        </div>
      </div>
    </section>
  );
}

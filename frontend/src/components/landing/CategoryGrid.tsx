"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { AntiGravityWrapper } from "@/components/ui/AntiGravityWrapper";

interface CollectionItem {
  name: string;
  tagline: string;
  image: string;
}

const collections: CollectionItem[] = [
  {
    name: "Casual",
    tagline: "Everyday essentials",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&auto=format&fit=crop&q=80",
  },
  {
    name: "Formal",
    tagline: "Sharp. Simple. Timeless.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80",
  },
  {
    name: "Party Wear",
    tagline: "Stand out, shine on.",
    image: "https://images.unsplash.com/photo-1518622358385-8ea7d0794bf6?w=500&auto=format&fit=crop&q=80",
  },
  {
    name: "Ethnic",
    tagline: "Tradition in style.",
    image: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=500&auto=format&fit=crop&q=80",
  },
  {
    name: "Streetwear",
    tagline: "Urban. Bold. Unique.",
    image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=500&auto=format&fit=crop&q=80",
  },
];

export default function CategoryGrid() {
  return (
    <section id="discover" className="section-spacing bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs tracking-[0.2em] uppercase text-[#9B9B9B] font-medium mb-3">
              Explore Collections
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold font-heading text-[#1A1A1A]">
              Find your <em className="not-italic text-[#C4727F]">vibe</em>
            </h2>
          </motion.div>

          <motion.a
            href="#"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="btn-text shrink-0"
          >
            View All Collections
            <ArrowRight className="w-4 h-4" />
          </motion.a>
        </div>

        {/* Collection cards — horizontal scroll on mobile, grid on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
          {collections.map((col, index) => (
            <motion.div
              key={col.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="flex-shrink-0 w-[220px] sm:w-[240px] lg:w-auto snap-start"
            >
              <AntiGravityWrapper intensity={8}>
                <div className="collection-card group cursor-pointer rounded-2xl overflow-hidden border border-[#E8E0D8] bg-white transition-all duration-400 shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.12)]">
                  {/* Image container */}
                  <Link 
                    href={`/discover?q=${col.name.toLowerCase()}`}
                    className="relative aspect-[3/4] overflow-hidden block"
                  >
                    <img
                      src={col.image}
                      alt={`${col.name} collection`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />

                    {/* Arrow on hover */}
                    <div className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg transform translate-y-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <ArrowRight className="w-4 h-4 text-[#1A1A1A]" />
                    </div>
                  </Link>

                  {/* Card footer */}
                  <div className="p-4 bg-white relative z-10 border-t border-[#E8E0D8]/50">
                    <h3 className="text-sm font-semibold text-[#1A1A1A] mb-0.5">{col.name}</h3>
                    <p className="text-[11px] font-medium text-[#9B9B9B]">{col.tagline}</p>
                  </div>
                </div>
              </AntiGravityWrapper>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

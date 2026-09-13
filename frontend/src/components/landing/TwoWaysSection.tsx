"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Search, Link2, ArrowRight } from "lucide-react";

const popularSearches = ["Summer Dress", "Party Wear", "Co-ord Set", "Blazer"];

const supportedStores = [
  { name: "Amazon", color: "#FF9900" },
  { name: "Flipkart", color: "#2874F0" },
  { name: "Myntra", color: "#FF3F6C" },
  { name: "AJIO", color: "#2B2B2B" },
  { name: "Meesho", color: "#E91E63" },
];

export default function TwoWaysSection() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [productUrl, setProductUrl] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/discover?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (productUrl.trim()) {
      router.push(`/try-on?url=${encodeURIComponent(productUrl.trim())}`);
    }
  };

  return (
    <section className="section-spacing bg-[#FAF8F5]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-semibold font-heading text-[#1A1A1A]">
            Two easy ways to find
            <br />
            your <em className="not-italic text-[#C4727F] italic">perfect outfit</em>
          </h2>
        </motion.div>

        {/* Two options grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8 items-start relative">
          {/* Option 1: Search */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white border-0 rounded-[28px] p-8 h-full shadow-[0_8px_32px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] flex items-center justify-center border border-[#E8E0D8]">
                  <Search className="w-5 h-5 text-[#8C7A6B]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1A1A1A]">Search in MITYRA</h3>
              </div>

              <form onSubmit={handleSearch} className="flex gap-2 mb-5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dresses, tops, brands..."
                  className="flex-1 px-4 py-3 bg-[#FAF8F5] border border-[#E8E0D8] rounded-xl text-sm placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#B8967D] focus:ring-1 focus:ring-[#B8967D]/20 transition-all"
                />
                <button type="submit" className="bg-[#1A1A1A] text-white px-5 py-3 rounded-xl hover:bg-[#333] transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </form>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#9B9B9B] mb-3 font-semibold">Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => setSearchQuery(term)}
                      className="text-xs px-4 py-2 rounded-full bg-[#FAF8F5] border border-[#E8E0D8] text-[#6B6B6B] hover:border-[#B8967D] hover:text-[#8C7A6B] transition-all duration-200 font-medium shadow-sm"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Divider */}
          <div className="hidden md:flex flex-col items-center justify-center absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10 h-[70%]">
            <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-[#E8E0D8] to-transparent" />
            <div className="absolute top-1/2 -translate-y-1/2 bg-[#FAF8F5] p-3">
              <div className="w-11 h-11 rounded-full bg-white border border-[#E8E0D8] flex items-center justify-center text-[10px] font-bold text-[#6B6B6B] shadow-sm">
                OR
              </div>
            </div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="bg-white border-0 rounded-[28px] p-8 h-full shadow-[0_8px_32px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#FAF8F5] flex items-center justify-center border border-[#E8E0D8]">
                  <Link2 className="w-5 h-5 text-[#8C7A6B]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1A1A1A]">Paste Product URL</h3>
              </div>

              <form onSubmit={handleUrlSubmit} className="flex gap-2 mb-5">
                <input
                  type="url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="Paste any product URL here..."
                  className="flex-1 px-4 py-3 bg-[#FAF8F5] border border-[#E8E0D8] rounded-xl text-sm placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#B8967D] focus:ring-1 focus:ring-[#B8967D]/20 transition-all"
                />
                <button type="submit" className="bg-[#1A1A1A] text-white px-5 py-3 rounded-xl hover:bg-[#333] transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#9B9B9B] mb-3 font-semibold">Works with</p>
                <div className="flex flex-wrap items-center gap-4">
                  {supportedStores.map((store) => (
                    <span
                      key={store.name}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A1A1A]"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: store.color }}
                      />
                      {store.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* OR divider between the cards on mobile */}
        <div className="flex md:hidden items-center justify-center -mt-4 -mb-4 relative z-10">
          <div className="w-10 h-10 rounded-full bg-white border border-[#E8E0D8] flex items-center justify-center text-[10px] font-bold text-[#6B6B6B] shadow-sm">
            OR
          </div>
        </div>
      </div>
    </section>
  );
}

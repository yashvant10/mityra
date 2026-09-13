"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { X, Search as SearchIcon, Clock, TrendingUp } from "lucide-react";

const popularSearches = [
  "linen shirt",
  "summer dress",
  "wedding outfit",
  "casual sneakers",
  "office blazer",
  "ethnic wear",
];

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem("recentSearches");
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved));
        } catch (e) {}
      }
    }
  }, [isOpen]);

  const handleSearch = (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;

    // Save to recents
    const updatedRecents = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5);
    setRecentSearches(updatedRecents);
    localStorage.setItem("recentSearches", JSON.stringify(updatedRecents));

    // Route to discover page
    router.push(`/discover?q=${encodeURIComponent(q)}`);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(query);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[55] bg-[#FAF8F5]"
        >
          <div className="max-w-2xl mx-auto px-4 pt-6">
            {/* Search header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9B9B9B]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search products, brands, styles..."
                  className="input-fashion !pl-12 !py-4 !text-base"
                  autoFocus
                />
              </div>
              <button
                onClick={onClose}
                className="w-12 h-12 flex items-center justify-center rounded-lg border border-[#E8E0D8] hover:bg-[#F5F0EB] transition-colors"
                aria-label="Close search"
              >
                <X className="w-5 h-5 text-[#6B6B6B]" />
              </button>
            </div>

            {/* Recent searches */}
            {recentSearches.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs tracking-[0.15em] uppercase text-[#9B9B9B] font-medium mb-3">
                  Recent searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search) => (
                    <button
                      key={search}
                      onClick={() => handleSearch(search)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E8E0D8] rounded-full text-sm text-[#6B6B6B] hover:border-[#D4949E] hover:text-[#1A1A1A] transition-all press-scale"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Popular searches */}
            <div>
              <h3 className="text-xs tracking-[0.15em] uppercase text-[#9B9B9B] font-medium mb-3">
                Popular searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((search) => (
                  <button
                    key={search}
                    onClick={() => handleSearch(search)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#F2E0E3] border border-transparent rounded-full text-sm text-[#C4727F] hover:bg-[#E8D5C4] transition-all press-scale"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    {search}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

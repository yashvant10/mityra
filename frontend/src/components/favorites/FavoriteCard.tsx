"use client";

import { FavoriteProduct } from "@/lib/favoritesApi";
import { motion } from "motion/react";
import { Heart, ExternalLink, Camera } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

// Store badge colors and labels
const storeBadges: Record<string, { bg: string; text: string; label: string }> = {
  myntra: { bg: "bg-[#FF3F6C]", text: "text-white", label: "Myntra" },
  amazon: { bg: "bg-[#FF9900]", text: "text-white", label: "Amazon" },
  flipkart: { bg: "bg-[#2874F0]", text: "text-white", label: "Flipkart" },
  ajio: { bg: "bg-[#1A1A2E]", text: "text-white", label: "AJIO" },
  meesho: { bg: "bg-[#570A57]", text: "text-white", label: "Meesho" },
};

interface FavoriteCardProps {
  item: FavoriteProduct;
  index: number;
  onRemove: (id: string) => void;
}

export default function FavoriteCard({ item, index, onRemove }: FavoriteCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleRemove = async () => {
    try {
      setIsRemoving(true);
      await onRemove(item.id);
    } catch {
      setIsRemoving(false);
    }
  };

  const badge = storeBadges[item.store?.toLowerCase()] || {
    bg: "bg-gray-600",
    text: "text-white",
    label: item.store || "Store",
  };

  // Parse numeric price for display
  const priceNum = item.price ? item.price.replace(/[^0-9.]/g, "") : "";
  const originalPriceNum = item.originalPrice ? item.originalPrice.replace(/[^0-9.]/g, "") : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="group bg-white rounded-2xl border border-[#EADDD7]/50 shadow-sm overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image container */}
      <Link
        href={`/product-details?id=${encodeURIComponent(item.productId || item.id)}&name=${encodeURIComponent(item.name)}&image=${encodeURIComponent(item.imageUrl)}&price=${encodeURIComponent(item.price || "")}&originalPrice=${encodeURIComponent(item.originalPrice || "")}&discount=${encodeURIComponent(item.discount || "")}&store=${encodeURIComponent(item.store)}&url=${encodeURIComponent(item.productUrl)}&brand=${encodeURIComponent(item.brand || "")}&category=${encodeURIComponent(item.category || "tops")}`}
        className="relative aspect-[3/4] bg-[#F5F2F0] overflow-hidden block cursor-pointer"
      >
        {/* Store badge */}
        <div className={`absolute top-3 left-3 z-10 ${badge.bg} ${badge.text} text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1`}>
          <span>{badge.label}</span>
        </div>

        {/* Heart (remove) button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleRemove();
          }}
          disabled={isRemoving}
          className="absolute top-3 right-3 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white hover:scale-110 transition-all duration-200"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${isRemoving ? "text-gray-300" : "fill-[#E74C5E] text-[#E74C5E]"}`}
          />
        </button>

        {/* Product image */}
        {!imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#A69B95]">
            <span className="text-xs">Image unavailable</span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="p-3 sm:p-4 flex flex-col gap-1.5 flex-1">
        {/* Brand */}
        {item.brand && (
          <span className="text-[10px] sm:text-[11px] font-bold text-[#8C7A70] uppercase tracking-wider truncate">
            {item.brand}
          </span>
        )}

        {/* Name */}
        <Link
          href={`/product-details?id=${encodeURIComponent(item.productId || item.id)}&name=${encodeURIComponent(item.name)}&image=${encodeURIComponent(item.imageUrl)}&price=${encodeURIComponent(item.price || "")}&originalPrice=${encodeURIComponent(item.originalPrice || "")}&discount=${encodeURIComponent(item.discount || "")}&store=${encodeURIComponent(item.store)}&url=${encodeURIComponent(item.productUrl)}&brand=${encodeURIComponent(item.brand || "")}&category=${encodeURIComponent(item.category || "tops")}`}
          className="text-xs sm:text-sm font-semibold text-[#4A3D36] line-clamp-2 leading-snug hover:text-[#b95b6a] transition-colors"
        >
          {item.name}
        </Link>

        {/* Price row */}
        <div className="flex items-center gap-2 flex-wrap mt-auto">
          {item.price && (
            <span className="text-sm sm:text-base font-bold text-[#4A3D36]">
              {item.price.startsWith("₹") ? item.price : `₹${priceNum}`}
            </span>
          )}
          {item.originalPrice && originalPriceNum !== priceNum && (
            <span className="text-[10px] sm:text-xs text-[#A69B95] line-through">
              {item.originalPrice.startsWith("₹") ? item.originalPrice : `₹${originalPriceNum}`}
            </span>
          )}
          {item.discount && (
            <span className="text-[10px] sm:text-xs font-bold text-emerald-600">
              {item.discount}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-2">
          <a
            href={item.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#4A3D36] text-white text-[11px] sm:text-xs font-bold hover:bg-[#3a2f2a] transition-colors"
          >
            Shop Now
          </a>
          <Link
            href={`/try-on?clothingImage=${encodeURIComponent(item.imageUrl)}&clothingName=${encodeURIComponent(item.name)}`}
            className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl border border-[#EADDD7] text-[#4A3D36] text-[11px] sm:text-xs font-bold hover:bg-[#FAF7F5] transition-colors"
          >
            <Camera className="w-3 h-3" />
            <span className="hidden sm:inline">Try On</span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

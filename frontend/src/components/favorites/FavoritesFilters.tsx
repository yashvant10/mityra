"use client";

import { FavoriteProduct } from "@/lib/favoritesApi";
import { useState, useMemo } from "react";
import { SlidersHorizontal, X } from "lucide-react";

interface FavoritesFiltersProps {
  favorites: FavoriteProduct[];
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  selectedCategories: string[];
  setSelectedCategories: (cats: string[]) => void;
  selectedBrand: string;
  setSelectedBrand: (brand: string) => void;
  selectedStore: string;
  setSelectedStore: (store: string) => void;
  selectedSize: string;
  setSelectedSize: (size: string) => void;
  onClearAll: () => void;
}

export default function FavoritesFilters({
  favorites,
  priceRange,
  setPriceRange,
  selectedCategories,
  setSelectedCategories,
  selectedBrand,
  setSelectedBrand,
  selectedStore,
  setSelectedStore,
  selectedSize,
  setSelectedSize,
  onClearAll,
}: FavoritesFiltersProps) {
  // Compute dynamic filter options from real data
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    favorites.forEach((f) => {
      const cat = f.category || "other";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [favorites]);

  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    favorites.forEach((f) => {
      if (f.brand) brands.add(f.brand);
    });
    return Array.from(brands).sort();
  }, [favorites]);

  const uniqueStores = useMemo(() => {
    const stores = new Set<string>();
    favorites.forEach((f) => {
      if (f.store) stores.add(f.store);
    });
    return Array.from(stores).sort();
  }, [favorites]);

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedBrand !== "" ||
    selectedStore !== "" ||
    selectedSize !== "" ||
    priceRange[0] > 0 ||
    priceRange[1] < 5000;

  return (
    <div className="bg-white rounded-2xl border border-[#EADDD7]/50 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-[#4A3D36] text-sm flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="text-[11px] font-semibold text-[#C88576] hover:text-[#b97060] transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Price Range */}
      <div className="mb-5">
        <label className="text-xs font-bold text-[#4A3D36] mb-2 block">Price Range</label>
        <input
          type="range"
          min={0}
          max={5000}
          step={100}
          value={priceRange[1]}
          onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
          className="w-full accent-[#C88576] h-1.5 rounded-full"
        />
        <div className="flex justify-between text-[10px] text-[#8C7A70] mt-1">
          <span>₹{priceRange[0]}</span>
          <span>₹{priceRange[1] >= 5000 ? "5000+" : priceRange[1]}</span>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-5">
        <label className="text-xs font-bold text-[#4A3D36] mb-2 block">Categories</label>
        <div className="flex flex-col gap-2">
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat)}
                onChange={() => toggleCategory(cat)}
                className="w-3.5 h-3.5 rounded border-[#EADDD7] text-[#C88576] accent-[#C88576]"
              />
              <span className="text-xs text-[#4A3D36] capitalize group-hover:text-[#C88576] transition-colors">
                {cat} ({count})
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Brands */}
      <div className="mb-5">
        <label className="text-xs font-bold text-[#4A3D36] mb-2 block">Brands</label>
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="w-full text-xs border border-[#EADDD7] rounded-xl py-2 px-3 text-[#4A3D36] bg-white focus:outline-none focus:border-[#C88576] transition-colors"
        >
          <option value="">All Brands</option>
          {uniqueBrands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {/* Stores */}
      <div className="mb-5">
        <label className="text-xs font-bold text-[#4A3D36] mb-2 block">Stores</label>
        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="w-full text-xs border border-[#EADDD7] rounded-xl py-2 px-3 text-[#4A3D36] bg-white focus:outline-none focus:border-[#C88576] transition-colors"
        >
          <option value="">All Stores</option>
          {uniqueStores.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Size */}
      <div className="mb-5">
        <label className="text-xs font-bold text-[#4A3D36] mb-2 block">Size</label>
        <select
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
          className="w-full text-xs border border-[#EADDD7] rounded-xl py-2 px-3 text-[#4A3D36] bg-white focus:outline-none focus:border-[#C88576] transition-colors"
        >
          <option value="">All Sizes</option>
          <option value="XS">XS</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="XXL">XXL</option>
        </select>
      </div>

      {/* Apply filters visual indicator */}
      {hasActiveFilters && (
        <div className="text-center py-2 px-3 rounded-xl bg-[#FAF1F2] text-[#C88576] text-[11px] font-semibold">
          Filters active — showing matching items
        </div>
      )}
    </div>
  );
}

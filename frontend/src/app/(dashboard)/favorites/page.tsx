"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  Share2,
  TrendingUp,
  Shirt,
  RectangleHorizontal,
  Triangle,
  Flame,
  ChevronDown,
  Loader2,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Undo2,
  Lock,
  Bell,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { fetchFavorites, removeFavorite, FavoriteProduct } from "@/lib/favoritesApi";
import FavoriteCard from "@/components/favorites/FavoriteCard";
import FavoritesFilters from "@/components/favorites/FavoritesFilters";
import Link from "next/link";
import { toast } from "sonner";

type SortOption = "recent" | "priceLow" | "priceHigh" | "discount";
type FilterTab = "all" | "tops" | "bottoms" | "dresses" | "sale";

export default function FavoritesPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Sidebar filter state
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  // Price drop alerts toggle
  const [priceDropAlerts, setPriceDropAlerts] = useState(true);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchFavorites();
      setFavorites(data);
    } catch (err: any) {
      console.error("Error loading favorites:", err);
      setError("Unable to load favorites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadFavorites();
  }, [user]);

  const handleRemove = async (id: string) => {
    try {
      await removeFavorite(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
      toast.success("Removed from favorites");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove favorite");
    }
  };

  const clearAllFilters = () => {
    setPriceRange([0, 5000]);
    setSelectedCategories([]);
    setSelectedBrand("");
    setSelectedStore("");
    setSelectedSize("");
    setActiveTab("all");
  };

  // Parse price helper
  const parsePrice = (p: string | null): number => {
    if (!p) return 0;
    const n = Number(p.replace(/[^0-9.]/g, ""));
    return isNaN(n) ? 0 : n;
  };

  // Computed stats
  const stats = useMemo(() => {
    const topsCount = favorites.filter((f) => f.category === "tops").length;
    const bottomsCount = favorites.filter((f) => f.category === "bottoms").length;
    const dressesCount = favorites.filter((f) => f.category === "dresses").length;
    const saleCount = favorites.filter((f) => f.discount && f.discount !== "0%").length;
    return { total: favorites.length, tops: topsCount, bottoms: bottomsCount, dresses: dressesCount, sale: saleCount };
  }, [favorites]);

  // "You Saved" calculation
  const savingsSummary = useMemo(() => {
    let totalMRP = 0;
    let totalSave = 0;
    favorites.forEach((f) => {
      const price = parsePrice(f.price);
      const original = parsePrice(f.originalPrice);
      if (original > price && price > 0) {
        totalMRP += original;
        totalSave += original - price;
      } else {
        totalMRP += price;
      }
    });
    return { totalMRP, totalSave };
  }, [favorites]);

  // Filter + sort logic
  const filteredFavorites = useMemo(() => {
    let result = [...favorites];

    // Tab filter
    if (activeTab === "tops") result = result.filter((f) => f.category === "tops");
    if (activeTab === "bottoms") result = result.filter((f) => f.category === "bottoms");
    if (activeTab === "dresses") result = result.filter((f) => f.category === "dresses");
    if (activeTab === "sale") result = result.filter((f) => f.discount && f.discount !== "0%");

    // Sidebar filters
    if (selectedCategories.length > 0) {
      result = result.filter((f) => selectedCategories.includes(f.category || "other"));
    }
    if (selectedBrand) {
      result = result.filter((f) => f.brand === selectedBrand);
    }
    if (selectedStore) {
      result = result.filter((f) => f.store === selectedStore);
    }

    // Price range
    result = result.filter((f) => {
      const p = parsePrice(f.price);
      if (p === 0) return true; // include items without price
      return p >= priceRange[0] && (priceRange[1] >= 5000 || p <= priceRange[1]);
    });

    // Sort
    if (sortBy === "recent") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "priceLow") {
      result.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (sortBy === "priceHigh") {
      result.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    } else if (sortBy === "discount") {
      result.sort((a, b) => {
        const dA = a.discount ? parseInt(a.discount) || 0 : 0;
        const dB = b.discount ? parseInt(b.discount) || 0 : 0;
        return dB - dA;
      });
    }

    return result;
  }, [favorites, activeTab, sortBy, priceRange, selectedCategories, selectedBrand, selectedStore]);

  const sortLabels: Record<SortOption, string> = {
    recent: "Recently Added",
    priceLow: "Price: Low → High",
    priceHigh: "Price: High → Low",
    discount: "Discount",
  };

  const filterTabs: { key: FilterTab; label: string; count: number; icon: any }[] = [
    { key: "all", label: "All Items", count: stats.total, icon: null },
    { key: "tops", label: "Tops", count: stats.tops, icon: Shirt },
    { key: "bottoms", label: "Bottoms", count: stats.bottoms, icon: RectangleHorizontal },
    { key: "dresses", label: "Dresses", count: stats.dresses, icon: Triangle },
    { key: "sale", label: "On Sale", count: stats.sale, icon: Flame },
  ];

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAF7F5] p-4 md:p-6 lg:p-8 font-sans w-full flex flex-col gap-6 pb-32 max-w-[1920px] mx-auto min-w-0 overflow-hidden">
      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#4A3D36] flex items-center gap-3">
            My Favorites
            <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-[#E74C5E] fill-[#E74C5E]" />
          </h1>
          <p className="text-sm text-[#8C7A70] mt-1">Your saved styles, ready when you are.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#EADDD7] bg-white text-[#4A3D36] text-xs font-bold hover:bg-[#FAF7F5] transition-colors self-start sm:self-auto shadow-sm">
          <Share2 className="w-3.5 h-3.5" />
          Share Wishlist
        </button>
      </motion.div>

      {/* ─── STATS BAR ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-0 bg-white rounded-2xl border border-[#EADDD7]/50 shadow-sm overflow-x-auto scrollbar-hide"
      >
        {[
          { icon: TrendingUp, value: stats.total, label: "Total Saved", color: "text-[#4A3D36]" },
          { icon: Shirt, value: stats.tops, label: "Tops", color: "text-[#C88576]" },
          { icon: RectangleHorizontal, value: stats.bottoms, label: "Bottoms", color: "text-[#4A3D36]" },
          { icon: Triangle, value: stats.dresses, label: "Dresses", color: "text-[#4A3D36]" },
          { icon: Flame, value: stats.sale, label: "On Sale", color: "text-emerald-600" },
        ].map((stat, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4 flex-1 min-w-[140px] border-r border-[#EADDD7]/30 last:border-r-0">
            <stat.icon className={`w-5 h-5 ${stat.color} shrink-0`} />
            <div>
              <div className="text-lg sm:text-xl font-bold text-[#4A3D36]">{stat.value}</div>
              <div className="text-[10px] sm:text-[11px] text-[#8C7A70] uppercase tracking-wider whitespace-nowrap">{stat.label}</div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ─── MAIN CONTENT (Grid + Sidebar) ───────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-6 min-w-0">
        {/* Left: Filters + Grid */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">
          {/* Filter pills + Sort */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            {/* Category pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.key
                      ? "bg-[#4A3D36] text-white shadow-md"
                      : "bg-white text-[#4A3D36] border border-[#EADDD7] hover:bg-[#FAF1F2]"
                  }`}
                >
                  {tab.icon && <tab.icon className="w-3 h-3" />}
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#EADDD7] bg-white text-xs font-semibold text-[#4A3D36] hover:bg-[#FAF7F5] transition-colors min-w-[160px] justify-between"
              >
                {sortLabels[sortBy]}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {isSortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 top-full mt-1 bg-white border border-[#EADDD7] rounded-xl shadow-lg z-20 min-w-[180px] overflow-hidden"
                  >
                    {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSortBy(key);
                          setIsSortOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${
                          sortBy === key
                            ? "bg-[#FAF1F2] text-[#C88576]"
                            : "text-[#4A3D36] hover:bg-[#FAF7F5]"
                        }`}
                      >
                        {sortLabels[key]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Product grid / Loading / Error / Empty */}
          {loading ? (
            /* Skeleton loading */
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#EADDD7]/30 overflow-hidden animate-pulse">
                  <div className="aspect-[3/4] bg-[#F0ECE9]" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-[#F0ECE9] rounded w-1/3" />
                    <div className="h-3 bg-[#F0ECE9] rounded w-full" />
                    <div className="h-4 bg-[#F0ECE9] rounded w-1/2 mt-2" />
                    <div className="h-8 bg-[#F0ECE9] rounded-xl w-full mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error state */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-[#FAF1F2] flex items-center justify-center mb-4">
                <Heart className="w-7 h-7 text-[#C88576]" />
              </div>
              <h3 className="text-lg font-bold text-[#4A3D36] mb-2">{error}</h3>
              <p className="text-sm text-[#8C7A70] mb-6">Something went wrong while loading your favorites.</p>
              <button
                onClick={loadFavorites}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#4A3D36] text-white text-sm font-bold hover:bg-[#3a2f2a] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </motion.div>
          ) : filteredFavorites.length === 0 && favorites.length === 0 ? (
            /* Empty state */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FAF1F2] to-[#EADDD7] flex items-center justify-center mb-5">
                <Heart className="w-9 h-9 text-[#C88576]" />
              </div>
              <h3 className="text-xl font-bold text-[#4A3D36] mb-2">No favorites yet</h3>
              <p className="text-sm text-[#8C7A70] mb-6 max-w-sm">
                Save outfits you love and find them here. Start exploring styles to build your collection.
              </p>
              <Link
                href="/recommendations"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C88576] text-white text-sm font-bold hover:bg-[#b97060] transition-colors shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                Explore Styles
              </Link>
            </motion.div>
          ) : filteredFavorites.length === 0 ? (
            /* No matches for current filter */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <p className="text-sm text-[#8C7A70] mb-4">No favorites match your current filters.</p>
              <button
                onClick={clearAllFilters}
                className="text-xs font-bold text-[#C88576] hover:text-[#b97060] transition-colors"
              >
                Clear All Filters
              </button>
            </motion.div>
          ) : (
            /* Product grid */
            <AnimatePresence mode="popLayout">
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {filteredFavorites.map((item, idx) => (
                  <FavoriteCard key={item.id} item={item} index={idx} onRemove={handleRemove} />
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>

        {/* Right sidebar (desktop/tablet) */}
        <div className="w-full xl:w-72 2xl:w-80 shrink-0 flex flex-col gap-5">
          {/* Filters */}
          <FavoritesFilters
            favorites={favorites}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            selectedBrand={selectedBrand}
            setSelectedBrand={setSelectedBrand}
            selectedStore={selectedStore}
            setSelectedStore={setSelectedStore}
            selectedSize={selectedSize}
            setSelectedSize={setSelectedSize}
            onClearAll={clearAllFilters}
          />

          {/* You Saved Summary */}
          {favorites.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#EADDD7]/50 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-[#4A3D36]">You Saved</h3>
                <Heart className="w-4 h-4 text-[#E74C5E] fill-[#E74C5E]" />
              </div>
              <div className="flex items-baseline gap-4">
                <div>
                  <div className="text-lg font-bold text-[#4A3D36]">₹{savingsSummary.totalMRP.toLocaleString("en-IN")}</div>
                  <div className="text-[10px] text-[#8C7A70]">Total MRP</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-600">₹{savingsSummary.totalSave.toLocaleString("en-IN")}</div>
                  <div className="text-[10px] text-[#8C7A70]">Total You Save</div>
                </div>
              </div>
            </div>
          )}

          {/* Price Drop Alerts */}
          <div className="bg-white rounded-2xl border border-[#EADDD7]/50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#4A3D36]">Price Drop Alerts</h3>
                <p className="text-[10px] text-[#8C7A70] mt-0.5">Get notified when items in your wishlist go on sale.</p>
              </div>
              <button
                onClick={() => setPriceDropAlerts(!priceDropAlerts)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${priceDropAlerts ? "bg-[#C88576]" : "bg-[#EADDD7]"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${priceDropAlerts ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TRUST BAR (Footer) ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 bg-white rounded-2xl border border-[#EADDD7]/50 p-4 sm:p-5 shadow-sm"
      >
        {[
          { icon: Bell, title: "Real-time Price Drops", desc: "We'll notify you instantly" },
          { icon: ShieldCheck, title: "100% Authentic Products", desc: "From trusted brands & stores" },
          { icon: Undo2, title: "Easy Returns", desc: "Hassle-free return policy" },
          { icon: Lock, title: "Secure Payments", desc: "Safe & encrypted checkout" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-[#FAF7F5] flex items-center justify-center shrink-0">
              <item.icon className="w-4 h-4 text-[#C88576]" />
            </div>
            <div>
              <div className="text-[11px] sm:text-xs font-bold text-[#4A3D36]">{item.title}</div>
              <div className="text-[9px] sm:text-[10px] text-[#8C7A70]">{item.desc}</div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

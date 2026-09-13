"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  Heart,
  ExternalLink,
  Loader2,
  Clock,
  Sparkles,
  Crown,
  Search,
  ArrowUpRight,
  Shirt,
  Layers,
  Sparkle,
  SlidersHorizontal,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TopNav from "@/components/dashboard/TopNav";
import Link from "next/link";
import { toast } from "sonner";
import { addFavorite, removeFavorite, fetchFavorites } from "@/lib/favoritesApi";

interface TryOnHistorySession {
  id: string;
  userImageUrl: string;
  clothingImageUrl: string;
  resultImageUrl: string;
  createdAt: string;
  clothingName?: string;
  clothingPrice?: string;
  clothingProductUrl?: string;
  clothingStore?: string;
  platform?: string;
  isSaved?: boolean;
}

type CategoryTab = "all" | "tops" | "outfits" | "traditional" | "outerwear";

const CATEGORY_TABS: { id: CategoryTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "tops", label: "Tops" },
  { id: "outfits", label: "Outfits" },
  { id: "traditional", label: "Traditional" },
  { id: "outerwear", label: "Outerwear" },
];

const decodeHtmlEntities = (str: string): string => {
  if (!str) return "";
  let decoded = str;
  for (let i = 0; i < 3; i++) {
    const prev = decoded;
    decoded = decoded
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;;?/g, "'")
      .replace(/&#39;;?/g, "'")
      .replace(/&#x2F;/g, "/")
      .replace(/&#96;/g, "`")
      .replace(/&apos;/g, "'");
    if (decoded === prev) break;
  }
  return decoded;
};

const categorizeItem = (item: TryOnHistorySession): "tops" | "outfits" | "traditional" | "outerwear" => {
  const text = `${item.clothingName || ""} ${item.clothingStore || ""} ${item.platform || ""}`.toLowerCase();

  if (
    text.includes("kurta") ||
    text.includes("kurti") ||
    text.includes("saree") ||
    text.includes("sari") ||
    text.includes("lehenga") ||
    text.includes("sherwani") ||
    text.includes("ethnic") ||
    text.includes("anarkali") ||
    text.includes("dhoti") ||
    text.includes("salwar") ||
    text.includes("chikankari")
  ) {
    return "traditional";
  }

  if (
    text.includes("jacket") ||
    text.includes("coat") ||
    text.includes("blazer") ||
    text.includes("hoodie") ||
    text.includes("cardigan") ||
    text.includes("sweater") ||
    text.includes("overshirt") ||
    text.includes("shrug") ||
    text.includes("bomber") ||
    text.includes("windbreaker")
  ) {
    return "outerwear";
  }

  if (
    text.includes("dress") ||
    text.includes("suit") ||
    text.includes("outfit") ||
    text.includes("jumpsuit") ||
    text.includes("combo") ||
    text.includes("set") ||
    text.includes("co-ord") ||
    text.includes("gown")
  ) {
    return "outfits";
  }

  return "tops";
};

const formatDateTime = (isoString?: string): string => {
  if (!isoString) return "Recently";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Recently";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Recently";
  }
};

export default function TryOnHistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<TryOnHistorySession[]>([]);
  const [favoriteProductIds, setFavoriteProductIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CategoryTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadHistoryAndFavorites = async () => {
    try {
      setLoading(true);
      const token =
        user && typeof (user as any).getIdToken === "function"
          ? await (user as any).getIdToken()
          : "";

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

      // 1. Fetch Try-on history
      const res = await fetch(`${apiUrl}/tryon/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const historyList: TryOnHistorySession[] = data.history || [];
        const decodedHistory = historyList.map((h) => ({
          ...h,
          clothingName: decodeHtmlEntities(h.clothingName || ""),
        }));
        setHistory(decodedHistory);
      }

      // 2. Fetch existing favorites to keep heart state synchronized
      try {
        const favs = await fetchFavorites();
        const favIds = new Set<string>(favs.map((f) => f.productId || f.id));
        setFavoriteProductIds(favIds);
      } catch (fErr) {
        console.warn("Favorites fetch skipped:", fErr);
      }
    } catch (err) {
      console.error("Failed to load try-on history:", err);
      toast.error("Failed to retrieve try-on history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadHistoryAndFavorites();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleBookNow = async (name: string, price: string, store: string, url: string) => {
    const storeLower = store.toLowerCase();
    let targetUrl = url || "";
    const lowercaseUrl = targetUrl.toLowerCase();

    const isGoogleRedirect =
      lowercaseUrl.includes("google.com") ||
      lowercaseUrl.includes("google.co.") ||
      !targetUrl.startsWith("http");

    if (isGoogleRedirect) {
      if (storeLower.includes("flipkart")) {
        targetUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(name)}`;
      } else if (storeLower.includes("amazon")) {
        targetUrl = `https://www.amazon.in/s?k=${encodeURIComponent(name)}`;
      } else if (storeLower.includes("myntra")) {
        targetUrl = `https://www.myntra.com/${encodeURIComponent(name)}`;
      } else if (storeLower.includes("ajio")) {
        targetUrl = `https://www.ajio.com/search/?text=${encodeURIComponent(name)}`;
      } else if (storeLower.includes("meesho")) {
        targetUrl = `https://www.meesho.com/search?q=${encodeURIComponent(name)}`;
      } else {
        targetUrl = `https://www.google.com/search?q=${encodeURIComponent(name + " " + store)}`;
      }
    }

    const newLowercaseUrl = targetUrl.toLowerCase();
    const isSearchOrCategory =
      newLowercaseUrl.includes("/search") ||
      newLowercaseUrl.includes("s?k=") ||
      newLowercaseUrl.includes("?q=") ||
      newLowercaseUrl.includes("?text=") ||
      (newLowercaseUrl.includes("myntra.com/") && !newLowercaseUrl.includes("/buy") && !newLowercaseUrl.includes("/p/")) ||
      (newLowercaseUrl.includes("ajio.com/") && !newLowercaseUrl.includes("/p/"));

    if (!isSearchOrCategory) {
      if (storeLower.includes("amazon")) {
        targetUrl = targetUrl + (targetUrl.includes("?") ? "&" : "?") + "tag=tryonx-21";
      } else if (storeLower.includes("flipkart")) {
        targetUrl = targetUrl + (targetUrl.includes("?") ? "&" : "?") + "affid=tryonx";
      } else if (storeLower.includes("myntra") || storeLower.includes("ajio")) {
        targetUrl = targetUrl + (targetUrl.includes("?") ? "&" : "?") + "utm_source=tryonx&utm_medium=affiliate";
      } else {
        targetUrl = targetUrl + (targetUrl.includes("?") ? "&" : "?") + "aff=tryonx";
      }
    }

    const newWindow = window.open(targetUrl, "_blank");
    if (!newWindow) {
      window.location.href = targetUrl;
      return;
    }

    try {
      const token =
        user && typeof (user as any).getIdToken === "function"
          ? await (user as any).getIdToken()
          : "";

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

      await fetch(`${apiUrl}/tryon/affiliate-click`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clothingName: name,
          clothingPrice: price,
          clothingStore: store,
          platform: store,
          productUrl: url,
        }),
      });
    } catch (err) {
      console.warn("Affiliate track call skipped:", err);
    }
  };

  const handleToggleFavorite = async (session: TryOnHistorySession) => {
    const isCurrentlySaved = session.isSaved || favoriteProductIds.has(session.id);
    const nextSavedState = !isCurrentlySaved;
    const itemName = session.clothingName || "Styled Outfit";

    // Optimistic UI updates
    setHistory((prev) =>
      prev.map((item) => (item.id === session.id ? { ...item, isSaved: nextSavedState } : item))
    );

    setFavoriteProductIds((prev) => {
      const next = new Set(prev);
      if (nextSavedState) next.add(session.id);
      else next.delete(session.id);
      return next;
    });

    try {
      const token =
        user && typeof (user as any).getIdToken === "function"
          ? await (user as any).getIdToken()
          : "";

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

      // 1. Update session bookmark
      await fetch(`${apiUrl}/tryon/history/${session.id}/save`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isSaved: nextSavedState }),
      });

      // 2. Sync with Favorites collection
      if (nextSavedState) {
        await addFavorite({
          productId: session.id,
          name: itemName,
          imageUrl: session.clothingImageUrl || session.resultImageUrl,
          price: session.clothingPrice || "₹499",
          store: session.clothingStore || session.platform || "Amazon",
          productUrl: session.clothingProductUrl || "",
          category: categorizeItem(session),
        });
        toast.success(`Saved "${itemName}" to Favorites! ❤️`);
      } else {
        await removeFavorite(session.id);
        toast.info(`Removed from Favorites.`);
      }
    } catch (err) {
      console.error("Save toggle failed:", err);
      toast.error("Could not update favorite state.");
    }
  };

  // Tab count calculations
  const tabCounts = useMemo(() => {
    const counts = { all: history.length, tops: 0, outfits: 0, traditional: 0, outerwear: 0 };
    history.forEach((item) => {
      const cat = categorizeItem(item);
      counts[cat]++;
    });
    return counts;
  }, [history]);

  // Filtered and searched items
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // Category filter
      if (activeTab !== "all") {
        const cat = categorizeItem(item);
        if (cat !== activeTab) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (item.clothingName || "").toLowerCase();
        const store = (item.clothingStore || item.platform || "").toLowerCase();
        const date = formatDateTime(item.createdAt).toLowerCase();
        if (!name.includes(q) && !store.includes(q) && !date.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [history, activeTab, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-8">
      {/* Top Search & Navigation Bar */}
      <TopNav />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#E8E0D8]/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1A1A1A] tracking-tight flex items-center gap-2.5 font-serif">
              Try-On History
              <span className="text-[#b95b6a] animate-pulse">✨</span>
            </h1>
          </div>
          <p className="text-[#6B6B6B] text-[13px] sm:text-[15px] font-normal leading-relaxed">
            Relive your looks &amp; shop your favorite styles again.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/try-on"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#b95b6a] text-white text-[13px] font-bold hover:bg-[#a84e5b] transition-all shadow-[0_4px_14px_rgba(185,91,106,0.25)] hover:shadow-[0_6px_20px_rgba(185,91,106,0.35)] active:scale-98 shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>New Try-On</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Filter Tabs & In-Page Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-2 sm:pb-0">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tabCounts[tab.id] || 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all duration-200 flex items-center gap-2 shrink-0 ${
                  isActive
                    ? "bg-[#FAF1F2] text-[#b95b6a] border border-[#b95b6a]/30 shadow-xs"
                    : "bg-white text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#FAF8F5] border border-[#E8E0D8]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-md font-mono ${
                    isActive
                      ? "bg-[#b95b6a]/15 text-[#b95b6a]"
                      : "bg-[#F5F0EB] text-[#888888]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9B9B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white border border-[#E8E0D8] text-[13px] text-[#1A1A1A] placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#C4727F] focus:ring-1 focus:ring-[#C4727F]/20 transition-all"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="min-h-[380px] flex flex-col items-center justify-center space-y-4 bg-white/60 backdrop-blur rounded-[24px] border border-[#E8E0D8]">
          <div className="w-12 h-12 rounded-full border-3 border-rose-400/20 border-t-[#b95b6a] animate-spin flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#b95b6a] animate-pulse" />
          </div>
          <p className="text-[13px] text-[#6B6B6B] font-medium tracking-wide">
            Loading your try-on collection...
          </p>
        </div>
      ) : filteredHistory.length === 0 ? (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] border border-[#E8E0D8] p-10 sm:p-14 text-center max-w-lg mx-auto shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-5"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#FAF1F2] border border-[#b95b6a]/20 flex items-center justify-center mx-auto text-[#b95b6a]">
            <Camera className="w-8 h-8" strokeWidth={1.8} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-[#1A1A1A] font-serif">
              {searchQuery || activeTab !== "all" ? "No matching try-ons found." : "No try-ons yet."}
            </h3>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed max-w-xs mx-auto">
              {searchQuery || activeTab !== "all"
                ? "Try clearing filters or searching with different keywords."
                : "Create your first look and it will appear here."}
            </p>
          </div>
          {searchQuery || activeTab !== "all" ? (
            <button
              onClick={() => {
                setActiveTab("all");
                setSearchQuery("");
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8E0D8] text-[13px] font-bold text-[#1A1A1A] hover:bg-[#F5F0EB] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          ) : (
            <Link
              href="/try-on"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#b95b6a] text-white text-[13px] font-bold hover:bg-[#a84e5b] transition-all shadow-[0_4px_14px_rgba(185,91,106,0.25)] hover:scale-102"
            >
              <span>Try Your First Look</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          )}
        </motion.div>
      ) : (
        /* History Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredHistory.map((session) => {
              const name = session.clothingName || "Custom Styled Outfit";
              const price = session.clothingPrice || "₹499";
              const store = session.clothingStore || session.platform || "Amazon";
              const isSaved = session.isSaved || favoriteProductIds.has(session.id);
              const dateStr = formatDateTime(session.createdAt);
              const displayImage = session.resultImageUrl || session.userImageUrl;
              const garmentImage = session.clothingImageUrl;

              return (
                <motion.div
                  key={session.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white rounded-[24px] overflow-hidden border border-[#E8E0D8] hover:border-[#b95b6a]/40 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(185,91,106,0.12)] transition-all duration-300 flex flex-col group"
                >
                  {/* Card Visual Hero */}
                  <div className="relative aspect-[3/4] bg-[#FAF8F5] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={displayImage}
                      alt={name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== garmentImage && garmentImage) {
                          target.src = garmentImage;
                        } else if (target.src !== session.userImageUrl && session.userImageUrl) {
                          target.src = session.userImageUrl;
                        }
                      }}
                    />

                    {/* Store Badge (Top-Left) */}
                    <div className="absolute top-3.5 left-3.5">
                      <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-[#E8E0D8] text-[11px] font-bold text-[#1A1A1A] tracking-wide uppercase shadow-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#b95b6a]"></span>
                        {store}
                      </span>
                    </div>

                    {/* Favorite Heart Button (Top-Right) */}
                    <button
                      onClick={() => handleToggleFavorite(session)}
                      className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-[#E8E0D8] flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xs group/fav z-10 cursor-pointer"
                      title={isSaved ? "Remove from Favorites" : "Add to Favorites"}
                    >
                      <Heart
                        className={`w-4 h-4 transition-colors ${
                          isSaved
                            ? "text-[#b95b6a] fill-[#b95b6a]"
                            : "text-[#6B6B6B] group-hover/fav:text-[#b95b6a]"
                        }`}
                      />
                    </button>

                    {/* Original Garment Inset Thumbnail (Bottom-Left) */}
                    {garmentImage && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-2 p-1.5 rounded-2xl bg-white/90 backdrop-blur-md border border-[#E8E0D8] shadow-sm max-w-[85%]">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shrink-0 border border-[#E8E0D8]/60">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={garmentImage}
                            alt="Original Garment"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (target.src !== displayImage && displayImage) {
                                target.src = displayImage;
                              }
                            }}
                          />
                        </div>
                        <div className="pr-1.5 overflow-hidden">
                          <p className="text-[9px] uppercase tracking-wider font-bold text-[#888888]">Garment</p>
                          <p className="text-[10px] font-bold text-[#1A1A1A] truncate">{store}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Metadata & Details */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      {/* Date & Time */}
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#888888]">
                        <Clock className="w-3 h-3 text-[#9B9B9B]" />
                        <span>{dateStr}</span>
                      </div>

                      {/* Product Name */}
                      <h3
                        className="text-[14px] font-bold text-[#1A1A1A] group-hover:text-[#b95b6a] transition-colors line-clamp-1"
                        title={name}
                      >
                        {name}
                      </h3>

                      {/* Price */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-[14px] font-extrabold text-[#1A1A1A]">{price}</span>
                        <span className="text-[10px] font-semibold text-[#888888] uppercase tracking-wide">
                          from {store}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E8E0D8]/70">
                      {/* Try Again Button */}
                      <Link
                        href={`/try-on?image=${encodeURIComponent(garmentImage || displayImage)}&name=${encodeURIComponent(name)}&store=${encodeURIComponent(store)}&platform=${encodeURIComponent(store.toLowerCase())}&productUrl=${encodeURIComponent(session.clothingProductUrl || "")}`}
                        className="py-2.5 px-3 rounded-xl bg-[#FAF1F2] hover:bg-[#F5E5E8] border border-[#b95b6a]/20 text-[#b95b6a] text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all text-center"
                        title="Re-open in Try-On Studio"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Try Again</span>
                      </Link>

                      {/* Shop Now Button */}
                      {session.clothingProductUrl ? (
                        <button
                          onClick={() => handleBookNow(name, price, store, session.clothingProductUrl!)}
                          className="py-2.5 px-3 rounded-xl bg-[#b95b6a] hover:bg-[#a84e5b] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_3px_10px_rgba(185,91,106,0.2)] active:scale-98 cursor-pointer"
                          title="Open Store Product Link"
                        >
                          <span>Shop Now</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBookNow(name, price, store, "")}
                          className="py-2.5 px-3 rounded-xl bg-[#b95b6a] hover:bg-[#a84e5b] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_3px_10px_rgba(185,91,106,0.2)] active:scale-98 cursor-pointer"
                          title="Search in Store"
                        >
                          <span>Shop Now</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Bottom Premium Banner */}
      <div className="mt-12 bg-gradient-to-r from-[#FAF1F2] via-white to-[#FDF8F0] border border-[#E8E0D8] rounded-[24px] p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#FFF9E6] border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shrink-0 shadow-xs">
            <Crown className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1A] font-serif">
                Upgrade to MITYRA Premium
              </h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#996515] border border-[#D4AF37]/30">
                PRO
              </span>
            </div>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed max-w-xl">
              Unlock unlimited high-resolution virtual try-ons, multi-garment outfit layering, and instant checkout discounts.
            </p>
          </div>
        </div>

        <Link
          href="/pricing"
          className="px-6 py-3.5 rounded-xl bg-[#b95b6a] text-white text-[13px] font-bold hover:bg-[#a84e5b] transition-all shadow-[0_4px_14px_rgba(185,91,106,0.25)] hover:scale-102 active:scale-98 shrink-0 flex items-center gap-2"
        >
          <span>Upgrade to Pro</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

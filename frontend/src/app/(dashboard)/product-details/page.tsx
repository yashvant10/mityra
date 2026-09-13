"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
  Heart,
  ExternalLink,
  Camera,
  Sparkles,
  ArrowLeft,
  Star,
  ShieldCheck,
  Truck,
  RefreshCw,
  ShoppingBag,
  Palette,
  Layers,
  Calendar,
  Lightbulb,
  Share2,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { addFavorite, removeFavorite, checkFavorite } from "@/lib/favoritesApi";
import { toast } from "sonner";

// Store badge colors & branding
const storeBadges: Record<string, { bg: string; text: string; label: string; accent: string }> = {
  myntra: { bg: "bg-[#FF3F6C]", text: "text-white", label: "Myntra", accent: "#FF3F6C" },
  amazon: { bg: "bg-[#FF9900]", text: "text-white", label: "Amazon", accent: "#FF9900" },
  flipkart: { bg: "bg-[#2874F0]", text: "text-white", label: "Flipkart", accent: "#2874F0" },
  ajio: { bg: "bg-[#1A1A2E]", text: "text-white", label: "AJIO", accent: "#1A1A2E" },
  meesho: { bg: "bg-[#570A57]", text: "text-white", label: "Meesho", accent: "#570A57" },
};

interface ProductData {
  id?: string;
  name: string;
  brand?: string;
  price?: string;
  originalPrice?: string;
  discount?: string;
  imageUrl: string;
  store: string;
  productUrl: string;
  rating?: number;
  reviews?: number;
  category?: string;
  gender?: string;
}

function ProductDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // Parse product from URL query params
  const product: ProductData = useMemo(() => {
    return {
      id: searchParams.get("id") || `prod_fallback_id`,
      name: searchParams.get("name") || "Curated Fashion Look",
      brand: searchParams.get("brand") || undefined,
      price: searchParams.get("price") || undefined,
      originalPrice: searchParams.get("originalPrice") || undefined,
      discount: searchParams.get("discount") || undefined,
      imageUrl: searchParams.get("image") || searchParams.get("imageUrl") || "",
      store: (searchParams.get("store") || searchParams.get("platform") || "amazon").toLowerCase(),
      productUrl: searchParams.get("url") || searchParams.get("productUrl") || "",
      rating: searchParams.get("rating") ? parseFloat(searchParams.get("rating")!) : 4.5,
      reviews: searchParams.get("reviews") ? parseInt(searchParams.get("reviews")!, 10) : 320,
      category: searchParams.get("category") || "tops",
      gender: searchParams.get("gender") || "unisex",
    };
  }, [searchParams]);

  // Favorites state
  const [isSaved, setIsSaved] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Premium VTO Gate State
  const { balance, loading: walletLoading } = useWallet();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Similar Products state
  const [similarProducts, setSimilarProducts] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if product is favorited on load
  useEffect(() => {
    if (user && product.imageUrl) {
      const prodKey = product.id || `p_${product.name.slice(0, 20).replace(/\s/g, "_")}_${product.store}`;
      checkFavorite(prodKey)
        .then((res) => {
          setIsSaved(res.isFavorited);
          setFavoriteId(res.favoriteId);
        })
        .catch((err) => console.warn("Check favorite failed:", err));
    }
  }, [user, product]);

  // Fetch Similar Products from RapidAPI
  useEffect(() => {
    async function fetchSimilar() {
      try {
        setLoadingSimilar(true);
        const token = user && typeof (user as any).getIdToken === "function"
          ? await (user as any).getIdToken()
          : "";

        // Query based on product name or brand
        const queryTerms = (product.brand ? `${product.brand} ` : "") + (product.category || "fashion");
        const genderParam = product.gender === "female" ? "female" : "male";
        const storeParam = product.store || "amazon";

        const res = await fetch(
          `${API_URL}/tryon/products?store=${storeParam}&gender=${genderParam}&q=${encodeURIComponent(queryTerms)}&limit=8`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.ok) {
          const data = await res.json();
          const filtered = (data.products || []).filter(
            (p: any) => (p.imageUrl || p.image) && p.name !== product.name
          );
          setSimilarProducts(filtered.slice(0, 4));
        }
      } catch (e) {
        console.error("Failed to load similar products", e);
      } finally {
        setLoadingSimilar(false);
      }
    }

    if (product.name) {
      fetchSimilar();
    }
  }, [product, user, API_URL]);

  // Favorite toggle handler
  const handleToggleFavorite = async () => {
    try {
      setIsSaving(true);
      if (isSaved && favoriteId) {
        await removeFavorite(favoriteId);
        setIsSaved(false);
        setFavoriteId(null);
        toast.success("Removed from Favorites");
      } else {
        const prodKey = product.id || `p_${product.name.slice(0, 20).replace(/\s/g, "_")}_${product.store}`;
        const newFav = await addFavorite({
          productId: prodKey,
          name: product.name,
          brand: product.brand || null,
          price: product.price || null,
          originalPrice: product.originalPrice || null,
          discount: product.discount || null,
          imageUrl: product.imageUrl,
          store: product.store,
          productUrl: product.productUrl,
          category: product.category || "tops",
        });
        setIsSaved(true);
        setFavoriteId(newFav.id);
        toast.success("Saved to Favorites ❤️");
      }
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setIsSaved(true);
        toast.info("Already in your favorites");
      } else {
        toast.error("Could not update favorites");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const badge = storeBadges[product.store] || {
    bg: "bg-[#4A3D36]",
    text: "text-white",
    label: product.store.toUpperCase(),
    accent: "#4A3D36",
  };

  // Pricing clean formatting
  const currentPriceFormatted = product.price
    ? (product.price.startsWith("₹") ? product.price : `₹${product.price}`)
    : "Check Store";
  const originalPriceFormatted = product.originalPrice
    ? (product.originalPrice.startsWith("₹") ? product.originalPrice : `₹${product.originalPrice}`)
    : null;

  return (
    <div className="min-h-screen bg-[#FAF7F5] p-4 sm:p-6 lg:p-10 font-sans w-full max-w-[1600px] mx-auto min-w-0 flex flex-col gap-10 pb-32">
      {/* ─── Breadcrumb & Navigation ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4 border-b border-[#EADDD7]/60 pb-4"
      >
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#4A3D36] hover:text-[#b95b6a] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Explore
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#EADDD7] bg-white text-xs font-semibold text-[#4A3D36] hover:bg-[#FAF1F2] transition-colors shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Share"}</span>
          </button>
        </div>
      </motion.div>

      {/* ─── Main Product Showcase (Side-by-Side on Desktop) ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Product Image Gallery */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-6 2xl:col-span-5 flex flex-col gap-4"
        >
          <div className="relative aspect-[3/4] bg-white rounded-3xl overflow-hidden border border-[#EADDD7]/70 shadow-[0_4px_24px_rgba(0,0,0,0.04)] group">
            {/* Store Badge */}
            <div className={`absolute top-4 left-4 z-10 ${badge.bg} ${badge.text} text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 uppercase tracking-wider`}>
              <span>{badge.label}</span>
            </div>

            {/* Discount Badge */}
            {product.discount && (
              <div className="absolute top-4 right-4 z-10 bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-md">
                {product.discount}
              </div>
            )}

            {/* Product Image */}
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAF8F5] text-[#8C7A70] gap-2">
                <ShoppingBag className="w-10 h-10 stroke-1" />
                <span className="text-xs">No image available</span>
              </div>
            )}

            {!imageLoaded && product.imageUrl && (
              <div className="absolute inset-0 bg-[#F0ECE9] animate-pulse" />
            )}
          </div>

          {/* Quick Assurance Badges */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-white/80 rounded-2xl border border-[#EADDD7]/40 p-3 text-center flex flex-col items-center gap-1 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-[#C88576]" />
              <span className="text-[10px] font-bold text-[#4A3D36]">100% Authentic</span>
            </div>
            <div className="bg-white/80 rounded-2xl border border-[#EADDD7]/40 p-3 text-center flex flex-col items-center gap-1 shadow-sm">
              <Truck className="w-4 h-4 text-[#C88576]" />
              <span className="text-[10px] font-bold text-[#4A3D36]">Fast Delivery</span>
            </div>
            <div className="bg-white/80 rounded-2xl border border-[#EADDD7]/40 p-3 text-center flex flex-col items-center gap-1 shadow-sm">
              <RefreshCw className="w-4 h-4 text-[#C88576]" />
              <span className="text-[10px] font-bold text-[#4A3D36]">Easy Returns</span>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Product Info & Actions */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="lg:col-span-6 2xl:col-span-7 flex flex-col gap-6"
        >
          {/* Brand & Title */}
          <div>
            {product.brand && (
              <span className="inline-block text-xs font-bold text-[#C88576] uppercase tracking-widest mb-1.5">
                {product.brand}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#4A3D36] font-heading leading-tight mb-3">
              {product.name}
            </h1>

            {/* Ratings & Platform */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-[#8C7A70]">
              <div className="flex items-center gap-1 bg-[#FAF1F2] px-2.5 py-1 rounded-lg text-[#b95b6a] font-bold">
                <Star className="w-3.5 h-3.5 fill-[#b95b6a] text-[#b95b6a]" />
                <span>{product.rating}</span>
                <span className="text-[#8C7A70] font-normal">({product.reviews?.toLocaleString()} reviews)</span>
              </div>
              <span>•</span>
              <span className="capitalize font-semibold text-[#4A3D36]">Available on {badge.label}</span>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="bg-white rounded-2xl border border-[#EADDD7]/60 p-5 shadow-sm flex items-baseline gap-4 flex-wrap">
            <span className="text-3xl sm:text-4xl font-bold text-[#4A3D36]">
              {currentPriceFormatted}
            </span>
            {originalPriceFormatted && originalPriceFormatted !== currentPriceFormatted && (
              <span className="text-base sm:text-lg text-[#A69B95] line-through">
                {originalPriceFormatted}
              </span>
            )}
            {product.discount && (
              <span className="text-xs sm:text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                Save {product.discount}
              </span>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {/* Try On Button (Primary) */}
            <button
              onClick={(e) => {
                e.preventDefault();
                if (!walletLoading && (balance === null || balance <= 0)) {
                  setShowUpgradeModal(true);
                } else {
                  router.push(`/try-on?platform=${product.store}&image=${encodeURIComponent(product.imageUrl)}&name=${encodeURIComponent(product.name)}&url=${encodeURIComponent(product.productUrl || "")}`);
                }
              }}
              className="flex-1 inline-flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-[#4A3D36] text-white text-sm sm:text-base font-bold hover:bg-[#3a2f2a] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <Camera className="w-5 h-5 text-[#C88576]" />
              <span>Try On Virtually</span>
              <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
            </button>

            {/* Shop Now Button (Merchant link) */}
            {product.productUrl && (
              <a
                href={product.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-[#b95b6a] text-white text-sm sm:text-base font-bold hover:bg-[#a84e5b] shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
              >
                <span>Shop on {badge.label}</span>
                <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            )}

            {/* Save / Favorite Button */}
            <button
              onClick={handleToggleFavorite}
              disabled={isSaving}
              className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-center gap-2 ${
                isSaved
                  ? "bg-[#FAF1F2] border-[#b95b6a]/30 text-[#b95b6a] shadow-sm"
                  : "bg-white border-[#EADDD7] text-[#4A3D36] hover:bg-[#FAF7F5]"
              }`}
              title={isSaved ? "Saved to Favorites" : "Save to Favorites"}
            >
              <motion.div
                whileTap={{ scale: 1.3 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Heart className={`w-5 h-5 ${isSaved ? "fill-[#b95b6a] text-[#b95b6a]" : "text-[#4A3D36]"}`} />
              </motion.div>
              <span className="text-sm font-bold hidden sm:inline">
                {isSaved ? "Saved" : "Save"}
              </span>
            </button>
          </div>

          {/* ─── AI Style Insight ("Why this look suits you ✨") ────────────── */}
          <div className="bg-gradient-to-br from-white to-[#FAF7F5] rounded-3xl border border-[#EADDD7]/80 p-6 shadow-sm flex flex-col gap-4 mt-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#b95b6a]" />
              <h3 className="text-base sm:text-lg font-bold text-[#4A3D36] font-heading">
                Why this look suits you ✨
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#8C7A70] leading-relaxed">
              Curated by MITYRA stylist engines based on balanced silhouettes and versatile styling.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-white/90 rounded-2xl border border-[#EADDD7]/50 p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FAF1F2] flex items-center justify-center shrink-0">
                  <Palette className="w-4 h-4 text-[#b95b6a]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#4A3D36]">Color Harmony</h4>
                  <p className="text-[11px] text-[#8C7A70] mt-0.5">Versatile palette that pairs effortlessly with neutral layers.</p>
                </div>
              </div>

              <div className="bg-white/90 rounded-2xl border border-[#EADDD7]/50 p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FAF1F2] flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 text-[#b95b6a]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#4A3D36]">Fit & Silhouette</h4>
                  <p className="text-[11px] text-[#8C7A70] mt-0.5">Tailored cut designed for all-day comfort and sharp aesthetics.</p>
                </div>
              </div>

              <div className="bg-white/90 rounded-2xl border border-[#EADDD7]/50 p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FAF1F2] flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-[#b95b6a]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#4A3D36]">Best Occasion</h4>
                  <p className="text-[11px] text-[#8C7A70] mt-0.5">Everyday casual, semi-formal meetings & weekend outings.</p>
                </div>
              </div>

              <div className="bg-white/90 rounded-2xl border border-[#EADDD7]/50 p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FAF1F2] flex items-center justify-center shrink-0">
                  <Lightbulb className="w-4 h-4 text-[#b95b6a]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#4A3D36]">Stylist Tip</h4>
                  <p className="text-[11px] text-[#8C7A70] mt-0.5">Pair with slim-fit trousers or dark denim for a balanced look.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ─── Similar Looks (Live RapidAPI Integration) ──────────────────────── */}
      <div className="flex flex-col gap-6 pt-6 border-t border-[#EADDD7]/70">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#4A3D36] font-heading flex items-center gap-2">
              Similar Looks <Sparkles className="w-4 h-4 text-[#C88576]" />
            </h2>
            <p className="text-xs sm:text-sm text-[#8C7A70] mt-0.5">
              Explore real related pieces from top stores.
            </p>
          </div>
        </div>

        {loadingSimilar ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#EADDD7]/40 overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-[#F0ECE9]" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-[#F0ECE9] rounded w-1/3" />
                  <div className="h-3 bg-[#F0ECE9] rounded w-full" />
                  <div className="h-4 bg-[#F0ECE9] rounded w-1/2 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : similarProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {similarProducts.map((p, idx) => (
              <motion.div
                key={p.id || idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-2xl border border-[#EADDD7]/50 shadow-sm overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                onClick={() => {
                  router.push(
                    `/product-details?name=${encodeURIComponent(p.name)}&image=${encodeURIComponent(p.imageUrl || p.image)}&price=${encodeURIComponent(p.price || "")}&originalPrice=${encodeURIComponent(p.originalPrice || "")}&discount=${encodeURIComponent(p.discount || "")}&store=${encodeURIComponent(p.store || p.platform || "amazon")}&url=${encodeURIComponent(p.productUrl || "")}&brand=${encodeURIComponent(p.brand || "")}`
                  );
                }}
              >
                <div className="relative aspect-[3/4] bg-[#F5F2F0] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imageUrl || p.image}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-bold text-[#4A3D36] capitalize">
                    {p.store || p.platform || "Store"}
                  </div>
                </div>

                <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                  <div>
                    {p.brand && <div className="text-[10px] font-bold text-[#8C7A70] uppercase">{p.brand}</div>}
                    <h4 className="text-xs font-semibold text-[#4A3D36] line-clamp-1 leading-snug">
                      {p.name}
                    </h4>
                    <div className="text-xs font-bold text-[#4A3D36] mt-1">
                      {p.price || "Check Price"}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!walletLoading && (balance === null || balance <= 0)) {
                        setShowUpgradeModal(true);
                      } else {
                        router.push(`/try-on?platform=${(p.store || p.platform || "amazon").toLowerCase()}&image=${encodeURIComponent(p.imageUrl || p.image)}&name=${encodeURIComponent(p.name)}&url=${encodeURIComponent(p.productUrl || p.url || "")}`);
                      }
                    }}
                    className="w-full text-center py-2 bg-[#FAF8F5] border border-[#EADDD7] rounded-xl text-[11px] font-bold text-[#4A3D36] hover:bg-[#FAF1F2] hover:text-[#b95b6a] transition-colors"
                  >
                    Try On →
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-[#8C7A70] bg-white rounded-2xl border border-dashed border-[#EADDD7]">
            No similar styles found for this item right now.
          </div>
        )}
      </div>

      {/* ─── Premium VTO Gate Modal ─── */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#FAF8F5] text-[#8C7A70] hover:bg-[#F0ECE9] hover:text-[#4A3D36] transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FAF1F2] to-[#F5E6D8] flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#EADDD7]/50">
                  <Sparkles className="w-8 h-8 text-[#b95b6a]" />
                </div>
                
                <h3 className="text-2xl font-bold text-[#4A3D36] font-heading mb-3">
                  Premium Feature
                </h3>
                
                <p className="text-sm text-[#8C7A70] mb-8 leading-relaxed">
                  Virtual Try-On is available with Premium. Upgrade your plan to see how this outfit looks on you!
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => router.push(`/pricing?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                    className="w-full py-4 rounded-2xl bg-[#b95b6a] text-white font-bold hover:bg-[#a84e5b] shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    View Premium Plans
                  </button>
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="w-full py-4 rounded-2xl bg-[#FAF8F5] text-[#4A3D36] font-bold hover:bg-[#F0ECE9] transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FAF7F5]">
          <div className="text-center flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#b95b6a] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-[#8C7A70]">Loading look details...</p>
          </div>
        </div>
      }
    >
      <ProductDetailsContent />
    </Suspense>
  );
}

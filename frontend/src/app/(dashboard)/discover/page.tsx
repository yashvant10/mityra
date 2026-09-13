"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Search, SlidersHorizontal, ChevronDown, Filter, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TopNav from "@/components/dashboard/TopNav";
import ProductCard from "@/components/shared/ProductCard";
import { GridSkeleton, ErrorState, EmptyState } from "@/components/shared/LoadingStates";
import { fetchWithRetry, normalizeProduct, debounce, NormalizedProduct } from "@/lib/fetchUtils";

import { Suspense } from "react";

function DiscoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  // Get initial state from URL or use defaults
  const initialQuery = searchParams.get("q") || "";
  const initialStore = searchParams.get("store") || "amazon";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedProducts, setDisplayedProducts] = useState<NormalizedProduct[]>([]);
  const [credits, setCredits] = useState(0);

  // Filters state
  const [selectedGender, setSelectedGender] = useState("male");
  const [selectedStore, setSelectedStore] = useState(initialStore);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedColor, setSelectedColor] = useState("all");
  const [selectedPrice, setSelectedPrice] = useState("all");

  const stores = ["amazon", "myntra", "flipkart", "ajio"];
  const genders = ["male", "female"];
  const categories = ["all", "tshirts", "shirts", "jeans", "dresses", "jackets", "ethnic"];
  const colors = ["all", "black", "white", "blue", "red", "green", "pink"];
  const prices = [
    { id: "all", label: "Any Price" },
    { id: "under1000", label: "Under ₹1000" },
    { id: "1000-2000", label: "₹1000 - ₹2000" },
    { id: "over2000", label: "Over ₹2000" }
  ];

  // Sync URL when search or store changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set("q", debouncedQuery);
    if (selectedStore) params.set("store", selectedStore);
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [debouncedQuery, selectedStore, router]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch data
  const fetchProducts = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const token = typeof (user as any).getIdToken === "function" ? await (user as any).getIdToken() : "";
      
      let q = debouncedQuery || "trending fashion";
      if (selectedColor !== "all") q += ` ${selectedColor}`;
      if (selectedPrice === "under1000") q += " under 1000";
      if (selectedPrice === "1000-2000") q += " 1000 to 2000";
      
      let url = `${API_URL}/tryon/products?store=${selectedStore}&gender=${selectedGender}&q=${encodeURIComponent(q)}&limit=20`;
      if (selectedCategory !== "all") {
        url += `&category=${encodeURIComponent(selectedCategory)}`;
      }
      
      const data = await fetchWithRetry(url, {
        headers: { Authorization: `Bearer ${token}` }
      }, 1, 1000);

      if (data.error) {
        setError(data.error);
        setDisplayedProducts([]);
        return;
      }

      const products = (data.products || []).filter((p: any) => p.imageUrl || p.image);
      setDisplayedProducts(products.map((p: any) => normalizeProduct(p, selectedStore)));
    } catch (err: any) {
      console.error("[Discover API Error]:", err);
      setError(err.message || "Failed to load products");
    } finally {
      setIsLoading(false);
    }
  }, [user, debouncedQuery, selectedStore, selectedGender, selectedCategory, selectedColor, selectedPrice, API_URL]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    // Fetch credits for topnav
    const fetchCredits = async () => {
      if (!user) return;
      try {
        const token = typeof (user as any).getIdToken === "function" ? await (user as any).getIdToken() : "";
        const res = await fetch(`${API_URL}/payments/user-analytics`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setCredits(data.currentCredits || 0);
        }
      } catch (e) {}
    };
    fetchCredits();
  }, [user, API_URL]);

  return (
    <div className="flex-1 flex flex-col items-center">
      <div className="w-full max-w-[1400px]">
        <TopNav />

        <div className="px-4 sm:px-8 pb-12 space-y-8 mt-4">
          
          {/* Header & Search */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-2">
            <div>
              <h1 className="text-[32px] font-bold text-[#1A1A1A] font-heading">Discover</h1>
              <p className="text-[14px] text-[#6B6B6B] mt-1">Explore curated fashion pieces across all stores.</p>
            </div>
            
            <div className="w-full md:w-[400px] relative flex items-center">
              <Search className="absolute left-4 text-[#9B9B9B] w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search for 'Summer dresses'..." 
                className="w-full bg-white border border-[#E8E0D8] rounded-full py-3.5 pl-12 pr-4 text-[14px] focus:outline-none focus:border-[#C4727F] focus:ring-4 focus:ring-[#C4727F]/10 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                className={`absolute right-2 p-2 rounded-full transition-colors ${isFilterOpen ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F0EB] text-[#1A1A1A] hover:bg-[#E8E0D8]'}`}
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                {isFilterOpen ? <X className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Filter Panel (Animated) */}
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#E8E0D8] mb-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Store Filter */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#6B6B6B] uppercase tracking-wider mb-3">Platform</label>
                    <div className="flex flex-wrap gap-2">
                      {stores.map(store => (
                        <button 
                          key={store}
                          onClick={() => setSelectedStore(store)}
                          className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors capitalize ${selectedStore === store ? 'bg-[#1A1A1A] text-white' : 'bg-[#FAF8F5] text-[#1A1A1A] hover:bg-[#E8E0D8]'}`}
                        >
                          {store}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gender Filter */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#6B6B6B] uppercase tracking-wider mb-3">Gender</label>
                    <div className="flex flex-wrap gap-2">
                      {genders.map(gender => (
                        <button 
                          key={gender}
                          onClick={() => setSelectedGender(gender)}
                          className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors capitalize ${selectedGender === gender ? 'bg-[#b95b6a] text-white' : 'bg-[#FAF8F5] text-[#1A1A1A] hover:bg-[#E8E0D8]'}`}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#6B6B6B] uppercase tracking-wider mb-3">Category</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <button 
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors capitalize ${selectedCategory === cat ? 'bg-[#1A1A1A] text-white' : 'bg-[#FAF8F5] text-[#1A1A1A] hover:bg-[#E8E0D8]'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Filter */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#6B6B6B] uppercase tracking-wider mb-3">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map(col => (
                        <button 
                          key={col}
                          onClick={() => setSelectedColor(col)}
                          className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors capitalize ${selectedColor === col ? 'bg-[#1A1A1A] text-white' : 'bg-[#FAF8F5] text-[#1A1A1A] hover:bg-[#E8E0D8]'}`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Filter */}
                  <div className="sm:col-span-2">
                    <label className="block text-[12px] font-bold text-[#6B6B6B] uppercase tracking-wider mb-3">Price Range</label>
                    <div className="flex flex-wrap gap-2">
                      {prices.map(price => (
                        <button 
                          key={price.id}
                          onClick={() => setSelectedPrice(price.id)}
                          className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors capitalize ${selectedPrice === price.id ? 'bg-[#1A1A1A] text-white' : 'bg-[#FAF8F5] text-[#1A1A1A] hover:bg-[#E8E0D8]'}`}
                        >
                          {price.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Grid */}
          <div className="w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[18px] font-bold text-[#1A1A1A] font-heading flex items-center gap-2">
                {isLoading && debouncedQuery && <span className="w-3 h-3 rounded-full border-2 border-[#b95b6a] border-t-transparent animate-spin" />}
                {isLoading ? "Searching..." : debouncedQuery ? `Results for "${debouncedQuery}"` : "Top Recommendations"}
              </h2>
            </div>

            {error ? (
              <ErrorState message={error} onRetry={fetchProducts} />
            ) : isLoading ? (
              <GridSkeleton count={12} columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" />
            ) : displayedProducts.length === 0 ? (
              <EmptyState 
                title="No items found" 
                subtitle="Try adjusting your filters or search terms." 
                actionLabel="Clear all filters" 
                onAction={() => {
                  setSearchQuery("");
                  setSelectedStore("amazon");
                }} 
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6 stagger-fade-in">
                {displayedProducts.map((product, idx) => (
                  <ProductCard 
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    imageUrl={product.imageUrl}
                    platform={product.platform}
                    price={product.price}
                    productUrl={product.productUrl}
                    rating={product.rating}
                    reviews={product.reviews}
                    index={idx}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading discover...</div>}>
      <DiscoverContent />
    </Suspense>
  );
}

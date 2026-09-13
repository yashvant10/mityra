"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { ChevronRight, ChevronLeft, Sparkles, TrendingUp, AlertCircle, RefreshCcw, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TopNav from "@/components/dashboard/TopNav";

// Reusing helper functions from Dashboard
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

const fetchWithRetry = async (url: string, options: any = {}, retries = 2, backoff = 1000): Promise<any> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }

      if (res.status === 429) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, backoff));
          backoff *= 2;
          continue;
        }
      }
      throw new Error(`API Error: ${res.status}`);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, backoff));
        backoff *= 2;
        continue;
      }
      throw err;
    }
  }
};

interface TrendingOutfit {
  id: string;
  name: string;
  imageUrl: string;
  platform: string;
  price: string;
  productUrl: string;
  rating?: number | null;
  reviews?: number | null;
  brand?: string | null;
}

const normalizeProduct = (p: any, defaultStore: string = "Platform"): TrendingOutfit => {
  return {
    id: p.id || `prod_${Math.random()}`,
    name: decodeHtmlEntities(p.name || p.title || ""),
    imageUrl: p.imageUrl || p.image || "",
    platform: p.platform || p.store || defaultStore,
    price: p.price || null,
    productUrl: p.productUrl || p.url || "",
    rating: p.rating || null,
    reviews: p.reviews || p.num_ratings || null,
    brand: p.brand || null,
  };
};

export default function TrendsPage() {
  const { user } = useAuth();
  
  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
  
  const [activeFilter, setActiveFilter] = useState("For You");
  const [activeTimeFilter, setActiveTimeFilter] = useState("This Week");
  
  const [trendingNow, setTrendingNow] = useState<TrendingOutfit[]>([]);
  const [loadingTrend, setLoadingTrend] = useState<boolean>(true);
  const [errorTrend, setErrorTrend] = useState<string | null>(null);
  
  const [topBrands, setTopBrands] = useState<string[]>([]);
  const [popularColors, setPopularColors] = useState<string[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<string[]>([]);

  const fetchingTrendRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const fetchCredits = useCallback(async () => {
      try {
          const token = user && typeof (user as any).getIdToken === "function" ? await (user as any).getIdToken() : "";
          const res = await fetch(`${API_URL}/payments/user-analytics`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
              const data = await res.json();
              setCreditsRemaining(data?.currentCredits || 0);
          }
      } catch (err) {}
  }, [user, API_URL]);

  const fetchTrendingData = useCallback(async () => {
    if (fetchingTrendRef.current) return;
    fetchingTrendRef.current = true;
    setLoadingTrend(true);
    setErrorTrend(null);
    
    try {
      const token = user && typeof (user as any).getIdToken === "function" ? await (user as any).getIdToken() : "";
      
      // Determine query based on filter
      let query = "trending fashion";
      if (activeFilter === "Men") query = "trending mens fashion";
      else if (activeFilter === "Women") query = "trending womens fashion";
      else if (activeFilter === "Indian Wear") query = "trending ethnic wear india";
      else if (activeFilter === "Streetwear") query = "trending streetwear outfit";
      else if (activeFilter === "Seasonal") query = "trending seasonal fashion";
      else if (activeFilter === "Global") query = "global fashion trends";
      else if (activeFilter === "For You") {
        query = "trending luxury fashion"; // Fallback if no profile
        try {
          const pRes = await fetch(`${API_URL}/users/profile`, { headers: { Authorization: `Bearer ${token}` } });
          if (pRes.ok) {
            const pData = await pRes.json();
            const prefs = pData?.profile?.stylePreferences || {};
            const gender = prefs.gender?.toLowerCase() || "male";
            const styles = prefs.preferredStyles?.length ? prefs.preferredStyles.join(" ") : "casual";
            query = `trending ${gender} ${styles} outfit`.trim();
          }
        } catch(e) {}
      }

      // Parallel fetching from multiple stores for robustness
      const stores = ["amazon", "myntra", "ajio", "flipkart"];
      const storefetches = stores.map(store => 
        fetchWithRetry(`${API_URL}/tryon/products?store=${store}&gender=male&q=${encodeURIComponent(query)}&limit=4`, {
          headers: { Authorization: `Bearer ${token}` }
        }, 1, 500).catch(() => ({ products: [] }))
      );
      
      const results = await Promise.all(storefetches);
      const mergedProducts = results.flatMap(r => (r.products || []).filter((p: any) => p.imageUrl || p.image));
      
      if (mergedProducts.length === 0) throw new Error("Trending API unavailable or no products found");
      
      const normalized = mergedProducts.map((p: any) => normalizeProduct(p));
      // Deduplicate by name
      const uniqueProducts: TrendingOutfit[] = [];
      const seen = new Set();
      for (const p of normalized) {
        if (!seen.has(p.name)) {
          seen.add(p.name);
          uniqueProducts.push(p);
        }
      }
      
      setTrendingNow(uniqueProducts.slice(0, 10));

      // Extract brands dynamically from results
      const brandsMap = new Map<string, number>();
      uniqueProducts.forEach(p => {
        if (p.brand) {
          brandsMap.set(p.brand, (brandsMap.get(p.brand) || 0) + 1);
        } else if (p.name) {
            const firstWord = p.name.split(" ")[0];
            if (firstWord && firstWord[0] === firstWord[0].toUpperCase() && firstWord.length > 2) {
                brandsMap.set(firstWord, (brandsMap.get(firstWord) || 0) + 1);
            }
        }
      });
      const extractedBrands = Array.from(brandsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(b => b[0]);
      
      setTopBrands(extractedBrands.length > 0 ? extractedBrands : ["Zara", "H&M", "Uniqlo", "Nike", "Adidas"]);

      // Extract popular colors naively or use defaults if not found
      const extractedColors = new Set<string>();
      const colorKeywords = ["black", "white", "olive", "beige", "navy", "red", "blue", "green", "brown", "pink", "grey"];
      const cssColors: Record<string, string> = {
          "black": "#1F2937", "white": "#F9FAFB", "olive": "#4B5320", "beige": "#F5F5DC", 
          "navy": "#000080", "red": "#EF4444", "blue": "#3B82F6", "green": "#10B981",
          "brown": "#8B4513", "pink": "#F472B6", "grey": "#9CA3AF"
      };
      
      uniqueProducts.forEach(p => {
          const titleLower = p.name.toLowerCase();
          colorKeywords.forEach(c => {
              if (titleLower.includes(c)) extractedColors.add(cssColors[c]);
          });
      });
      const finalColors = Array.from(extractedColors).slice(0, 6);
      if (finalColors.length < 6) {
          const defaultColors = ["#4B5320", "#D2B48C", "#1F2937", "#1E3A8A", "#9CA3AF", "#F472B6"];
          for (const c of defaultColors) {
              if (finalColors.length >= 6) break;
              if (!finalColors.includes(c)) finalColors.push(c);
          }
      }
      setPopularColors(finalColors);

      // Generate hashtags based on the query and products
      setTrendingHashtags([
          `#${activeFilter.replace(/\s+/g, '')}`,
          "#TrendingFashion",
          "#StyleInspo",
          "#OutfitOfTheDay"
      ]);

    } catch (err: any) {
      console.warn("[Trending API Error]:", err.message);
      // Fallback
      setTrendingNow([]);
      setErrorTrend(err.message || "Failed to load trends");
    } finally {
      setLoadingTrend(false);
      fetchingTrendRef.current = false;
    }
  }, [user, API_URL, activeFilter]);

  useEffect(() => {
    fetchCredits();
    fetchTrendingData();
  }, [fetchTrendingData, fetchCredits]);

  const filters = ["For You", "Men", "Women", "Indian Wear", "Streetwear", "Seasonal", "Global"];
  
  // Category Mock Data (UI structure)
  const categories = [
    { name: "Top Wear", img: "https://images.unsplash.com/photo-1596755094514-f87e32f6b472?w=500&q=80", trend: "up" },
    { name: "Bottom Wear", img: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&q=80", trend: "up" },
    { name: "Indian Wear", img: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=500&q=80", trend: "up" },
    { name: "Footwear", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80", trend: "up" },
    { name: "Outerwear", img: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80", trend: "up" },
    { name: "Accessories", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80", trend: "up" },
  ];

  const forecast = [
    { name: "Bomber Jackets", time: "Next 1-2 Weeks", img: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=200&q=80" },
    { name: "Earthy Tones", time: "Next 2-4 Weeks", img: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=200&q=80" },
    { name: "Knit Polos", time: "Next 1 Month", img: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200&q=80" },
    { name: "Wide Leg Jeans", time: "Next 1-2 Months", img: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=200&q=80" },
    { name: "Pastel Shades", time: "Next 2-3 Months", img: "https://images.unsplash.com/photo-1576871337645-3115f617c1be?w=200&q=80" },
  ];

  const scrollLeft = () => {
      if (scrollRef.current) scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
  };
  const scrollRight = () => {
      if (scrollRef.current) scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
  };

  return (
    <div className="flex-1 flex flex-col items-center pb-20">
      <div className="w-full max-w-[1400px]">
        <TopNav />

        <div className="px-4 sm:px-8 space-y-8 mt-2">
          
          {/* Header & Filters */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-[32px] font-bold text-[#1A1A1A] font-heading mb-1">Trends</h1>
              <p className="text-[14px] text-[#6B6B6B]">Stay ahead with the latest fashion trends tailored for you.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-wrap gap-2">
                  {filters.map(filter => (
                      <button
                          key={filter}
                          onClick={() => setActiveFilter(filter)}
                          className={`px-4 py-2 rounded-full text-[13px] font-bold transition-colors ${
                              activeFilter === filter 
                              ? "bg-[#b95b6a] text-white" 
                              : "bg-[#FAF8F5] text-[#1A1A1A] hover:bg-[#F5F0EB]"
                          } flex items-center gap-1.5`}
                      >
                          {filter === "For You" && <Sparkles className="w-3.5 h-3.5" />}
                          {filter}
                      </button>
                  ))}
              </div>
              
              <div className="relative">
                  <select 
                      className="appearance-none bg-white border border-[#E8E0D8] rounded-full px-4 py-2 pr-8 text-[13px] font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#b95b6a]/20 cursor-pointer"
                      value={activeTimeFilter}
                      onChange={(e) => setActiveTimeFilter(e.target.value)}
                  >
                      <option value="Today">Today</option>
                      <option value="This Week">This Week</option>
                      <option value="This Month">This Month</option>
                  </select>
                  <ChevronRight className="w-4 h-4 text-[#6B6B6B] absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
              </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-8">
            
            {/* Main Content Area */}
            <div className="flex-1 space-y-10 min-w-0">
                
                {/* Trending Right Now */}
                <div>
                    <h2 className="text-[20px] font-bold text-[#1A1A1A] font-heading mb-4 flex items-center gap-2">
                        🔥 Trending Right Now
                    </h2>
                    
                    <div className="relative group">
                        <div 
                            ref={scrollRef}
                            className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 snap-x snap-mandatory"
                        >
                            {loadingTrend ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="min-w-[200px] md:min-w-[240px] aspect-[3/4] bg-[#FAF8F5] rounded-[24px] animate-pulse flex-shrink-0 snap-start border border-[#E8E0D8]"></div>
                                ))
                            ) : errorTrend ? (
                                <div className="w-full py-12 flex flex-col items-center justify-center border border-[#E8E0D8] rounded-[24px] bg-[#FAF8F5]">
                                    <AlertCircle className="w-8 h-8 text-[#b95b6a] mb-2" />
                                    <p className="text-[14px] font-bold text-[#1A1A1A] mb-4">{errorTrend}</p>
                                    <button onClick={fetchTrendingData} className="px-4 py-2 bg-white rounded-full text-[13px] font-bold shadow-sm border border-[#E8E0D8] flex items-center gap-2">
                                        <RefreshCcw className="w-4 h-4" /> Retry
                                    </button>
                                </div>
                            ) : trendingNow.length > 0 ? (
                                trendingNow.map((trend, idx) => (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                                        key={trend.id} 
                                        className="min-w-[200px] md:min-w-[240px] aspect-[3/4] rounded-[24px] overflow-hidden relative flex-shrink-0 snap-start group cursor-pointer"
                                        onClick={() => window.open(trend.productUrl, '_blank')}
                                    >
                                        <img src={trend.imageUrl} alt={trend.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 opacity-80"></div>
                                        
                                        <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md text-white text-[12px] font-bold px-2.5 py-1 rounded-lg">
                                            {String(idx + 1).padStart(2, '0')}
                                        </div>
                                        
                                        <div className="absolute bottom-4 left-4 right-4 z-10">
                                            <h3 className="text-white font-bold text-[16px] md:text-[18px] leading-tight mb-2 line-clamp-2 drop-shadow-md">{trend.name}</h3>
                                            <div className="flex items-center gap-1.5 text-white/90 text-[12px] font-medium drop-shadow-sm">
                                                {trend.reviews ? (
                                                    <span className="flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" /> Highly Rated ({trend.reviews})</span>
                                                ) : (
                                                    <span className="flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" /> Trending</span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="w-full py-12 text-center text-[#6B6B6B] bg-[#FAF8F5] rounded-[24px]">No trends found for this filter.</div>
                            )}
                        </div>
                        
                        {!loadingTrend && trendingNow.length > 3 && (
                            <>
                                <button 
                                    onClick={scrollLeft}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.1)] opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-white"
                                >
                                    <ChevronLeft className="w-5 h-5 text-[#1A1A1A]" />
                                </button>
                                <button 
                                    onClick={scrollRight}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.1)] opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-white"
                                >
                                    <ChevronRight className="w-5 h-5 text-[#1A1A1A]" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Trending by Category */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[20px] font-bold text-[#1A1A1A] font-heading">Trending by Category</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {categories.map((cat, idx) => (
                            <div key={idx} className="bg-white rounded-[24px] p-4 flex items-center gap-4 border border-[#E8E0D8] hover:shadow-[0_4px_16px_rgba(185,91,106,0.06)] hover:border-[#b95b6a]/30 transition-all cursor-pointer group">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#FAF8F5] flex-shrink-0">
                                    <img src={cat.img} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <div>
                                    <h4 className="text-[15px] font-bold text-[#1A1A1A] group-hover:text-[#b95b6a] transition-colors">{cat.name}</h4>
                                    <div className="flex items-center gap-1 text-[#2D6A4F] text-[12px] font-bold mt-1">
                                        <TrendingUp className="w-3 h-3" /> Trending up
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center mt-6">
                        <button className="text-[#b95b6a] text-[13px] font-bold hover:underline flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#FAF1F2] flex items-center justify-center text-[16px] leading-none pb-0.5">+</span> View All Categories →
                        </button>
                    </div>
                </div>

                {/* AI Trend Forecast */}
                <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-[#E8E0D8] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                    <h2 className="text-[20px] font-bold text-[#1A1A1A] font-heading mb-1">Trend Forecast</h2>
                    <p className="text-[13px] text-[#6B6B6B] mb-8">AI predicts what's going to be big next.</p>
                    
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute top-[40px] left-8 right-8 h-px border-t-[1.5px] border-dashed border-[#E8E0D8] hidden md:block"></div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                            {forecast.map((item, idx) => (
                                <div key={idx} className="flex flex-col items-center text-center relative z-10 group">
                                    <div className="w-20 h-20 rounded-full bg-[#FAF8F5] border-[4px] border-white shadow-sm overflow-hidden mb-3 group-hover:-translate-y-2 transition-transform duration-300 relative">
                                        <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                                    </div>
                                    <h4 className="text-[13px] font-bold text-[#1A1A1A] leading-tight mb-1">{item.name}</h4>
                                    <p className="text-[11px] text-[#9B9B9B]">{item.time}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
            
            {/* Right Sidebar - Trend Insights */}
            <div className="w-full xl:w-[320px] space-y-6 flex-shrink-0">
                
                {/* Insights Box */}
                <div className="bg-white rounded-[28px] p-6 border border-[#E8E0D8] shadow-[0_2px_12px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[16px] font-bold text-[#1A1A1A] font-heading flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-[#b95b6a]" /> Trend Insights
                        </h3>
                    </div>
                    
                    <div className="mb-6 relative z-10">
                        <p className="text-[12px] text-[#6B6B6B] mb-1 font-medium">Overall Trend Score</p>
                        <div className="flex items-end gap-1.5">
                            <span className="text-[48px] font-bold text-[#1A1A1A] leading-none tracking-tight">92</span>
                            <span className="text-[16px] text-[#9B9B9B] font-medium pb-1.5">/100</span>
                        </div>
                        <div className="text-[12px] text-[#2D6A4F] font-bold flex items-center gap-1 mt-2 bg-[#E8F3ED] w-fit px-2 py-0.5 rounded-full">
                            <ArrowUpRight className="w-3.5 h-3.5" /> High Activity
                        </div>
                    </div>
                    
                    <div className="bg-[#FAF8F5] rounded-xl p-4 flex items-start gap-3 relative z-10">
                        <Sparkles className="w-4 h-4 text-[#b95b6a] flex-shrink-0 mt-0.5" />
                        <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
                            Fashion engagement is peaking. Users are highly interested in <strong className="text-[#1A1A1A]">{activeFilter}</strong> styles this week.
                        </p>
                    </div>

                    {/* Chart background decor */}
                    <svg viewBox="0 0 400 150" className="absolute bottom-0 left-0 w-full h-[120px] opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity" preserveAspectRatio="none">
                        <path d="M0,150 L0,120 Q40,100 80,60 T160,80 T240,40 T320,100 T400,60 L400,150 Z" fill="#b95b6a" />
                    </svg>
                </div>

                {/* Popular Colors */}
                <div className="bg-white rounded-[28px] p-6 border border-[#E8E0D8]">
                    <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-4">Popular Colors</h3>
                    <div className="flex gap-2.5 flex-wrap">
                        {popularColors.map((color, idx) => (
                            <div 
                                key={idx} 
                                className="w-[42px] h-[42px] rounded-2xl shadow-inner border border-black/5 hover:scale-110 transition-transform cursor-pointer" 
                                style={{ backgroundColor: color }}
                                title="Color trend"
                            ></div>
                        ))}
                    </div>
                    <div className="mt-5 text-right">
                        <button className="text-[#b95b6a] text-[12px] font-bold hover:underline">View All →</button>
                    </div>
                </div>

                {/* Top Rising Brands */}
                <div className="bg-white rounded-[28px] p-6 border border-[#E8E0D8]">
                    <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-5">Top Rising Brands</h3>
                    <div className="space-y-4">
                        {topBrands.map((brand, idx) => (
                            <div key={idx} className="flex items-center justify-between group cursor-default">
                                <div className="flex items-center gap-3">
                                    <span className="text-[12px] text-[#9B9B9B] font-bold w-4">{String(idx + 1).padStart(2, '0')}</span>
                                    <span className="text-[14px] font-bold text-[#1A1A1A] group-hover:text-[#b95b6a] transition-colors">{brand}</span>
                                </div>
                                <span className="text-[12px] text-[#2D6A4F] font-bold flex items-center gap-0.5">
                                    <ArrowUpRight className="w-3.5 h-3.5" /> Rising
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 text-center">
                        <button className="text-[#b95b6a] text-[12px] font-bold hover:underline">View All Brands →</button>
                    </div>
                </div>

                {/* Trending Hashtags */}
                <div className="bg-white rounded-[28px] p-6 border border-[#E8E0D8]">
                    <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-4">Trending Hashtags</h3>
                    <div className="flex flex-wrap gap-2">
                        {trendingHashtags.map((tag, idx) => (
                            <span key={idx} className="px-3.5 py-1.5 bg-[#FAF8F5] text-[#1A1A1A] text-[12px] font-medium rounded-full border border-[#E8E0D8] cursor-pointer hover:bg-[#F5F0EB] hover:border-[#E8E0D8] transition-colors">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <div className="mt-5 text-center">
                        <button className="text-[#b95b6a] text-[12px] font-bold hover:underline">View All Hashtags →</button>
                    </div>
                </div>

                {/* CTA Box */}
                <div className="bg-[#FAF1F2] rounded-[28px] p-8 text-center border border-[#b95b6a]/10 relative overflow-hidden shadow-[0_4px_24px_rgba(185,91,106,0.06)]">
                    <div className="absolute -top-6 -right-6 text-[#b95b6a]/10 opacity-60"><Sparkles className="w-32 h-32" /></div>
                    <h3 className="text-[18px] font-bold text-[#1A1A1A] font-heading mb-2 relative z-10">Want looks in this trend?</h3>
                    <p className="text-[13px] text-[#6B6B6B] mb-6 relative z-10 leading-relaxed">
                        Let AI create outfits based on the latest trends for you.
                    </p>
                    <Link 
                        href="/ai-style-match" 
                        className="inline-flex items-center justify-center gap-2 w-full bg-[#b95b6a] text-white py-3 rounded-full text-[13px] font-bold hover:bg-[#a84e5b] transition-colors relative z-10 shadow-md shadow-[#b95b6a]/20 hover:shadow-lg hover:shadow-[#b95b6a]/30 group"
                    >
                        Create My Trend Look <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    </Link>
                </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

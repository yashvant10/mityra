"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import {
  Crown,
  Camera,
  Shirt,
  Shield,
  Heart,
  ChevronRight,
  ChevronLeft,
  Info,
  RefreshCcw,
  AlertCircle,
  Wand2,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TopNav from "@/components/dashboard/TopNav";
import ProductCard from "@/components/shared/ProductCard";
import { toast } from "sonner";

import { fetchWithRetry, normalizeProduct, decodeHtmlEntities, NormalizedProduct as TrendingOutfit } from "@/lib/fetchUtils";

// SVG component for mock chart
const ChartSvg = () => (
  <svg viewBox="0 0 400 80" className="w-full h-full preserve-3d" preserveAspectRatio="none">
    <path
      d="M0,70 Q40,60 80,40 T160,50 T240,20 T320,60 T400,30"
      fill="none"
      stroke="#C4727F"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M0,70 Q40,60 80,40 T160,50 T240,20 T320,60 T400,30 L400,80 L0,80 Z"
      fill="url(#gradient)"
      opacity="0.3"
    />
    <defs>
      <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="#C4727F" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#C4727F" stopOpacity="0" />
      </linearGradient>
    </defs>
    {[
      { cx: 80, cy: 40 },
      { cx: 160, cy: 50 },
      { cx: 240, cy: 20 },
      { cx: 320, cy: 60 }
    ].map((p, i) => (
      <circle key={i} cx={p.cx} cy={p.cy} r="4" fill="white" stroke="#C4727F" strokeWidth="2" />
    ))}
  </svg>
);

export default function DashboardPage() {
  const { user } = useAuth();
  
  // Real stats
  const [wardrobeCount, setWardrobeCount] = useState<number>(0);
  const [tryOnCount, setTryOnCount] = useState<number>(0);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("free");
  
  const [creditsRemaining, setCreditsRemaining] = useState<number>(0);
  
  const [aiRecommendations, setAiRecommendations] = useState<TrendingOutfit[]>([]);
  const [loadingRecs, setLoadingRecs] = useState<boolean>(true);
  const [errorRecs, setErrorRecs] = useState<string | null>(null);

  const [trendingNow, setTrendingNow] = useState<TrendingOutfit[]>([]);
  const [loadingTrend, setLoadingTrend] = useState<boolean>(true);
  const [errorTrend, setErrorTrend] = useState<string | null>(null);

  // Dedup guards to prevent duplicate concurrent requests
  const fetchingRecsRef = useRef(false);
  const fetchingTrendRef = useRef(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const fetchRecommendations = useCallback(async () => {
    // Prevent duplicate concurrent requests
    if (fetchingRecsRef.current) return;
    fetchingRecsRef.current = true;
    setLoadingRecs(true);
    setErrorRecs(null);
    try {
      const token = user && typeof (user as any).getIdToken === "function" ? await (user as any).getIdToken() : "";
      
      // 1. Fetch user profile for personalization
      let profile = null;
      try {
        const pRes = await fetch(`${API_URL}/users/profile`, { headers: { Authorization: `Bearer ${token}` } });
        if (pRes.ok) {
          const pData = await pRes.json();
          profile = pData?.profile;
        }
      } catch (e) {}

      // 2. Build dynamic personalized query
      const prefs = profile?.stylePreferences || {};
      const gender = prefs.gender?.toLowerCase() || "male";
      
      // Rotate through preferences based on day to keep it fresh
      const day = new Date().getDate();
      const styles = prefs.preferredStyles?.length ? prefs.preferredStyles : ["casual", "premium"];
      const colors = prefs.favoriteColors?.length ? prefs.favoriteColors : [""];
      const occasions = prefs.occasions?.length ? prefs.occasions : [""];
      
      const style = styles[day % styles.length];
      const color = colors[(day + 1) % colors.length];
      const occasion = occasions[(day + 2) % occasions.length];

      let query = `${gender} ${style} ${color} ${occasion} outfit`.replace(/\s+/g, " ").trim();
      if (!query || query === "outfit") query = `${gender} premium fashion`;

      // Query ALL stores in parallel for maximum speed and resilience
      const stores = ["amazon", "myntra", "flipkart", "ajio"];
      const allResults = await Promise.allSettled(
        stores.map(store =>
          fetchWithRetry(`${API_URL}/tryon/products?store=${store}&gender=${gender}&q=${encodeURIComponent(query)}&limit=4`, {
            headers: { Authorization: `Bearer ${token}` }
          }, 1, 500) // only 1 retry with 500ms backoff for speed
        )
      );

      // Collect products from all successful stores
      let products: any[] = [];
      for (const result of allResults) {
        if (result.status === "fulfilled") {
          const valid = (result.value.products || []).filter((p: any) => p.imageUrl || p.image);
          if (valid.length > 0 && products.length === 0) {
            products = valid;
          }
        }
      }

      // Fallback: if personalized query returned nothing, try a broader query
      if (products.length === 0) {
        try {
          const fallbackData = await fetchWithRetry(`${API_URL}/tryon/products?store=amazon&gender=${gender}&q=${encodeURIComponent(gender + " trending fashion")}&limit=4`, {
            headers: { Authorization: `Bearer ${token}` }
          }, 1, 500);
          products = (fallbackData.products || []).filter((p: any) => p.imageUrl || p.image);
        } catch (e) {}
      }

      if (products.length === 0) throw new Error("No products returned");
      
      setAiRecommendations(products.map((p: any) => normalizeProduct(p)));
    } catch (err: any) {
      console.warn("[Recommendations API Error]:", err.message);
      // Fallback to high-quality mock data instead of breaking the UI
      setAiRecommendations([
        { id: "mock-rec-1", name: "Premium Tailored Suit", imageUrl: "https://images.unsplash.com/photo-1593030761757-71fae45fa0e5?w=500&q=80", price: "₹8,499", productUrl: "#", platform: "amazon" },
        { id: "mock-rec-2", name: "Minimalist Beige Coat", imageUrl: "https://images.unsplash.com/photo-1544441893-675973e31985?w=500&q=80", price: "₹4,999", productUrl: "#", platform: "myntra" },
        { id: "mock-rec-3", name: "Classic White Oxford", imageUrl: "https://images.unsplash.com/photo-1620012253295-c15c54e0c963?w=500&q=80", price: "₹1,899", productUrl: "#", platform: "ajio" },
        { id: "mock-rec-4", name: "Navy Slim Fit Trousers", imageUrl: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&q=80", price: "₹2,199", productUrl: "#", platform: "flipkart" }
      ]);
      setErrorRecs(null);
    } finally {
      setLoadingRecs(false);
      fetchingRecsRef.current = false;
    }
  }, [user, API_URL]);

  const fetchTrending = useCallback(async () => {
    // Prevent duplicate concurrent requests
    if (fetchingTrendRef.current) return;
    fetchingTrendRef.current = true;
    setLoadingTrend(true);
    setErrorTrend(null);
    try {
      const token = user && typeof (user as any).getIdToken === "function" ? await (user as any).getIdToken() : "";
      
      // Rotating trending queries to ensure fresh data daily — all fashion-specific
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
      const trendingKeywords = ["trending mens clothing", "bestseller mens shirt", "mens casual wear trending", "new arrivals mens fashion", "popular mens outfit"];
      const currentKeyword = trendingKeywords[dayOfYear % trendingKeywords.length];

      // Parallel resilient fetching
      const stores = ["flipkart", "amazon", "ajio", "myntra"];
      // Rotate stores to avoid hitting the same endpoints constantly
      const selectedStores = [
        stores[dayOfYear % stores.length],
        stores[(dayOfYear + 1) % stores.length],
        stores[(dayOfYear + 2) % stores.length]
      ];
      
      const storefetches = selectedStores.map(store => 
        fetchWithRetry(`${API_URL}/tryon/products?store=${store}&gender=male&q=${encodeURIComponent(currentKeyword)}&limit=3`, {
          headers: { Authorization: `Bearer ${token}` }
        }, 1, 500).catch(err => {
          console.warn(`[Trending] Failed for ${store}:`, err.message);
          return { products: [] };
        })
      );
      
      const results = await Promise.all(storefetches);
      const mergedProducts = results.flatMap(r => (r.products || []).filter((p: any) => p.imageUrl || p.image));
      
      if (mergedProducts.length === 0) throw new Error("Trending API unavailable");
      
      setTrendingNow(mergedProducts.map((p: any) => normalizeProduct(p)));
    } catch (err: any) {
      console.warn("[Trending API Error]:", err.message);
      // Fallback to high-quality mock data instead of breaking the UI
      setTrendingNow([
        { id: "mock-trend-1", name: "Urban Streetwear Jacket", imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80", price: "₹3,499", productUrl: "#", platform: "myntra" },
        { id: "mock-trend-2", name: "Oversized Vintage Tee", imageUrl: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=500&q=80", price: "₹999", productUrl: "#", platform: "amazon" },
        { id: "mock-trend-3", name: "Classic Denim Jacket", imageUrl: "https://images.unsplash.com/photo-1576871337645-3115f617c1be?w=500&q=80", price: "₹2,899", productUrl: "#", platform: "flipkart" },
        { id: "mock-trend-4", name: "Casual Chinos Sand", imageUrl: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&q=80", price: "₹1,499", productUrl: "#", platform: "ajio" }
      ]);
      setErrorTrend(null);
    } finally {
      setLoadingTrend(false);
      fetchingTrendRef.current = false;
    }
  }, [user, API_URL]);

  const fetchData = useCallback(async () => {
    try {
      const token = user && typeof (user as any).getIdToken === "function" ? await (user as any).getIdToken() : "";
      
      fetch(`${API_URL}/users/profile`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : null)
        .then(data => data?.profile && setSubscriptionPlan(data.profile.subscription || "free"))
        .catch(() => {});

      fetch(`${API_URL}/wardrobe`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : null)
        .then(data => data?.items && setWardrobeCount(data.items.length))
        .catch(() => {});

      fetch(`${API_URL}/tryon/history`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          const history = data?.history || [];
          setTryOnCount(history.length);
          setRecentSessions(
            [...history]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 4)
          );
        })
        .catch(() => {});

      fetch(`${API_URL}/payments/user-analytics`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : null)
        .then(data => data && setCreditsRemaining(data.currentCredits || 0))
        .catch(() => {});

    } catch (err) {}
  }, [user, API_URL]);

  useEffect(() => {
    fetchData();
    fetchRecommendations();
    fetchTrending();

    // Safety timeout: if loading is STILL true after 20 seconds, force error state
    // This guarantees the UI never remains permanently stuck on skeleton
    const safetyTimer = setTimeout(() => {
      setLoadingRecs(prev => {
        if (prev) {
          setErrorRecs("Request timed out");
          return false;
        }
        return prev;
      });
      setLoadingTrend(prev => {
        if (prev) {
          setErrorTrend("Request timed out");
          return false;
        }
        return prev;
      });
    }, 20000);

    return () => clearTimeout(safetyTimer);
  }, [fetchData, fetchRecommendations, fetchTrending]);

  const getDisplayUrl = (url: string | null): string => {
    if (!url) return "";
    if (url.startsWith("data:")) return url;
    if (url.includes("/api/tryon/image/")) {
      const match = url.match(/\/api\/tryon\/image\/(.+)$/);
      if (match) return `${API_URL}/tryon/image/${match[1]}`;
    }
    return url;
  };

  const handleProductClick = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };



  const memberSinceStr = user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "May 2024";

  return (
    <div className="flex-1 flex flex-col items-center">
      <div className="w-full max-w-[1400px]">
        <TopNav />

        <div className="px-4 sm:px-8 pb-12 space-y-6">
          
          {/* Welcome Banner */}
          <div className="mb-8">
            <h1 className="text-[24px] sm:text-[28px] font-bold text-[#1A1A1A] font-heading">
              Good morning, {user?.displayName || "Yashvant"}! 👋
            </h1>
            <p className="text-[13px] sm:text-[14px] text-[#6B6B6B] mt-1">Let's create your best look today.</p>
          </div>

          {/* Stat Cards Row */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {/* Credits */}
            <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#E8E0D8] flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[13px] font-bold text-[#6B6B6B]">Credits Left</span>
                <div className="w-8 h-8 rounded-full bg-[#FAF1F2] text-[#b95b6a] flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-[32px] font-bold text-[#1A1A1A] flex items-baseline gap-2">
                  {creditsRemaining} <span className="text-[14px] text-[#9B9B9B] font-medium">/ 20</span>
                </div>
                <div className="w-full h-1.5 bg-[#F5F0EB] rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#b95b6a]" style={{ width: `${Math.min(100, (creditsRemaining/20)*100)}%` }} />
                </div>
                <p className="text-[11px] text-[#6B6B6B] mt-2">Refreshes in 12h 30m</p>
              </div>
            </div>

            {/* Try-Ons Today */}
            <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#E8E0D8] flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[13px] font-bold text-[#6B6B6B]">Try-Ons Today</span>
                <div className="w-8 h-8 rounded-full bg-[#F5F0EB] text-[#1A1A1A] flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-[32px] font-bold text-[#1A1A1A] flex items-baseline gap-2">
                  4 <span className="text-[14px] text-[#9B9B9B] font-medium">/ 10</span>
                </div>
                <div className="w-full h-1.5 bg-[#F5F0EB] rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#1A1A1A]" style={{ width: `40%` }} />
                </div>
                <p className="text-[11px] text-[#6B6B6B] mt-2">6 try-ons remaining</p>
              </div>
            </div>

            {/* Looks Created */}
            <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#E8E0D8] flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[13px] font-bold text-[#6B6B6B]">Looks Created</span>
                <div className="w-8 h-8 rounded-full bg-[#E8F3ED] text-[#2D6A4F] flex items-center justify-center">
                  <Shirt className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-[32px] font-bold text-[#1A1A1A]">
                  {tryOnCount + wardrobeCount}
                </div>
                <p className="text-[11px] text-[#6B6B6B] mt-4">Your personal looks</p>
              </div>
            </div>

            {/* Member Since */}
            <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#E8E0D8] flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[13px] font-bold text-[#6B6B6B]">Member Since</span>
                <div className="w-8 h-8 rounded-full bg-[#F3E8F5] text-[#6A2D77] flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-[24px] font-bold text-[#1A1A1A]">
                  {memberSinceStr}
                </div>
                <p className="text-[11px] text-[#6B6B6B] mt-4 capitalize">{subscriptionPlan} Plan</p>
              </div>
            </div>
          </motion.div>

          {/* Find Your Look — Free Feature Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link href="/find-your-look" className="block">
              <div className="bg-white rounded-[28px] p-6 sm:p-7 shadow-[0_2px_16px_rgba(0,0,0,0.03)] border border-[#E8E0D8] flex flex-col sm:flex-row items-center gap-5 hover:shadow-[0_4px_24px_rgba(185,91,106,0.08)] hover:border-[#b95b6a]/20 transition-all duration-400 group cursor-pointer">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#FAF1F2] to-[#F5E6D8] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <Wand2 className="w-7 h-7 text-[#b95b6a]" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 bg-[#FAF1F2] text-[#b95b6a] text-[10px] font-bold px-3 py-1 rounded-full mb-2">
                    <Sparkles className="w-3 h-3" /> FREE AI STYLE RECOMMENDATION
                  </div>
                  <h3 className="text-[18px] font-bold text-[#1A1A1A] font-heading mb-1">Find Your Look ✨</h3>
                  <p className="text-[13px] text-[#6B6B6B] leading-relaxed">Upload your photo and discover outfits that match your style.</p>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center gap-2 bg-[#b95b6a] text-white px-5 py-2.5 rounded-full text-[13px] font-bold group-hover:bg-[#a84e5b] transition-colors">
                    Find Your Look <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* AI Style Recs & Style Profile */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* AI Style Recommendations */}
            <div className="lg:col-span-2 bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#E8E0D8] flex flex-col lg:flex-row gap-8">
              <div className="flex-shrink-0 flex flex-col justify-center">
                <h2 className="text-[22px] font-bold text-[#1A1A1A] font-heading leading-tight mb-2">
                  AI Style<br/>Recommendations ✨
                </h2>
                <p className="text-[13px] text-[#6B6B6B] mb-6 max-w-[200px]">
                  Handpicked styles just for you, based on your taste & trends.
                </p>
                <Link
                  href="/recommendations"
                  className="w-fit bg-[#b95b6a] text-white px-6 py-2.5 rounded-full text-[13px] font-bold hover:bg-[#a84e5b] transition-colors flex items-center gap-2"
                >
                  Explore Looks →
                </Link>
              </div>
              
              <div className="flex-1 flex gap-3 overflow-x-auto custom-scrollbar pb-2 items-center">
                {loadingRecs ? (
                  [1,2,3,4].map(i => (
                    <div key={i} className="w-[160px] flex-shrink-0">
                      <div className="aspect-[3/4] rounded-[16px] bg-[#FAF8F5] animate-pulse mb-3"></div>
                      <div className="h-4 bg-[#FAF8F5] w-2/3 rounded mb-1 animate-pulse"></div>
                      <div className="h-3 bg-[#FAF8F5] w-1/2 rounded animate-pulse"></div>
                    </div>
                  ))
                ) : errorRecs ? (
                  <div className="w-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[#E8E0D8] rounded-[24px] bg-[#FAF8F5]/50">
                    <AlertCircle className="w-8 h-8 text-[#b95b6a] mb-2 opacity-50" />
                    <p className="text-[13px] font-bold text-[#1A1A1A] mb-1">Unable to load recommendations</p>
                    <p className="text-[11px] text-[#6B6B6B] mb-4">Please try again</p>
                    <button 
                      onClick={fetchRecommendations}
                      className="px-4 py-2 bg-white border border-[#E8E0D8] rounded-full text-[12px] font-bold text-[#1A1A1A] hover:bg-[#F5F0EB] transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <RefreshCcw className="w-3 h-3" /> Try Again
                    </button>
                  </div>
                ) : aiRecommendations.length > 0 ? (
                  aiRecommendations.slice(0,4).map((rec, idx) => (
                    <ProductCard 
                      key={rec.id}
                      id={rec.id}
                      name={rec.name}
                      imageUrl={rec.imageUrl}
                      platform={rec.platform}
                      price={rec.price}
                      productUrl={rec.productUrl}
                      index={idx}
                    />
                  ))
                ) : (
                  <div className="w-full text-center p-4 text-[13px] text-[#6B6B6B]">No recommendations available.</div>
                )}
              </div>
            </div>

            {/* Your Style Profile */}
            <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#E8E0D8]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[18px] font-bold text-[#1A1A1A] font-heading">Your Style Profile</h3>
                <Link href="/profile" className="text-[#b95b6a] text-[13px] font-bold hover:underline">Edit</Link>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[#6B6B6B] flex items-center gap-2"><div className="w-4 flex justify-center">👤</div> Body Type</span>
                  <span className="text-[#1A1A1A] font-bold">Athletic</span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[#6B6B6B] flex items-center gap-2"><div className="w-4 flex justify-center">💧</div> Skin Tone</span>
                  <span className="text-[#1A1A1A] font-bold">Warm</span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[#6B6B6B] flex items-center gap-2"><div className="w-4 flex justify-center">👕</div> Style Preference</span>
                  <span className="text-[#1A1A1A] font-bold">Minimal, Modern</span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[#6B6B6B] flex items-center gap-2"><div className="w-4 flex justify-center">🎨</div> Favorite Colors</span>
                  <div className="flex gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#1A1A1A]"></div>
                    <div className="w-4 h-4 rounded-full bg-[#E3C5B5]"></div>
                    <div className="w-4 h-4 rounded-full bg-[#5D6B5A]"></div>
                    <div className="w-4 h-4 rounded-full bg-[#1E293B]"></div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-[#6B6B6B] flex items-center gap-2"><div className="w-4 flex justify-center">💼</div> Occasions</span>
                  <span className="text-[#1A1A1A] font-bold">Casual, Party, Office</span>
                </div>
              </div>

              <button className="w-full mt-6 py-2.5 border border-[#E8E0D8] rounded-xl text-[#b95b6a] text-[13px] font-bold flex items-center justify-center gap-2 hover:bg-[#FAF8F5] transition-colors">
                ✨ Retake Style Quiz
              </button>
            </div>
          </div>

          {/* Bottom Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Recent Try-Ons */}
            <div className="bg-transparent">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[18px] font-bold text-[#1A1A1A] font-heading">Recent Try-Ons</h3>
                <Link href="/tryon-history" className="text-[#b95b6a] text-[13px] font-bold hover:underline">View all</Link>
              </div>
              <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2">
                {recentSessions.length > 0 ? (
                  recentSessions.map((session, idx) => (
                    <div key={session.id || idx} className="min-w-[120px] flex-shrink-0 group cursor-pointer">
                      <div className="aspect-square rounded-[16px] overflow-hidden mb-2 relative">
                        <img 
                          src={getDisplayUrl(session.resultImageUrl || session.clothingImageUrl)} 
                          alt="Try-on" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {session.status === 'completed' && (
                          <div className="absolute top-2 left-2 bg-[#2D6A4F] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Success</div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-[#6B6B6B]">Today, {new Date(session.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        <h4 className="text-[12px] font-bold text-[#1A1A1A]">{session.clothingName || "Generated Look"}</h4>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="w-full h-32 flex flex-col items-center justify-center text-[#6B6B6B] border border-dashed border-[#E8E0D8] rounded-[24px]">
                    <p className="text-[13px] mb-2">No try-ons yet.</p>
                    <Link href="/try-on" className="text-[#b95b6a] text-[13px] font-bold">Try Your First Look</Link>
                  </div>
                )}
              </div>
            </div>

            {/* Trending Right Now */}
            <div className="bg-transparent">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[18px] font-bold text-[#1A1A1A] font-heading">Trending Right Now 🔥</h3>
                <Link href="/trends" className="text-[#b95b6a] text-[13px] font-bold hover:underline">View all</Link>
              </div>
              <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2">
                {loadingTrend ? (
                  [1,2,3,4].map(i => (
                    <div key={i} className="w-[130px] flex-shrink-0">
                      <div className="aspect-[3/4] rounded-[16px] bg-white border border-[#E8E0D8] animate-pulse mb-2"></div>
                      <div className="h-3 bg-white w-1/2 mx-auto rounded animate-pulse"></div>
                    </div>
                  ))
                ) : errorTrend ? (
                  <div className="w-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[#E8E0D8] rounded-[24px] bg-[#FAF8F5]/50">
                    <AlertCircle className="w-8 h-8 text-[#b95b6a] mb-2 opacity-50" />
                    <p className="text-[13px] font-bold text-[#1A1A1A] mb-1">Failed to load trends</p>
                    <button 
                      onClick={fetchTrending}
                      className="mt-3 px-4 py-2 bg-white border border-[#E8E0D8] rounded-full text-[12px] font-bold text-[#1A1A1A] hover:bg-[#F5F0EB] transition-colors flex items-center gap-2 mx-auto shadow-sm"
                    >
                      <RefreshCcw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                ) : trendingNow.length > 0 ? (
                  trendingNow.map((trend, idx) => (
                    <ProductCard 
                      key={trend.id}
                      id={trend.id}
                      name={trend.name}
                      imageUrl={trend.imageUrl}
                      platform={trend.platform}
                      price={trend.price}
                      productUrl={trend.productUrl}
                      rating={trend.rating}
                      reviews={trend.reviews}
                      index={idx}
                    />
                  ))
                ) : (
                  <div className="w-full text-center p-4 text-[13px] text-[#6B6B6B]">No trending products available.</div>
                )}
              </div>
            </div>

          </div>

          {/* Banner & Chart Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Premium Banner */}
            <div className="rounded-[32px] p-8 relative overflow-hidden flex flex-col justify-center bg-gradient-to-r from-[#b95b6a] to-[#d88d9a] shadow-[0_4px_20px_rgba(185,91,106,0.2)]">
              <div className="relative z-10 max-w-[280px]">
                <h3 className="text-[22px] font-bold text-white font-heading leading-tight mb-2">
                  Unlock Premium.<br/>Unlock Your Style.
                </h3>
                <p className="text-[13px] text-white/90 mb-6">
                  Unlimited try-ons, premium AI recommendations, early access to new features and more.
                </p>
                <Link
                  href="/pricing"
                  className="w-fit bg-white text-[#b95b6a] px-6 py-2.5 rounded-full text-[13px] font-bold hover:bg-[#FAF8F5] transition-colors flex items-center gap-2"
                >
                  Upgrade to Premium →
                </Link>
              </div>
              <div className="absolute -right-8 bottom-[-20%] w-[200px] h-[200px] opacity-70 pointer-events-none">
                 <Crown className="w-full h-full text-white/20" />
              </div>
            </div>

            {/* Weekly Style Report */}
            <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-[#E8E0D8] flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-[18px] font-bold text-[#1A1A1A] font-heading">Your Weekly Style Report</h3>
                  <Info className="w-4 h-4 text-[#9B9B9B]" />
                </div>
                <div className="text-right">
                  <span className="text-[18px] font-bold text-[#b95b6a]">+32%</span>
                  <p className="text-[11px] text-[#6B6B6B]">Style Score<br/>vs last week</p>
                </div>
              </div>
              
              <div className="flex-1 min-h-[100px] relative">
                <ChartSvg />
              </div>

              <div className="flex justify-between text-[11px] text-[#9B9B9B] mt-2 font-medium px-2">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
              
              <div className="mt-4 text-right">
                 <Link href="/profile" className="text-[#b95b6a] text-[13px] font-bold hover:underline">View Full Report →</Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

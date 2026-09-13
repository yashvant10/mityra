"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Heart, 
  Trash2, 
  ExternalLink, 
  ShoppingBag, 
  Sparkles, 
  Loader2, 
  ArrowLeftRight, 
  Clock 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { toast } from "sonner";

interface SavedOutfitSession {
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

const decodeHtmlEntities = (str: string): string => {
  if (!str) return "";
  let decoded = str;
  // Run up to 3 times for multi-encoded strings
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

export default function SavedOutfitsPage() {
  const { user } = useAuth();
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfitSession[]>([]);
  const [loading, setLoading] = useState(true);

  const handleBookNow = async (name: string, price: string, store: string, url: string) => {
    const storeLower = store.toLowerCase();
    
    let targetUrl = url || "";
    const lowercaseUrl = targetUrl.toLowerCase();
    
    // If the URL points to Google instead of a direct store, generate a clean direct store search URL
    const isGoogleRedirect = 
      lowercaseUrl.includes("google.com") || 
      lowercaseUrl.includes("google.co.") || 
      !targetUrl.startsWith("http");

    if (isGoogleRedirect) {
      console.log(`[BookNow] Google redirect detected. Generating clean direct store URL for: ${name}`);
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
    // Check if it's a search or category page to prevent WAF bot triggers on parameters
    const isSearchOrCategory = 
      newLowercaseUrl.includes("/search") ||
      newLowercaseUrl.includes("s?k=") ||
      newLowercaseUrl.includes("?q=") ||
      newLowercaseUrl.includes("?text=") ||
      (newLowercaseUrl.includes("myntra.com/") && !newLowercaseUrl.includes("/buy") && !newLowercaseUrl.includes("/p/")) ||
      (newLowercaseUrl.includes("ajio.com/") && !newLowercaseUrl.includes("/p/"));

    // Only inject tracking parameters if it is a direct product page, not a search/category index
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

    // Open store page IMMEDIATELY in a native user-initiated window to bypass WAF detection
    const newWindow = window.open(targetUrl, "_blank");
    if (!newWindow) {
      // Last-resort fallback if popup blocker restricts opening
      window.location.href = targetUrl;
      return;
    }

    try {
      const token = user && typeof (user as any).getIdToken === "function"
        ? await (user as any).getIdToken()
        : "";

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      
      // Perform database click tracking in the background asynchronously
      const res = await fetch(`${apiUrl}/tryon/affiliate-click`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          clothingName: name,
          clothingPrice: price,
          clothingStore: store,
          platform: store,
          productUrl: url
        })
      });

      if (res.ok) {
        toast.success("Affiliate click recorded! 💰");
      }
    } catch (err) {
      console.warn("Affiliate track call failed in background:", err);
    }
  };

  const loadSavedOutfits = async () => {
    try {
      setLoading(true);
      const token = user && typeof (user as any).getIdToken === "function"
        ? await (user as any).getIdToken()
        : "";

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/tryon/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const historyList = data.history || [];
        // Filter for bookmarked items
        const savedOnly = historyList.filter((s: any) => s.isSaved === true);
        const decodedSaved = savedOnly.map((s: any) => ({
          ...s,
          clothingName: decodeHtmlEntities(s.clothingName || "")
        }));
        setSavedOutfits(decodedSaved);
      }
    } catch (err) {
      console.error("Failed to load saved outfits:", err);
      toast.error("Failed to retrieve saved outfits from studio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSavedOutfits();
  }, [user]);

  const handleUnsave = async (id: string, name: string) => {
    try {
      const token = user && typeof (user as any).getIdToken === "function"
        ? await (user as any).getIdToken()
        : "";

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/tryon/history/${id}/save`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ isSaved: false })
      });

      if (res.ok) {
        toast.success(`Removed "${name || 'Outfit'}" from saved looks.`);
        setSavedOutfits((prev) => prev.filter((item) => item.id !== id));
      } else {
        throw new Error("API error");
      }
    } catch (err) {
      console.error("Unsave failed:", err);
      toast.error("Could not remove outfit from saved folder.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="space-y-1.5 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black text-white flex items-center justify-center md:justify-start gap-2.5">
            <Heart className="w-8 h-8 text-fuchsia-500 fill-fuchsia-500/20" />
            Saved <span className="gradient-text">Outfits</span>
          </h1>
          <p className="text-white/50 text-xs md:text-sm font-mono uppercase tracking-wider">
            Your curated virtual try-on looks and photorealistic bookmarked styling sessions.
          </p>
        </div>
        <Link
          href="/try-on"
          className="btn-futuristic bg-gradient-to-r from-neon-purple to-electric-blue text-xs py-3 px-6 text-white font-black tracking-widest uppercase"
        >
          ← Go To Studio
        </Link>
      </div>

      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-neon-purple animate-spin" />
          <p className="text-xs text-white/40 font-mono tracking-widest animate-pulse uppercase">
            Loading saved configurations...
          </p>
        </div>
      ) : savedOutfits.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-12 border border-white/5 bg-space-black/35 text-center max-w-xl mx-auto space-y-6"
        >
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto shadow-inner">
            <Heart className="w-7 h-7 text-white/30" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">No Saved Outfits</h3>
            <p className="text-xs text-white/40 font-mono leading-relaxed">
              You haven't bookmarked any virtual try-on styling sessions yet. Create a photorealistic fitting in the Studio and save it!
            </p>
          </div>
          <Link
            href="/try-on"
            className="w-full inline-block py-3.5 rounded-xl bg-gradient-to-r from-neon-purple to-purple-600 text-xs font-black tracking-widest uppercase hover:scale-[1.02] transition-all text-white border-transparent text-center"
          >
            Design First Outfit
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {savedOutfits.map((session, idx) => {
              const name = session.clothingName || "Custom Styled Outfit";
              const price = session.clothingPrice || "₹499";
              const store = session.clothingStore || session.platform || "Amazon";
              const dateStr = new Date(session.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric"
              });

              return (
                <motion.div
                  key={session.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3 }}
                  className="glass-card rounded-3xl overflow-hidden border border-white/5 bg-space-black/20 hover:border-fuchsia-500/30 transition-all duration-300 flex flex-col relative group"
                >
                  {/* Image Grid Comparison */}
                  <div className="grid grid-cols-2 aspect-[4/3] bg-white/5 border-b border-white/5 relative overflow-hidden">
                    <div className="relative overflow-hidden border-r border-white/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={session.userImageUrl} alt="Body Portrait" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 pointer-events-none" />
                      <span className="absolute bottom-2 left-2 text-[7px] font-bold text-white bg-black/60 px-2 py-0.5 rounded border border-white/10 tracking-widest uppercase font-mono">
                        Portrait
                      </span>
                    </div>
                    <div className="relative overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={session.resultImageUrl} alt="Try-On Fit" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                      <span className="absolute bottom-2 left-2 text-[7px] font-black text-fuchsia-400 bg-black/80 px-2 py-0.5 rounded border border-fuchsia-500/20 tracking-widest uppercase font-mono flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 animate-pulse" /> Try-On Fit
                      </span>
                    </div>

                    {/* Unsave trash button */}
                    <button
                      onClick={() => handleUnsave(session.id, name)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white/50 hover:text-red-400 transition-all border border-white/10 group-hover:scale-105 active:scale-95"
                      title="Unsave Outfit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Metadata and Description */}
                  <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-bold text-white tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase font-mono">
                          {store}
                        </span>
                        <span className="text-[8px] font-mono text-white/40 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {dateStr}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-white group-hover:text-fuchsia-400 transition-colors line-clamp-1">
                          {name}
                        </h3>
                        <p className="text-xs font-mono font-bold text-fuchsia-400">
                          {price}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                      {session.clothingProductUrl ? (
                        <button
                          onClick={() => handleBookNow(name, price, store, session.clothingProductUrl!)}
                          className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-[10px] font-bold tracking-wider text-center text-white flex items-center justify-center gap-1 cursor-pointer"
                        >
                          Book Now <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        <div className="w-full py-2.5 rounded-xl bg-white/[0.01] border border-white/5 text-[10px] font-bold text-white/20 text-center uppercase tracking-widest font-mono">
                          Unavailable
                        </div>
                      )}

                      <Link
                        href={`/try-on?gender=${session.platform ? 'male' : 'female'}&platform=${store.toLowerCase()}`}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-neon-purple/20 to-electric-blue/20 border border-neon-purple/30 hover:brightness-115 transition-all text-[10px] font-black tracking-widest uppercase text-center text-white flex items-center justify-center gap-1"
                      >
                        Adjust <ArrowLeftRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

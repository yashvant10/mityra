"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  ArrowUpRight, 
  CheckCircle, 
  Clock, 
  Copy, 
  ExternalLink, 
  Loader2,
  Percent,
  Link2,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface ClickRecord {
  id: string;
  clothingName: string;
  clothingPrice: string;
  clothingStore: string;
  platform: string;
  productUrl: string;
  affiliateUrl: string;
  timestamp: string;
  commissionRate: number;
  estimatedCommission: number;
  isConverted: boolean;
}

interface AffiliateStats {
  totalClicks: number;
  totalConversions: number;
  estimatedEarnings: number;
}

const STORE_COLORS: Record<string, string> = {
  flipkart: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  amazon: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  myntra: "text-pink-400 bg-pink-500/10 border-pink-500/20",
  ajio: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  meesho: "text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20",
};

export default function AffiliatePage() {
  const [stats, setStats] = useState<AffiliateStats>({ totalClicks: 0, totalConversions: 0, estimatedEarnings: 0 });
  const [history, setHistory] = useState<ClickRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Link generator states
  const [inputUrl, setInputUrl] = useState("");
  const [inputStore, setInputStore] = useState("amazon");
  const [inputName, setInputName] = useState("");
  const [inputPrice, setInputPrice] = useState("₹999");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);

  const loadAffiliateData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("tryonx_admin_token");
      if (!token) {
        window.location.href = "/admin";
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      
      // Fetch Stats
      const statsRes = await fetch(`${apiUrl}/admin/affiliate-stats`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats || { totalClicks: 0, totalConversions: 0, estimatedEarnings: 0 });
      }

      // Fetch History Log
      const historyRes = await fetch(`${apiUrl}/admin/affiliate-history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData.history || []);
      }
    } catch (err) {
      console.error("Failed to load affiliate analytics:", err);
      toast.error("Failed to retrieve affiliate analytics from ledger.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAffiliateData();
  }, []);

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl || !inputName) {
      toast.warning("Please fill in the product URL and custom name.");
      return;
    }
    
    setGeneratingLink(true);
    try {
      const token = localStorage.getItem("tryonx_admin_token");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      
      const res = await fetch(`${apiUrl}/admin/affiliate-click`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          clothingName: inputName,
          clothingPrice: inputPrice,
          clothingStore: inputStore,
          platform: inputStore,
          productUrl: inputUrl
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedUrl(data.affiliateUrl);
        toast.success("Affiliate link generated and click registered! 💰");
        setInputUrl("");
        setInputName("");
        setInputPrice("₹999");
        loadAffiliateData(); // Reload data to show the manual link click
      } else {
        throw new Error("API failure");
      }
    } catch (err) {
      toast.error("Failed to register and compile custom affiliate link.");
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Affiliate link copied to clipboard! 📋");
  };

  // Compute conversion rate percentage
  const conversionRate = stats.totalClicks > 0 
    ? parseFloat(((stats.totalConversions / stats.totalClicks) * 100).toFixed(1)) 
    : 0;

  // Aggregate by platform for comparison chart
  const platformStats = history.reduce((acc, click) => {
    const store = click.clothingStore.toLowerCase();
    if (!acc[store]) {
      acc[store] = { clicks: 0, earnings: 0, conversions: 0 };
    }
    acc[store].clicks++;
    if (click.isConverted) {
      acc[store].conversions++;
      acc[store].earnings += click.estimatedCommission;
    }
    return acc;
  }, {} as Record<string, { clicks: number; earnings: number; conversions: number }>);

  const storesList = ["amazon", "flipkart", "myntra", "ajio"];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      
      {/* Premium Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="space-y-1.5 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black text-white flex items-center justify-center md:justify-start gap-2.5">
            <DollarSign className="w-8 h-8 text-amber-500 fill-amber-500/20" />
            Affiliate <span className="gradient-text">Center</span>
          </h1>
          <p className="text-white/50 text-xs md:text-sm font-mono uppercase tracking-wider">
            Track clicks, compile commission statistics, and check referral earnings.
          </p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[10px] text-amber-400 font-mono font-bold tracking-widest uppercase">
            Affiliate Node Active
          </span>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 text-neon-purple animate-spin" />
          <p className="text-xs text-white/40 font-mono tracking-widest animate-pulse uppercase">
            Loading affiliate ledger stats...
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* 🟢 METRICS ROW */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Clicks */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass-card rounded-2xl p-5 border border-white/5 bg-space-black/35 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-16 h-16 text-blue-400" />
              </div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">
                Total Clicks
              </p>
              <div className="space-y-0.5">
                <h3 className="text-3xl font-black text-white tracking-tight">
                  {stats.totalClicks}
                </h3>
                <p className="text-[9px] text-blue-400 font-mono uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Book redirects logged
                </p>
              </div>
            </motion.div>

            {/* Total Conversions */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card rounded-2xl p-5 border border-white/5 bg-space-black/35 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="w-16 h-16 text-purple-400" />
              </div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">
                Conversions
              </p>
              <div className="space-y-0.5">
                <h3 className="text-3xl font-black text-white tracking-tight">
                  {stats.totalConversions}
                </h3>
                <p className="text-[9px] text-purple-400 font-mono uppercase tracking-wider">
                  🛒 Completed referrals
                </p>
              </div>
            </motion.div>

            {/* Conversion Rate */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass-card rounded-2xl p-5 border border-white/5 bg-space-black/35 flex flex-col justify-between h-32 relative overflow-hidden group hover:border-pink-500/30 transition-all duration-300"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-300">
                <Percent className="w-16 h-16 text-pink-400" />
              </div>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">
                Conversion Rate
              </p>
              <div className="space-y-0.5">
                <h3 className="text-3xl font-black text-white tracking-tight">
                  {conversionRate}%
                </h3>
                <p className="text-[9px] text-pink-400 font-mono uppercase tracking-wider">
                  📊 Avg merchant conversion
                </p>
              </div>
            </motion.div>

            {/* Estimated Earnings */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card rounded-2xl p-5 border border-amber-500/10 bg-amber-500/[0.02] shadow-[0_0_20px_rgba(245,158,11,0.02)] flex flex-col justify-between h-32 relative overflow-hidden group hover:border-amber-500/30 hover:bg-amber-500/[0.04] transition-all duration-300"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="w-16 h-16 text-amber-400" />
              </div>
              <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest font-mono">
                Estimated Earnings
              </p>
              <div className="space-y-0.5">
                <h3 className="text-3xl font-black text-amber-400 tracking-tight flex items-baseline gap-1">
                  ₹{stats.estimatedEarnings.toLocaleString("en-IN")}
                </h3>
                <p className="text-[9px] text-amber-500/80 font-mono uppercase tracking-wider flex items-center gap-1">
                  ✨ Accumulated Commission pool
                </p>
              </div>
            </motion.div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            
            {/* 🟢 QUICK LINK GENERATOR */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/5 bg-space-black/35 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                  <Link2 className="w-24 h-24 text-white" />
                </div>
                
                <div className="space-y-2 border-b border-white/5 pb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-amber-500" /> Quick Affiliate Link Compiler
                  </h3>
                  <p className="text-xs text-white/50 leading-relaxed font-mono">
                    Convert any standard merchant clothing page link into a tracked, commission-generating Look.ai affiliate link.
                  </p>
                </div>

                <form onSubmit={handleGenerateLink} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider block">Platform Store</label>
                      <select
                        value={inputStore}
                        onChange={(e) => setInputStore(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                      >
                        <option value="amazon">Amazon (8% Commission)</option>
                        <option value="flipkart">Flipkart (6% Commission)</option>
                        <option value="myntra">Myntra (10% Commission)</option>
                        <option value="ajio">Ajio (12% Commission)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider block">Estimated Price String</label>
                      <input
                        type="text"
                        placeholder="e.g. ₹1,299"
                        value={inputPrice}
                        onChange={(e) => setInputPrice(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider block">Custom Name / Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Traditional Embroidered Silk Sherwani"
                      value={inputName}
                      onChange={(e) => setInputName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-white/40 uppercase tracking-wider block">Original Product Page URL</label>
                    <input
                      type="url"
                      placeholder="https://www.amazon.in/dp/B07XJ8C8J7..."
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 font-mono"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={generatingLink}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 active:scale-98 transition-all text-xs font-black tracking-widest uppercase text-white shadow-lg border-transparent flex items-center justify-center gap-2"
                  >
                    {generatingLink ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Registering Click ledger...
                      </>
                    ) : (
                      <>
                        Compile & Register Tracked Affiliate Link <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Generated URL Box */}
                {generatedUrl && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="pt-4 border-t border-white/5 space-y-2"
                  >
                    <p className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">Generated Affiliate Link Ready</p>
                    <div className="flex bg-space-black rounded-xl border border-amber-500/20 overflow-hidden">
                      <div className="flex-1 px-4 py-3 text-[11px] font-mono text-white/70 truncate">
                        {generatedUrl}
                      </div>
                      <button
                        onClick={() => copyToClipboard(generatedUrl)}
                        className="bg-amber-500/10 border-l border-amber-500/20 px-4 flex items-center justify-center text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all"
                        title="Copy to Clipboard"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

              </div>
            </div>

            {/* 🟢 PLATFORM COMPARATIVE BREAKDOWN */}
            <div className="space-y-6">
              <div className="glass-card rounded-3xl p-6 border border-white/5 bg-space-black/35 space-y-5 h-full flex flex-col justify-between">
                <div className="space-y-1.5 border-b border-white/5 pb-3">
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4.5 h-4.5 text-amber-500" /> Platform Shares
                  </h3>
                  <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
                    Commission rates and earnings breakdown
                  </p>
                </div>

                <div className="space-y-4 flex-1 pt-2">
                  {storesList.map((store) => {
                    const statsForStore = platformStats[store] || { clicks: 0, earnings: 0, conversions: 0 };
                    
                    // Rates labels
                    let rateLabel = "8%";
                    if (store === "flipkart") { rateLabel = "6%"; }
                    else if (store === "myntra") { rateLabel = "10%"; }
                    else if (store === "ajio") { rateLabel = "12%"; }

                    // calculate percentage bar representation based on estimated earnings
                    const maxEarnings = Object.values(platformStats).reduce((max, s) => Math.max(max, s.earnings), 1);
                    const percentWidth = Math.max(10, Math.min(100, (statsForStore.earnings / maxEarnings) * 100));

                    return (
                      <div key={store} className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-white capitalize flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            {store} <span className="text-[9px] text-white/30">({rateLabel} rate)</span>
                          </span>
                          <span className="text-white/80 font-bold">
                            ₹{statsForStore.earnings.toLocaleString("en-IN")}
                          </span>
                        </div>

                        {/* Bar */}
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                            style={{ width: `${statsForStore.clicks > 0 ? percentWidth : 0}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-[9px] font-mono text-white/40 uppercase">
                          <span>{statsForStore.clicks} redirects</span>
                          <span>{statsForStore.conversions} conversions</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-[10px] text-white/50 leading-relaxed font-mono mt-4">
                  <p className="flex justify-between text-white mb-1">
                    <span className="font-bold flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-amber-500" /> Referral Tips:</span>
                  </p>
                  High-commission platforms like **Ajio (12%)** and **Myntra (10%)** generate substantially more earnings per purchase refer.
                </div>

              </div>
            </div>

          </div>

          {/* 🟢 CLICK TIMELINE LEDGER */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pl-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" /> Affiliate Click Stream Ledger
              </h3>
              <span className="text-[10px] text-white/40 font-mono">Showing latest {history.length} logged redirects</span>
            </div>

            {history.length === 0 ? (
              <div className="glass-card rounded-3xl p-12 border border-white/5 bg-space-black/35 text-center max-w-xl mx-auto space-y-6">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto shadow-inner">
                  <Link2 className="w-7 h-7 text-white/20" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-md font-bold text-white uppercase tracking-wider">No Clicks Logged Yet</h4>
                  <p className="text-xs text-white/40 font-mono leading-relaxed">
                    Once you select outfits in the Try-On studio or recommendations tab and click "Book Now", they will be recorded in this real-time ledger!
                  </p>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-3xl border border-white/5 bg-space-black/25 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left font-mono">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] text-white/40 uppercase tracking-widest font-black">
                        <th className="px-6 py-4">TIMESTAMP</th>
                        <th className="px-6 py-4">PRODUCT LABEL</th>
                        <th className="px-6 py-4 text-center">PLATFORM</th>
                        <th className="px-6 py-4 text-center">STATUS</th>
                        <th className="px-6 py-4 text-right">COMMISSION (EST)</th>
                        <th className="px-6 py-4 text-center">OUTBOUND</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-white/80">
                      {history.map((record) => {
                        const dateStr = new Date(record.timestamp).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        });
                        const store = record.clothingStore.toLowerCase();
                        const colorClass = STORE_COLORS[store] || "text-white bg-white/10 border-white/20";
                        
                        return (
                          <tr key={record.id} className="hover:bg-white/[0.01] transition-all">
                            <td className="px-6 py-4 whitespace-nowrap text-white/50 text-[10.5px]">
                              {dateStr}
                            </td>
                            <td className="px-6 py-4 max-w-xs">
                              <div className="space-y-0.5">
                                <p className="font-bold text-white line-clamp-1">{record.clothingName}</p>
                                <p className="text-[10px] text-amber-500/80 font-bold">{record.clothingPrice}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-widest ${colorClass}`}>
                                {store}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {record.isConverted ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[9.5px] font-bold text-green-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Converted
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9.5px] font-bold text-amber-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Pending
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-black text-amber-400 text-sm">
                              {record.isConverted ? `₹${record.estimatedCommission}` : "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                <a 
                                  href={record.affiliateUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 text-white/50 transition-all"
                                  title="Test Affiliate URL"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  onClick={() => copyToClipboard(record.affiliateUrl)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 text-white/50 transition-all"
                                  title="Copy URL"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
}

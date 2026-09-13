"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import {
  Crown,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  History,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Loader2
} from "lucide-react";
import TopNav from "@/components/dashboard/TopNav";
import Sidebar from "@/components/dashboard/Sidebar";

/* ─── Types ─── */
interface CreditTransaction {
  id: string;
  amount: number;
  type: 'addition' | 'deduction';
  description: string;
  createdAt: string;
}

interface PlanData {
  plan: 'free' | 'starter' | 'premium';
  credits: number;
  creditsUsed: number;
  triesUsedToday: number;
  maxTries: number;
  history: CreditTransaction[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function CreditsPlanPage() {
  const { user } = useAuth();
  const [data, setData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPlanData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const token = typeof (user as any).getIdToken === "function" ? await (user as any).getIdToken() : "";
        const res = await fetch(`${API_URL}/users/plan`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Failed to fetch plan data");
        const json = await res.json();
        
        setData({
          plan: ['starter', 'premium'].includes(json.plan) ? json.plan : 'free',
          credits: json.credits || 0,
          creditsUsed: json.creditsUsed || 0,
          triesUsedToday: json.triesUsedToday || 0,
          maxTries: json.maxTries || 0,
          history: json.history || []
        });
        setError(false);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPlanData();
  }, [user]);

  /* ─── Helpers ─── */
  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    } catch { return "Unknown Date"; }
  };

  const getPlanName = (tier: string) => {
    if (tier === 'premium') return 'Premium';
    if (tier === 'starter') return 'Starter';
    return 'Free';
  };

  const getPlanPrice = (tier: string) => {
    if (tier === 'premium') return '₹499 / month';
    if (tier === 'starter') return '₹199 / month';
    return '₹0';
  };

  /* ─── SVG Ring Component ─── */
  const CircularProgress = ({ value, max }: { value: number, max: number }) => {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} className="fill-none stroke-[#F5F0EB]" strokeWidth="6" />
          <motion.circle 
            cx="40" cy="40" r={radius} 
            className="fill-none stroke-[#C4727F]" 
            strokeWidth="6" strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-xl font-heading font-bold text-[#1A1A1A] leading-none">{value}</span>
          <span className="text-[9px] font-bold text-[#9B9B9B] uppercase tracking-wider mt-1">Left</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#FAF8F5]">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopNav />

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
          <motion.div 
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="max-w-[1200px] mx-auto space-y-8"
          >
            {/* Page Header */}
            <div>
              <h1 className="text-[28px] font-heading font-bold text-[#1A1A1A] mb-1">Credits & Plan</h1>
              <p className="text-[#6B6B6B] text-[13px]">Manage your MITYRA plan, credits and AI usage.</p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 bg-white rounded-[24px] border border-[#E8E0D8] animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="bg-white rounded-[24px] border border-[#E8E0D8] p-12 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">Unable to load your plan information.</h3>
                <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-[13px] font-bold mt-4">
                  Try Again →
                </button>
              </div>
            ) : data && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Current Plan Hero */}
                  <div className={`col-span-1 lg:col-span-2 rounded-[24px] p-8 border relative overflow-hidden flex flex-col justify-between ${
                    data.plan === 'premium' 
                      ? 'bg-[#1A1A1A] border-[#333] text-white shadow-[0_8px_32px_rgba(0,0,0,0.12)]' 
                      : 'bg-white border-[#E8E0D8] text-[#1A1A1A] shadow-[0_2px_12px_rgba(0,0,0,0.02)]'
                  }`}>
                    {data.plan === 'premium' && (
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Crown className="w-48 h-48 text-[#D4AF37]" />
                      </div>
                    )}
                    
                    <div className="relative z-10 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Crown className={`w-5 h-5 ${data.plan === 'premium' ? 'text-[#D4AF37]' : 'text-[#6B6B6B]'}`} />
                          <span className={`text-[12px] font-bold uppercase tracking-wider ${data.plan === 'premium' ? 'text-[#D4AF37]' : 'text-[#9B9B9B]'}`}>Current Plan</span>
                        </div>
                        <h2 className="text-[32px] font-heading font-bold mb-1">{getPlanName(data.plan)}</h2>
                        <p className={`text-[15px] ${data.plan === 'premium' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>{getPlanPrice(data.plan)}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                        data.plan === 'premium' ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-[#FAF8F5] border border-[#E8E0D8] text-[#1A1A1A]'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </div>
                    </div>

                    <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                      <p className={`text-[13px] ${data.plan === 'premium' ? 'text-[#A0A0A0]' : 'text-[#6B6B6B]'}`}>
                        {data.plan === 'free' ? 'Discover your style for free.' : 'Full access to premium fashion AI features.'}
                      </p>
                      {data.plan !== 'premium' ? (
                        <Link href="/pricing" className="px-6 py-2.5 rounded-full text-[13px] font-bold transition-all flex items-center gap-2 bg-[#1A1A1A] text-white hover:bg-[#333]">
                          Upgrade <ArrowRight className="w-4 h-4" />
                        </Link>
                      ) : (
                        <button className="px-6 py-2.5 rounded-full text-[13px] font-bold bg-white/10 hover:bg-white/20 transition-all flex items-center gap-2">
                          Manage Subscription <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Credit Balance */}
                  <div className="bg-white rounded-[24px] border border-[#E8E0D8] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <div>
                      <h3 className="text-[14px] font-bold text-[#6B6B6B] mb-6 uppercase tracking-wider">Credits Available</h3>
                      <div className="flex items-center justify-between">
                        <CircularProgress value={data.credits} max={data.credits + data.creditsUsed} />
                        <div className="text-right">
                          <p className="text-[32px] font-heading font-bold text-[#1A1A1A] leading-none mb-1">{data.credits}</p>
                          <p className="text-[12px] text-[#9B9B9B]">Total Credits</p>
                        </div>
                      </div>
                    </div>
                    
                    <button className="w-full mt-6 py-2.5 border-2 border-[#1A1A1A] rounded-full text-[13px] font-bold text-[#1A1A1A] hover:bg-[#FAF8F5] transition-colors flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4" /> Buy More Credits
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily Usage */}
                  <div className="bg-white rounded-[24px] border border-[#E8E0D8] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-[16px] font-heading font-bold text-[#1A1A1A]">Today's AI Usage</h3>
                      <span className="text-[12px] text-[#6B6B6B] bg-[#FAF8F5] px-2.5 py-1 rounded-md border border-[#E8E0D8]">Resets at midnight</span>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[13px] font-bold text-[#1A1A1A]">Try-Ons & Recommendations</span>
                          <span className="text-[13px] text-[#6B6B6B]">{data.triesUsedToday} / {data.maxTries}</span>
                        </div>
                        <div className="w-full h-2.5 bg-[#FAF8F5] rounded-full overflow-hidden border border-[#E8E0D8]">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${data.maxTries > 0 ? Math.min((data.triesUsedToday / data.maxTries) * 100, 100) : 0}%` }} 
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-[#C4727F] rounded-full"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-[13px] font-bold text-[#1A1A1A]">Premium Credits Used</span>
                          <span className="text-[13px] text-[#6B6B6B]">{data.creditsUsed} lifetime</span>
                        </div>
                        <div className="w-full h-2.5 bg-[#FAF8F5] rounded-full overflow-hidden border border-[#E8E0D8]">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${(data.credits + data.creditsUsed) > 0 ? Math.min((data.creditsUsed / (data.credits + data.creditsUsed)) * 100, 100) : 0}%` }} 
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-[#1A1A1A] rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Billing & Payments */}
                  <div className="bg-white rounded-[24px] border border-[#E8E0D8] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                    <h3 className="text-[16px] font-heading font-bold text-[#1A1A1A] mb-6">Billing & Payments</h3>
                    
                    <div className="bg-[#FAF8F5] rounded-xl p-5 border border-[#E8E0D8] flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-[#E8E0D8] shadow-sm">
                          <CreditCard className="w-5 h-5 text-[#6B6B6B]" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[#1A1A1A]">{data.plan === 'free' ? 'No Payment Method' : 'Card ending in ****'}</p>
                          <p className="text-[12px] text-[#9B9B9B]">{data.plan === 'free' ? 'Free Plan' : 'Next billing cycle'}</p>
                        </div>
                      </div>
                      {data.plan !== 'free' && (
                        <button className="text-[12px] font-bold underline text-[#6B6B6B]">Update</button>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <Link href="/pricing" className="flex-1 py-2.5 bg-[#FAF8F5] border border-[#E8E0D8] rounded-full text-center text-[13px] font-bold text-[#1A1A1A] hover:bg-[#F5F0EB] transition-colors">
                        View Pricing
                      </Link>
                      <button className="flex-1 py-2.5 bg-[#1A1A1A] text-white rounded-full text-center text-[13px] font-bold hover:bg-[#333] transition-colors">
                        Billing History
                      </button>
                    </div>
                  </div>
                </div>

                {/* Credit History */}
                <div className="bg-white rounded-[24px] border border-[#E8E0D8] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[16px] font-heading font-bold text-[#1A1A1A] flex items-center gap-2">
                      <History className="w-5 h-5 text-[#6B6B6B]" /> Credit History
                    </h3>
                  </div>

                  {data.history.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-[#FAF8F5] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#E8E0D8]">
                        <TrendingUp className="w-6 h-6 text-[#9B9B9B]" />
                      </div>
                      <h4 className="text-[15px] font-bold text-[#1A1A1A] mb-1">No credit activity yet.</h4>
                      <p className="text-[13px] text-[#6B6B6B]">Your future credit usage and purchases will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {data.history.map((tx, idx) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-[#FAF8F5] transition-colors border border-transparent hover:border-[#E8E0D8]">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              tx.type === 'addition' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#FAF8F5] text-[#1A1A1A]'
                            }`}>
                              {tx.type === 'addition' ? <Zap className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-[14px] font-bold text-[#1A1A1A]">{tx.description}</p>
                              <p className="text-[12px] text-[#9B9B9B]">{formatDate(tx.createdAt)}</p>
                            </div>
                          </div>
                          <span className={`text-[15px] font-bold ${tx.type === 'addition' ? 'text-emerald-600' : 'text-[#1A1A1A]'}`}>
                            {tx.type === 'addition' ? '+' : '-'}{tx.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Plan Comparison */}
                <div className="bg-white rounded-[24px] border border-[#E8E0D8] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                  <h3 className="text-[18px] font-heading font-bold text-[#1A1A1A] mb-8 text-center">Plan Comparison</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Free Plan */}
                    <div className="p-6 rounded-2xl border border-[#E8E0D8] bg-[#FAF8F5]">
                      <h4 className="text-[14px] font-bold text-[#6B6B6B] mb-2 uppercase tracking-wider">Free</h4>
                      <p className="text-[24px] font-heading font-bold text-[#1A1A1A] mb-6">₹0</p>
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-start gap-2 text-[13px] text-[#6B6B6B]"><CheckCircle2 className="w-4 h-4 text-[#C4727F] shrink-0 mt-0.5" /> Basic AI Try-On (Ads)</li>
                        <li className="flex items-start gap-2 text-[13px] text-[#6B6B6B]"><CheckCircle2 className="w-4 h-4 text-[#C4727F] shrink-0 mt-0.5" /> Standard Styling</li>
                        <li className="flex items-start gap-2 text-[13px] text-[#6B6B6B]"><CheckCircle2 className="w-4 h-4 text-[#C4727F] shrink-0 mt-0.5" /> Basic Wardrobe</li>
                      </ul>
                      {data.plan === 'free' ? (
                        <div className="w-full py-2.5 text-center bg-[#E8E0D8] text-[#6B6B6B] rounded-full text-[13px] font-bold">Current Plan</div>
                      ) : (
                        <Link href="/pricing" className="block w-full py-2.5 text-center bg-white border border-[#E8E0D8] rounded-full text-[13px] font-bold text-[#1A1A1A]">Select Free</Link>
                      )}
                    </div>

                    {/* Starter Plan */}
                    <div className="p-6 rounded-2xl border-2 border-[#1A1A1A] bg-white relative">
                      <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-[#1A1A1A] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Popular</div>
                      <h4 className="text-[14px] font-bold text-[#6B6B6B] mb-2 uppercase tracking-wider">Starter</h4>
                      <p className="text-[24px] font-heading font-bold text-[#1A1A1A] mb-6">₹199<span className="text-[14px] font-normal text-[#9B9B9B]">/mo</span></p>
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-start gap-2 text-[13px] text-[#1A1A1A]"><CheckCircle2 className="w-4 h-4 text-[#1A1A1A] shrink-0 mt-0.5" /> 100 Credits Included</li>
                        <li className="flex items-start gap-2 text-[13px] text-[#1A1A1A]"><CheckCircle2 className="w-4 h-4 text-[#1A1A1A] shrink-0 mt-0.5" /> Ad-Free Try-On</li>
                        <li className="flex items-start gap-2 text-[13px] text-[#1A1A1A]"><CheckCircle2 className="w-4 h-4 text-[#1A1A1A] shrink-0 mt-0.5" /> Premium Recommendations</li>
                      </ul>
                      {data.plan === 'starter' ? (
                        <div className="w-full py-2.5 text-center bg-[#E8E0D8] text-[#6B6B6B] rounded-full text-[13px] font-bold">Current Plan</div>
                      ) : (
                        <Link href="/pricing" className="block w-full py-2.5 text-center bg-[#1A1A1A] text-white rounded-full text-[13px] font-bold">Upgrade to Starter</Link>
                      )}
                    </div>

                    {/* Premium Plan */}
                    <div className="p-6 rounded-2xl border border-[#D4AF37] bg-gradient-to-br from-[#1A1A1A] to-[#333] text-white">
                      <h4 className="text-[14px] font-bold text-[#D4AF37] mb-2 uppercase tracking-wider">Premium</h4>
                      <p className="text-[24px] font-heading font-bold text-white mb-6">₹499<span className="text-[14px] font-normal text-white/60">/mo</span></p>
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-start gap-2 text-[13px] text-white/90"><CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" /> 300 Credits Included</li>
                        <li className="flex items-start gap-2 text-[13px] text-white/90"><CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" /> Unlimited Priority Generation</li>
                        <li className="flex items-start gap-2 text-[13px] text-white/90"><CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" /> Early Access Features</li>
                      </ul>
                      {data.plan === 'premium' ? (
                        <div className="w-full py-2.5 text-center bg-white/10 text-white rounded-full text-[13px] font-bold border border-white/20">Current Plan</div>
                      ) : (
                        <Link href="/pricing" className="block w-full py-2.5 text-center bg-[#D4AF37] text-black rounded-full text-[13px] font-bold">Upgrade to Premium</Link>
                      )}
                    </div>
                  </div>
                </div>

              </>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

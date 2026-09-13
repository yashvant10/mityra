"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Zap,
  Infinity,
  Shirt,
  Image as ImageIcon,
  Palette,
  LayoutTemplate,
  ScanFace,
  TrendingUp,
  Wand2,
  Lock,
  ChevronRight,
  Gift,
  CheckCircle2,
  Clock,
  Box,
  ImagePlus,
  Heart
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TopNav from "@/components/dashboard/TopNav";
import { toast } from "sonner";

export default function AIStudioPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All Tools");
  
  // Real data state
  const [analytics, setAnalytics] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

  const fetchStudioData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = typeof (user as any).getIdToken === "function" 
        ? await (user as any).getIdToken() 
        : "";

      // Fetch credits/analytics
      const analyticsRes = await fetch(`${API_URL}/payments/user-analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }

      // Fetch AI generation history
      const historyRes = await fetch(`${API_URL}/tryon/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Failed to load AI Studio data", error);
    } finally {
      setLoading(false);
    }
  }, [user, API_URL]);

  useEffect(() => {
    fetchStudioData();
  }, [fetchStudioData]);

  const tabs = ["All Tools", "Outfit Creation", "Image Tools", "Style Enhancement", "Personalization"];

  const tools = [
    {
      id: "outfit-gen",
      name: "AI Outfit Generator",
      desc: "Generate complete outfits based on occasion, style, and your preferences.",
      icon: Shirt,
      color: "bg-rose-100 text-rose-500",
      route: "/recommendations",
      category: "Outfit Creation",
      premium: false
    },
    {
      id: "style-transform",
      name: "Style Transformer",
      desc: "Transform your outfit style—casual to formal, streetwear to classic & more.",
      icon: Wand2,
      color: "bg-indigo-100 text-indigo-500",
      route: "/try-on",
      category: "Style Enhancement",
      premium: true
    },
    {
      id: "color-match",
      name: "Color & Match AI",
      desc: "AI-powered color coordination and matching for the perfect look.",
      icon: Palette,
      color: "bg-emerald-100 text-emerald-500",
      route: "#",
      category: "Personalization",
      premium: false,
      comingSoon: true
    },
    {
      id: "bg-studio",
      name: "Background Studio",
      desc: "Change backgrounds and create studio-quality fashion photos instantly.",
      icon: ImageIcon,
      color: "bg-amber-100 text-amber-500",
      route: "#",
      category: "Image Tools",
      premium: true,
      comingSoon: true
    },
    {
      id: "wardrobe-analyze",
      name: "Wardrobe Analyzer",
      desc: "AI analyzes your wardrobe and suggests what to wear and buy next.",
      icon: Box,
      color: "bg-blue-100 text-blue-500",
      route: "/wardrobe",
      category: "Personalization",
      premium: false
    },
    {
      id: "face-body",
      name: "Face & Body Analysis",
      desc: "Get AI insights on face shape, body type and styling that suits you best.",
      icon: ScanFace,
      color: "bg-orange-100 text-orange-500",
      route: "/find-your-look",
      category: "Personalization",
      premium: true
    },
    {
      id: "trend-explorer",
      name: "Trend Explorer",
      desc: "Explore AI-curated trending styles, outfits and fashion insights.",
      icon: TrendingUp,
      color: "bg-pink-100 text-pink-500",
      route: "/trends",
      category: "Style Enhancement",
      premium: false
    },
    {
      id: "look-enhancer",
      name: "Look Enhancer",
      desc: "Enhance your photos, improve lighting, colors and overall outfit appeal.",
      icon: ImagePlus,
      color: "bg-purple-100 text-purple-500",
      route: "#",
      category: "Image Tools",
      premium: true,
      comingSoon: true
    }
  ];

  const filteredTools = activeTab === "All Tools" 
    ? tools 
    : tools.filter(t => t.category === activeTab);

  const handleToolClick = (tool: any) => {
    if (tool.comingSoon) {
      toast.info(`${tool.name} is coming soon!`);
      return;
    }
    
    // Check premium access
    const isPremium = analytics?.subscriptionTier === "premium";
    if (tool.premium && !isPremium) {
      router.push("/pricing");
      return;
    }
    
    router.push(tool.route);
  };

  // Derive stats
  const totalGenerations = analytics?.totalGenerations || history.length || 0;
  const currentCredits = analytics?.currentCredits || 0;
  const maxCredits = analytics?.subscriptionTier === "premium" ? 500 : 25; // fallback
  const usedCredits = Math.max(0, maxCredits - currentCredits);
  const usagePercentage = Math.min(100, Math.round((usedCredits / maxCredits) * 100));

  const imagesEnhanced = history.filter(h => h.tool === "enhance").length || Math.floor(history.length * 0.4);
  const timeSaved = Math.round(totalGenerations * 5 / 60) || 0; // estimate 5 mins per gen

  return (
    <div className="flex-1 flex flex-col items-center pb-20">
      <div className="w-full max-w-[1400px]">
        <TopNav />

        <div className="px-4 sm:px-8 space-y-8 mt-2">
          
          {/* Header */}
          <div>
              <h1 className="text-[32px] font-bold text-[#1A1A1A] font-heading mb-1 flex items-center gap-2">
                  AI Studio <Sparkles className="w-6 h-6 text-[#D4AF37]" />
              </h1>
              <p className="text-[14px] text-[#6B6B6B]">Create, enhance and experiment with AI to elevate your style.</p>
          </div>

          {/* Filters */}
          <div className="flex gap-6 border-b border-[#E8E0D8] overflow-x-auto custom-scrollbar">
              {tabs.map(tab => (
                  <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`pb-4 text-[13px] font-bold whitespace-nowrap transition-colors border-b-2 ${
                          activeTab === tab 
                          ? "border-[#b95b6a] text-[#b95b6a]" 
                          : "border-transparent text-[#6B6B6B] hover:text-[#1A1A1A]"
                      }`}
                  >
                      {tab}
                  </button>
              ))}
          </div>

          <div className="flex flex-col xl:flex-row gap-8">
            
            {/* Main Content Area */}
            <div className="flex-1 space-y-10 min-w-0">
                
                {/* Hero Card */}
                <div className="bg-[#FAF1F2] rounded-[32px] p-8 md:p-10 border border-[#b95b6a]/10 relative overflow-hidden flex flex-col md:flex-row items-center justify-between shadow-[0_4px_24px_rgba(185,91,106,0.06)]">
                    
                    <div className="md:w-[55%] relative z-10 space-y-5">
                        <span className="text-[10px] font-bold tracking-widest text-[#b95b6a] uppercase">MITYRA POWERED</span>
                        <h2 className="text-[32px] md:text-[40px] font-bold text-[#1A1A1A] font-heading leading-tight mt-1 flex items-center gap-2">
                            Your Personal AI Stylist <Sparkles className="w-7 h-7 text-[#D4AF37]" />
                        </h2>
                        <p className="text-[14px] text-[#6B6B6B] max-w-md leading-relaxed">
                            From outfit ideas to virtual styling, use the power of AI to create looks that are uniquely you.
                        </p>
                        
                        <div className="flex items-center gap-6 pt-4">
                            <div className="flex flex-col items-center">
                                <Infinity className="w-6 h-6 text-[#b95b6a] mb-1" />
                                <span className="text-[11px] font-bold text-[#1A1A1A] text-center">Unlimited<br/>Creativity</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <Zap className="w-6 h-6 text-[#b95b6a] mb-1" />
                                <span className="text-[11px] font-bold text-[#1A1A1A] text-center">Smart<br/>AI Models</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[20px] font-black text-[#b95b6a] mb-0.5 leading-none mt-1">100+</span>
                                <span className="text-[11px] font-bold text-[#1A1A1A] text-center">Style<br/>Possibilities</span>
                            </div>
                        </div>
                    </div>

                    <div className="md:w-[45%] mt-8 md:mt-0 flex justify-end relative z-10">
                        {/* Illustration using generic high-quality fashion imagery to mimic the premium ref */}
                        <div className="relative w-full max-w-[320px] aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500 border-4 border-white">
                            <img src="https://images.unsplash.com/photo-1550614000-4b95d4662d5e?w=600&q=80" className="w-full h-full object-cover" alt="AI Stylist Demo" />
                        </div>
                    </div>

                    {/* Background Decors */}
                    <div className="absolute top-10 right-[30%] text-[#b95b6a]/15"><Sparkles className="w-12 h-12" /></div>
                    <div className="absolute bottom-10 left-[40%] text-[#b95b6a]/15"><Sparkles className="w-8 h-8" /></div>
                </div>

                {/* Popular AI Tools Grid */}
                <div>
                    <h2 className="text-[20px] font-bold text-[#1A1A1A] font-heading mb-5">Popular AI Tools</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredTools.map((tool, idx) => (
                            <motion.div
                                key={tool.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: idx * 0.05 }}
                                className="bg-white rounded-[24px] p-6 border border-[#E8E0D8] hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-[#E8E0D8] transition-all group flex flex-col justify-between min-h-[220px] relative overflow-hidden"
                            >
                                {tool.premium && (
                                    <div className="absolute top-4 right-4 bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] p-1.5 rounded-full shadow-sm" title="Premium Feature">
                                        <Lock className="w-3.5 h-3.5 text-amber-900" />
                                    </div>
                                )}
                                
                                <div>
                                    <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center mb-4 ${tool.color}`}>
                                        <tool.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-2">{tool.name}</h3>
                                    <p className="text-[12px] text-[#6B6B6B] leading-relaxed">{tool.desc}</p>
                                </div>
                                
                                <div className="mt-6 pt-4 border-t border-[#E8E0D8]">
                                    <button 
                                        onClick={() => handleToolClick(tool)}
                                        className={`text-[12px] font-bold flex items-center gap-1.5 transition-colors ${
                                            tool.comingSoon 
                                            ? "text-[#9B9B9B] cursor-not-allowed" 
                                            : "text-[#b95b6a] hover:text-[#a84e5b]"
                                        }`}
                                    >
                                        {tool.comingSoon ? "Coming Soon" : "Use Now"} 
                                        {!tool.comingSoon && <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* AI Studio History */}
                <div>
                    <div className="flex justify-between items-center mb-5">
                        <h2 className="text-[20px] font-bold text-[#1A1A1A] font-heading flex flex-col">
                            <span><Clock className="w-4 h-4 inline mr-1 text-[#6B6B6B]" /> AI Studio History</span>
                            <span className="text-[12px] text-[#6B6B6B] font-normal mt-1">View your recent AI creations and experiments.</span>
                        </h2>
                        <Link href="/tryon-history" className="text-[#b95b6a] text-[13px] font-bold hover:underline">View All History →</Link>
                    </div>

                    {loading ? (
                        <div className="flex gap-4 overflow-hidden">
                            {[1,2,3,4].map(i => <div key={i} className="w-48 aspect-square bg-[#FAF8F5] rounded-2xl animate-pulse"></div>)}
                        </div>
                    ) : history.length > 0 ? (
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                            {history.slice(0, 5).map((item, idx) => (
                                <Link 
                                    href={`/product-details?id=${item.id}&name=${encodeURIComponent(item.clothingName || 'AI Generation')}`}
                                    key={idx} 
                                    className="min-w-[160px] md:min-w-[180px] group cursor-pointer snap-start"
                                >
                                    <div className="aspect-[3/4] rounded-[20px] overflow-hidden bg-[#FAF8F5] border border-[#E8E0D8] mb-3 relative">
                                        <img src={item.resultImageUrl || item.clothingImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="History Item" />
                                    </div>
                                    <h4 className="text-[13px] font-bold text-[#1A1A1A] truncate group-hover:text-[#b95b6a] transition-colors">{item.clothingName || "AI Generated Look"}</h4>
                                    <p className="text-[10px] text-[#6B6B6B] mt-0.5 uppercase tracking-wider">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Just now"}</p>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-[#FAF8F5] border border-[#E8E0D8] rounded-[24px] p-8 text-center">
                            <p className="text-[14px] text-[#1A1A1A] font-bold mb-1">No AI creations yet.</p>
                            <p className="text-[12px] text-[#6B6B6B] mb-4">Start creating your first look using the tools above.</p>
                        </div>
                    )}
                </div>

            </div>
            
            {/* Right Sidebar */}
            <div className="w-full xl:w-[320px] space-y-6 flex-shrink-0">
                
                {/* AI Usage Box */}
                <div className="bg-white rounded-[28px] p-6 border border-[#E8E0D8] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                    <h3 className="text-[16px] font-bold text-[#1A1A1A] font-heading mb-6">AI Usage Today</h3>
                    
                    <div className="flex justify-center mb-6">
                        <div className="w-[120px] h-[120px] rounded-full border-[8px] border-[#FAF1F2] relative flex items-center justify-center">
                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                <circle cx="52" cy="52" r="52" fill="none" stroke="#b95b6a" strokeWidth="8" strokeDasharray="326" strokeDashoffset={`${326 - (326 * usagePercentage / 100)}`} strokeLinecap="round" className="translate-x-1 translate-y-1" />
                            </svg>
                            <div className="text-center relative z-10">
                                <span className="text-[24px] font-bold text-[#1A1A1A] leading-none">{usedCredits}</span>
                                <span className="text-[14px] text-[#6B6B6B]"> / {maxCredits}</span>
                                <p className="text-[10px] text-[#6B6B6B] uppercase font-bold tracking-wider mt-1">Used</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] text-[#6B6B6B] flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#b95b6a]"></span> Generation & Styling</span>
                            <span className="text-[12px] font-bold text-[#1A1A1A]">{usedCredits}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] text-[#6B6B6B] flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span> Available Credits</span>
                            <span className="text-[12px] font-bold text-[#1A1A1A]">{currentCredits}</span>
                        </div>
                    </div>
                </div>

                {/* Pro Tips */}
                <div className="bg-white rounded-[28px] p-6 border border-[#E8E0D8]">
                    <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-4">Pro Tips</h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] flex items-center justify-center flex-shrink-0">
                                <LayoutTemplate className="w-4 h-4 text-[#b95b6a]" />
                            </div>
                            <p className="text-[12px] text-[#6B6B6B] leading-relaxed">Be specific with your style preferences for better results.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] flex items-center justify-center flex-shrink-0">
                                <Heart className="w-4 h-4 text-[#b95b6a]" />
                            </div>
                            <p className="text-[12px] text-[#6B6B6B] leading-relaxed">Try different styles and save your favorites.</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] flex items-center justify-center flex-shrink-0">
                                <ImageIcon className="w-4 h-4 text-[#b95b6a]" />
                            </div>
                            <p className="text-[12px] text-[#6B6B6B] leading-relaxed">Use high quality images for best AI results.</p>
                        </div>
                    </div>
                    <div className="mt-4 text-right">
                        <Link href="/find-your-look" className="text-[#b95b6a] text-[11px] font-bold hover:underline">Learn More →</Link>
                    </div>
                </div>

                {/* Your AI Stats */}
                <div className="bg-white rounded-[28px] p-6 border border-[#E8E0D8]">
                    <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-4">Your AI Stats</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between pb-3 border-b border-[#E8E0D8]">
                            <span className="text-[12px] text-[#6B6B6B] flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#8BA888]" /> Looks Created</span>
                            <span className="text-[13px] font-bold text-[#1A1A1A]">{totalGenerations}</span>
                        </div>
                        <div className="flex items-center justify-between pb-3 border-b border-[#E8E0D8]">
                            <span className="text-[12px] text-[#6B6B6B] flex items-center gap-2"><ImageIcon className="w-4 h-4 text-[#D8A7A7]" /> Images Enhanced</span>
                            <span className="text-[13px] font-bold text-[#1A1A1A]">{imagesEnhanced}</span>
                        </div>
                        <div className="flex items-center justify-between pb-3 border-b border-[#E8E0D8]">
                            <span className="text-[12px] text-[#6B6B6B] flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#A89F91]" /> Experiments Run</span>
                            <span className="text-[13px] font-bold text-[#1A1A1A]">{totalGenerations}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] text-[#6B6B6B] flex items-center gap-2"><Clock className="w-4 h-4 text-[#94B0B7]" /> Time Saved</span>
                            <span className="text-[13px] font-bold text-[#1A1A1A]">{timeSaved}+ mins</span>
                        </div>
                    </div>
                </div>

                {/* Need Inspiration */}
                <div className="bg-[#FAF1F2] rounded-[28px] p-6 border border-[#b95b6a]/10 relative overflow-hidden">
                    <h3 className="text-[16px] font-bold text-[#1A1A1A] font-heading mb-1">Need Inspiration?</h3>
                    <p className="text-[12px] text-[#6B6B6B] mb-5 relative z-10 w-2/3">
                        Let AI surprise you with something amazing!
                    </p>
                    <button 
                        onClick={() => router.push("/recommendations")}
                        className="inline-flex items-center justify-center gap-2 bg-[#b95b6a] text-white py-2 px-5 rounded-full text-[12px] font-bold hover:bg-[#a84e5b] transition-colors shadow-md relative z-10"
                    >
                        Surprise Me <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute -bottom-4 -right-4 w-28 h-28 opacity-40 z-0">
                        <Gift className="w-full h-full text-[#b95b6a]" />
                    </div>
                </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

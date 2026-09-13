"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserCircle,
  Camera,
  Shirt,
  Heart,
  Calendar,
  Lock,
  CheckCircle2,
  Crown,
  ChevronRight,
  Eye,
  HeadphonesIcon,
  X,
  Sparkles,
  Edit3,
  Palette,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Link from "next/link";
import TopNav from "@/components/dashboard/TopNav";

/* ─── Types ─── */
interface StylePreferences {
  favoriteColors: string[];
  preferredStyles: string[];
  bodyType: string;
  gender: string;
  budget: 'low' | 'medium' | 'high' | 'luxury';
  occasions: string[];
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  bio: string;
  stylePreferences: StylePreferences;
  styleScore: number;
  subscription: string;
  createdAt: string;
  updatedAt: string;
  plan?: string;
  sizeProfile?: { heightCategory?: string; bodyType?: string; gender?: string; age?: number; phone?: string };
  phone?: string;
}

interface PlanInfo {
  plan: string;
  triesUsedToday: number;
  maxTries: number;
  adStatus: { canWatch: boolean; nextAvailableDate: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  
  /* ─── State ─── */
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [credits, setCredits] = useState<number>(0);
  
  // Stats & Recent Items
  const [wardrobeItems, setWardrobeItems] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [tryOnHistory, setTryOnHistory] = useState<any[]>([]);
  
  // UI State
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editHeight, setEditHeight] = useState("");

  /* ─── Data Fetching ─── */
  useEffect(() => {
    const loadAllData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const token = typeof (user as any).getIdToken === "function" ? await (user as any).getIdToken() : "";
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Profile & Credits
        let pRes = await fetch(`${API_URL}/users/profile`, { headers });
        if (pRes.status === 404) {
          // Auto-init profile if it doesn't exist
          await fetch(`${API_URL}/users/profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({ displayName: user.displayName || "User", email: user.email }),
          });
          pRes = await fetch(`${API_URL}/users/profile`, { headers });
        }
        if (pRes.ok) {
          const pData = await pRes.json();
          setProfile(pData.profile);
          setCredits(pData.profile?.credits ?? 0);
          
          // Populate edit form
          setEditName(pData.profile?.displayName || "");
          setEditPhone(pData.profile?.phone || "");
          setEditAge(pData.profile?.sizeProfile?.age?.toString() || "");
          setEditGender(pData.profile?.sizeProfile?.gender || pData.profile?.stylePreferences?.gender || "");
          setEditHeight(pData.profile?.sizeProfile?.heightCategory || "");
        }

        // 2. Plan Info
        const planRes = await fetch(`${API_URL}/users/plan`, { headers });
        if (planRes.ok) setPlanInfo(await planRes.json());

        // 3. Wardrobe
        const wRes = await fetch(`${API_URL}/wardrobe`, { headers });
        if (wRes.ok) {
          const wData = await wRes.json();
          setWardrobeItems(wData.items || []);
        }

        // 4. Try-On History
        const tRes = await fetch(`${API_URL}/tryon/history`, { headers });
        if (tRes.ok) {
          const tData = await tRes.json();
          setTryOnHistory(tData.history || []);
        }

        // 5. Favorites
        const fRes = await fetch(`${API_URL}/favorites`, { headers });
        if (fRes.ok) {
          const fData = await fRes.json();
          setFavorites(fData.favorites || []);
        }

      } catch (err) {
        console.error("Failed to load profile data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [user]);

  /* ─── Handlers ─── */
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      setIsSaving(true);
      const token = typeof (user as any).getIdToken === "function" ? await (user as any).getIdToken() : "";
      
      const updates = {
        displayName: editName,
        phone: editPhone,
        sizeProfile: {
          ...profile.sizeProfile,
          age: editAge ? parseInt(editAge) : undefined,
          gender: editGender,
          heightCategory: editHeight,
        }
      };

      const res = await fetch(`${API_URL}/users/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setIsEditModalOpen(false);
        toast.success("Profile updated successfully", {
          style: { background: "#F5F0EB", color: "#1A1A1A", border: "1px solid #E8E0D8" }
        });
      } else {
        throw new Error("Failed to save profile");
      }
    } catch (err) {
      toast.error("Could not save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  /* ─── Helpers ─── */
  const getInitials = () => {
    const name = profile?.displayName || user?.displayName || "User";
    const parts = name.split(" ");
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "Not available";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch { return "Not available"; }
  };

  const getPlanDetails = () => {
    const p = planInfo?.plan || profile?.plan || profile?.subscription || "free";
    if (p === "pro" || p === "premium") return { title: "Premium Plan", cta: "Manage Premium", isPremium: true };
    if (p === "student" || p === "starter") return { title: "Starter Plan", cta: "Manage Plan", isPremium: false };
    return { title: "Free Plan", cta: "Upgrade to Premium", isPremium: false };
  };

  const planDetails = getPlanDetails();
  
  // Calculate reset time for daily credits (end of day)
  const getResetTime = () => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const diff = endOfDay.getTime() - now.getTime();
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m`;
  };

  // SVG Arc calculation for Score
  const score = profile?.styleScore || 0;
  const arcRadius = 40;
  const arcCircumference = Math.PI * arcRadius;
  const arcOffset = arcCircumference - (score / 100) * arcCircumference;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] px-4 sm:px-8 max-w-7xl mx-auto space-y-6 pb-20 pt-4">
        <TopNav />
        <div className="h-10 w-48 bg-[#E8E0D8]/60 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-white rounded-2xl border border-[#E8E0D8] animate-pulse" />
          <div className="h-64 bg-white rounded-2xl border border-[#E8E0D8] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      {/* ─── TopNav ─── */}
      <div className="px-4 sm:px-8 max-w-7xl mx-auto">
        <TopNav />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto px-4 sm:px-8 space-y-6"
      >
        {/* ─── Page Header ─── */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-[#1A1A1A] mb-1">My Profile</h1>
          <p className="text-[#6B6B6B] text-[14px]">Manage your style, preferences and account</p>
        </div>

        {/* ─── Top Row: Profile & Plan ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* PROFILE CARD */}
          <div className="bg-white rounded-2xl border border-[#E8E0D8] p-6 sm:p-8 flex flex-col justify-between hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border border-[#E8E0D8] flex-shrink-0 bg-[#F5F0EB] flex items-center justify-center">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-[#C4727F]">{getInitials()}</span>
                )}
              </div>
              
              <div className="text-center sm:text-left flex-1">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <h2 className="text-xl font-heading font-bold text-[#1A1A1A]">{profile?.displayName || "User"}</h2>
                  <CheckCircle2 className="w-4 h-4 text-[#C4727F] fill-[#C4727F]/10" />
                </div>
                
                <p className="text-[13px] text-[#6B6B6B] mb-1">{profile?.email}</p>
                {profile?.phone && <p className="text-[13px] text-[#6B6B6B]">{profile.phone}</p>}
                
                <div className="flex items-center justify-center sm:justify-start gap-6 mt-4 pt-4 border-t border-[#F5F0EB]">
                  <div className="text-center sm:text-left">
                    <p className="text-[12px] font-bold text-[#1A1A1A]">{profile?.sizeProfile?.age ? `${profile.sizeProfile.age} Years` : "—"}</p>
                    <p className="text-[11px] text-[#9B9B9B]">Age</p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-[12px] font-bold text-[#1A1A1A] capitalize">{profile?.sizeProfile?.gender || profile?.stylePreferences?.gender || "—"}</p>
                    <p className="text-[11px] text-[#9B9B9B]">Gender</p>
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-[12px] font-bold text-[#1A1A1A]">{profile?.sizeProfile?.heightCategory || "—"}</p>
                    <p className="text-[11px] text-[#9B9B9B]">Height</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-center sm:justify-start">
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="btn-secondary px-6 py-2 rounded-full text-[13px] font-semibold flex items-center gap-2 cursor-pointer"
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* PREMIUM / PLAN CARD */}
          <div className="bg-[#FAF8F5] rounded-2xl border border-[#E8E0D8] p-6 sm:p-8 relative overflow-hidden flex flex-col justify-between hover:border-[#D4949E] transition-all">
            {/* Background Accent */}
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[#C4727F]/5 blur-[60px] pointer-events-none" />
            
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${planDetails.isPremium ? 'bg-[#D4AF37]/10' : 'bg-[#E8E0D8]'}`}>
                  <Crown className={`w-5 h-5 ${planDetails.isPremium ? 'text-[#D4AF37]' : 'text-[#6B6B6B]'}`} />
                </div>
                <div>
                  <p className="text-[11px] text-[#6B6B6B]">You are on</p>
                  <h3 className="text-lg font-heading font-bold text-[#1A1A1A]">{planDetails.title}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E8E0D8] text-[11px] font-semibold text-[#1A1A1A]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-6 items-center">
              {/* Credits Balance */}
              <div>
                <p className="text-[12px] font-bold text-[#1A1A1A] mb-1">Credits Balance</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-heading font-bold text-[#1A1A1A] tracking-tight">{credits}</span>
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-[13px] text-[#6B6B6B]">credits</span>
                </div>
                <Link href="/pricing" className="inline-block mt-3 px-4 py-1.5 rounded-full border border-[#C4727F] text-[#C4727F] text-[11px] font-bold hover:bg-[#C4727F] hover:text-white transition-colors">
                  {planDetails.cta}
                </Link>
              </div>

              {/* Daily Credits */}
              <div>
                <p className="text-[12px] font-bold text-[#1A1A1A] mb-1">Daily Credits</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[#1A1A1A]">{planInfo?.maxTries ? Math.max(0, planInfo.maxTries - planInfo.triesUsedToday) : 0}</span>
                  <span className="text-[14px] text-[#9B9B9B]">/ {planInfo?.maxTries || 0}</span>
                </div>
                <p className="text-[11px] text-[#6B6B6B] mt-1">Resets in {getResetTime()}</p>
              </div>

              {/* Progress Ring */}
              <div className="hidden sm:flex justify-end">
                <div className="relative w-14 h-14">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#E8E0D8"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#C4727F"
                      strokeWidth="3"
                      strokeDasharray={`${planInfo?.maxTries ? ((planInfo.maxTries - planInfo.triesUsedToday) / planInfo.maxTries) * 100 : 0}, 100`}
                    />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Features Row */}
            <div className="mt-6 pt-4 border-t border-[#E8E0D8] grid grid-cols-2 gap-y-2 gap-x-4">
              {['Virtual Try-On', 'Premium AI Styling', 'High Quality Results', 'Priority Processing'].map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-[#6B6B6B]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C4727F]" /> {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Middle Row: Style Profile & Score ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          
          {/* YOUR STYLE PROFILE */}
          <div className="bg-white rounded-2xl border border-[#E8E0D8] p-6 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all">
            <div className="flex items-center justify-between mb-6 border-b border-[#F5F0EB] pb-4">
              <h3 className="text-lg font-heading font-bold text-[#1A1A1A]">Your Style Profile</h3>
              <Link href="/find-your-look" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E8E0D8] text-[11px] font-semibold text-[#6B6B6B] hover:border-[#D4949E] transition-colors">
                <Edit3 className="w-3 h-3" /> Edit Style Profile
              </Link>
            </div>

            {profile?.stylePreferences && Object.keys(profile.stylePreferences).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[
                  { label: "Style Personality", value: profile.stylePreferences.preferredStyles?.join(", ") || "—", icon: Shirt },
                  { label: "Body Type", value: profile.stylePreferences.bodyType || "—", icon: UserCircle },
                  { label: "Occasions", value: profile.stylePreferences.occasions?.join(", ") || "—", icon: Calendar },
                  { label: "Color Preference", value: profile.stylePreferences.favoriteColors?.join(", ") || "—", icon: Palette },
                  { label: "Favorite Brands", value: "H&M, Zara, Nike", icon: Crown }, // placeholder since not in model
                  { label: "Budget Range", value: profile.stylePreferences.budget === 'low' ? "Under ₹1,000" : profile.stylePreferences.budget === 'medium' ? "₹1,000 - ₹5,000" : profile.stylePreferences.budget === 'high' ? "₹5,000 - ₹15,000" : "Luxury (₹15,000+)", icon: Eye },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#FAF8F5] flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-[#9B9B9B]" />
                    </div>
                    <div>
                      <p className="text-[11px] text-[#9B9B9B] mb-0.5">{item.label}</p>
                      <p className="text-[13px] font-semibold text-[#1A1A1A] capitalize">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-[#6B6B6B] text-sm mb-4">Complete your style profile to unlock personalized insights.</p>
                <Link href="/find-your-look" className="btn-rose px-6 py-2.5 rounded-full text-sm font-semibold inline-block">
                  Complete Style Profile →
                </Link>
              </div>
            )}
          </div>

          {/* AI STYLE SCORE */}
          <div className="bg-white rounded-2xl border border-[#E8E0D8] p-6 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all flex flex-col items-center text-center justify-center">
            {score > 0 ? (
              <>
                <h3 className="text-lg font-heading font-bold text-[#1A1A1A] self-start w-full text-left mb-6">AI Style Score</h3>
                <div className="relative w-36 h-20 overflow-hidden mb-2">
                  {/* Gauge Background */}
                  <svg className="w-full h-full absolute bottom-0 left-0" viewBox="0 0 100 50">
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#F5F0EB" strokeWidth="12" strokeLinecap="round" />
                    <path 
                      d="M 10 50 A 40 40 0 0 1 90 50" 
                      fill="none" 
                      stroke="url(#gradient)" 
                      strokeWidth="12" 
                      strokeLinecap="round"
                      strokeDasharray={`${(score / 100) * 125}, 125`} // Roughly half circumference
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#D4949E" />
                        <stop offset="100%" stopColor="#A85B67" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute bottom-0 left-0 right-0 flex items-baseline justify-center">
                    <span className="text-4xl font-heading font-bold text-[#1A1A1A] leading-none">{score}</span>
                    <span className="text-[14px] text-[#9B9B9B] ml-1">/100</span>
                  </div>
                </div>
                <p className="text-[13px] font-bold text-[#1A1A1A] mt-2">Great choices!</p>
                <p className="text-[11px] text-[#6B6B6B] mt-1">Keep exploring to improve your style score.</p>
              </>
            ) : (
              <div className="text-center w-full">
                <h3 className="text-lg font-heading font-bold text-[#1A1A1A] text-left mb-4">Style Profile</h3>
                <p className="text-[#6B6B6B] text-[13px] mb-4">Complete your style profile to unlock personalized insights.</p>
                <Link href="/find-your-look" className="text-[#C4727F] text-[12px] font-bold underline">Complete Profile →</Link>
              </div>
            )}
          </div>
        </div>

        {/* ─── Quick Activity Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Wardrobe", items: wardrobeItems, link: "/wardrobe", count: wardrobeItems.length, icon: Shirt },
            { title: "Favorites", items: favorites, link: "/favorites", count: favorites.length, icon: Heart },
            { title: "Try-On History", items: tryOnHistory, link: "/tryon-history", count: tryOnHistory.length, icon: Camera },
            { title: "Recently Viewed", items: [], link: "/", count: 0, icon: Eye }, // Empty state
          ].map((card, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-[#E8E0D8] p-5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#FAF8F5] flex items-center justify-center">
                    <card.icon className="w-4 h-4 text-[#C4727F]" />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-[#1A1A1A]">{card.title}</h4>
                    <p className="text-[11px] text-[#6B6B6B]">{card.count} {card.title.includes("Looks") || card.title.includes("History") ? "Looks" : "Items"}</p>
                  </div>
                </div>
                <Link href={card.link} className="text-[11px] font-bold text-[#C4727F] hover:underline">View all</Link>
              </div>

              {card.items.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {card.items.slice(0, 4).map((item, i) => (
                    <div key={i} className="aspect-[3/4] rounded-lg overflow-hidden bg-[#FAF8F5] border border-[#E8E0D8]">
                      <img src={item.imageUrl || item.userImageUrl || item.resultImageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {/* Fill empty slots if < 4 items */}
                  {Array.from({ length: Math.max(0, 4 - card.items.length) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-[3/4] rounded-lg bg-[#FAF8F5] border border-[#E8E0D8] border-dashed" />
                  ))}
                </div>
              ) : (
                <div className="w-full aspect-[4/1] bg-[#FAF8F5] rounded-xl border border-[#E8E0D8] border-dashed flex items-center justify-center">
                  <span className="text-[11px] text-[#9B9B9B]">No items yet.</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ─── Bottom Row: Account Info & Support ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          
          {/* ACCOUNT INFO */}
          <div className="bg-white rounded-2xl border border-[#E8E0D8] p-6 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all">
            <h3 className="text-lg font-heading font-bold text-[#1A1A1A] mb-6">Account Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#9B9B9B]">
                  <UserCircle className="w-3.5 h-3.5" /> Member Since
                </div>
                <p className="text-[13px] font-semibold text-[#1A1A1A]">{formatDate(profile?.createdAt)}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#9B9B9B]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Email
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-[#1A1A1A] truncate max-w-[120px]">{profile?.email}</p>
                  <span className="px-1.5 py-0.5 rounded border border-[#2D6A4F]/20 text-[#2D6A4F] text-[9px] font-bold uppercase">Verified</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#9B9B9B]">
                  <Lock className="w-3.5 h-3.5" /> Password
                </div>
                <p className="text-[13px] font-bold text-[#1A1A1A]">••••••••</p>
                <button className="text-[10px] text-[#C4727F] font-bold">Change Password</button>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#9B9B9B]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Account Status
                </div>
                <p className="text-[13px] font-bold text-[#2D6A4F]">Active</p>
                <button 
                  onClick={() => signOut()}
                  className="text-[10px] text-red-500 font-bold mt-1 block"
                >
                  Log Out
                </button>
              </div>

            </div>
          </div>

          {/* NEED HELP */}
          <div className="bg-[#FAF8F5] rounded-2xl border border-[#E8E0D8] p-6 relative overflow-hidden flex flex-col justify-center">
             {/* Decorative blob */}
             <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-[#D4AF37]/10 blur-[40px] pointer-events-none" />
             <div className="relative z-10">
               <h3 className="text-lg font-heading font-bold text-[#1A1A1A] mb-1">Need Help?</h3>
               <p className="text-[12px] text-[#6B6B6B] mb-5">We are here to help you anytime.</p>
               <button className="bg-white border border-[#E8E0D8] hover:border-[#D4949E] px-4 py-2 rounded-full text-[12px] font-semibold text-[#1A1A1A] flex items-center gap-2 transition-all cursor-pointer shadow-sm">
                 <HeadphonesIcon className="w-3.5 h-3.5 text-[#C4727F]" /> Contact Support
               </button>
             </div>
          </div>
        </div>

      </motion.div>

      {/* ─── Edit Profile Modal ─── */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isSaving && setIsEditModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-[#E8E0D8] z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-heading font-bold text-[#1A1A1A]">Edit Profile</h3>
                <button onClick={() => !isSaving && setIsEditModalOpen(false)} className="p-1.5 rounded-full hover:bg-[#FAF8F5] text-[#9B9B9B] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#9B9B9B]">Full Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required
                    className="w-full bg-[#FAF8F5] border border-[#E8E0D8] focus:border-[#C4727F] rounded-xl px-4 py-3 text-[14px] text-[#1A1A1A] outline-none transition-all" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#9B9B9B]">Phone Number</label>
                  <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E8E0D8] focus:border-[#C4727F] rounded-xl px-4 py-3 text-[14px] text-[#1A1A1A] outline-none transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#9B9B9B]">Age</label>
                    <input type="number" value={editAge} onChange={e => setEditAge(e.target.value)} min="13" max="120"
                      className="w-full bg-[#FAF8F5] border border-[#E8E0D8] focus:border-[#C4727F] rounded-xl px-4 py-3 text-[14px] text-[#1A1A1A] outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#9B9B9B]">Gender</label>
                    <select value={editGender} onChange={e => setEditGender(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-[#E8E0D8] focus:border-[#C4727F] rounded-xl px-4 py-3 text-[14px] text-[#1A1A1A] outline-none transition-all appearance-none">
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="unisex">Unisex</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#9B9B9B]">Height (e.g. 5'10")</label>
                  <input type="text" value={editHeight} onChange={e => setEditHeight(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-[#E8E0D8] focus:border-[#C4727F] rounded-xl px-4 py-3 text-[14px] text-[#1A1A1A] outline-none transition-all" />
                </div>

                <button type="submit" disabled={isSaving}
                  className="w-full btn-rose mt-2 py-3.5 rounded-xl text-[14px] font-bold shadow-md shadow-[#C4727F]/20 cursor-pointer disabled:opacity-70 flex justify-center items-center">
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

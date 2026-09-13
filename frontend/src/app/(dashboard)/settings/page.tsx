"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserCircle,
  Bell,
  Palette,
  Shield,
  CreditCard,
  Link as LinkIcon,
  HelpCircle,
  Settings,
  CheckCircle2,
  ChevronRight,
  Download,
  Trash2,
  Clock,
  Sparkles,
  Lock,
  MessageCircle,
  Crown,
  Gift,
  Camera
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { toast } from "sonner";
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

interface NotificationPreferences {
  newOutfitRecommendations: boolean;
  tryOnResults: boolean;
  priceDrops: boolean;
  productUpdates: boolean;
  tipsAndStyle: boolean;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  bio: string;
  phone?: string;
  stylePreferences: StylePreferences;
  styleScore: number;
  subscription: string;
  createdAt: string;
  updatedAt: string;
  plan?: string;
  sizeProfile?: { heightCategory?: string; bodyType?: string; gender?: string; age?: number; phone?: string };
  notificationPreferences?: NotificationPreferences;
}

interface PlanInfo {
  plan: string;
  triesUsedToday: number;
  maxTries: number;
  adStatus: { canWatch: boolean; nextAvailableDate: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

const SETTINGS_SECTIONS = [
  { id: "account", label: "Account", desc: "Personal information & account details", icon: UserCircle },
  { id: "style", label: "Style Preferences", desc: "Your style, body & fashion choices", icon: Palette },
  { id: "notifications", label: "Notifications", desc: "Manage alerts and updates", icon: Bell },
  { id: "privacy", label: "Privacy & Security", desc: "Data, privacy and security settings", icon: Shield },
  { id: "payment", label: "Payment & Plan", desc: "Manage subscription and credits", icon: CreditCard },
  { id: "connected", label: "Connected Accounts", desc: "Manage third-party connections", icon: LinkIcon },
  { id: "help", label: "Help & Support", desc: "FAQs, guides and contact support", icon: HelpCircle },
  { id: "advanced", label: "Advanced", desc: "Developer & advanced settings", icon: Settings },
];

export default function SettingsPage() {
  const { user } = useAuth();
  
  /* ─── State ─── */
  const [activeSection, setActiveSection] = useState("account");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<string | null>(null); // tracks which section is saving
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Notification State (optimistic updates)
  const [notifs, setNotifs] = useState<NotificationPreferences>({
    newOutfitRecommendations: true,
    tryOnResults: true,
    priceDrops: true,
    productUpdates: false,
    tipsAndStyle: true
  });

  /* ─── Data Fetching ─── */
  useEffect(() => {
    const loadAllData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const token = typeof (user as any).getIdToken === "function" ? await (user as any).getIdToken() : "";
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Profile & Credits
        const pRes = await fetch(`${API_URL}/users/profile`, { headers });
        if (pRes.ok) {
          const pData = await pRes.json();
          setProfile(pData.profile);
          setCredits(pData.profile?.credits ?? 0);
          if (pData.profile?.notificationPreferences) {
            setNotifs(pData.profile.notificationPreferences);
          }
        }

        // 2. Plan Info
        const planRes = await fetch(`${API_URL}/users/plan`, { headers });
        if (planRes.ok) setPlanInfo(await planRes.json());

      } catch (err) {
        console.error("Failed to load settings data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [user]);

  /* ─── Handlers ─── */
  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleToggleNotification = async (key: keyof NotificationPreferences) => {
    if (!profile) return;
    
    // Optimistic UI Update
    const updatedNotifs = { ...notifs, [key]: !notifs[key] };
    setNotifs(updatedNotifs);
    setSaving("notifications");

    try {
      const token = typeof (user as any).getIdToken === "function" ? await (user as any).getIdToken() : "";
      const updates = { notificationPreferences: updatedNotifs };

      const res = await fetch(`${API_URL}/users/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success("Saved ✓", { style: { background: "#F5F0EB", color: "#1A1A1A", border: "1px solid #E8E0D8" } });
    } catch (err) {
      toast.error("Failed to update setting.");
      setNotifs(notifs); // revert
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteAccount = () => {
    toast.error("Please contact support to initiate account deletion.", { 
      duration: 5000, 
      style: { background: "#FEE2E2", color: "#991B1B", border: "1px solid #FCA5A5" } 
    });
    setShowDeleteConfirm(false);
  };

  /* ─── Helpers ─── */
  const getInitials = () => {
    const name = profile?.displayName || user?.displayName || "User";
    const parts = name.split(" ");
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "Not added";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return "Not added"; }
  };

  const getPlanDetails = () => {
    const p = planInfo?.plan || profile?.plan || profile?.subscription || "free";
    if (p === "pro" || p === "premium") return { title: "Premium Plan", isPremium: true };
    if (p === "student" || p === "starter") return { title: "Starter Plan", isPremium: false };
    return { title: "Free Plan", isPremium: false };
  };

  const getResetTime = () => {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const diff = endOfDay.getTime() - now.getTime();
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}:${m.toString().padStart(2, '0')}:${new Date().getSeconds().toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] px-4 sm:px-8 max-w-7xl mx-auto space-y-6 pb-20 pt-4">
        <TopNav />
        <div className="h-10 w-48 bg-[#E8E0D8]/60 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10">
          <div className="h-[600px] bg-white rounded-2xl border border-[#E8E0D8] animate-pulse" />
          <div className="space-y-6">
            <div className="h-80 bg-white rounded-2xl border border-[#E8E0D8] animate-pulse" />
            <div className="h-64 bg-white rounded-2xl border border-[#E8E0D8] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const planDetails = getPlanDetails();

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
        className="max-w-[1400px] mx-auto px-4 sm:px-8 mt-6"
      >
        {/* ─── Page Header ─── */}
        <div className="mb-10">
          <h1 className="text-[28px] font-heading font-bold text-[#1A1A1A] mb-1">Settings</h1>
          <p className="text-[#6B6B6B] text-[13px]">Manage your account, preferences and app experience</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 items-start relative">
          
          {/* ─── Left Sidebar (In-page Settings Nav) ─── */}
          <div className="w-full lg:w-[320px] shrink-0 sticky top-6 space-y-6 hidden lg:block">
            <div className="flex flex-col space-y-1">
              {SETTINGS_SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`flex items-start gap-4 p-4 rounded-2xl text-left transition-all ${
                      isActive 
                        ? "bg-[#FAF8F5] border border-[#E8E0D8] shadow-[0_2px_10px_rgba(0,0,0,0.02)]" 
                        : "hover:bg-[#FAF8F5] border border-transparent"
                    }`}
                  >
                    <section.icon className={`w-5 h-5 mt-0.5 ${isActive ? "text-[#C4727F]" : "text-[#9B9B9B]"}`} />
                    <div>
                      <p className={`text-[14px] font-bold ${isActive ? "text-[#1A1A1A]" : "text-[#6B6B6B]"}`}>{section.label}</p>
                      <p className={`text-[11px] ${isActive ? "text-[#6B6B6B]" : "text-[#9B9B9B]"}`}>{section.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Refer & Earn Banner */}
            <div className="bg-[#FAF8F5] rounded-2xl border border-[#E8E0D8] p-5">
              <h4 className="text-[14px] font-bold text-[#1A1A1A] mb-1">Refer & Earn</h4>
              <p className="text-[12px] text-[#6B6B6B] mb-1">Invite friends and earn</p>
              <p className="text-[12px] font-bold text-[#C4727F] mb-4">50 credits</p>
              <div className="flex justify-between items-end">
                <button className="bg-white border border-[#E8E0D8] px-4 py-1.5 rounded-full text-[11px] font-bold text-[#1A1A1A] hover:bg-[#F5F0EB] transition-colors">
                  Invite Now
                </button>
                <Gift className="w-10 h-10 text-[#C4727F] opacity-20" />
              </div>
            </div>
          </div>

          {/* ─── Right Content Area ─── */}
          <div className="flex-1 space-y-8 w-full max-w-[900px]">
            
            {/* 1. Account Information */}
            <div id="section-account" className="bg-white rounded-3xl border border-[#E8E0D8] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="flex items-start justify-between mb-8 border-b border-[#F5F0EB] pb-6">
                <div>
                  <h3 className="text-xl font-heading font-bold text-[#1A1A1A] mb-1">Account Information</h3>
                  <p className="text-[13px] text-[#6B6B6B]">Update your personal details and contact information.</p>
                </div>
                <Link href="/profile" className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E8E0D8] text-[12px] font-semibold text-[#1A1A1A] hover:border-[#D4949E] transition-colors">
                  <UserCircle className="w-4 h-4 text-[#C4727F]" /> Edit Profile
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-10">
                {/* Photo */}
                <div className="flex flex-col items-center gap-4 shrink-0">
                  <div className="w-28 h-28 rounded-full overflow-hidden border border-[#E8E0D8] bg-[#FAF8F5] flex items-center justify-center">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-[#C4727F]">{getInitials()}</span>
                    )}
                  </div>
                  <button className="text-[11px] font-bold text-[#C4727F] px-4 py-1.5 rounded-full border border-[#C4727F] hover:bg-[#C4727F] hover:text-white transition-colors w-full">
                    Change Photo
                  </button>
                </div>

                {/* Details Grid */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                    <p className="text-[11px] text-[#9B9B9B] mb-1">Full Name</p>
                    <p className="text-[14px] font-bold text-[#1A1A1A]">{profile?.displayName || "Not added"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[11px] text-[#9B9B9B] mb-1">Email</p>
                    <div className="flex items-center gap-3">
                      <p className="text-[14px] font-bold text-[#1A1A1A]">{profile?.email}</p>
                      <span className="px-2 py-0.5 rounded border border-emerald-500/20 text-emerald-600 text-[10px] font-bold uppercase tracking-wider bg-emerald-50">Verified</span>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-[11px] text-[#9B9B9B] mb-1">Phone Number</p>
                    <div className="flex items-center gap-3">
                      <p className="text-[14px] font-bold text-[#1A1A1A]">{profile?.phone || "Not added"}</p>
                      {profile?.phone && <span className="px-2 py-0.5 rounded border border-emerald-500/20 text-emerald-600 text-[10px] font-bold uppercase tracking-wider bg-emerald-50">Verified</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#9B9B9B] mb-1">Age</p>
                    <p className="text-[14px] font-bold text-[#1A1A1A]">{profile?.sizeProfile?.age ? `${profile.sizeProfile.age} Years` : "Not added"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#9B9B9B] mb-1">Gender</p>
                    <p className="text-[14px] font-bold text-[#1A1A1A] capitalize">{profile?.sizeProfile?.gender || profile?.stylePreferences?.gender || "Not added"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#9B9B9B] mb-1">Height</p>
                    <p className="text-[14px] font-bold text-[#1A1A1A]">{profile?.sizeProfile?.heightCategory || "Not added"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#9B9B9B] mb-1">Member Since</p>
                    <p className="text-[14px] font-bold text-[#1A1A1A]">{formatDate(profile?.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Style Preferences */}
            <div id="section-style" className="bg-white rounded-3xl border border-[#E8E0D8] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="flex items-start justify-between mb-8 border-b border-[#F5F0EB] pb-6">
                <div>
                  <h3 className="text-xl font-heading font-bold text-[#1A1A1A] mb-1">Style Preferences</h3>
                  <p className="text-[13px] text-[#6B6B6B]">Your current style profile at a glance.</p>
                </div>
                <Link href="/find-your-look" className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E8E0D8] text-[12px] font-semibold text-[#1A1A1A] hover:border-[#D4949E] transition-colors">
                  <Palette className="w-3.5 h-3.5 text-[#C4727F]" /> Edit
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                {[
                  { label: "Style Personality", value: profile?.stylePreferences?.preferredStyles?.join(", ") || "Not added", icon: "👕" },
                  { label: "Occasions", value: profile?.stylePreferences?.occasions?.join(", ") || "Not added", icon: "🗓️" },
                  { label: "Body Type", value: profile?.stylePreferences?.bodyType || "Not added", icon: "🧍" },
                  { label: "Favorite Brands", value: "Not added", icon: "🏷️" }, // Placeholder, not in model
                  { label: "Color Preference", value: profile?.stylePreferences?.favoriteColors?.join(", ") || "Not added", icon: "🎨" },
                  { label: "Budget Range", value: profile?.stylePreferences?.budget === 'low' ? "Under ₹1,000" : profile?.stylePreferences?.budget === 'medium' ? "₹1,000 - ₹5,000" : profile?.stylePreferences?.budget === 'high' ? "₹5,000 - ₹15,000" : profile?.stylePreferences?.budget === 'luxury' ? "₹15,000+" : "Not added", icon: "💰" },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-center">
                    <div className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#E8E0D8] flex items-center justify-center text-lg flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-[11px] text-[#9B9B9B] mb-0.5">{item.label}</p>
                      <p className="text-[14px] font-semibold text-[#1A1A1A] capitalize">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/find-your-look" className="w-full block text-center py-3 rounded-xl bg-[#FAF8F5] border border-[#E8E0D8] text-[#C4727F] text-[13px] font-bold hover:bg-[#F5F0EB] transition-colors">
                Update Style Profile
              </Link>
            </div>

            {/* Grid for Notifications & Privacy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* 3. Notification Settings */}
              <div id="section-notifications" className="bg-white rounded-3xl border border-[#E8E0D8] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="mb-8 border-b border-[#F5F0EB] pb-6">
                  <h3 className="text-xl font-heading font-bold text-[#1A1A1A] mb-1">Notification Settings</h3>
                  <p className="text-[13px] text-[#6B6B6B]">Choose what notifications you want to receive.</p>
                </div>
                
                <div className="space-y-6">
                  {[
                    { key: "newOutfitRecommendations", label: "New Outfit Recommendations", desc: "Get notified about new AI recommendations", icon: Bell },
                    { key: "tryOnResults", label: "Try-On Results", desc: "When your try-on results are ready", icon: Camera },
                    { key: "priceDrops", label: "Price Drops & Offers", desc: "Get alerts on price drops and special offers", icon: Gift },
                    { key: "productUpdates", label: "Product Updates", desc: "Updates on your favorite products", icon: Sparkles },
                    { key: "tipsAndStyle", label: "Tips & Style Updates", desc: "Style tips, trends and fashion updates", icon: Palette },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-center justify-between gap-4">
                      <div className="flex gap-3">
                        <setting.icon className="w-4 h-4 text-[#C4727F] mt-1 shrink-0" />
                        <div>
                          <p className="text-[13px] font-bold text-[#1A1A1A]">{setting.label}</p>
                          <p className="text-[11px] text-[#6B6B6B]">{setting.desc}</p>
                        </div>
                      </div>
                      
                      {/* Custom Toggle */}
                      <button 
                        onClick={() => handleToggleNotification(setting.key as keyof NotificationPreferences)}
                        disabled={saving === "notifications"}
                        className={`w-10 h-5 rounded-full relative transition-colors ${notifs[setting.key as keyof NotificationPreferences] ? "bg-emerald-600" : "bg-[#E8E0D8]"} shrink-0`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${notifs[setting.key as keyof NotificationPreferences] ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-[#F5F0EB]">
                  <button className="text-[12px] font-bold text-[#C4727F] flex items-center gap-1.5 hover:underline">
                    Manage Email Preferences <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 4. Privacy & Security */}
              <div id="section-privacy" className="bg-white rounded-3xl border border-[#E8E0D8] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="mb-8 border-b border-[#F5F0EB] pb-6">
                  <h3 className="text-xl font-heading font-bold text-[#1A1A1A] mb-1">Privacy & Security</h3>
                  <p className="text-[13px] text-[#6B6B6B]">Manage your privacy and security preferences.</p>
                </div>
                
                <div className="space-y-6">
                  {/* Password */}
                  <div className="flex items-center justify-between group cursor-pointer border-b border-[#F5F0EB] pb-4">
                    <div className="flex gap-3">
                      <Lock className="w-4 h-4 text-[#9B9B9B] mt-1" />
                      <div>
                        <p className="text-[13px] font-bold text-[#1A1A1A]">Change Password</p>
                        <p className="text-[11px] text-[#6B6B6B]">Update your account password</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9B9B9B] group-hover:text-[#1A1A1A] transition-colors" />
                  </div>
                  
                  {/* 2FA */}
                  <div className="flex items-center justify-between border-b border-[#F5F0EB] pb-4 opacity-50 cursor-not-allowed">
                    <div className="flex gap-3">
                      <Shield className="w-4 h-4 text-[#9B9B9B] mt-1" />
                      <div>
                        <p className="text-[13px] font-bold text-[#1A1A1A]">Two-Factor Authentication</p>
                        <p className="text-[11px] text-[#6B6B6B]">Coming soon</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9B9B9B]" />
                  </div>
                  
                  {/* Login Activity */}
                  <div className="flex items-center justify-between group cursor-pointer border-b border-[#F5F0EB] pb-4">
                    <div className="flex gap-3">
                      <Clock className="w-4 h-4 text-[#9B9B9B] mt-1" />
                      <div>
                        <p className="text-[13px] font-bold text-[#1A1A1A]">Login Activity</p>
                        <p className="text-[11px] text-[#6B6B6B]">View your recent login history</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9B9B9B] group-hover:text-[#1A1A1A] transition-colors" />
                  </div>

                  {/* Download Data */}
                  <div className="flex items-center justify-between group cursor-pointer border-b border-[#F5F0EB] pb-4">
                    <div className="flex gap-3">
                      <Download className="w-4 h-4 text-[#9B9B9B] mt-1" />
                      <div>
                        <p className="text-[13px] font-bold text-[#1A1A1A]">Download Your Data</p>
                        <p className="text-[11px] text-[#6B6B6B]">Download a copy of your data</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9B9B9B] group-hover:text-[#1A1A1A] transition-colors" />
                  </div>
                  
                  {/* Delete Account */}
                  <div className="flex items-center justify-between group cursor-pointer" onClick={() => setShowDeleteConfirm(true)}>
                    <div className="flex gap-3">
                      <Trash2 className="w-4 h-4 text-red-400 mt-1" />
                      <div>
                        <p className="text-[13px] font-bold text-red-500">Delete Account</p>
                        <p className="text-[11px] text-[#6B6B6B]">Permanently delete your account</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#9B9B9B] group-hover:text-[#1A1A1A] transition-colors" />
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Payment & Plan */}
            <div id="section-payment" className="bg-white rounded-3xl border border-[#E8E0D8] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="mb-8 border-b border-[#F5F0EB] pb-6">
                <h3 className="text-xl font-heading font-bold text-[#1A1A1A] mb-1">Your Plan & Credits</h3>
                <p className="text-[13px] text-[#6B6B6B]">Manage your subscription and credits.</p>
              </div>

              <div className="bg-[#FAF8F5] rounded-2xl border border-[#E8E0D8] p-6 relative overflow-hidden mb-6">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${planDetails.isPremium ? 'bg-[#D4AF37]/10' : 'bg-[#E8E0D8]'}`}>
                      <Crown className={`w-5 h-5 ${planDetails.isPremium ? 'text-[#D4AF37]' : 'text-[#6B6B6B]'}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-heading font-bold text-[#1A1A1A]">{planDetails.title}</h3>
                      <p className="text-[11px] text-[#6B6B6B]">Next billing: Not available</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#E8E0D8] text-[11px] font-semibold text-[#1A1A1A]">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-6 items-center">
                  <div>
                    <p className="text-[12px] font-bold text-[#1A1A1A] mb-1">Credits Balance</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-heading font-bold text-[#1A1A1A] tracking-tight">{credits}</span>
                      <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <Link href="/pricing" className="inline-block mt-3 px-4 py-1.5 rounded-full border border-[#C4727F] text-[#C4727F] text-[11px] font-bold hover:bg-[#C4727F] hover:text-white transition-colors">
                      Buy More Credits
                    </Link>
                  </div>

                  <div>
                    <p className="text-[12px] font-bold text-[#1A1A1A] mb-1">Daily Credits</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-[#1A1A1A]">{planInfo?.maxTries ? Math.max(0, planInfo.maxTries - planInfo.triesUsedToday) : 0}</span>
                      <span className="text-[14px] text-[#9B9B9B]">/ {planInfo?.maxTries || 0}</span>
                    </div>
                    <p className="text-[11px] text-[#6B6B6B] mt-1">Resets in {getResetTime()}</p>
                  </div>

                  {/* Progress Ring */}
                  <div className="hidden sm:flex justify-end pr-4">
                    <div className="relative w-14 h-14">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E8E0D8" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#C4727F" strokeWidth="3"
                          strokeDasharray={`${planInfo?.maxTries ? ((planInfo.maxTries - planInfo.triesUsedToday) / planInfo.maxTries) * 100 : 0}, 100`} />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Link href="/pricing" className="flex items-center justify-between group">
                  <div className="flex gap-3 items-center">
                    <CreditCard className="w-4 h-4 text-[#9B9B9B]" />
                    <span className="text-[13px] font-bold text-[#1A1A1A]">View Billing History</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#9B9B9B] group-hover:text-[#1A1A1A] transition-colors" />
                </Link>
                <div className="w-full h-px bg-[#F5F0EB]" />
                <Link href="/pricing" className="flex items-center justify-between group">
                  <div className="flex gap-3 items-center">
                    <Settings className="w-4 h-4 text-[#9B9B9B]" />
                    <span className="text-[13px] font-bold text-[#1A1A1A]">Manage Subscription</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#9B9B9B] group-hover:text-[#1A1A1A] transition-colors" />
                </Link>
              </div>
            </div>

            {/* 6. Help & Support */}
            <div id="section-help" className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              
              <div className="bg-white rounded-2xl border border-[#E8E0D8] p-6 shadow-sm">
                <h4 className="text-[14px] font-bold text-[#1A1A1A] mb-1">Need Help?</h4>
                <p className="text-[11px] text-[#6B6B6B] mb-4">We are here to help you anytime.</p>
                <button className="px-4 py-1.5 rounded-full border border-[#E8E0D8] text-[12px] font-bold text-[#1A1A1A] hover:bg-[#FAF8F5] transition-colors">
                  Contact Support
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-[#E8E0D8] p-6 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-[#FAF8F5] flex items-center justify-center mb-3">
                  <HelpCircle className="w-4 h-4 text-[#C4727F]" />
                </div>
                <h4 className="text-[14px] font-bold text-[#1A1A1A] mb-1">Help Center</h4>
                <p className="text-[11px] text-[#6B6B6B] mb-4">Guides, tips and tutorials</p>
                <button className="text-[12px] font-bold text-[#C4727F] flex items-center gap-1 hover:underline">
                  Visit Help Center <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-[#E8E0D8] p-6 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-[#FAF8F5] flex items-center justify-center mb-3">
                  <MessageCircle className="w-4 h-4 text-[#C4727F]" />
                </div>
                <h4 className="text-[14px] font-bold text-[#1A1A1A] mb-1">Live Chat</h4>
                <p className="text-[11px] text-[#6B6B6B] mb-4">Chat with our support team</p>
                <button className="text-[12px] font-bold text-[#C4727F] flex items-center gap-1 hover:underline">
                  Start Chat <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

            <div className="pt-10 pb-6 text-center border-t border-[#E8E0D8]/50 mt-12">
              <div className="flex items-center justify-center gap-2 text-[11px] text-[#9B9B9B]">
                <Lock className="w-3 h-3" /> Secure Payments · Cancel Anytime · Your Data is Always Safe
              </div>
            </div>

          </div>
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 border border-[#E8E0D8] z-10 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-heading font-bold text-[#1A1A1A] mb-2">Delete Account?</h3>
              <p className="text-[13px] text-[#6B6B6B] mb-6">This action cannot be undone. All your wardrobe items, favorites, and Try-On history will be permanently erased.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-full border border-[#E8E0D8] text-[13px] font-bold text-[#1A1A1A] hover:bg-[#FAF8F5]">Cancel</button>
                <button onClick={handleDeleteAccount} className="flex-1 py-2.5 rounded-full bg-red-500 text-white text-[13px] font-bold hover:bg-red-600 shadow-sm">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

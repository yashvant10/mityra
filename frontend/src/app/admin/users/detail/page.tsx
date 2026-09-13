"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { ArrowLeft, Ban, ShieldCheck, Gift, X, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminUserDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const uid = searchParams.get('id') as string;
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gift modal state
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);
  const [giftPlan, setGiftPlan] = useState("pro");
  const [giftDuration, setGiftDuration] = useState("30");

  const fetchUser = async () => {
    try {
      const result = await adminApi.getUser(uid);
      setUser(result.user);
    } catch (e) {
      toast.error("Failed to load user details");
      router.push("/admin/users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [uid]);



  const handleBanToggle = async () => {
    setIsSubmitting(true);
    try {
      await adminApi.banUser(uid, !user.isBanned);
      toast.success(`User ${user.isBanned ? 'unbanned' : 'banned'} successfully`);
      await fetchUser();
    } catch (e) {
      toast.error("Failed to update ban status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePremium = async () => {
    if (!window.confirm("Are you sure you want to revoke premium access?")) return;
    setIsSubmitting(true);
    try {
      await adminApi.removePremium(uid);
      toast.success("Premium access revoked");
      await fetchUser();
    } catch (e) {
      toast.error("Failed to revoke premium access");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGiftPremium = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adminApi.giftPremium(uid, giftPlan, Number(giftDuration));
      toast.success(`Gifted ${giftPlan} for ${giftDuration} days`);
      setIsGiftModalOpen(false);
      await fetchUser();
    } catch (e) {
      toast.error("Failed to gift premium");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-[#C4727F] animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className="p-2 bg-[#FFFFFF] border border-[#E8E0D8] rounded-xl hover:bg-[#FAF8F5] transition-colors">
          <ArrowLeft className="w-5 h-5 text-[#1A1A1A]/70" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">{user.name || 'User Details'}</h1>
          <p className="text-sm text-[#1A1A1A]/60">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm">
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Profile Information</h2>
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <p className="text-xs font-bold text-[#1A1A1A]/50 uppercase tracking-widest mb-1">User ID</p>
                <p className="text-sm font-mono text-[#1A1A1A]">{user.uid}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A]/50 uppercase tracking-widest mb-1">Joined Date</p>
                <p className="text-sm text-[#1A1A1A]">{user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A]/50 uppercase tracking-widest mb-1">Role</p>
                <p className="text-sm text-[#1A1A1A] capitalize">{user.role || 'user'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A]/50 uppercase tracking-widest mb-1">Status</p>
                {user.isBanned ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-md">
                    <Ban className="w-3 h-3" /> BANNED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00B982] bg-[#00B982]/10 px-2.5 py-1 rounded-md">
                    <ShieldCheck className="w-3 h-3" /> ACTIVE
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm">
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Style Profile</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4">
              <div>
                <p className="text-xs font-bold text-[#1A1A1A]/50 uppercase tracking-widest mb-1">Gender</p>
                <p className="text-sm text-[#1A1A1A] capitalize">{user.gender || 'Not Set'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A]/50 uppercase tracking-widest mb-1">Skin Tone</p>
                <p className="text-sm text-[#1A1A1A] capitalize">{user.skinTone || 'Not Set'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A]/50 uppercase tracking-widest mb-1">Body Type</p>
                <p className="text-sm text-[#1A1A1A] capitalize">{user.bodyType || 'Not Set'}</p>
              </div>
              <div className="col-span-full">
                <p className="text-xs font-bold text-[#1A1A1A]/50 uppercase tracking-widest mb-1">Favorite Colors</p>
                <div className="flex gap-2 flex-wrap mt-2">
                  {user.favoriteColors && user.favoriteColors.length > 0 ? (
                    user.favoriteColors.map((c: string) => (
                      <span key={c} className="px-3 py-1 bg-[#FAF8F5] border border-[#E8E0D8] rounded-full text-xs font-medium text-[#1A1A1A]">
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[#1A1A1A]/50">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm">
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-4">Subscription</h2>
            
            <div className="mb-6">
              <p className="text-xs font-bold text-[#1A1A1A]/50 uppercase tracking-widest mb-2">Current Plan</p>
              <div className="flex items-center justify-between">
                <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                  user.plan === 'free' ? 'bg-[#E8E0D8] text-[#1A1A1A]/70' : 
                  user.plan === 'premium' || user.plan === 'pro' ? 'bg-[#00B982]/10 text-[#00B982]' : 
                  'bg-[#C4727F]/10 text-[#C4727F]'
                }`}>
                  {user.plan || 'Free'}
                </span>
                <span className="text-sm font-bold text-[#1A1A1A]">
                  {user.credits ?? 0} Credits
                </span>
              </div>
              {user.planExpiryDate && (
                <p className="text-xs text-[#1A1A1A]/50 mt-2">
                  Expires: {new Date(user.planExpiryDate).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => setIsGiftModalOpen(true)}
                className="w-full py-3 bg-[#1A1A1A] text-white rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-2 hover:bg-[#1A1A1A]/90 transition-colors"
              >
                <Gift className="w-4 h-4" /> Gift Premium
              </button>
              
              {user.plan !== 'free' && (
                <button 
                  onClick={handleRemovePremium}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#FAF8F5] border border-[#E8E0D8] text-[#1A1A1A] rounded-xl text-sm font-bold tracking-wide hover:bg-[#E8E0D8] transition-colors"
                >
                  Revoke Premium
                </button>
              )}
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-red-200 shadow-sm">
            <h2 className="text-lg font-bold text-red-600 mb-4">Danger Zone</h2>
            <p className="text-xs text-[#1A1A1A]/60 mb-4">
              Banning a user immediately prevents them from logging into the MITYRA platform.
            </p>
            <button 
              onClick={handleBanToggle}
              disabled={isSubmitting}
              className={`w-full py-3 rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-colors ${
                user.isBanned 
                  ? 'bg-[#00B982]/10 text-[#00B982] hover:bg-[#00B982]/20'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              <Ban className="w-4 h-4" /> 
              {user.isBanned ? 'Unban User' : 'Ban User'}
            </button>
          </div>
        </div>
      </div>

      {/* Gift Modal */}
      {isGiftModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] rounded-[24px] p-6 w-full max-w-md border border-[#E8E0D8] shadow-2xl relative">
            <button 
              onClick={() => setIsGiftModalOpen(false)}
              className="absolute top-6 right-6 text-[#1A1A1A]/40 hover:text-[#1A1A1A]"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-[#1A1A1A] mb-6">Gift Premium Plan</h2>
            
            <form onSubmit={handleGiftPremium} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/70 mb-2 block">Select Plan</label>
                <select 
                  value={giftPlan}
                  onChange={(e) => setGiftPlan(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#E8E0D8] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#C4727F]"
                >
                  <option value="student">Student</option>
                  <option value="pro">Pro</option>
                  <option value="business">Business</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/70 mb-2 block">Duration (Days)</label>
                <input 
                  type="number"
                  value={giftDuration}
                  onChange={(e) => setGiftDuration(e.target.value)}
                  min="1"
                  className="w-full bg-[#FAF8F5] border border-[#E8E0D8] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#C4727F]"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsGiftModalOpen(false)}
                  className="flex-1 py-3 bg-[#FAF8F5] border border-[#E8E0D8] rounded-xl text-sm font-bold text-[#1A1A1A]/70 hover:bg-[#E8E0D8]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-[#C4727F] rounded-xl text-sm font-bold text-white hover:bg-[#b0616e] flex justify-center items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Apply Gift</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

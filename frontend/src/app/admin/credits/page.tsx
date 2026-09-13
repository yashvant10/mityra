"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { Coins, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminCreditsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const usersData = await adminApi.getUsers();
      // Sort by credits descending
      const sorted = (usersData || []).sort((a: any, b: any) => (b.credits || 0) - (a.credits || 0));
      setUsers(sorted);
    } catch (e) {
      toast.error("Failed to load credits data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {

  useEffect(() => {
    fetchData();
  }, []);

    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-[#C4727F] animate-spin" />
      </div>
    );
  }

  const topUsers = users.slice(0, 50); // Top 50 highest balances
  
  const totalSystemCredits = users.reduce((sum, u) => sum + (u.credits || 0), 0);
  const avgCredits = users.length > 0 ? Math.round(totalSystemCredits / users.length) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">Credits Ledger</h1>
        <p className="text-sm text-[#1A1A1A]/60">Monitor total outstanding credits and top balances.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
            <Coins className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <h3 className="text-3xl font-black text-[#1A1A1A]">{totalSystemCredits}</h3>
          <p className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest mt-1">Total Outstanding Credits</p>
        </div>
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-[#FAF8F5] rounded-2xl flex items-center justify-center mb-4 border border-[#E8E0D8]">
            <Coins className="w-6 h-6 text-[#1A1A1A]/40" />
          </div>
          <h3 className="text-3xl font-black text-[#1A1A1A]">{avgCredits}</h3>
          <p className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest mt-1">Avg. Balance per User</p>
        </div>
      </div>

      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E8E0D8] shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-[#E8E0D8]">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Top 50 Credit Balances</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8E0D8]">
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">User</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Plan</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest text-right">Balance</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-[#1A1A1A]/50 font-medium">
                    No users found.
                  </td>
                </tr>
              ) : (
                topUsers.map((user: any) => (
                  <tr key={user.uid} className="border-b border-[#E8E0D8] hover:bg-[#FAF8F5]/50 transition-colors">
                    <td className="p-4 text-sm font-bold text-[#1A1A1A]">
                      {user.email}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        user.plan === 'free' || !user.plan ? 'bg-[#E8E0D8] text-[#1A1A1A]/70' : 
                        'bg-[#00B982]/10 text-[#00B982]'
                      }`}>
                        {user.plan || 'Free'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="inline-flex items-center gap-1 text-sm font-black text-[#D4AF37] bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                        <Coins className="w-3.5 h-3.5" /> {user.credits || 0}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link 
                        href={`/admin/users/${user.uid}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F5] border border-[#E8E0D8] rounded-lg text-xs font-bold text-[#1A1A1A] hover:bg-[#E8E0D8] transition-colors"
                      >
                        Adjust <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { CreditCard, Crown, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminSubscriptionsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const usersData = await adminApi.getUsers();
      setUsers(usersData || []);
    } catch (e) {
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {

    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-[#C4727F] animate-spin" />
      </div>
    );
  }

  const premiumUsers = users.filter(u => u.plan && u.plan !== 'free');
  
  const planCounts = premiumUsers.reduce((acc: any, u) => {
    acc[u.plan] = (acc[u.plan] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">Subscriptions</h1>
        <p className="text-sm text-[#1A1A1A]/60">Manage and view active Premium, Pro, and Business plans.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
            <CreditCard className="w-6 h-6 text-blue-500" />
          </div>
          <h3 className="text-3xl font-black text-[#1A1A1A]">{planCounts.student || 0}</h3>
          <p className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest mt-1">Student Plans</p>
        </div>
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-[#00B982]/10 rounded-2xl flex items-center justify-center mb-4">
            <Crown className="w-6 h-6 text-[#00B982]" />
          </div>
          <h3 className="text-3xl font-black text-[#1A1A1A]">{planCounts.pro || planCounts.premium || 0}</h3>
          <p className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest mt-1">Pro / Premium Plans</p>
        </div>
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-[#C4727F]/10 rounded-2xl flex items-center justify-center mb-4">
            <Crown className="w-6 h-6 text-[#C4727F]" />
          </div>
          <h3 className="text-3xl font-black text-[#1A1A1A]">{planCounts.business || 0}</h3>
          <p className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest mt-1">Business Plans</p>
        </div>
      </div>

      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E8E0D8] shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-[#E8E0D8]">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Active Subscriptions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8E0D8]">
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">User</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Plan</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Joined</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {premiumUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-[#1A1A1A]/50 font-medium">
                    No active subscriptions found.
                  </td>
                </tr>
              ) : (
                premiumUsers.map((user: any) => (
                  <tr key={user.uid} className="border-b border-[#E8E0D8] hover:bg-[#FAF8F5]/50 transition-colors">
                    <td className="p-4 text-sm font-bold text-[#1A1A1A]">
                      {user.email}
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        user.plan === 'business' ? 'bg-[#C4727F]/10 text-[#C4727F]' : 'bg-[#00B982]/10 text-[#00B982]'
                      }`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[#1A1A1A]/70">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 text-right">
                      <Link 
                        href={`/admin/users/${user.uid}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F5] border border-[#E8E0D8] rounded-lg text-xs font-bold text-[#1A1A1A] hover:bg-[#E8E0D8] transition-colors"
                      >
                        Manage <ArrowRight className="w-3 h-3" />
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

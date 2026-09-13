"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminRecommendationsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const result = await adminApi.getUsers();
      setUsers(result || []);
    } catch (e) {
      toast.error("Failed to load users for recommendations");
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

  const usersWithPreferences = users.filter(u => u.favoriteColors?.length > 0 || u.gender || u.bodyType);
  const totalPrefs = usersWithPreferences.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">AI Recommendations</h1>
        <p className="text-sm text-[#1A1A1A]/60">Manage personalization profiles used by the recommendation engine.</p>
      </div>

      <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#1A1A1A]">{totalPrefs} Active Profiles</h3>
            <p className="text-xs text-[#1A1A1A]/60">Users with personalized style preferences.</p>
          </div>
        </div>
      </div>

      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E8E0D8] shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-[#E8E0D8]">
          <h2 className="text-lg font-bold text-[#1A1A1A]">User Style Preferences</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8E0D8]">
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">User</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Gender</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Skin Tone</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest hidden md:table-cell">Colors</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest text-right">View Profile</th>
              </tr>
            </thead>
            <tbody>
              {usersWithPreferences.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#1A1A1A]/50 font-medium">
                    No users with preferences found.
                  </td>
                </tr>
              ) : (
                usersWithPreferences.map((user: any) => (
                  <tr key={user.uid} className="border-b border-[#E8E0D8] hover:bg-[#FAF8F5]/50 transition-colors">
                    <td className="p-4 text-sm font-bold text-[#1A1A1A]">
                      {user.name || user.email}
                    </td>
                    <td className="p-4 text-sm text-[#1A1A1A] capitalize">{user.gender || 'N/A'}</td>
                    <td className="p-4 text-sm text-[#1A1A1A] capitalize">{user.skinTone || 'N/A'}</td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(user.favoriteColors || []).slice(0, 3).map((c: string) => (
                          <span key={c} className="px-2 py-0.5 bg-[#FAF8F5] border border-[#E8E0D8] rounded text-[10px] text-[#1A1A1A]">{c}</span>
                        ))}
                        {user.favoriteColors?.length > 3 && <span className="text-[10px] text-[#1A1A1A]/50 px-1">+{user.favoriteColors.length - 3}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <Link 
                        href={`/admin/users/${user.uid}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F5] border border-[#E8E0D8] rounded-lg text-xs font-bold text-[#1A1A1A] hover:bg-[#E8E0D8] transition-colors"
                      >
                        Inspect <ArrowRight className="w-3 h-3" />
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

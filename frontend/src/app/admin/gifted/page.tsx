"use client";

import { useState, useEffect, useMemo } from "react";
import { Gift, ArrowUpCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function GiftedPlansPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("tryonx_admin_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/admin/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      toast.error("Failed to load gifted matrix.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRevoke = async (uid: string) => {
    try {
      const token = localStorage.getItem("tryonx_admin_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiUrl}/admin/users/${uid}/remove-premium`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });
      if (res.ok) {
        toast.success("Premium revoked successfully.");
        fetchUsers();
      } else {
        toast.error("Failed to revoke premium.");
      }
    } catch (err) {
      toast.error("Network error executing admin command.");
    }
  };

  const giftedUsers = useMemo(() => {
    return users.filter(u => u.giftedByAdmin === true).sort((a, b) => new Date(b.giftedDate || 0).getTime() - new Date(a.giftedDate || 0).getTime());
  }, [users]);

  const totalGiftedValue = useMemo(() => {
    return giftedUsers.reduce((total, u) => {
      if (u.plan === "business") return total + 999;
      if (u.plan === "pro") return total + 499;
      if (u.plan === "student") return total + 199;
      return total;
    }, 0);
  }, [giftedUsers]);

  return (
    <div className="space-y-6 pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Gift className="w-8 h-8 text-pink-500" /> Gifted Premium Matrix
          </h1>
          <p className="text-sm text-white/50 font-mono mt-1">Track promotional and gifted subscriptions.</p>
        </div>
        <div className="glass-card bg-[#0a0a16] border border-pink-500/20 px-6 py-3 rounded-2xl flex flex-col items-end">
          <span className="text-[10px] font-mono text-pink-400 uppercase tracking-widest">Total Value Gifted</span>
          <span className="text-2xl font-black text-white">₹{totalGiftedValue.toLocaleString()}</span>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/5 bg-[#0a0a16] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono">
            <thead>
              <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-white/40 border-b border-white/5">
                <th className="p-4 pl-6">Citizen</th>
                <th className="p-4">Plan Gifted</th>
                <th className="p-4">Expiration Date</th>
                <th className="p-4">Date Gifted</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-white/80">
              {loading ? (
                <tr><td colSpan={6} className="text-center p-8 text-white/30 tracking-widest uppercase">Fetching matrix...</td></tr>
              ) : giftedUsers.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-8 text-white/30 tracking-widest uppercase">No gifted plans found</td></tr>
              ) : (
                giftedUsers.map((u) => {
                  const plan = u.plan || u.subscription || "free";
                  const isValid = !(u.planExpiresAt && new Date(u.planExpiresAt) < new Date());
                  const activePlan = isValid ? plan : 'free';
                  
                  let planColor = "text-slate-400 bg-slate-500/10 border-slate-500/20";
                  if (activePlan === "student") planColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
                  if (activePlan === "pro") planColor = "text-purple-400 bg-purple-500/10 border-purple-500/20";
                  if (activePlan === "business") planColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";

                  return (
                    <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold overflow-hidden">
                            {u.photoURL ? <img src={u.photoURL} alt="" /> : (u.displayName || u.email || "?")[0].toUpperCase()}
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-bold text-white font-sans">{u.displayName || "Unknown"}</p>
                            <p className="text-[10px] text-white/40">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 w-fit ${planColor}`}>
                          {activePlan}
                        </span>
                      </td>
                      <td className="p-4 text-white/50 text-[11px]">
                        {u.planExpiresAt ? new Date(u.planExpiresAt).toLocaleDateString() : 'Lifetime'}
                      </td>
                      <td className="p-4 text-white/50 text-[11px]">
                        {u.giftedDate ? new Date(u.giftedDate).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="p-4 text-center">
                        {!isValid ? (
                          <span className="text-red-400 flex items-center justify-center gap-1 text-[10px]"><XCircle className="w-3 h-3" /> Expired / Revoked</span>
                        ) : (
                          <span className="text-green-400 flex items-center justify-center gap-1 text-[10px]"> Active</span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isValid && (
                            <button onClick={() => handleRevoke(u.uid)} className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest border border-orange-500/20" title="Revoke Premium">
                              Revoke <ArrowUpCircle className="w-3 h-3 rotate-180" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

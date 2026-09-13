"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { Search, Filter, MoreVertical, Eye, Ban, ShieldCheck, Loader2, Gift, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Credits Modal State
  const [selectedUserForCredits, setSelectedUserForCredits] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState<number>(10);
  const [grantingCredits, setGrantingCredits] = useState(false);

  const fetchUsers = async () => {
    try {
      const result = await adminApi.getUsers();
      setUsers(result || []);
    } catch (e) {
      console.error("Users fetch error:", e);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleGrantCredits = async () => {
    if (!selectedUserForCredits || creditAmount <= 0) {
      toast.error("Invalid amount");
      return;
    }
    
    setGrantingCredits(true);
    try {
      await adminApi.grantCredits(selectedUserForCredits.uid, creditAmount);
      toast.success(`Successfully granted ${creditAmount} credits to ${selectedUserForCredits.name || 'User'}`);
      setSelectedUserForCredits(null);
      fetchUsers(); // Refresh to show new credits
    } catch (e: any) {
      console.error("Failed to grant credits:", e);
      toast.error(e.message || "Failed to grant credits");
    } finally {
      setGrantingCredits(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">Users</h1>
          <p className="text-sm text-[#1A1A1A]/60">Manage all registered accounts.</p>
        </div>
      </div>

      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E8E0D8] shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#E8E0D8] flex flex-wrap gap-4 items-center bg-[#FAF8F5]/50">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-[#1A1A1A]/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#E8E0D8] rounded-xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:border-[#C4727F] transition-colors"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF] border border-[#E8E0D8] rounded-xl text-sm font-bold text-[#1A1A1A]/70 hover:bg-[#FAF8F5] transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8E0D8]">
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">User</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Plan</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Credits</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest hidden md:table-cell">Joined</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest hidden sm:table-cell">Status</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="w-6 h-6 text-[#C4727F] animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#1A1A1A]/50 font-medium">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uid} className="border-b border-[#E8E0D8] hover:bg-[#FAF8F5]/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E8E0D8] flex items-center justify-center font-bold text-[#1A1A1A] shrink-0">
                          {(user.name || user.email || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col max-w-[150px] sm:max-w-[200px]">
                          <span className="text-sm font-bold text-[#1A1A1A] truncate">{user.name || "No Name"}</span>
                          <span className="text-xs text-[#1A1A1A]/60 truncate">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        user.plan === 'free' ? 'bg-[#E8E0D8] text-[#1A1A1A]/70' : 
                        user.plan === 'premium' || user.plan === 'pro' ? 'bg-[#00B982]/10 text-[#00B982]' : 
                        'bg-[#C4727F]/10 text-[#C4727F]'
                      }`}>
                        {user.plan || 'Free'}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-medium text-[#1A1A1A]">
                      {user.credits ?? 0}
                    </td>
                    <td className="p-4 text-sm text-[#1A1A1A]/70 hidden md:table-cell">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      {user.isBanned ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-red-500">
                          <Ban className="w-3 h-3" /> Banned
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-[#00B982]">
                          <ShieldCheck className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedUserForCredits(user)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E8E0D8] text-[#1A1A1A]/70 hover:text-[#00B982] hover:border-[#00B982]/30 transition-colors"
                        title="Grant Credits"
                      >
                        <Gift className="w-4 h-4" />
                      </button>
                      <Link 
                        href={`/admin/users/detail?id=${user.uid}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#E8E0D8] text-[#1A1A1A]/70 hover:text-[#C4727F] hover:border-[#C4727F]/30 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination mock footer */}
        <div className="p-4 border-t border-[#E8E0D8] bg-[#FAF8F5]/50 flex justify-between items-center text-xs font-bold text-[#1A1A1A]/50">
          <span>Showing {filteredUsers.length} users</span>
        </div>
      </div>

      {/* Grant Credits Modal */}
      {selectedUserForCredits && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-[24px] shadow-xl border border-[#E8E0D8] overflow-hidden">
            <div className="p-6 border-b border-[#E8E0D8] flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#1A1A1A]">Grant Credits</h3>
              <button 
                onClick={() => setSelectedUserForCredits(null)}
                className="text-[#1A1A1A]/40 hover:text-[#1A1A1A] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]/70 mb-1">User</p>
                <p className="font-bold text-[#1A1A1A]">{selectedUserForCredits.name || 'No Name'} ({selectedUserForCredits.email})</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A]/70 mb-2">Amount to Grant</label>
                <input
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#FAF8F5] border border-[#E8E0D8] rounded-xl py-3 px-4 text-[#1A1A1A] font-medium focus:outline-none focus:border-[#C4727F]"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-[#E8E0D8] bg-[#FAF8F5]/30 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedUserForCredits(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#1A1A1A]/60 hover:bg-[#E8E0D8]/50 transition-colors"
                disabled={grantingCredits}
              >
                Cancel
              </button>
              <button 
                onClick={handleGrantCredits}
                disabled={grantingCredits || creditAmount <= 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#1A1A1A] text-white hover:bg-[#C4727F] disabled:opacity-50 transition-colors"
              >
                {grantingCredits && <Loader2 className="w-4 h-4 animate-spin" />}
                Grant Credits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


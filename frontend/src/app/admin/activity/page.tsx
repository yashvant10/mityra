"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { Activity, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    try {
      const result = await adminApi.getActivityFeed();
      setActivities(result.activities || []);
    } catch (e) {
      toast.error("Failed to load activity feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">Admin Activity Log</h1>
          <p className="text-sm text-[#1A1A1A]/60">Audit trail for all administrative actions.</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF] border border-[#E8E0D8] rounded-xl text-sm font-bold text-[#1A1A1A]/70 hover:bg-[#FAF8F5] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E8E0D8] shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-[#E8E0D8]">
          <h2 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#C4727F]" /> Global Audit Trail
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8E0D8]">
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Admin Email</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Action</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Target</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest hidden sm:table-cell">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center">
                    <Loader2 className="w-6 h-6 text-[#C4727F] animate-spin mx-auto" />
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-[#1A1A1A]/50 font-medium">
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                activities.map((log: any) => (
                  <tr key={log.id} className="border-b border-[#E8E0D8] hover:bg-[#FAF8F5]/50 transition-colors">
                    <td className="p-4 text-sm font-bold text-[#1A1A1A]">
                      {log.adminEmail || 'Unknown'}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-[#FAF8F5] border border-[#E8E0D8] rounded-md text-[10px] font-bold text-[#1A1A1A] uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-mono text-[#1A1A1A]/70">
                      {log.target}
                    </td>
                    <td className="p-4 text-sm text-[#1A1A1A]/70 hidden sm:table-cell">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
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

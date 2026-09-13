"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { Sparkles, CheckCircle, XCircle, Activity, Loader2, RefreshCw } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

export default function AdminVirtualTryOnAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const result = await adminApi.getVirtualTryOnAnalytics();
      setData(result);
    } catch (e) {
      console.error("Virtual Try-On Analytics fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);



  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-[#C4727F] animate-spin" />
      </div>
    );
  }

  const COLORS = ['#00B982', '#C4727F', '#D4AF37', '#1A1A1A'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">Virtual Try-On</h1>
          <p className="text-sm text-[#1A1A1A]/60">Analytics & system performance metrics.</p>
        </div>
        <button 
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF] border border-[#E8E0D8] rounded-xl text-sm font-bold text-[#1A1A1A]/70 hover:bg-[#FAF8F5] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Total Generations" value={data?.total || 0} icon={<Sparkles className="w-5 h-5 text-[#C4727F]" />} />
        <StatCard title="Success Rate" value={`${data?.successRate || 0}%`} icon={<Activity className="w-5 h-5 text-blue-500" />} />
        <StatCard title="Successful" value={data?.successCount || 0} icon={<CheckCircle className="w-5 h-5 text-[#00B982]" />} />
        <StatCard title="Failed" value={data?.failedCount || 0} icon={<XCircle className="w-5 h-5 text-red-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-6">Generations Over Time (Last 7 Days)</h2>
          <div className="h-72">
            {data?.timeline && data.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeline}>
                  <defs>
                    <linearGradient id="colorGenerations" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C4727F" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#C4727F" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E0D8" />
                  <XAxis dataKey="date" stroke="#1A1A1A" opacity={0.5} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#1A1A1A" opacity={0.5} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E8E0D8', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1A1A1A' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#C4727F" strokeWidth={3} fillOpacity={1} fill="url(#colorGenerations)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#1A1A1A]/40">No timeline data</div>
            )}
          </div>
        </div>

        {/* Model Usage Pie Chart */}
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-6">Model Distribution</h2>
          <div className="h-48">
            {data?.models && data.models.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.models}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.models.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E8E0D8' }}
                    itemStyle={{ color: '#1A1A1A' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#1A1A1A]/40">No model data</div>
            )}
          </div>
          <div className="mt-6 space-y-3">
            {data?.models?.map((model: any, idx: number) => (
              <div key={model.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="font-medium text-[#1A1A1A]">{model.name}</span>
                </div>
                <span className="text-[#1A1A1A]/60 font-bold">{model.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Logs Table */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E8E0D8] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#E8E0D8]">
          <h2 className="text-lg font-bold text-[#1A1A1A]">Recent Activity Log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8E0D8]">
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">ID</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">User</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Model</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest hidden sm:table-cell">Timestamp</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {!data?.recentLogs || data.recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#1A1A1A]/50 font-medium">
                    No recent try-ons found.
                  </td>
                </tr>
              ) : (
                data.recentLogs.map((log: any) => (
                  <tr key={log.id} className="border-b border-[#E8E0D8] hover:bg-[#FAF8F5]/50 transition-colors">
                    <td className="p-4 text-xs font-mono text-[#1A1A1A]/60">
                      {log.id.slice(0,8)}...
                    </td>
                    <td className="p-4 text-sm font-bold text-[#1A1A1A]">
                      {log.userId || 'Unknown'}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-[#FAF8F5] border border-[#E8E0D8] rounded-md text-xs font-medium text-[#1A1A1A]">
                        {log.model || 'VTO'}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-[#1A1A1A]/70 hidden sm:table-cell">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-4 text-right">
                      {log.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">
                          Failed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00B982] bg-[#00B982]/10 px-2 py-1 rounded">
                          Success
                        </span>
                      )}
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

function StatCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <p className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest mb-2 relative z-10">{title}</p>
      <h3 className="text-3xl font-black text-[#1A1A1A] relative z-10">{value}</h3>
    </div>
  );
}

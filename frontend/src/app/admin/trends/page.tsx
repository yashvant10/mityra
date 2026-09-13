"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { TrendingUp, Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

export default function AdminTrendsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const result = await adminApi.getUsers();
      setUsers(result || []);
    } catch (e) {
      toast.error("Failed to load users for trends");
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

  const colorCounts: Record<string, number> = {};
  const bodyTypeCounts: Record<string, number> = {};

  users.forEach(u => {
    if (u.favoriteColors && Array.isArray(u.favoriteColors)) {
      u.favoriteColors.forEach((c: string) => {
        colorCounts[c] = (colorCounts[c] || 0) + 1;
      });
    }
    if (u.bodyType) {
      bodyTypeCounts[u.bodyType] = (bodyTypeCounts[u.bodyType] || 0) + 1;
    }
  });

  const topColors = Object.entries(colorCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const topBodyTypes = Object.entries(bodyTypeCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#C4727F', '#D4AF37', '#00B982', '#1A1A1A'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">Fashion Trends</h1>
        <p className="text-sm text-[#1A1A1A]/60">Live metrics derived from user style profiles and preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Colors Chart */}
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Flame className="w-5 h-5 text-[#C4727F]" />
            <h2 className="text-lg font-bold text-[#1A1A1A]">Most Popular Colors</h2>
          </div>
          <div className="h-72">
            {topColors.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topColors} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8E0D8" />
                  <XAxis type="number" stroke="#1A1A1A" opacity={0.5} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#1A1A1A" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    cursor={{fill: '#FAF8F5'}}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E8E0D8', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1A1A1A' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {topColors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#1A1A1A]/40">No color data available</div>
            )}
          </div>
        </div>

        {/* Body Types Chart */}
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-[#1A1A1A]">Demographics: Body Type</h2>
          </div>
          <div className="h-72">
            {topBodyTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topBodyTypes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E0D8" />
                  <XAxis dataKey="name" stroke="#1A1A1A" opacity={0.5} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#1A1A1A" opacity={0.5} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{fill: '#FAF8F5'}}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E8E0D8' }}
                  />
                  <Bar dataKey="value" fill="#1A1A1A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#1A1A1A]/40">No body type data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

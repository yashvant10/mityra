"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { Box, TrendingUp, DollarSign, ExternalLink, Loader2, RefreshCw } from "lucide-react";

export default function AdminProductsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const result = await adminApi.getProductsAnalytics();
      setData(result.analytics);
    } catch (e) {
      console.error("Products Analytics fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  if (loading && !data) {

    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-[#C4727F] animate-spin" />
      </div>
    );
  }

  const { summary, topProducts, platformBreakdown } = data || {};

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">Products & Affiliates</h1>
          <p className="text-sm text-[#1A1A1A]/60">Track top performing affiliate fashion products.</p>
        </div>
        <button 
          onClick={fetchProducts}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF] border border-[#E8E0D8] rounded-xl text-sm font-bold text-[#1A1A1A]/70 hover:bg-[#FAF8F5] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Total Affiliate Clicks" value={summary?.totalClicks || 0} icon={<Box className="w-5 h-5 text-[#C4727F]" />} />
        <StatCard title="Total Conversions" value={summary?.totalConversions || 0} icon={<TrendingUp className="w-5 h-5 text-blue-500" />} />
        <StatCard title="Conversion Rate" value={`${summary?.conversionRate || 0}%`} icon={<TrendingUp className="w-5 h-5 text-[#00B982]" />} />
        <StatCard title="Est. Earnings" value={`₹${summary?.totalEarnings || 0}`} icon={<DollarSign className="w-5 h-5 text-[#D4AF37]" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products Table */}
        <div className="lg:col-span-2 bg-[#FFFFFF] rounded-[24px] border border-[#E8E0D8] shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[#E8E0D8]">
            <h2 className="text-lg font-bold text-[#1A1A1A]">Top Converting Products</h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E8E0D8]">
                  <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Product Name</th>
                  <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest hidden sm:table-cell">Store</th>
                  <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest text-right">Clicks</th>
                  <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest text-right">Conversions</th>
                  <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest text-right hidden md:table-cell">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {!topProducts || topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#1A1A1A]/50 font-medium">
                      No product data available yet.
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p: any, i: number) => (
                    <tr key={i} className="border-b border-[#E8E0D8] hover:bg-[#FAF8F5]/50 transition-colors">
                      <td className="p-4">
                        <span className="text-sm font-bold text-[#1A1A1A] line-clamp-1">{p.name}</span>
                        <span className="text-xs text-[#1A1A1A]/50 block sm:hidden uppercase mt-1">{p.store}</span>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <span className="px-2 py-1 bg-[#FAF8F5] border border-[#E8E0D8] rounded-md text-[10px] font-bold text-[#1A1A1A] uppercase">
                          {p.store}
                        </span>
                      </td>
                      <td className="p-4 text-right text-sm font-medium text-[#1A1A1A]">
                        {p.clicks}
                      </td>
                      <td className="p-4 text-right text-sm font-bold text-[#00B982]">
                        {p.conversions}
                      </td>
                      <td className="p-4 text-right text-sm font-bold text-[#C4727F] hidden md:table-cell">
                        ₹{p.earnings.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-6">Platform Breakdown</h2>
          <div className="space-y-4 flex-1">
            {!platformBreakdown || Object.keys(platformBreakdown).length === 0 ? (
              <div className="flex items-center justify-center h-32 text-[#1A1A1A]/50">No platform data</div>
            ) : (
              Object.entries(platformBreakdown).map(([platform, stats]: [string, any]) => (
                <div key={platform} className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E0D8]">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-black text-[#1A1A1A] uppercase tracking-widest">{platform}</span>
                    <span className="text-xs font-bold text-[#00B982] bg-[#00B982]/10 px-2 py-1 rounded">
                      {stats.conversions} Sales
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[#1A1A1A]/50 mb-1">Clicks</p>
                      <p className="text-sm font-medium text-[#1A1A1A]">{stats.clicks}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-[#1A1A1A]/50 mb-1">Earnings</p>
                      <p className="text-sm font-medium text-[#C4727F]">₹{stats.earnings.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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

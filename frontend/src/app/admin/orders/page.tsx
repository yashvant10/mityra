"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { ShoppingCart, CheckCircle, XCircle, Search, Filter, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AdminOrdersPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const result = await adminApi.getOrders();
      setData(result);
    } catch (e) {
      console.error("Orders fetch error:", e);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-[#C4727F] animate-spin" />
      </div>
    );
  }

  const orders = data?.orders || [];
  const filteredOrders = orders.filter((o: any) => 
    (o.id || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.userId || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">Orders & Payments</h1>
          <p className="text-sm text-[#1A1A1A]/60">Track subscription purchases and credit top-ups.</p>
        </div>
        <button 
          onClick={fetchOrders}
          className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF] border border-[#E8E0D8] rounded-xl text-sm font-bold text-[#1A1A1A]/70 hover:bg-[#FAF8F5] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <StatCard title="Total Orders" value={data?.totalOrders || 0} icon={<ShoppingCart className="w-5 h-5 text-blue-500" />} />
        <StatCard title="Successful Payments" value={data?.successfulOrders || 0} icon={<CheckCircle className="w-5 h-5 text-[#00B982]" />} />
        <StatCard title="Total Revenue" value={`₹${data?.totalRevenue || 0}`} icon={<ShoppingCart className="w-5 h-5 text-[#C4727F]" />} />
      </div>

      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E8E0D8] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#E8E0D8] flex flex-wrap gap-4 items-center bg-[#FAF8F5]/50">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-[#1A1A1A]/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search by Order ID or User ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#E8E0D8] rounded-xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:border-[#C4727F] transition-colors"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF] border border-[#E8E0D8] rounded-xl text-sm font-bold text-[#1A1A1A]/70 hover:bg-[#FAF8F5] transition-colors">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8E0D8]">
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Order ID</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">User ID</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest text-right">Amount</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest hidden md:table-cell">Plan</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest hidden sm:table-cell">Date</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#1A1A1A]/50 font-medium">
                    No orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order: any) => (
                  <tr key={order.id} className="border-b border-[#E8E0D8] hover:bg-[#FAF8F5]/50 transition-colors">
                    <td className="p-4 text-xs font-mono text-[#1A1A1A]/60">
                      {order.id}
                    </td>
                    <td className="p-4 text-xs font-mono text-[#1A1A1A]/80">
                      {order.userId || 'Unknown'}
                    </td>
                    <td className="p-4 text-right text-sm font-black text-[#1A1A1A]">
                      ₹{order.amount || 0}
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className="px-2.5 py-1 bg-[#FAF8F5] border border-[#E8E0D8] rounded-md text-xs font-bold text-[#1A1A1A] uppercase">
                        {order.planId || 'Credits'}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-[#1A1A1A]/70 hidden sm:table-cell">
                      {order.timestamp ? new Date(order.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-4 text-right">
                      {order.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[#00B982] bg-[#00B982]/10 px-2.5 py-1 rounded-md">
                          Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-md">
                          Failed
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

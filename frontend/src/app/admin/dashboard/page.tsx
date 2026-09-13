"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  DollarSign, 
  Users, 
  Crown, 
  UserMinus, 
  Tv, 
  ShoppingCart,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Gift,
  Bell,
  Mail,
  Wrench,
  Download
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from "sonner";

interface DashboardStats {
  totalUsers: number;
  premiumUsers: number;
  freeUsers: number;
  studentCount: number;
  proCount: number;
  businessCount: number;
  todayTryOns: number;
  totalTryOns: number;
  adRevenue: number;
  affiliateRevenue: number;
  subRevenue: number;
  dailyRevenue: { date: string, revenue: number }[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [creditStats, setCreditStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("tryonx_admin_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      
      const statsRes = await fetch(`${apiUrl}/admin/dashboard`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }

      const actRes = await fetch(`${apiUrl}/admin/activity-feed`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }

      const creditRes = await fetch(`${apiUrl}/admin/credit-analytics`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (creditRes.ok) {
        setCreditStats(await creditRes.json());
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats || !creditStats) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-xs font-mono tracking-widest text-white/50 uppercase">Syncing Dashboard Matrices...</p>
      </div>
    );
  }

  const totalRevenue = stats.subRevenue + stats.adRevenue + stats.affiliateRevenue;
  
  // Pie Chart Data
  const planData = [
    { name: 'Free', value: stats.freeUsers, color: '#94a3b8' },
    { name: 'Student', value: stats.studentCount, color: '#3b82f6' },
    { name: 'Pro', value: stats.proCount, color: '#a855f7' },
    { name: 'Business', value: stats.businessCount, color: '#f59e0b' },
  ];

  return (
    <div className="space-y-8 pb-10">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-white/50 font-mono mt-1">Real-time metrics and system overview.</p>
        </div>
        <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-xs font-mono font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> System Online
        </div>
      </div>

      {/* TOP STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Revenue" value={`₹${totalRevenue.toLocaleString()}`} icon={<DollarSign className="w-6 h-6 text-emerald-400" />} color="border-emerald-500/20 bg-emerald-500/5" trend="+12%" />
        <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={<Users className="w-6 h-6 text-blue-400" />} color="border-blue-500/20 bg-blue-500/5" trend="+5%" />
        <StatCard title="Premium Users" value={stats.premiumUsers.toLocaleString()} icon={<Crown className="w-6 h-6 text-amber-400" />} color="border-amber-500/20 bg-amber-500/5" trend="+18%" />
        <StatCard title="Free Users" value={stats.freeUsers.toLocaleString()} icon={<UserMinus className="w-6 h-6 text-slate-400" />} color="border-slate-500/20 bg-slate-500/5" />
        <StatCard title="Ad Revenue" value={`₹${stats.adRevenue.toLocaleString()}`} icon={<Tv className="w-6 h-6 text-purple-400" />} color="border-purple-500/20 bg-purple-500/5" />
        <StatCard title="Affiliate Rev" value={`₹${stats.affiliateRevenue.toLocaleString()}`} icon={<ShoppingCart className="w-6 h-6 text-pink-400" />} color="border-pink-500/20 bg-pink-500/5" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* REVENUE CHART */}
        <div className="xl:col-span-2 glass-card rounded-2xl p-6 border border-white/10 bg-[#0a0a16] shadow-xl space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" /> Revenue Timeline (30 Days)
            </h3>
            <span className="text-xs text-white/50 font-mono">Month over month: <span className="text-emerald-400">+14%</span></span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickMargin={10} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickFormatter={(val) => `₹${val}`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PLAN BREAKDOWN */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 bg-[#0a0a16] shadow-xl space-y-6 flex flex-col">
          <h3 className="text-lg font-bold text-white">Plan Breakdown</h3>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {planData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 pt-4 border-t border-white/5">
            <div className="flex justify-between text-xs font-mono text-white/70">
              <span>Student (₹199):</span> <span className="font-bold text-blue-400">₹{(stats.studentCount * 199).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs font-mono text-white/70">
              <span>Pro (₹499):</span> <span className="font-bold text-purple-400">₹{(stats.proCount * 499).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs font-mono text-white/70">
              <span>Business (₹999):</span> <span className="font-bold text-amber-400">₹{(stats.businessCount * 999).toLocaleString()}</span>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* RECENT ACTIVITY FEED */}
        <div className="xl:col-span-2 glass-card rounded-2xl p-6 border border-white/10 bg-[#0a0a16] shadow-xl space-y-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" /> Live Activity Feed
            </h3>
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" /> Auto-syncing
            </span>
          </div>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {activities.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-10 font-mono">No recent activity found.</p>
            ) : (
              activities.map((act) => {
                let Icon = Activity;
                let color = "text-slate-400 bg-slate-500/10";
                if (act.action === 'try_on') { Icon = ShoppingCart; color = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"; }
                if (act.action === 'upgrade') { Icon = Crown; color = "text-amber-400 bg-amber-500/10 border-amber-500/20"; }
                if (act.action === 'watch_ad') { Icon = Tv; color = "text-purple-400 bg-purple-500/10 border-purple-500/20"; }
                if (act.action === 'affiliate_click') { Icon = ArrowUpRight; color = "text-pink-400 bg-pink-500/10 border-pink-500/20"; }
                
                const timeStr = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' });

                return (
                  <div key={act.id} className="flex items-start gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/5">
                    <div className={`p-2 rounded-lg border ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white/80">
                        <span className="font-bold text-white">{act.username}</span> {act.details}
                      </p>
                      <p className="text-[10px] text-white/40 font-mono mt-1">{timeStr}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* REVENUE vs LOSS (P&L) */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 bg-[#0a0a16] shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4">Revenue vs Costs</h3>
            
            <div className="space-y-2">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Revenue Streams</p>
              <div className="flex justify-between text-sm text-white/70"><span>Premium Subs</span> <span className="text-white">₹{stats.subRevenue.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm text-white/70"><span>Affiliate</span> <span className="text-white">₹{stats.affiliateRevenue.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm text-white/70"><span>Ad Revenue</span> <span className="text-white">₹{stats.adRevenue.toLocaleString()}</span></div>
              <div className="flex justify-between text-sm font-bold text-emerald-400 pt-2 border-t border-white/5"><span>Total Revenue</span> <span>₹{totalRevenue.toLocaleString()}</span></div>
            </div>

            <div className="space-y-2 mt-6">
              <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Fixed Costs (Est.)</p>
              <div className="flex justify-between text-sm text-white/70"><span>HuggingFace API</span> <span className="text-white">₹0</span></div>
              <div className="flex justify-between text-sm text-white/70"><span>Hosting (Vercel)</span> <span className="text-white">₹0</span></div>
              <div className="flex justify-between text-sm text-white/70"><span>Domain (~₹999/yr)</span> <span className="text-white">₹83/mo</span></div>
              <div className="flex justify-between text-sm font-bold text-red-400 pt-2 border-t border-white/5"><span>Total Cost</span> <span>₹83</span></div>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-center">
            <p className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-widest mb-1">Net Profit / Month 🔥</p>
            <h2 className="text-3xl font-black text-emerald-400">₹{(totalRevenue - 83).toLocaleString()}</h2>
          </div>
        </div>

      </div>
 
      {/* CREDIT MONETIZATION ANALYTICS */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          🪙 Credit Monetization Analytics
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Credit Sales Revenue" value={`₹${creditStats.totalRevenue.toLocaleString()}`} icon={<DollarSign className="w-6 h-6 text-amber-400" />} color="border-amber-500/20 bg-amber-500/5" />
          <StatCard title="Total Credits Sold" value={creditStats.totalCreditsSold.toLocaleString()} icon={<Users className="w-6 h-6 text-purple-400" />} color="border-purple-500/20 bg-purple-500/5" />
          <StatCard title="Total Credits Consumed" value={creditStats.totalCreditsConsumed.toLocaleString()} icon={<Activity className="w-6 h-6 text-pink-400" />} color="border-pink-500/20 bg-pink-500/5" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* MOST ACTIVE USERS */}
          <div className="xl:col-span-2 glass-card rounded-2xl p-6 border border-white/10 bg-[#0a0a16] shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              🔥 Most Active Users (Credits Used)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="p-3 text-[10px] uppercase font-mono tracking-widest text-white/40">User</th>
                    <th className="p-3 text-[10px] uppercase font-mono tracking-widest text-white/40">Email</th>
                    <th className="p-3 text-[10px] uppercase font-mono tracking-widest text-white/40">Credits Consumed</th>
                    <th className="p-3 text-[10px] uppercase font-mono tracking-widest text-white/40">Current Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {creditStats.mostActiveUsers.map((item: any) => (
                    <tr key={item.uid} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-3 font-bold text-white">{item.displayName}</td>
                      <td className="p-3 text-white/60 font-mono">{item.email}</td>
                      <td className="p-3 font-mono font-bold text-rose-400">{item.totalCreditsUsed} credits</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{item.credits} credits</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* REVENUE SPLIT BY CREDIT PLAN */}
          <div className="glass-card rounded-2xl p-6 border border-white/10 bg-[#0a0a16] shadow-xl space-y-6 flex flex-col justify-between">
            <h3 className="text-lg font-bold text-white">Revenue Split by Credit Plan</h3>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-mono text-white/70">
                  <span>Starter (₹199):</span> <span className="font-bold text-amber-400">₹{(creditStats.revenueByPlan?.Starter || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-1.5" 
                    style={{ width: `${creditStats.totalRevenue > 0 ? ((creditStats.revenueByPlan?.Starter || 0) / creditStats.totalRevenue) * 100 : 0}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs font-mono text-white/70">
                  <span>Pro (₹499):</span> <span className="font-bold text-purple-400">₹{(creditStats.revenueByPlan?.Pro || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-purple-500 h-1.5" 
                    style={{ width: `${creditStats.totalRevenue > 0 ? ((creditStats.revenueByPlan?.Pro || 0) / creditStats.totalRevenue) * 100 : 0}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs font-mono text-white/70">
                  <span>Premium (₹999):</span> <span className="font-bold text-blue-400">₹{(creditStats.revenueByPlan?.Premium || 0).toLocaleString()}</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-1.5" 
                    style={{ width: `${creditStats.totalRevenue > 0 ? ((creditStats.revenueByPlan?.Premium || 0) / creditStats.totalRevenue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-center">
              <p className="text-[10px] font-mono text-amber-400/80 uppercase tracking-widest mb-1 font-bold">Total Credit Revenue</p>
              <h2 className="text-2xl font-black text-amber-400">₹{creditStats.totalRevenue.toLocaleString()}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ADMIN ACTIONS */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">Quick Admin Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <ActionButton icon={<Bell />} label="Send Notification" color="from-blue-500/20 to-indigo-500/20 text-blue-400" />
          <ActionButton icon={<Gift />} label="Gift Premium" color="from-purple-500/20 to-fuchsia-500/20 text-purple-400" onClick={() => window.location.href = "/admin/users"} />
          <ActionButton icon={<Mail />} label="Email Campaign" color="from-pink-500/20 to-rose-500/20 text-pink-400" />
          <ActionButton icon={<Wrench />} label="Maintenance Mode" color="from-amber-500/20 to-orange-500/20 text-amber-400" />
          <ActionButton icon={<Download />} label="Export Revenue" color="from-emerald-500/20 to-teal-500/20 text-emerald-400" />
          <ActionButton icon={<Users />} label="Export Users" color="from-slate-500/20 to-gray-500/20 text-slate-400" onClick={() => window.location.href = "/admin/users"} />
        </div>
      </div>

    </div>
  );
}

function StatCard({ title, value, icon, color, trend }: { title: string, value: string, icon: React.ReactNode, color: string, trend?: string }) {
  return (
    <div className={`glass-card rounded-2xl p-5 border ${color} flex flex-col justify-between h-32 relative overflow-hidden group`}>
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">{icon}</div>
      <p className="text-sm md:text-[10px] font-bold text-white/60 uppercase tracking-widest font-mono">{title}</p>
      <div>
        <h3 className="text-2xl font-black text-white">{value}</h3>
        {trend && <p className="text-sm md:text-[10px] text-emerald-400 font-mono mt-1">{trend} this week</p>}
      </div>
    </div>
  );
}

function ActionButton({ icon, label, color, onClick }: { icon: React.ReactNode, label: string, color: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`p-4 rounded-xl bg-gradient-to-br ${color} border border-white/5 hover:brightness-125 active:scale-95 transition-all flex flex-col items-center justify-center gap-3 text-center w-full`}
    >
      <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center">{icon}</div>
      <span className="text-sm md:text-[10px] font-bold tracking-wider uppercase font-mono">{label}</span>
    </button>
  );
}

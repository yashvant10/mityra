"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, Users, ShoppingBag, Box, ShoppingCart, 
  CreditCard, Coins, Activity, TrendingUp, Sparkles, 
  LifeBuoy, Server, Settings, LogOut, Menu, X, Search, Bell
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    const checkAdminRole = async () => {
      if (loading) return; // Wait for Firebase auth to initialize
      if (!user) {
        router.replace("/login");
        return;
      }
      try {
        const token = await (user as any).getIdToken();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const role = data.profile?.role;
          if (role === 'admin' || role === 'super_admin') {
            setIsAuthenticated(true);
            setIsCheckingRole(false);
            return;
          }
        }
        // Not admin
        router.replace("/dashboard");
      } catch (err) {
        console.error("Admin role check failed", err);
        router.replace("/dashboard");
      }
    };
    checkAdminRole();
  }, [user, loading, router]);

  if (isCheckingRole) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#C4727F] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Overview" },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/virtual-try-on", icon: Sparkles, label: "Virtual Try-On" },
    { href: "/admin/products", icon: Box, label: "Products" },
    { href: "/admin/orders", icon: ShoppingCart, label: "Orders" },
    { href: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
    { href: "/admin/credits", icon: Coins, label: "Credits" },
    { href: "/admin/ai-analytics", icon: Activity, label: "AI Analytics" },
    { href: "/admin/recommendations", icon: ShoppingBag, label: "Recommendations" },
    { href: "/admin/trends", icon: TrendingUp, label: "Trends" },
    { href: "/admin/support", icon: LifeBuoy, label: "Support" },
    { href: "/admin/api-health", icon: Server, label: "API Health" },
    { href: "/admin/settings", icon: Settings, label: "Admin Settings" },
    { href: "/admin/activity", icon: Activity, label: "Activity Log" }, // Reusing Activity icon for log
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] flex overflow-hidden font-sans selection:bg-[#C4727F]/30 selection:text-[#1A1A1A]">
      {/* Mobile Sidebar Toggle & Topnav */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#FFFFFF]/90 border-b border-[#E8E0D8] z-50 flex items-center px-4 justify-between backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="font-black tracking-widest text-sm uppercase text-[#1A1A1A]">MITYRA ADMIN</span>
        </div>
        <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 bg-[#FAF8F5] rounded-xl border border-[#E8E0D8] text-[#1A1A1A] hover:bg-[#E8E0D8]">
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#FFFFFF] border-r border-[#E8E0D8] flex flex-col z-40 transition-transform duration-300 ${isSidebarOpen ? "translate-x-0 mt-16 lg:mt-0" : "-translate-x-full mt-16 lg:mt-0 lg:translate-x-0"}`}>
        <div className="p-6 hidden lg:flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-black tracking-widest uppercase text-lg text-[#1A1A1A]">MITYRA ADMIN</span>
            <span className="text-xs text-[#00B982] font-medium tracking-widest">SECURE PORTAL</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            // Strict exact match for overview
            if (item.href === '/admin' && pathname !== '/admin') return null;

            // Make sure overview is active ONLY on exactly /admin
            const isStrictActive = item.href === '/admin' ? pathname === '/admin' : isActive;

            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium ${
                  isStrictActive 
                    ? "bg-[#C4727F]/10 text-[#C4727F] border border-[#C4727F]/20" 
                    : "text-[#1A1A1A]/70 hover:bg-[#FAF8F5] hover:text-[#1A1A1A] border border-transparent"
                }`}
              >
                <item.icon className={`w-4 h-4 ${isStrictActive ? "text-[#C4727F]" : "text-[#1A1A1A]/50"}`} />
                {item.label}
              </Link>
            );
          })}
          {/* Add missing overview link manually if it got skipped above */}
          <Link 
            href="/admin"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium ${
              pathname === "/admin"
                ? "bg-[#C4727F]/10 text-[#C4727F] border border-[#C4727F]/20" 
                : "text-[#1A1A1A]/70 hover:bg-[#FAF8F5] hover:text-[#1A1A1A] border border-transparent"
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 ${pathname === "/admin" ? "text-[#C4727F]" : "text-[#1A1A1A]/50"}`} />
            Overview
          </Link>
        </nav>

        <div className="p-4 border-t border-[#E8E0D8] bg-[#FAF8F5]">
          <div className="mb-4 px-2">
            <p className="text-xs font-bold text-[#1A1A1A] truncate">{user?.displayName || "Admin"}</p>
            <p className="text-[10px] text-[#1A1A1A]/50 truncate">{user?.email}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 text-sm font-medium text-[#1A1A1A]/70 hover:bg-red-50 hover:text-red-600 border border-transparent w-full"
          >
            <LogOut className="w-4 h-4 text-red-500/70" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 min-h-screen pt-16 lg:pt-0 overflow-y-auto flex flex-col">
        {/* Top Nav (Desktop) */}
        <header className="hidden lg:flex h-20 bg-[#FFFFFF] border-b border-[#E8E0D8] items-center justify-between px-8 sticky top-0 z-30">
          <div className="relative w-96">
            <Search className="w-4 h-4 text-[#1A1A1A]/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search users, orders, settings..." 
              className="w-full bg-[#FAF8F5] border border-[#E8E0D8] rounded-full py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:border-[#C4727F] transition-colors"
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full bg-[#FAF8F5] border border-[#E8E0D8] flex items-center justify-center text-[#1A1A1A]/70 hover:bg-[#E8E0D8] transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#C4727F] rounded-full"></span>
            </button>
            <div className="w-10 h-10 rounded-full bg-[#C4727F] text-white flex items-center justify-center font-bold text-sm shadow-md">
              AD
            </div>
          </div>
        </header>
        
        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          {children}
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

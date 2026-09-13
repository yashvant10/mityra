"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Sparkles,
  Camera,
  Shirt,
  Sparkles as RecsIcon,
  TrendingUp,
  Heart,
  ShoppingBag,
  CreditCard,
  UserCircle,
  LogOut,
  Menu,
  X,
  Crown,
  ChevronRight,
  Headphones,
  Wand2,
  History,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Logo from "@/components/shared/Logo";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/find-your-look", icon: Wand2, label: "Find Your Look" },
  { href: "/ai-studio", icon: Sparkles, label: "AI Studio" },
  { href: "/try-on", icon: Camera, label: "Try On" },
  { href: "/tryon-history", icon: History, label: "Try-On History" },
  { href: "/wardrobe", icon: Shirt, label: "Wardrobe" },
  { href: "/favorites", icon: Heart, label: "Favorites" },
  { href: "/recommendations", icon: RecsIcon, label: "Recommendations" },
  { href: "/trends", icon: TrendingUp, label: "Trends" },
  { href: "/orders", icon: ShoppingBag, label: "Orders" },
  { href: "/pricing", icon: CreditCard, label: "Credits & Plan" },
  { href: "/profile", icon: UserCircle, label: "Style Profile" },
  { href: "/help-support", icon: Headphones, label: "Help & Support" },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const isActive = (href: string) => pathname === href;

  const renderNavContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pb-6">
      {/* Logo */}
      <div className="px-6 py-8 flex items-center justify-start">
        <Logo href="/dashboard" />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item, index) => {
          const active = isActive(item.href);
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative"
            >
              {active && (
                <motion.div
                  layoutId={`sidebar-active-${isMobile ? "mobile" : "desktop"}`}
                  className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#b95b6a] rounded-r-full z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {item.href === "/orders" ? (
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block w-full transition-transform duration-300 press-scale ml-2 mb-2 mt-2 px-2"
                >
                  <img src="/images/orders-sidebar-btn.png" alt="Orders Coming Soon" className="w-full object-contain" />
                </Link>
              ) : (
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-[14px] text-[14px] font-medium transition-all duration-300 group press-scale ml-2 ${
                    active
                      ? "bg-[#FAF1F2] text-[#b95b6a]"
                      : "text-[#1A1A1A] hover:bg-[#F5F0EB]"
                  }`}
                >
                  <item.icon
                    className={`w-[20px] h-[20px] flex-shrink-0 transition-colors duration-300 ${
                      active ? "text-[#b95b6a]" : "text-[#1A1A1A]"
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              )}
            </motion.div>
          );
        })}
      </nav>

      {/* Upgrade Banner */}
      <div className="px-4 mt-6">
        <div className="bg-[#FAF8F5] border border-[#E8E0D8] rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-[#D4AF37]" />
            <h4 className="font-bold text-[#1A1A1A] text-[14px]">Upgrade to Premium</h4>
          </div>
          <p className="text-[12px] text-[#6B6B6B] leading-relaxed mb-4">
            Unlock unlimited try-ons, advanced AI recommendations and more.
          </p>
          <Link
            href="/pricing"
            className="w-full block text-center py-2.5 rounded-xl bg-[#b95b6a] text-white text-[13px] font-bold hover:bg-[#a84e5b] transition-colors"
          >
            Upgrade Now →
          </Link>
        </div>
      </div>

      {/* User Profile Snippet */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between p-3 rounded-[16px] hover:bg-[#F5F0EB] cursor-pointer transition-colors border border-transparent hover:border-[#E8E0D8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E8E0D8] overflow-hidden shrink-0 border border-[#D4AF37]/30">
              <img
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || "User"}&background=random`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="overflow-hidden">
              <h4 className="text-[14px] font-bold text-[#1A1A1A] truncate leading-tight flex items-center gap-1">
                {user?.displayName || "Yashvant Rao"}
                <Crown className="w-3 h-3 text-[#D4AF37]" />
              </h4>
              <p className="text-[11px] text-[#b95b6a] font-medium">Premium Member</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9B9B9B]" />
        </div>
      </div>

      {/* Help & Support & Logout */}
      <div className="px-4 mt-2 mb-4 space-y-2">
        <button className="w-full flex items-center justify-between p-3 rounded-[16px] text-[#1A1A1A] hover:bg-[#F5F0EB] transition-colors border border-transparent hover:border-[#E8E0D8]">
          <div className="flex items-center gap-3">
            <Headphones className="w-[18px] h-[18px] text-[#1A1A1A]" />
            <span className="text-[14px] font-medium">Help & Support</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9B9B9B]" />
        </button>
        
        <button 
          onClick={() => signOut()}
          className="w-full flex items-center justify-between p-3 rounded-[16px] text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-[18px] h-[18px] text-red-500" />
            <span className="text-[14px] font-medium">Log Out</span>
          </div>
        </button>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-white border-r border-[#E8E0D8] w-64 shadow-[2px_0_20px_rgba(0,0,0,0.02)] transition-all duration-300">
        {renderNavContent({ isMobile: false })}
      </aside>



      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[#E8E0D8] px-4 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <Logo href="/dashboard" />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-3 text-[#1A1A1A] hover:bg-[#F5F0EB] rounded-full transition-colors active:scale-95 min-h-[48px] min-w-[48px] flex items-center justify-center"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div
              className="absolute inset-0 bg-[#1A1A1A]/20 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0.2, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -50 || info.velocity.x < -500) {
                  setMobileOpen(false);
                }
              }}
              className="absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-[#E8E0D8] shadow-2xl"
            >
              {renderNavContent({ isMobile: true })}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

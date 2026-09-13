"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { LayoutDashboard, Camera, Search, UserCircle, Shirt } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { href: "/discover", icon: Search, label: "Discover" },
    { href: "/try-on", icon: Camera, label: "Studio" },
    { href: "/wardrobe", icon: Shirt, label: "Wardrobe" },
    { href: "/profile", icon: UserCircle, label: "Profile" },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-white/90 backdrop-blur-xl border-t border-[#E8E0D8] z-40 flex justify-around items-center px-2 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center justify-center gap-1 w-full h-full min-h-[56px] transition-all duration-300 active:scale-95 ${
              active ? "text-[#b95b6a]" : "text-[#6B6B6B] hover:text-[#1A1A1A]"
            }`}
          >
            {active && (
              <motion.div
                layoutId="bottom-nav-indicator"
                className="absolute top-0 w-10 h-1 bg-[#b95b6a] rounded-b-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <motion.div
              animate={active ? { y: -2, scale: 1.05 } : { y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex flex-col items-center gap-1 mt-1"
            >
              <item.icon className={`w-[24px] h-[24px] ${active ? "text-[#b95b6a]" : ""}`} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-bold tracking-wide">
                {item.label}
              </span>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}

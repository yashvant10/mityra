"use client";

import { Search, Bell, Heart, Crown, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useState } from "react";

export default function TopNav({ onSearch }: { onSearch?: (query: string) => void }) {
  const { user } = useAuth();
  const { balance, loading } = useWallet();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  return (
    <div className="w-full h-20 flex items-center justify-between px-2 sm:px-0 mb-6 bg-transparent pt-4 sm:pt-6">
      {/* Search Bar */}
      <div className="flex-1 max-w-2xl mr-4">
        <div className="relative group">
          {isNavigating ? (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#b95b6a] border-t-transparent animate-spin" />
          ) : (
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9B9B9B] group-focus-within:text-[#b95b6a] transition-colors" />
          )}
          <input
            type="text"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = e.currentTarget.value.trim();
                if (!val) return;
                
                const isUrl = /^https?:\/\//i.test(val) || val.includes("amzn.in/") || val.includes("amazon.in/") || val.includes("flipkart.com/") || val.includes("myntra.com/") || val.includes("ajio.com/") || val.includes("meesho.com/");

                if (isUrl) {
                  if (onSearch) {
                    onSearch(val);
                  } else {
                    setIsNavigating(true);
                    router.push(`/try-on?url=${encodeURIComponent(val)}`);
                  }
                } else {
                  setIsNavigating(true);
                  router.push(`/discover?q=${encodeURIComponent(val)}`);
                }
              }
            }}
            placeholder="Search outfits, brands, trends, occasions, or paste a product link..."
            className="w-full h-12 pl-12 pr-12 rounded-full bg-white border border-[#E8E0D8] text-[14px] text-[#1A1A1A] placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#C4727F] focus:ring-1 focus:ring-[#C4727F]/20 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all duration-300"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#9B9B9B] bg-[#FAF8F5] px-2 py-1 rounded border border-[#E8E0D8]">
            /
          </div>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
        <button className="relative text-[#1A1A1A] hover:text-[#b95b6a] transition-colors p-2">
          <Bell className="w-[20px] h-[20px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#b95b6a] rounded-full border border-[#FAF8F5]"></span>
        </button>

        <Link href="/favorites" className="text-[#1A1A1A] hover:text-[#b95b6a] transition-colors p-2 hidden sm:block">
          <Heart className="w-[20px] h-[20px]" />
        </Link>

        <Link
          href="/credits"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-[#E8E0D8] rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-[#D4AF37]/50 transition-colors"
        >
          <Crown className="w-[18px] h-[18px] text-[#D4AF37]" />
          <span className="text-[13px] font-bold text-[#1A1A1A] flex items-center gap-1">
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : (balance !== null ? balance : 0)} Credits
          </span>
        </Link>

        <div className="w-10 h-10 rounded-full overflow-hidden border border-[#E8E0D8] shadow-sm ml-1 shrink-0 cursor-pointer hover:opacity-90 transition-opacity">
          <img
            src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || "User"}&background=random`}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

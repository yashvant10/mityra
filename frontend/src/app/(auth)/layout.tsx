"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles, Star, Cpu } from "lucide-react";
import Logo from "@/components/shared/Logo";

export const dynamic = "force-dynamic";

function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="w-10 h-10 border-4 border-rose-400/30 border-t-[#C4727F] rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return <>{children}</>;
}

const cardsData = [
  {
    id: 'perfect-match',
    title: 'Perfect Match!',
    subtitle: '98% Compatibility',
    desc: 'AI finds the perfect style that matches you',
    img: '/images/categories/casual.png',
    icon: <Sparkles className="w-3.5 h-3.5 text-[#C4727F]" strokeWidth={2} />,
    animate: { y: [-5, 5, -5] },
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" as const },
    side: 'left'
  },
  {
    id: 'style-unlocked',
    title: 'Style Unlocked',
    subtitle: 'New looks for you',
    desc: 'Discover fresh styles every day',
    img: '/images/categories/party.png',
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C4727F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 15V9a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v6"/><path d="M15 7c0-2-1.3-3.8-3-4-1.8-.2-3.4 1.2-3.4 3v3h6Z"/></svg>,
    animate: { y: [4, -6, 4] },
    transition: { duration: 7, repeat: Infinity, ease: "easeInOut" as const, delay: 1 },
    side: 'left'
  },
  {
    id: 'trend-spotted',
    title: 'Trend Spotted',
    subtitle: 'Just for you',
    desc: 'Top trends handpicked for your style',
    img: '/images/categories/workwear.png',
    icon: <Star className="w-3.5 h-3.5 text-[#C4727F]" strokeWidth={2} />,
    animate: { y: [-4, 6, -4] },
    transition: { duration: 5.5, repeat: Infinity, ease: "easeInOut" as const, delay: 0.5 },
    side: 'right'
  },
  {
    id: 'ai-powered',
    title: 'AI-Powered',
    subtitle: 'Fashion Tech',
    desc: 'Smart technology for smarter styling',
    img: '/images/hero/hero-models.png',
    icon: <Cpu className="w-3.5 h-3.5 text-[#C4727F]" strokeWidth={2} />,
    animate: { y: [6, -4, 6] },
    transition: { duration: 6.5, repeat: Infinity, ease: "easeInOut" as const, delay: 1.5 },
    side: 'right'
  }
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const renderCard = (card: typeof cardsData[0], extraClass = "") => (
    <motion.div
      key={card.id}
      animate={card.animate}
      transition={card.transition}
      className={`w-full max-w-[192px] p-3 rounded-[24px] bg-white border border-[#E8E0D8]/60 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col group hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-500 ease-out mx-auto ${extraClass}`}
    >
      <div className="w-full h-32 rounded-[16px] overflow-hidden relative mb-4 bg-[#FAF5F6]">
        <img
          src={card.img}
          alt={card.title}
          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
        />
        <div className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center">
          {card.icon}
        </div>
      </div>
      <div className="text-center pb-2">
        <h3 className="text-[10px] font-bold tracking-widest uppercase text-[#C4727F] mb-1.5">{card.title}</h3>
        <p className="text-[13px] font-bold text-[#1A1A1A] mb-1 font-heading">{card.subtitle}</p>
        <p className="text-[10px] font-medium text-[#9B9B9B] leading-relaxed px-1">{card.desc}</p>
      </div>
    </motion.div>
  );

  return (
    <GuestGuard>
        <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] flex flex-col justify-between relative font-sans select-none overflow-y-auto">
          {/* Header with Logo */}
          <header className="w-full max-w-7xl mx-auto px-6 pt-6 flex items-center justify-between relative z-20">
            <Logo />
          </header>

          {/* Main Content Area */}
          <main className="flex-1 w-full mx-auto px-6 py-12 lg:py-8 relative z-10 flex flex-col items-center">
            
            <div className="w-full max-w-7xl relative flex items-center justify-center min-h-[500px]">
              {/* LEFT side floating panels - Visible on large screens */}
              <div className="hidden lg:flex flex-col gap-6 absolute left-0 xl:left-8 max-w-[200px] z-0">
                {cardsData.filter(c => c.side === 'left').map((card, i) => renderCard(card, i === 0 ? "ml-6" : "mr-6"))}
              </div>

              {/* CENTER Card - Rendered via children */}
              <div className="relative z-10 w-full max-w-[480px]">
                {children}
              </div>

              {/* RIGHT side floating panels - Visible on large screens */}
              <div className="hidden lg:flex flex-col gap-6 absolute right-0 xl:right-8 max-w-[200px] z-0">
                {cardsData.filter(c => c.side === 'right').map((card, i) => renderCard(card, i === 0 ? "mr-6" : "ml-6"))}
              </div>
            </div>

            {/* Mobile/Tablet Stacked Cards Layout */}
            <div className="lg:hidden w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-6 mt-16 pb-8">
              {cardsData.map(card => renderCard(card))}
            </div>
            
          </main>

          {/* Footer credits */}
          <footer className="w-full py-4 text-center text-xs font-medium text-[#9B9B9B] relative z-20">
            © 2026 MITYRA. All rights reserved.
          </footer>
        </div>
    </GuestGuard>
  );
}

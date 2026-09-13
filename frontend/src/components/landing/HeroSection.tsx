"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Heart, Lock, Sparkles } from "lucide-react";
import { AnimatedText } from "@/components/ui/AnimatedText";
import { AntiGravityWrapper } from "@/components/ui/AntiGravityWrapper";

const trustedStores = [
  { name: "Amazon", logo: "/images/amazon.svg", alt: "Amazon" },
  { name: "Flipkart", logo: "/images/flipkart.svg", alt: "Flipkart" },
  { name: "Myntra", logo: "/images/myntra.png", alt: "Myntra" },
  { name: "AJIO", logo: "/images/ajio.svg", alt: "AJIO", height: "h-5 sm:h-6" },
  { name: "Meesho", logo: "/images/meesho.png", alt: "Meesho", height: "h-7 sm:h-8" },
];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen bg-[#FAF8F5] pt-28 lg:pt-32 pb-16 overflow-hidden">
      
      {/* Background ambient gradient with slow breathing animation */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#E8D5C4] blur-[150px] rounded-full mix-blend-multiply" 
        />
        <motion.div 
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.65, 0.4] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#F2E0E3] blur-[120px] rounded-full mix-blend-multiply" 
        />
      </div>

      <div className="relative z-20 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 xl:gap-12 items-center">

          {/* LEFT COLUMN: BRANDING & CTA */}
          <div className="lg:col-span-4 flex flex-col items-start text-left order-2 lg:order-1 pt-10 lg:pt-0">
            
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
              className="text-[11px] sm:text-xs tracking-[0.25em] uppercase text-[#B8967D] font-bold mb-6 flex items-center gap-2.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI VIRTUAL TRY-ON
            </motion.p>

            <h1 className="text-[clamp(3.5rem,5.5vw,5.5rem)] font-semibold leading-[1.05] tracking-[-0.01em] mb-7 font-heading text-[#1A1A1A]">
              <AnimatedText text="See it on you," className="block" delay={0.2} />
              <AnimatedText text="before you buy." className="block italic text-[#C4727F] font-medium font-heading" delay={0.5} />
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, delay: 1.0, ease: [0.33, 1, 0.68, 1] }}
              className="text-base sm:text-lg text-[#6B6B6B] max-w-[360px] mb-12 leading-relaxed font-body"
            >
              Discover, try and shop outfits from your favorite brands with the power of cinematic AI generation.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2, ease: [0.33, 1, 0.68, 1] }}
              className="flex flex-col sm:flex-row items-center gap-4 mb-14 w-full"
            >
              <Link href="/try-on" className="btn-primary !px-8 !py-4 text-[15px] font-semibold !rounded-xl gap-2.5 w-full sm:w-auto shadow-[0_6px_24px_rgba(26,26,26,0.12)] hover:shadow-[0_10px_36px_rgba(26,26,26,0.18)] group">
                Try Your Look Now
                <ArrowRight className="w-4 h-4 ml-1 transition-transform duration-400 group-hover:translate-x-1.5" />
              </Link>
              <a href="#discover" className="btn-secondary !px-8 !py-4 text-[15px] font-semibold !rounded-xl w-full sm:w-auto bg-transparent border-[#E8E0D8] hover:border-[#1A1A1A]">
                Explore Collections
              </a>
            </motion.div>

            {/* Trust Features with staggered reveal */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1, delayChildren: 1.4 }
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6"
            >
              {[
                { icon: CheckCircle2, title: "Realistic AI", desc: "True-to-life results" },
                { icon: ShieldCheck, title: "High Accuracy", desc: "Perfect body match" },
                { icon: ShieldCheck, title: "Secure", desc: "Encrypted inference" },
                { icon: Lock, title: "Privacy First", desc: "Photos auto-deleted" }
              ].map((feature, idx) => (
                <motion.div 
                  key={idx}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
                  }}
                  className="flex items-center gap-3 group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-[#F2E0E3]/50 flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:scale-110 shadow-sm group-hover:shadow-md">
                    <feature.icon className="w-4 h-4 text-[#C4727F]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">{feature.title}</p>
                    <p className="text-[11px] text-[#6B6B6B] mt-0.5">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* CENTER COLUMN: ANTI-GRAVITY FLOATING VISUAL */}
          <div className="lg:col-span-5 h-[50vh] sm:h-[60vh] lg:h-[75vh] w-full relative order-1 lg:order-2 flex items-center justify-center z-10">
            <AntiGravityWrapper intensity={20} className="w-full h-full">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 1.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="w-full h-full rounded-[32px] overflow-hidden relative group shadow-[0_40px_80px_rgba(0,0,0,0.1)]"
                style={{ transform: "translateZ(30px)" }}
              >
                <img 
                  src="/premium-fashion-display.jpg" 
                  alt="Premium fashion campaign visual"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                
                {/* Floating internal badge */}
                <motion.div 
                  className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border border-white/20"
                  style={{ transform: "translateZ(60px)" }}
                >
                  <div className="w-2 h-2 rounded-full bg-[#C4727F]" style={{ animation: "premium-glow 4s ease-in-out infinite" }} />
                  <span className="text-[13px] font-bold tracking-wider uppercase text-[#1A1A1A]">Generation Complete</span>
                </motion.div>
              </motion.div>
            </AntiGravityWrapper>
          </div>

          {/* RIGHT COLUMN: QUICK TRY-ON CARD */}
          <div className="lg:col-span-3 flex justify-center lg:justify-end order-3 w-full lg:pt-12">
            <AntiGravityWrapper intensity={10} className="w-full max-w-[320px]">
              <motion.div
                initial={{ opacity: 0, x: 40, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.9, delay: 0.7, type: "spring", stiffness: 50, damping: 18 }}
                className="bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-[#E8E0D8] overflow-hidden hover:shadow-[0_24px_80px_rgba(0,0,0,0.1)] transition-shadow duration-700"
                style={{ transform: "translateZ(40px)" }}
              >
                <div className="p-4 border-b border-[#E8E0D8] bg-[#FAF8F5]/50 flex justify-between items-center">
                  <span className="text-[13px] font-bold uppercase tracking-wider text-[#1A1A1A]">Quick Try-On</span>
                  <span className="w-2 h-2 rounded-full bg-[#C4727F]" style={{ animation: "luxury-pulse 3s ease-in-out infinite" }} />
                </div>
                
                <div className="relative aspect-[4/5] bg-[#F5F0EB] overflow-hidden group">
                  <video 
                    src="/videos/virtual-tryon-demo.mp4?v=3" 
                    poster="/premium-fashion-display.jpg"
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-black/10 transition-opacity duration-500 group-hover:opacity-0" />
                  <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md shadow-lg flex items-center justify-center text-[#1A1A1A] hover:text-[#C4727F] transition-all duration-300 hover:scale-110 active:scale-95">
                    <Heart className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5">
                  <Link href="/try-on" className="w-full btn-primary !py-3.5 flex justify-center !rounded-[14px] group shadow-md hover:shadow-lg">
                    Try Your Look
                    <ArrowRight className="w-4 h-4 ml-1.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            </AntiGravityWrapper>
          </div>

        </div>
      </div>

      {/* TRUSTED STORES CAROUSEL */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.6 }}
        className="relative mt-20 lg:mt-32 pb-8 border-t border-[#E8E0D8]/50 pt-12 bg-gradient-to-b from-white/40 to-transparent"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <p className="text-center text-[11px] uppercase tracking-[0.2em] font-bold text-[#6B6B6B]">
            Shop from <span className="text-[#C4727F]">trusted brands</span>
          </p>
        </div>
        
        <div className="relative flex overflow-x-hidden w-full max-w-[1200px] mx-auto mask-image-linear">
          <div className="animate-marquee-scroll whitespace-nowrap flex items-center hover:animation-pause">
            {[...trustedStores, ...trustedStores].map((store, idx) => (
              <div 
                key={`${store.name}-${idx}`} 
                className="mx-8 sm:mx-12 transition-all duration-500 cursor-pointer flex items-center justify-center min-w-[110px] opacity-50 grayscale hover:opacity-100 hover:grayscale-0 hover:scale-105"
              >
                <img 
                  src={store.logo} 
                  alt={store.alt} 
                  className={`object-contain ${store.height || "h-9 sm:h-10"}`} 
                />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .mask-image-linear {
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
        @keyframes marquee-scroll-custom {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-scroll {
          animation: marquee-scroll-custom 35s linear infinite;
        }
        .hover\\:animation-pause:hover {
          animation-play-state: paused;
        }
      `}} />
    </section>
  );
}


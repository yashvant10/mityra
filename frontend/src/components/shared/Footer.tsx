"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const footerNav = {
  Shop: [
    { label: "Women", href: "#" },
    { label: "Men", href: "#" },
    { label: "Kids", href: "#" },
    { label: "Brands", href: "#" },
    { label: "Collections", href: "#discover" },
  ],
  Help: [
    { label: "How It Works", href: "#how-it-works" },
    { label: "FAQs", href: "#" },
    { label: "Shipping", href: "#" },
    { label: "Returns", href: "#" },
    { label: "Contact", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Press", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Privacy", href: "#" },
  ],
};

export default function Footer() {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Newsletter integration point
    console.log("Subscribe:", email);
    setEmail("");
  };

  return (
    <footer className="bg-[#F5F0EB] border-t border-[#E8E0D8]">
      <ScrollReveal variant="fade-up" duration={0.7}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Logo className="mb-4" />
            <p className="text-[#6B6B6B] text-sm leading-relaxed mb-6 max-w-xs">
              Discover outfits, try them on virtually, and shop with confidence from your favorite stores.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-2.5">
              {[
                { label: "Instagram", path: "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 017.8 2m-.2 2A3.6 3.6 0 004 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 003.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5M12 7a5 5 0 110 10 5 5 0 010-10m0 2a3 3 0 100 6 3 3 0 000-6z" },
                { label: "Twitter", path: "M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 01-1.93.07 4.28 4.28 0 004 2.98 8.521 8.521 0 01-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" },
                { label: "LinkedIn", path: "M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#"
                  aria-label={social.label}
                  className="w-9 h-9 rounded-lg bg-white border border-[#E8E0D8] hover:border-[#D4949E] flex items-center justify-center text-[#6B6B6B] hover:text-[#C4727F] transition-all duration-400 hover:scale-105 hover:shadow-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerNav).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-[#1A1A1A] mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#6B6B6B] hover:text-[#C4727F] transition-colors duration-200"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter column */}
          <div className="col-span-2 md:col-span-1">
            <h4 className="text-sm font-semibold text-[#1A1A1A] mb-4">
              Newsletter
            </h4>
            <p className="text-xs text-[#6B6B6B] mb-3 leading-relaxed">
              Stay updated with the latest styles, offers and exclusive drops.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white border border-[#E8E0D8] text-sm text-[#1A1A1A] placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#C4727F] focus:ring-1 focus:ring-[#C4727F]/20 transition-all"
                required
              />
              <button type="submit" className="px-3 py-2 rounded-lg bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex-shrink-0">
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-[#E8E0D8] flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#9B9B9B]">
            © {new Date().getFullYear()} MITYRA. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-[#9B9B9B]">
            <Link href="/help-support" className="hover:text-[#C4727F] transition-colors">Terms</Link>
            <Link href="/help-support" className="hover:text-[#C4727F] transition-colors">Privacy</Link>
            <Link href="/help-support" className="hover:text-[#C4727F] transition-colors">Cookies</Link>
          </div>
          <p className="text-xs text-[#9B9B9B]">
            Made with <span className="text-[#C4727F]">❤️</span> in India
          </p>
        </div>
      </div>
      </ScrollReveal>
    </footer>
  );
}

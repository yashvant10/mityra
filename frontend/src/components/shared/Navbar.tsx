"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, Search } from "lucide-react";
import Logo from "./Logo";

const navLinks = [
  { href: "#women", label: "Women" },
  { href: "#men", label: "Men" },
  { href: "#kids", label: "Kids" },
  { href: "#brands", label: "Brands" },
  { href: "#collections", label: "Collections" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const lastScrollY = useRef(0);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 30);
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobileOpen]);

  // Trap focus in mobile menu when open
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-[600ms] ease-[cubic-bezier(0.33,1,0.68,1)] ${
          isScrolled
            ? "glass-navbar"
            : "bg-transparent"
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[72px]">
            {/* Logo */}
            <Logo />

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-0.5">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="nav-link-premium px-4 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors duration-400 font-medium"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Desktop Right Actions */}
            <div className="hidden lg:flex items-center gap-2">
              {/* Search */}
              <button
                className="w-10 h-10 flex items-center justify-center text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors duration-300 rounded-lg hover:bg-[#F0EBE6]"
                aria-label="Search"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="7.5" cy="7.5" r="5.5" />
                  <line x1="12" y1="12" x2="16" y2="16" />
                </svg>
              </button>

              {/* Log in */}
              <Link
                href="/login"
                className="nav-link-premium px-5 py-2 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors duration-300 font-medium"
              >
                Log in
              </Link>

              {/* Sign up */}
              <Link
                href="/signup"
                className="btn-primary !py-2.5 !px-5 !text-sm !rounded-lg"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center text-[#1A1A1A] transition-colors rounded-lg"
              aria-label={isMobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileOpen}
              aria-controls="mobile-nav-panel"
            >
              <motion.div
                initial={false}
                animate={{ rotate: isMobileOpen ? 90 : 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {isMobileOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </motion.div>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/25 backdrop-blur-sm"
              onClick={() => setIsMobileOpen(false)}
            />

            {/* Panel */}
            <motion.div
              ref={mobileMenuRef}
              id="mobile-nav-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-[#FAF8F5] p-6 pt-20 shadow-[0_0_60px_rgba(0,0,0,0.08)]"
            >
              <div className="flex flex-col gap-1">
                {navLinks.map((link, index) => (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 + index * 0.05, duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
                    onClick={() => setIsMobileOpen(false)}
                    className="px-4 py-3.5 text-[#1A1A1A] hover:bg-[#F0EBE6] rounded-lg transition-all duration-200 text-base font-medium"
                  >
                    {link.label}
                  </motion.a>
                ))}

                <div className="h-px bg-[#E8E0D8] my-4" />

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.35 }}
                >
                  <Link
                    href="/login"
                    onClick={() => setIsMobileOpen(false)}
                    className="block px-4 py-3.5 text-[#6B6B6B] hover:text-[#1A1A1A] rounded-lg transition-all text-base font-medium"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setIsMobileOpen(false)}
                    className="btn-primary text-center text-base mt-2 w-full"
                  >
                    Get Started
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


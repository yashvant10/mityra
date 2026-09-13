"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { 
  Search, 
  BookOpen, 
  Sparkles, 
  Camera, 
  CreditCard, 
  ChevronDown, 
  Headphones, 
  MessageCircle, 
  ShieldCheck,
  ChevronRight,
  LifeBuoy
} from "lucide-react";
import TopNav from "@/components/dashboard/TopNav";

export default function HelpSupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "How does MITYRA recommend outfits?",
      answer: "MITYRA uses advanced AI algorithms to analyze your style profile, body type, and current trends to curate personalized outfit recommendations perfectly suited for you."
    },
    {
      question: "How does Virtual Try-On work?",
      answer: "Virtual Try-On allows you to upload a clear photo of yourself and select an item of clothing. Our AI seamlessly maps the clothing onto your image, giving you a highly realistic preview of the fit."
    },
    {
      question: "How do credits work?",
      answer: "Credits are used for AI generations such as Virtual Try-On or advanced AI Studio edits. You receive a monthly allowance based on your subscription tier. You can track your usage in the Top Navigation bar."
    },
    {
      question: "What is included in Premium?",
      answer: "Premium unlocks unlimited Virtual Try-Ons, access to exclusive high-end AI Studio tools (like Style Transformer), priority generation speed, and exclusive trend insights."
    },
    {
      question: "How can I change my profile?",
      answer: "Navigate to the 'Style Profile' tab in the sidebar. There you can update your sizing, favorite colors, style preferences, and upload a new avatar."
    },
    {
      question: "How can I manage my account?",
      answer: "You can manage your email, password, and active subscriptions by going to the 'Credits & Plan' page or through your secure profile settings."
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const quickCards = [
    {
      title: "Getting Started",
      desc: "Learn how to use MITYRA.",
      icon: BookOpen,
      route: "/profile",
      color: "text-[#C4727F]",
      bg: "bg-[#FAF1F2]"
    },
    {
      title: "AI & Recommendations",
      desc: "Learn about Find Your Look, Recommendations and AI Studio.",
      icon: Sparkles,
      route: "/ai-studio",
      color: "text-[#D4AF37]",
      bg: "bg-[#FAF8ED]"
    },
    {
      title: "Virtual Try-On",
      desc: "Learn how Virtual Try-On works.",
      icon: Camera,
      route: "/try-on",
      color: "text-[#8BA888]",
      bg: "bg-[#F0F5EF]"
    },
    {
      title: "Payments & Credits",
      desc: "Learn about plans, credits and payments.",
      icon: CreditCard,
      route: "/pricing",
      color: "text-[#94B0B7]",
      bg: "bg-[#F2F6F7]"
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center bg-[#FAF8F5] min-h-screen pb-20">
      <div className="w-full max-w-[1400px]">
        <TopNav />

        <div className="px-4 sm:px-8 space-y-12 mt-6">
          
          {/* Header & Search */}
          <div className="text-center space-y-6 max-w-2xl mx-auto">
            <h1 className="text-[36px] font-bold text-[#1A1A1A] font-heading">Help & Support</h1>
            <p className="text-[15px] text-[#6B6B6B]">We're here to help you get the most from MITYRA.</p>
            
            <div className="relative max-w-xl mx-auto mt-8">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-[#C4727F]" />
              </div>
              <input 
                type="text" 
                placeholder="How can we help you? Search FAQs, articles..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-4 rounded-full border border-[#E8E0D8] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-[#C4727F]/20 focus:border-[#C4727F] text-[15px] text-[#1A1A1A] transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-10">
            
            {/* Main Content (Left) */}
            <div className="flex-1 space-y-10 min-w-0">
              
              {/* Quick Help Cards */}
              <section>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {quickCards.map((card, idx) => (
                    <motion.div
                      whileHover={{ y: -4 }}
                      transition={{ duration: 0.2 }}
                      key={idx}
                    >
                      <Link href={card.route} className="block h-full bg-white p-6 rounded-[24px] border border-[#E8E0D8] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#C4727F]/30 transition-colors group">
                        <div className={`w-12 h-12 rounded-[16px] ${card.bg} flex items-center justify-center mb-4`}>
                          <card.icon className={`w-6 h-6 ${card.color}`} />
                        </div>
                        <h3 className="text-[16px] font-bold text-[#1A1A1A] mb-1.5">{card.title}</h3>
                        <p className="text-[13px] text-[#6B6B6B] mb-5">{card.desc}</p>
                        <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#C4727F]">
                          View Help <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* FAQs Accordion */}
              <section className="bg-white rounded-[32px] p-8 border border-[#E8E0D8] shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
                <h2 className="text-[22px] font-bold text-[#1A1A1A] font-heading mb-6 flex items-center gap-2">
                  <LifeBuoy className="w-6 h-6 text-[#C4727F]" /> Frequently Asked Questions
                </h2>
                
                <div className="space-y-4">
                  {filteredFaqs.length > 0 ? (
                    filteredFaqs.map((faq, idx) => (
                      <div key={idx} className="border border-[#E8E0D8] rounded-[20px] overflow-hidden transition-colors hover:border-[#C4727F]/30">
                        <button 
                          onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                          className="w-full flex items-center justify-between p-5 text-left bg-white focus:outline-none"
                        >
                          <span className="text-[15px] font-bold text-[#1A1A1A]">{faq.question}</span>
                          <ChevronDown className={`w-5 h-5 text-[#C4727F] transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {openFaq === idx && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                              <div className="p-5 pt-0 text-[14px] text-[#6B6B6B] leading-relaxed border-t border-[#E8E0D8] bg-[#FAF8F5]/50">
                                {faq.answer}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-[#6B6B6B] text-[14px]">
                      No frequently asked questions match your search.
                    </div>
                  )}
                </div>
              </section>

            </div>

            {/* Sidebar Content (Right) */}
            <div className="w-full xl:w-[340px] space-y-6 flex-shrink-0">
              
              {/* Contact Support */}
              <div className="bg-[#FAF1F2] rounded-[32px] p-8 border border-[#C4727F]/10 text-center relative overflow-hidden">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-5 shadow-sm relative z-10">
                  <Headphones className="w-8 h-8 text-[#C4727F]" />
                </div>
                <h3 className="text-[20px] font-bold text-[#1A1A1A] font-heading mb-2 relative z-10">Still need help?</h3>
                <p className="text-[13px] text-[#6B6B6B] mb-6 relative z-10">Our support team is here for you.</p>
                <a 
                  href="mailto:support@mityra.com"
                  className="inline-flex items-center justify-center w-full py-3.5 rounded-full bg-[#1A1A1A] text-white text-[14px] font-bold hover:bg-[#333333] transition-colors gap-2 relative z-10"
                >
                  Contact Support <ChevronRight className="w-4 h-4" />
                </a>
                
                {/* Decorative background shapes */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#C4727F]/5 rounded-full z-0"></div>
                <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[#C4727F]/5 rounded-full z-0"></div>
              </div>

              {/* Support Options */}
              <div className="bg-white rounded-[28px] p-6 border border-[#E8E0D8]">
                <h3 className="text-[15px] font-bold text-[#1A1A1A] mb-4">Support Options</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-[16px] hover:bg-[#FAF8F5] transition-colors cursor-pointer border border-transparent hover:border-[#E8E0D8]">
                    <div className="w-10 h-10 rounded-full bg-[#FAF1F2] flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-[#C4727F]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-[#1A1A1A]">Help Center</p>
                      <p className="text-[11px] text-[#6B6B6B]">Browse guides and tutorials.</p>
                    </div>
                  </div>
                  <a href="mailto:support@mityra.com" className="flex items-center gap-3 p-3 rounded-[16px] hover:bg-[#FAF8F5] transition-colors cursor-pointer border border-transparent hover:border-[#E8E0D8]">
                    <div className="w-10 h-10 rounded-full bg-[#FAF1F2] flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-[#C4727F]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-[#1A1A1A]">Contact Support</p>
                      <p className="text-[11px] text-[#6B6B6B]">Get help from the MITYRA team.</p>
                    </div>
                  </a>
                  <div className="flex items-center gap-3 p-3 rounded-[16px] hover:bg-[#FAF8F5] transition-colors cursor-pointer border border-transparent hover:border-[#E8E0D8]">
                    <div className="w-10 h-10 rounded-full bg-[#FAF1F2] flex items-center justify-center flex-shrink-0">
                      <LifeBuoy className="w-5 h-5 text-[#C4727F]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-[#1A1A1A]">FAQs</p>
                      <p className="text-[11px] text-[#6B6B6B]">Find quick answers.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Your Privacy Matters */}
              <div className="bg-white rounded-[28px] p-6 border border-[#E8E0D8]">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-[#8BA888]" />
                  <h3 className="text-[15px] font-bold text-[#1A1A1A]">Your Privacy Matters</h3>
                </div>
                <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
                  MITYRA securely protects your account information. We will never ask you to share your password or payment details over email or chat.
                </p>
              </div>

            </div>
          </div>

          {/* Real Data Block: Support Tickets */}
          <div className="mt-8 border-t border-[#E8E0D8] pt-10">
            <h2 className="text-[20px] font-bold text-[#1A1A1A] font-heading mb-6">Your Support Requests</h2>
            <div className="bg-white rounded-[24px] p-10 border border-[#E8E0D8] text-center shadow-sm">
              <p className="text-[15px] font-bold text-[#1A1A1A] mb-2">No support requests yet.</p>
              <p className="text-[13px] text-[#6B6B6B]">When you contact support, your ticket history will appear here.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

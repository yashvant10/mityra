"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles, Zap, Check, ChevronRight, Shield, CreditCard, Clock, RefreshCw } from "lucide-react";
import TopNav from "@/components/dashboard/TopNav";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import Script from "next/script";

const PLANS = [
  { id: "starter", name: "Starter", credits: 5, price: 49, popular: false, desc: "Perfect for quick tests" },
  { id: "basic", name: "Basic", credits: 10, price: 89, popular: false, desc: "Great for weekend outfits" },
  { id: "popular", name: "Popular", credits: 25, price: 199, popular: true, desc: "Best value for regular users" },
  { id: "pro", name: "Pro", credits: 50, price: 349, popular: false, desc: "For the fashion enthusiast" },
  { id: "ultimate", name: "Ultimate", credits: 100, price: 599, popular: false, desc: "Never run out of style" },
];

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CreditsPage() {
  const { user } = useAuth();
  const { balance, loading } = useWallet();
  const [processing, setProcessing] = useState<string | null>(null);

  const handlePurchase = async (plan: typeof PLANS[0]) => {
    if (!user) {
      toast.error("Please login to purchase credits.");
      return;
    }

    setProcessing(plan.id);
    
    try {
      const token = await (user as any).getIdToken();
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ planId: plan.id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create order");

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "MITYRA",
        description: `${plan.credits} Virtual Try-On Credits`,
        order_id: data.orderId,
        prefill: {
          email: user.email,
        },
        theme: {
          color: "#C4727F",
        },
        handler: function (response: any) {
          toast.success("Payment successful! Credits will be added momentarily.");
          setProcessing(null);
        },
        modal: {
          ondismiss: function () {
            toast.error("Payment cancelled.");
            setProcessing(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        toast.error(`Payment failed: ${response.error.description}`);
        setProcessing(null);
      });
      rzp.open();
      
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Something went wrong.");
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-24">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <TopNav />
      
      <main className="max-w-6xl mx-auto px-6 pt-24">
        {/* Header section */}
        <div className="text-center mb-16 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-[#C4727F]/10 text-[#C4727F] px-4 py-2 rounded-full text-[12px] font-bold tracking-wider uppercase mb-6"
          >
            <Zap className="w-4 h-4 fill-[#C4727F]" />
            Power Your Virtual Wardrobe
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-[42px] md:text-[56px] font-bold text-[#1A1A1A] font-heading leading-tight mb-4"
          >
            Choose Your <span className="text-[#C4727F]">Credits</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[#6B6B6B] text-[18px] max-w-2xl mx-auto"
          >
            1 Credit = 1 Premium Virtual Try-On Generation. Secure checkout with Razorpay.
          </motion.p>
        </div>

        {/* Current Balance Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-md mx-auto bg-white rounded-[24px] p-6 mb-16 border border-[#E8E0D8] shadow-[0_8px_24px_rgba(0,0,0,0.04)] flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#FAF8F5] flex items-center justify-center border border-[#E8E0D8]">
              <Sparkles className="w-5 h-5 text-[#C4727F]" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#6B6B6B] uppercase tracking-wider">Current Balance</p>
              <div className="text-[28px] font-bold text-[#1A1A1A] flex items-center gap-2">
                {loading ? <RefreshCw className="w-5 h-5 animate-spin text-[#9B9B9B]" /> : (balance !== null ? balance : 0)}
                <span className="text-[16px] text-[#9B9B9B] font-medium">Credits</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
              className={`relative bg-white rounded-[24px] p-8 border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(196,114,127,0.12)] ${
                plan.popular ? "border-[#C4727F] shadow-[0_8px_24px_rgba(196,114,127,0.08)]" : "border-[#E8E0D8]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#C4727F] to-[#D4949E] text-white text-[11px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-sm">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-[20px] font-bold text-[#1A1A1A] mb-2">{plan.name}</h3>
                <p className="text-[14px] text-[#6B6B6B] h-10">{plan.desc}</p>
              </div>

              <div className="flex items-end gap-2 mb-8">
                <span className="text-[48px] font-bold text-[#1A1A1A] leading-none">₹{plan.price}</span>
              </div>

              <div className="flex items-center justify-between mb-8 pb-8 border-b border-[#E8E0D8]">
                <div className="flex flex-col">
                  <span className="text-[24px] font-bold text-[#C4727F]">{plan.credits}</span>
                  <span className="text-[13px] font-medium text-[#6B6B6B]">VTO Credits</span>
                </div>
                <Sparkles className="w-8 h-8 text-[#FAF8F5] stroke-[#E8E0D8] stroke-2" />
              </div>

              <button
                onClick={() => handlePurchase(plan)}
                disabled={processing === plan.id || !user}
                className={`w-full py-4 rounded-full font-bold text-[14px] transition-all flex items-center justify-center gap-2 ${
                  plan.popular
                    ? "bg-[#C4727F] hover:bg-[#a65d6a] text-white shadow-lg shadow-[#C4727F]/25"
                    : "bg-[#1A1A1A] hover:bg-black text-white"
                } disabled:opacity-50`}
              >
                {processing === plan.id ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <>Get {plan.credits} Credits <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Security Badges */}
        <div className="flex flex-wrap justify-center gap-8 mt-20 opacity-60">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#1A1A1A]">
            <Shield className="w-4 h-4" /> 256-bit Encryption
          </div>
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#1A1A1A]">
            <CreditCard className="w-4 h-4" /> Secure Razorpay Checkout
          </div>
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#1A1A1A]">
            <Clock className="w-4 h-4" /> Instant Credit Delivery
          </div>
        </div>
      </main>
    </div>
  );
}

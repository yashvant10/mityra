"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  X,
  Sparkles,
  ArrowRight,
  Lock,
  Shield,
  CreditCard,
  ChevronDown,
  RefreshCw,
  Star,
  Zap,
  Building,
  CheckCircle,
  AlertCircle,
  Crown,
  Eye,
  Clock,
  ShoppingBag,
  Gem,
  Search,
  Palette,
  TrendingUp,
  Store,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import TopNav from "@/components/dashboard/TopNav";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

/* ─── Plan Types ─── */
interface Feature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  priceNum: number;
  period: string;
  tagline: string;
  features: Feature[];
  cta: string;
  highlighted: boolean;
  badge?: string;
  tierMap: string; // maps to backend SubscriptionTier
}

/* ─── Plans Data — 3 Plans Only ─── */
const plans: Plan[] = [
  {
    id: "free",
    name: "FREE",
    price: "₹0",
    priceNum: 0,
    period: "Forever",
    tagline: "Find what suits you.",
    features: [
      { text: "Find Your Look (AI)", included: true },
      { text: "AI Fashion Recommendations", included: true },
      { text: "Real Product Discovery", included: true },
      { text: "Save Favorites", included: true },
      { text: "Basic Wardrobe (20 Items)", included: true },
      { text: "Style Insights (Basic)", included: true },
    ],
    cta: "Start for Free",
    highlighted: false,
    tierMap: "free",
  },
  {
    id: "starter",
    name: "STARTER",
    price: "₹199",
    priceNum: 199,
    period: "/month",
    tagline: "Start exploring AI-powered styling.",
    features: [
      { text: "Everything in Free", included: true },
      { text: "Virtual Try-On (Limited)", included: true },
      { text: "HD Try-On Quality", included: true },
      { text: "Basic AI Styling", included: true },
      { text: "Early Access to New Features", included: true },
    ],
    cta: "Start Starter Plan",
    highlighted: false,
    tierMap: "student",
  },
  {
    id: "premium",
    name: "PREMIUM",
    price: "₹499",
    priceNum: 499,
    period: "/month",
    tagline: "See your style on you.",
    badge: "MOST POPULAR",
    features: [
      { text: "Everything in Starter", included: true },
      { text: "Virtual Try-On (More)", included: true },
      { text: "Ultra HD Try-On", included: true },
      { text: "Advanced AI Styling", included: true },
      { text: "Outfit Re-creation", included: true },
      { text: "Priority Processing", included: true },
      { text: "Ad-Free Experience", included: true },
    ],
    cta: "Go Premium",
    highlighted: true,
    tierMap: "pro",
  },
];

/* ─── Comparison Table Data ─── */
const comparisonRows = [
  { feature: "Find Your Look (AI)", free: "✓", starter: "✓", premium: "✓" },
  { feature: "AI Fashion Recommendations", free: "✓", starter: "✓", premium: "✓" },
  { feature: "Virtual Try-On", free: "—", starter: "20 / month", premium: "100 / month" },
  { feature: "Try-On Quality", free: "—", starter: "HD", premium: "Ultra HD" },
  { feature: "Wardrobe", free: "20 Items", starter: "50 Items", premium: "Unlimited" },
  { feature: "Advanced AI Styling", free: "Basic", starter: "Basic", premium: "Advanced" },
  { feature: "Outfit Re-creation", free: "✗", starter: "✗", premium: "✓" },
  { feature: "Priority Processing", free: "✗", starter: "✗", premium: "✓" },
  { feature: "Ad-Free", free: "✗", starter: "✗", premium: "✓" },
  { feature: "Customer Support", free: "Email", starter: "Email", premium: "Priority" },
];

/* ─── Why Upgrade Data ─── */
const whyUpgrade = [
  { icon: Eye, text: "See outfits on you before you buy." },
  { icon: Clock, text: "Save time. Shop with confidence." },
  { icon: Sparkles, text: "Get personalized style suggestions." },
  { icon: Store, text: "Access real products from top stores." },
];

/* ─── FAQ Data ─── */
const faqs = [
  {
    q: "How does the credit system work?",
    a: "Every virtual try-on consumes credits based on the selected generation mode: Fast Preview (1 credit), HD Mode (3 credits), and Premium AI Mode (5 credits). Credits never expire and can be purchased in tiers."
  },
  {
    q: "Can I earn credits for free?",
    a: "Yes! New signups receive 5 free welcome credits. You can also earn credits by watching short advertisements in the Rewarded Ad Center on your Profile page."
  },
  {
    q: "How accurate is the virtual try-on?",
    a: "Our generative AI models analyze your body shape and clothing images to construct highly realistic try-on results, preserving fabric textures, drapes, and fit with high visual accuracy."
  },
  {
    q: "Is my photo and face data safe?",
    a: "Yes, data safety is our highest priority. All uploaded photos are processed temporarily in volatile memory to generate your virtual try-on, and are never permanently stored."
  }
];

/* ─── Razorpay Script Loader ─── */
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") { resolve(false); return; }
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/* ═══════════════════════════════════════════════════════════════════
   PRICING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function PricingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [userPlan, setUserPlan] = useState<string>("free");
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutState, setCheckoutState] = useState<"select" | "processing" | "success" | "error" | "mock_pay">("select");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [processingStep, setProcessingStep] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [createdOrderData, setCreatedOrderData] = useState<any>(null);

  const fetchProfile = async () => {
    if (!user) { setUserCredits(null); setLoadingProfile(false); return; }
    try {
      const token = await user.getIdToken?.() || "";
      const res = await fetch(`${API_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserCredits(data.profile?.credits ?? 0);
        setUserPlan(data.profile?.plan || data.profile?.subscription || "free");
      }
    } catch (e) {
      console.error("Error fetching user profile:", e);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => { fetchProfile(); }, [user]);

  const handlePlanClick = (plan: Plan) => {
    if (!user) { router.push("/login"); return; }
    if (plan.id === "free") return;
    setSelectedPlan(plan);
    setCheckoutState("select");
    setIsCheckoutOpen(true);
  };

  const handleCheckoutSubmit = async () => {
    if (!selectedPlan || !user) return;
    setCheckoutState("processing");
    setProcessingStep(0);

    const timer1 = setTimeout(() => setProcessingStep(1), 600);
    const timer2 = setTimeout(() => setProcessingStep(2), 1200);

    try {
      const token = await user.getIdToken?.() || "";
      const planName = selectedPlan.id.charAt(0).toUpperCase() + selectedPlan.id.slice(1);
      const orderRes = await fetch(`${API_URL}/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planName }),
      });

      if (!orderRes.ok) throw new Error("Failed to create order");

      const orderData = await orderRes.json();
      setCreatedOrderData(orderData);
      const { orderId, amount, isMock, razorpayKeyId } = orderData;

      if (isMock) {
        setCheckoutState("mock_pay");
      } else {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) throw new Error("Razorpay SDK failed to load");

        const options = {
          key: razorpayKeyId,
          amount: amount * 100,
          currency: "INR",
          name: "MITYRA",
          description: `${selectedPlan.name} Plan — ${selectedPlan.price}${selectedPlan.period}`,
          order_id: orderId,
          handler: async function (response: any) {
            try {
              setCheckoutState("processing");
              setProcessingStep(2);
              const verifyRes = await fetch(`${API_URL}/payments/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              if (verifyRes.ok) {
                const verifyData = await verifyRes.json();
                setUserCredits(verifyData.credits);
                setCheckoutState("success");
              } else { setCheckoutState("error"); }
            } catch { setCheckoutState("error"); }
          },
          prefill: {
            name: user.displayName || "Fashionista",
            email: user.email || "fashion@mityra.com",
          },
          theme: { color: "#C4727F" },
          modal: { ondismiss: () => setCheckoutState("select") },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      console.error("Order process error:", err);
      setCheckoutState("error");
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
    }
  };

  const handleMockPaymentSuccess = async () => {
    if (!createdOrderData || !user) return;
    setCheckoutState("processing");
    setProcessingStep(2);
    try {
      const token = await user.getIdToken?.() || "";
      const orderId = createdOrderData.orderId;
      const verifyRes = await fetch(`${API_URL}/payments/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substring(7),
          razorpay_signature: "mock_sig_" + orderId,
        }),
      });
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        setUserCredits(verifyData.credits);
        setCheckoutState("success");
      } else { setCheckoutState("error"); }
    } catch { setCheckoutState("error"); }
  };

  /* ─── Loading Skeleton ─── */
  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen bg-[#FAF8F5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 space-y-12">
          <div className="text-center space-y-4">
            <div className="h-8 w-48 bg-[#E8E0D8]/60 rounded-full mx-auto animate-pulse" />
            <div className="h-12 w-[500px] max-w-full bg-[#E8E0D8]/40 rounded-xl mx-auto animate-pulse" />
            <div className="h-4 w-96 max-w-full bg-[#E8E0D8]/30 rounded-lg mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E8E0D8] p-8 space-y-6 animate-pulse">
                <div className="h-6 w-24 bg-[#E8E0D8]/40 rounded" />
                <div className="h-10 w-32 bg-[#E8E0D8]/40 rounded" />
                <div className="h-4 w-40 bg-[#E8E0D8]/30 rounded" />
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-3 w-full bg-[#E8E0D8]/20 rounded" />
                  ))}
                </div>
                <div className="h-12 w-full bg-[#E8E0D8]/40 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] relative overflow-hidden">
      {/* ─── TopNav ─── */}
      <div className="px-4 sm:px-8 max-w-7xl mx-auto">
        <TopNav />
      </div>

      {/* ─── Hero Section ─── */}
      <section className="relative pt-2 pb-10 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          {/* Premium Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#1A1A1A] text-white text-[13px] font-semibold tracking-wide mb-6"
          >
            <Crown className="w-4 h-4 text-[#D4AF37]" />
            MITYRA PREMIUM
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-[3.4rem] font-heading font-bold text-[#1A1A1A] tracking-tight leading-[1.15] mb-5"
          >
            Upgrade Your{" "}
            <span className="italic font-heading" style={{
              background: "linear-gradient(135deg, #C4727F, #A85B67)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Style
            </span>{" "}
            Experience <span className="text-[#D4AF37]">✨</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-[#6B6B6B] text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-8"
          >
            Discover outfits that suit you for free. Upgrade to see them on you.
          </motion.p>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-2"
          >
            {[
              { icon: ShoppingBag, label: "Real Products" },
              { icon: Sparkles, label: "AI-Powered Fashion" },
              { icon: Store, label: "Trusted Stores" },
              { icon: Shield, label: "Secure Payments" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[#6B6B6B] text-[13px] font-medium">
                <div className="w-8 h-8 rounded-full bg-[#F5F0EB] border border-[#E8E0D8] flex items-center justify-center">
                  <item.icon className="w-3.5 h-3.5 text-[#9B9B9B]" />
                </div>
                {item.label}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Pricing Cards Section ─── */}
      <section className="px-4 sm:px-8 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.12, duration: 0.5 }}
                className={`relative rounded-2xl overflow-hidden transition-all duration-300 group ${
                  plan.highlighted
                    ? "bg-white border-2 border-[#C4727F] shadow-[0_8px_40px_rgba(196,114,127,0.15)] md:-mt-3 md:mb-0"
                    : "bg-white border border-[#E8E0D8] hover:border-[#D4949E] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
                }`}
              >
                {/* Popular Badge */}
                {plan.badge && (
                  <div className="bg-[#C4727F] text-white text-[10px] font-bold tracking-[0.12em] uppercase text-center py-2 px-4">
                    {plan.badge}
                  </div>
                )}

                <div className="p-7 pb-6 flex flex-col">
                  {/* Plan Name */}
                  <p className={`text-[13px] font-bold tracking-[0.15em] uppercase mb-4 ${
                    plan.highlighted ? "text-[#C4727F]" : "text-[#1A1A1A]"
                  }`}>
                    {plan.name}
                  </p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl sm:text-[2.8rem] font-heading font-bold text-[#1A1A1A] leading-none">
                      {plan.price}
                    </span>
                    <span className="text-[14px] text-[#9B9B9B] font-medium">{plan.period}</span>
                  </div>

                  {/* Tagline */}
                  <p className="text-[13px] text-[#9B9B9B] mb-6">{plan.tagline}</p>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          plan.highlighted
                            ? "bg-[#C4727F]/10 text-[#C4727F]"
                            : "bg-[#2D6A4F]/10 text-[#2D6A4F]"
                        }`}>
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </div>
                        <span className="text-[13px] text-[#3A3A3A] leading-snug font-medium">
                          {feat.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handlePlanClick(plan)}
                    className={`w-full py-3.5 rounded-full text-[14px] font-semibold tracking-wide transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
                      plan.highlighted
                        ? "bg-[#C4727F] text-white hover:bg-[#A85B67] shadow-md hover:shadow-lg hover:shadow-[#C4727F]/20"
                        : plan.id === "free"
                        ? "bg-white text-[#1A1A1A] border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white"
                        : "bg-[#C4727F] text-white hover:bg-[#A85B67] shadow-sm"
                    }`}
                  >
                    {plan.cta}
                    {plan.id !== "free" && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Comparison Table + Why Upgrade ─── */}
      <section className="px-4 sm:px-8 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

            {/* ── Comparison Table ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="bg-white rounded-2xl border border-[#E8E0D8] overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-[#E8E0D8]">
                <h2 className="text-lg font-heading font-bold text-[#1A1A1A]">Compare All Plans</h2>
              </div>

              {/* Table Header */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#E8E0D8]">
                      <th className="px-6 py-4 text-[12px] font-semibold text-[#9B9B9B] uppercase tracking-wider w-[200px]" />
                      <th className="px-4 py-4 text-center">
                        <div className="text-[13px] font-bold text-[#1A1A1A]">Free</div>
                        <div className="text-[11px] text-[#9B9B9B]">₹0</div>
                      </th>
                      <th className="px-4 py-4 text-center">
                        <div className="text-[13px] font-bold text-[#1A1A1A]">Starter</div>
                        <div className="text-[11px] text-[#9B9B9B]">₹199 /month</div>
                      </th>
                      <th className="px-4 py-4 text-center">
                        <div className="space-y-1">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#C4727F] text-white text-[9px] font-bold tracking-wider uppercase">
                            Popular
                          </span>
                          <div className="text-[13px] font-bold text-[#C4727F]">Premium</div>
                          <div className="text-[11px] text-[#9B9B9B]">₹499 /month</div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, idx) => (
                      <tr key={idx} className={`border-b border-[#F0EBE6] last:border-b-0 ${idx % 2 === 0 ? "bg-[#FDFCFB]" : "bg-white"}`}>
                        <td className="px-6 py-3.5 text-[13px] text-[#3A3A3A] font-medium">{row.feature}</td>
                        <td className="px-4 py-3.5 text-center">
                          <ComparisonCell value={row.free} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <ComparisonCell value={row.starter} />
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <ComparisonCell value={row.premium} highlight />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* ── Why Upgrade ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-2xl border border-[#E8E0D8] p-6">
                <h3 className="text-lg font-heading font-bold text-[#1A1A1A] mb-5">Why Upgrade?</h3>
                <div className="space-y-5">
                  {whyUpgrade.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-[#F2E0E3] flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4.5 h-4.5 text-[#C4727F]" />
                      </div>
                      <p className="text-[13.5px] text-[#3A3A3A] leading-snug pt-2 font-medium">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Plan Card */}
              {userCredits !== null && (
                <div className="bg-white rounded-2xl border border-[#E8E0D8] p-6">
                  <p className="text-[11px] font-bold text-[#9B9B9B] uppercase tracking-widest mb-2">Your Current Plan</p>
                  <p className="text-lg font-bold text-[#1A1A1A] capitalize">{userPlan}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Crown className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-[14px] font-bold text-[#1A1A1A]">{userCredits} Credits</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── FAQ Section ─── */}
      <section className="px-4 sm:px-8 pb-16">
        <div className="max-w-3xl mx-auto space-y-5">
          <h2 className="text-2xl font-heading font-bold text-[#1A1A1A] text-center mb-6">
            Frequently Asked Questions
          </h2>
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white border border-[#E8E0D8] rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full px-6 py-5 flex items-center justify-between text-left text-[15px] font-semibold text-[#1A1A1A] hover:bg-[#FDFCFB] transition-colors cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-[#9B9B9B] transition-transform duration-300 flex-shrink-0 ml-4 ${openFaq === idx ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {openFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden border-t border-[#E8E0D8]"
                  >
                    <p className="px-6 py-4 text-[13.5px] leading-relaxed text-[#6B6B6B]">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Premium CTA Banner ─── */}
      <section className="px-4 sm:px-8 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          <div className="bg-[#1A1A1A] rounded-2xl px-6 sm:px-10 py-7 flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Left */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center flex-shrink-0">
                <Crown className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-white text-[15px] font-bold leading-snug">
                  MITYRA Premium is more than fashion.
                </p>
                <p className="text-white/60 text-[13px]">
                  It&apos;s your personal AI stylist in your pocket.
                </p>
              </div>
            </div>

            {/* Center highlights */}
            <div className="hidden lg:flex items-center gap-8">
              {[
                { icon: Eye, label: "Real Looks", sub: "on Real You" },
                { icon: Sparkles, label: "Smart AI", sub: "Personalized for You" },
                { icon: Gem, label: "Premium Experience", sub: "Built for You" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-white text-[12px] font-bold leading-tight">{item.label}</p>
                    <p className="text-white/40 text-[10px]">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => handlePlanClick(plans[2])}
              className="btn-rose px-7 py-3 rounded-full text-[14px] font-semibold whitespace-nowrap flex items-center gap-2 shadow-lg shadow-[#C4727F]/30 hover:shadow-xl hover:shadow-[#C4727F]/40 transition-all duration-300 cursor-pointer"
            >
              Upgrade Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </section>

      {/* ─── Trust Footer ─── */}
      <div className="text-center pb-8">
        <div className="flex items-center justify-center gap-2 text-[#9B9B9B] text-[12px]">
          <Lock className="w-3 h-3" />
          <span>Secure Payments</span>
          <span className="text-[#D4949E]">·</span>
          <span>Cancel Anytime</span>
          <span className="text-[#D4949E]">·</span>
          <span>Your Data is Always Safe</span>
        </div>
      </div>

      {/* ═══ CHECKOUT MODAL ═══ */}
      <AnimatePresence>
        {isCheckoutOpen && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (checkoutState !== "processing") setIsCheckoutOpen(false); }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white border border-[#E8E0D8] rounded-2xl overflow-hidden shadow-2xl p-6 z-10 space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#E8E0D8] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F2E0E3] flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-[#C4727F]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#1A1A1A]">Secure Checkout</h3>
                    <p className="text-[11px] text-[#9B9B9B]">MITYRA — Razorpay Payments</p>
                  </div>
                </div>
                {checkoutState !== "processing" && (
                  <button
                    onClick={() => setIsCheckoutOpen(false)}
                    className="text-[#9B9B9B] hover:text-[#1A1A1A] p-1.5 rounded-lg hover:bg-[#F5F0EB] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* ── Select Payment ── */}
              {checkoutState === "select" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E0D8] space-y-2">
                    <span className="text-[10px] uppercase font-bold text-[#9B9B9B] tracking-wider">Order Summary</span>
                    <div className="flex justify-between items-center">
                      <span className="text-[14px] font-semibold text-[#1A1A1A]">{selectedPlan.name} Plan</span>
                      <span className="text-lg font-bold text-[#C4727F]">{selectedPlan.price}{selectedPlan.period}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-[#9B9B9B] tracking-wider">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "upi" as const, icon: Zap, label: "UPI / GPay" },
                        { key: "card" as const, icon: CreditCard, label: "Card" },
                        { key: "netbanking" as const, icon: Building, label: "Netbanking" },
                      ].map((m) => (
                        <button
                          key={m.key}
                          onClick={() => setPaymentMethod(m.key)}
                          className={`py-2.5 px-3 rounded-xl border text-[12px] font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                            paymentMethod === m.key
                              ? "bg-[#F2E0E3] border-[#C4727F] text-[#C4727F]"
                              : "bg-[#FAF8F5] border-[#E8E0D8] text-[#9B9B9B] hover:border-[#D4949E]"
                          }`}
                        >
                          <m.icon className="w-4 h-4" />
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCheckoutSubmit}
                    className="w-full btn-rose py-3.5 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 mt-3 shadow-md shadow-[#C4727F]/15 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    Pay {selectedPlan.price} Securely
                  </button>
                  <p className="text-[10px] text-center text-[#9B9B9B]">
                    By clicking pay, you agree to secure authorization via Razorpay.
                  </p>
                </div>
              )}

              {/* ── Processing ── */}
              {checkoutState === "processing" && (
                <div className="py-12 flex flex-col items-center justify-center space-y-5 text-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-[#F2E0E3] border-t-[#C4727F] animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-[#C4727F] animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[15px] font-bold text-[#1A1A1A]">Processing Payment</h4>
                    <p className="text-[12px] text-[#9B9B9B]">Please wait while we confirm your transaction...</p>
                  </div>
                </div>
              )}

              {/* ── Mock Pay ── */}
              {checkoutState === "mock_pay" && createdOrderData && (
                <div className="space-y-4 text-center py-2">
                  <div className="p-4 rounded-xl bg-[#F2E0E3]/50 border border-[#C4727F]/20 space-y-2">
                    <span className="text-[10px] font-bold text-[#C4727F] uppercase tracking-widest">Test Gateway Simulation</span>
                    <h3 className="text-[14px] font-bold text-[#1A1A1A]">No Razorpay Credentials Configured</h3>
                    <p className="text-[12px] text-[#6B6B6B]">Simulating payment for developer verification.</p>
                  </div>

                  <div className="space-y-2 text-left bg-[#FAF8F5] border border-[#E8E0D8] p-4 rounded-xl text-[12px]">
                    <div className="flex justify-between text-[#6B6B6B]"><span>Order ID:</span> <span className="text-[#1A1A1A] font-semibold">{createdOrderData.orderId}</span></div>
                    <div className="flex justify-between text-[#6B6B6B]"><span>Plan:</span> <span className="text-[#1A1A1A] font-semibold">{createdOrderData.plan}</span></div>
                    <div className="flex justify-between text-[#6B6B6B]"><span>Credits:</span> <span className="text-[#1A1A1A] font-semibold">+{createdOrderData.credits}</span></div>
                    <div className="flex justify-between text-[#6B6B6B]"><span>Amount:</span> <span className="text-[#C4727F] font-bold">₹{createdOrderData.amount}</span></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={() => setCheckoutState("select")}
                      className="py-3 bg-[#FAF8F5] border border-[#E8E0D8] hover:bg-[#F0EBE6] text-[#1A1A1A] rounded-xl text-[13px] font-semibold transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleMockPaymentSuccess}
                      className="py-3 bg-[#2D6A4F] hover:bg-[#245A42] text-white rounded-xl text-[13px] font-semibold transition-all shadow-md shadow-[#2D6A4F]/20 cursor-pointer"
                    >
                      Approve Test ✓
                    </button>
                  </div>
                </div>
              )}

              {/* ── Success ── */}
              {checkoutState === "success" && (
                <div className="py-8 text-center space-y-5">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-16 h-16 rounded-full bg-[#2D6A4F]/15 border-2 border-[#2D6A4F] flex items-center justify-center mx-auto text-[#2D6A4F]"
                  >
                    <CheckCircle className="w-8 h-8" />
                  </motion.div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-heading font-bold text-[#1A1A1A]">Payment Successful!</h3>
                    <p className="text-[14px] text-[#2D6A4F] font-semibold">
                      You&apos;re all set 🎉
                    </p>
                    <p className="text-[13px] text-[#6B6B6B] max-w-xs mx-auto">
                      Your {selectedPlan.name} plan is now active.
                      {userCredits !== null && (
                        <> Your balance: <span className="font-bold text-[#1A1A1A]">{userCredits} credits</span>.</>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => { setIsCheckoutOpen(false); router.push(redirectUrl || "/try-on"); }}
                    className="w-full py-3.5 bg-[#2D6A4F] hover:bg-[#245A42] text-white rounded-xl text-[14px] font-bold transition-all shadow-md cursor-pointer"
                  >
                    Start Trying On →
                  </button>
                </div>
              )}

              {/* ── Error ── */}
              {checkoutState === "error" && (
                <div className="py-8 text-center space-y-5">
                  <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-400 flex items-center justify-center mx-auto text-red-500">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-heading font-bold text-[#1A1A1A]">Transaction Failed</h3>
                    <p className="text-[13px] text-[#6B6B6B] max-w-xs mx-auto">
                      There was a problem processing your payment. Please try again.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setCheckoutState("select")}
                      className="flex-1 py-3 bg-[#FAF8F5] border border-[#E8E0D8] text-[#1A1A1A] hover:bg-[#F0EBE6] rounded-xl text-[13px] font-semibold transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCheckoutSubmit}
                      className="flex-1 py-3 btn-rose rounded-xl text-[13px] font-semibold transition-all cursor-pointer"
                    >
                      Retry Payment
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Comparison Cell Helper ─── */
function ComparisonCell({ value, highlight }: { value: string; highlight?: boolean }) {
  if (value === "✓") {
    return (
      <div className="flex items-center justify-center">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
          highlight ? "bg-[#C4727F]/10 text-[#C4727F]" : "bg-[#2D6A4F]/10 text-[#2D6A4F]"
        }`}>
          <Check className="w-3 h-3" strokeWidth={3} />
        </div>
      </div>
    );
  }
  if (value === "✗") {
    return (
      <div className="flex items-center justify-center">
        <div className="w-5 h-5 rounded-full bg-red-50 text-red-400 flex items-center justify-center">
          <X className="w-3 h-3" strokeWidth={3} />
        </div>
      </div>
    );
  }
  if (value === "—") {
    return <span className="text-[12px] text-[#9B9B9B]">—</span>;
  }
  return (
    <span className={`text-[12px] font-medium ${highlight ? "text-[#C4727F] font-semibold" : "text-[#3A3A3A]"}`}>
      {value}
    </span>
  );
}

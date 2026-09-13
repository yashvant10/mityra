"use client";

import { motion } from "motion/react";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: 0,
    period: "forever",
    description: "Perfect for exploring AI fashion",
    features: [
      "5 AI stylist chats / month",
      "3 virtual try-ons / month",
      "Basic wardrobe (20 items)",
      "Trending recommendations",
      "Community access",
    ],
    highlighted: false,
    cta: "Get Started Free",
  },
  {
    name: "Pro",
    price: 19,
    period: "month",
    description: "For the fashion-forward individual",
    features: [
      "Unlimited AI stylist chats",
      "50 virtual try-ons / month",
      "Unlimited wardrobe items",
      "Personalized recommendations",
      "Style score & analytics",
      "Priority AI processing",
      "Outfit history & saves",
    ],
    highlighted: true,
    cta: "Start Pro Trial",
  },
  {
    name: "Enterprise",
    price: 49,
    period: "month",
    description: "For brands and power users",
    features: [
      "Everything in Pro",
      "Unlimited virtual try-ons",
      "API access",
      "Team collaboration",
      "Custom AI training",
      "White-label options",
      "Dedicated support",
      "Advanced analytics",
    ],
    highlighted: false,
    cta: "Contact Sales",
  },
];

export default function PricingPreview() {
  return (
    <section id="pricing" className="relative section-spacing bg-[#F5F0EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-16"
        >
          <span className="text-xs tracking-[0.2em] uppercase text-[#9B9B9B] font-medium">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold mt-3 mb-4 font-heading text-[#1A1A1A]">
            Simple,{" "}
            <span className="text-[#C4727F] italic">transparent</span> pricing
          </h2>
          <p className="text-[#6B6B6B] max-w-xl mx-auto text-base leading-relaxed">
            Start free, upgrade when you&apos;re ready. No hidden fees.
          </p>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className={`relative ${
                plan.highlighted
                  ? "pricing-card-highlighted md:scale-[1.03]"
                  : "pricing-card-light"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#C4727F] text-xs font-semibold text-white shadow-md">
                    <Sparkles className="w-3 h-3" />
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-1">
                {plan.name}
              </h3>
              <p className="text-sm text-[#6B6B6B] mb-5">{plan.description}</p>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-[#1A1A1A] font-heading">
                  ${plan.price}
                </span>
                <span className="text-[#9B9B9B] text-sm">/{plan.period}</span>
              </div>

              <Link
                href="/signup"
                className={`block text-center py-3.5 rounded-xl text-sm font-semibold transition-all duration-400 mb-6 ${
                  plan.highlighted
                    ? "btn-primary !w-full !rounded-xl"
                    : "bg-[#FAF8F5] border border-[#E8E0D8] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] !w-full"
                }`}
              >
                {plan.cta}
              </Link>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-[#6B6B6B]"
                  >
                    <Check className="w-4 h-4 text-[#C4727F] flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

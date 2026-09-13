import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import TwoWaysSection from "@/components/landing/TwoWaysSection";
import FeaturesGrid from "@/components/landing/FeaturesGrid";
import CategoryGrid from "@/components/landing/CategoryGrid";
import AIShowcase from "@/components/landing/AIShowcase";
import TryOnDemo from "@/components/landing/TryOnDemo";
import Testimonials from "@/components/landing/Testimonials";
import PricingPreview from "@/components/landing/PricingPreview";
import TrustSection from "@/components/landing/TrustSection";
import CTASection from "@/components/landing/CTASection";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <HowItWorks />
        <TwoWaysSection />
        <FeaturesGrid />
        <CategoryGrid />
        <AIShowcase />
        <TryOnDemo />
        <Testimonials />
        <PricingPreview />
        <TrustSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}

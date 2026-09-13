"use client";

import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/dashboard/Sidebar";
import BottomNav from "@/components/dashboard/BottomNav";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const dynamic = "force-dynamic";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const initializeProfileIfNeeded = async () => {
      if (!user) return;
      try {
        const token = typeof (user as any).getIdToken === "function"
          ? await (user as any).getIdToken()
          : "";
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
        
        const res = await fetch(`${API_URL}/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          const role = data.profile?.role;
          if (role === 'admin' || role === 'super_admin') {
            router.push('/admin');
            return;
          }
        } else if (res.status === 404) {
          console.log("Auto-initializing profile for new user...");
          await fetch(`${API_URL}/users/profile`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              displayName: user.displayName || "Fashionista",
              email: user.email,
              photoURL: user.photoURL || "",
            }),
          });
        }
      } catch (e) {
        console.warn("Error auto-initializing profile:", e);
      }
    };

    if (user) {
      initializeProfileIfNeeded();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF8F5] gap-5">
        {/* Branded MITYRA lettermark loader */}
        <div className="relative">
          <div className="w-14 h-14 rounded-xl bg-[#1A1A1A] flex items-center justify-center" style={{ animation: "luxury-pulse 2.5s ease-in-out infinite" }}>
            <span className="text-lg font-bold text-white font-heading select-none">M</span>
            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#C4727F]" />
          </div>
        </div>
        <p className="text-sm text-[#9B9B9B] font-body tracking-wide">Preparing your studio...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#FAF8F5] relative overflow-x-hidden text-[#1A1A1A] font-sans">
        <Sidebar />
        <BottomNav />
        <main className="lg:ml-64 min-h-screen pt-[72px] lg:pt-0 pb-24 lg:pb-0 relative z-10 flex flex-col">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyAIStyleMatchPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/find-your-look");
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center p-8 min-h-[60vh]">
      <div className="animate-pulse text-[#b95b6a] font-medium text-sm">
        Redirecting to Find Your Look...
      </div>
    </div>
  );
}

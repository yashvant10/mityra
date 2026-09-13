"use client";

import { Settings, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast.success("Settings saved successfully.");
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">Admin Settings</h1>
        <p className="text-sm text-[#1A1A1A]/60">Configure global platform parameters.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#C4727F]" /> Security & Access
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/70">Admin Email</label>
              <input 
                type="email" 
                defaultValue="yashwanthrao2626@gmail.com"
                disabled
                className="w-full bg-[#FAF8F5] border border-[#E8E0D8] rounded-xl py-3 px-4 text-sm text-[#1A1A1A]/50 cursor-not-allowed"
              />
              <p className="text-[10px] text-[#1A1A1A]/50">Master admin email cannot be changed from the dashboard.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/70">Require 2FA for Staff</label>
              <select className="w-full bg-[#FFFFFF] border border-[#E8E0D8] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#C4727F]">
                <option value="yes">Enabled</option>
                <option value="no">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-[#1A1A1A] flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" /> API Configuration
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/70">Fallback Product API</label>
              <select className="w-full bg-[#FFFFFF] border border-[#E8E0D8] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#C4727F]">
                <option value="amazon">Amazon Real-Time (Default)</option>
                <option value="flipkart">Flipkart (Degraded)</option>
              </select>
              <p className="text-[10px] text-[#1A1A1A]/50">Reroute fashion searches if a provider fails.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/70">Free Try-On Limit</label>
              <input 
                type="number" 
                defaultValue="3"
                className="w-full bg-[#FFFFFF] border border-[#E8E0D8] rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#C4727F]"
              />
            </div>
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="py-3 px-6 bg-[#1A1A1A] text-white rounded-xl text-sm font-bold tracking-wide flex items-center justify-center gap-2 hover:bg-[#1A1A1A]/90 transition-colors"
        >
          {loading ? "Saving..." : <><Save className="w-4 h-4" /> Save Settings</>}
        </button>
      </form>
    </div>
  );
}

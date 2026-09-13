"use client";

import { MessageSquare, LifeBuoy, Inbox, CheckCircle, Search } from "lucide-react";
import { useState } from "react";

export default function AdminSupportPage() {
  const [tickets] = useState([
    { id: "T-1049", user: "alex@example.com", subject: "Credits not showing up", status: "open", time: "2 hours ago" },
    { id: "T-1048", user: "sarah.m@test.com", subject: "Virtual Try-On error 502", status: "open", time: "5 hours ago" },
    { id: "T-1047", user: "david99@mail.com", subject: "How to upgrade plan?", status: "closed", time: "1 day ago" },
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">Support Tickets</h1>
        <p className="text-sm text-[#1A1A1A]/60">Manage user inquiries and technical issues.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
            <Inbox className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-[#1A1A1A]">2</h3>
            <p className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest mt-1">Open Tickets</p>
          </div>
        </div>
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-[#00B982]/10 rounded-2xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-[#00B982]" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-[#1A1A1A]">14</h3>
            <p className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest mt-1">Resolved Today</p>
          </div>
        </div>
        <div className="bg-[#FFFFFF] p-6 rounded-[24px] border border-[#E8E0D8] shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <LifeBuoy className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-[#1A1A1A]">1h 15m</h3>
            <p className="text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest mt-1">Avg. Response Time</p>
          </div>
        </div>
      </div>

      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E8E0D8] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[#E8E0D8] flex gap-4 items-center bg-[#FAF8F5]/50">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-[#1A1A1A]/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search tickets..." 
              className="w-full bg-[#FFFFFF] border border-[#E8E0D8] rounded-xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:border-[#C4727F]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E8E0D8]">
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">ID</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">User</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Subject</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest">Status</th>
                <th className="p-4 text-xs font-bold text-[#1A1A1A]/60 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-[#E8E0D8] hover:bg-[#FAF8F5]/50 transition-colors">
                  <td className="p-4 text-xs font-mono text-[#1A1A1A]/60">{ticket.id}</td>
                  <td className="p-4 text-sm font-bold text-[#1A1A1A]">{ticket.user}</td>
                  <td className="p-4 text-sm text-[#1A1A1A]/80">
                    <div>{ticket.subject}</div>
                    <div className="text-[10px] text-[#1A1A1A]/40 mt-0.5">{ticket.time}</div>
                  </td>
                  <td className="p-4">
                    {ticket.status === 'open' ? (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        Open
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-[#00B982]/10 text-[#00B982] rounded-md text-[10px] font-bold uppercase tracking-wider">
                        Closed
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F5] border border-[#E8E0D8] rounded-lg text-xs font-bold text-[#1A1A1A] hover:bg-[#E8E0D8] transition-colors">
                      <MessageSquare className="w-3 h-3" /> Reply
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

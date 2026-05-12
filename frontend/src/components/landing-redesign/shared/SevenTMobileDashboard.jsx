import React from "react";
import { 
  MessageSquare, 
  TrendingUp, 
  Activity, 
  Zap, 
  Users, 
  ShoppingCart, 
  Settings, 
  BarChart3,
  Search,
  Plus
} from "lucide-react";
import { cn } from "../../../utils/cn";

const MiniChart = () => {
  return (
    <div className="flex items-end gap-[2px] h-10 w-24">
      {[40, 70, 45, 90, 65, 80, 50, 95, 60, 85].map((h, i) => (
        <div
          key={i}
          style={{ height: `${h}%` }}
          className="flex-1 bg-amber-500/40 rounded-t-[2px] animate-pulse"
        />
      ))}
    </div>
  );
};

const SevenTMobileDashboard = () => {
  return (
    <div className="flex flex-col h-full bg-[#030303] text-white font-sans overflow-hidden select-none">
      {/* Top Header */}
      <div className="px-6 pt-14 pb-4 flex items-center justify-between border-b border-white/[0.04] bg-[#09090b] sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-inner">
            <div className="w-5 h-5 text-amber-500 font-bold flex items-center justify-center">7T</div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-[0.2em]">WhatsApp Account</span>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <h4 className="text-[14px] font-bold tracking-tight text-zinc-100">Business-Premium-01</h4>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border border-white/5 flex items-center justify-center bg-white/[0.03] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer">
            <Search className="w-4 h-4" />
          </div>
          <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-amber-500/30 shadow-lg cursor-pointer">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=SevenT" alt="avatar" className="w-full h-full object-cover bg-zinc-900" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-5 py-5 space-y-4">
        {/* Real-time Monitor Card */}
        <div className="p-5 rounded-[2rem] bg-zinc-900/50 border border-white/[0.06] shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full" />
          
          <div className="flex items-center justify-between mb-5 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Messages Traités</span>
            </div>
            <div className="px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="text-[9px] font-bold text-amber-500">ACTIF</span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-6 relative z-10">
            <div>
              <h3 className="text-5xl font-medium tracking-tighter text-white mb-1 font-mono">12,842</h3>
              <div className="flex items-center gap-1.5 text-amber-500">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">+12.4% / jour</span>
              </div>
            </div>
            <div className="flex-1 flex justify-end pb-1">
              <MiniChart />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Dernières Actions</h4>
            <div className="w-7 h-7 rounded-xl bg-zinc-900/80 flex items-center justify-center border border-white/5 cursor-pointer hover:bg-zinc-800 transition-colors">
              <Plus className="w-4 h-4 text-zinc-400" />
            </div>
          </div>
          
          <div className="flex flex-col gap-2.5">
            {[
              { name: "Commande validée", type: "Vente", value: "+45k", time: "2m ago", icon: <ShoppingCart className="w-4 h-4" /> },
              { name: "Lead qualifié", type: "Prospect", value: "High", time: "15m ago", icon: <Users className="w-4 h-4" /> },
              { name: "Relance auto", type: "IA", value: "Sent", time: "1h ago", icon: <Zap className="w-4 h-4" /> }
            ].map((action, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 bg-zinc-900 border border-white/5 rounded-[1.25rem] hover:bg-zinc-800 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-black/50 border border-white/5 flex items-center justify-center group-hover:scale-105 transition-transform group-hover:border-amber-500/30 shadow-inner">
                    <div className="text-zinc-400 group-hover:text-amber-500 transition-colors">
                      {action.icon}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200 tracking-tight">{action.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-zinc-500 font-medium tracking-tight bg-white/5 px-1.5 rounded">{action.type}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-zinc-100">{action.value}</p>
                  <p className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider">{action.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-0.5">
           <div className="p-2 rounded-[1.5rem] bg-zinc-900/40 border border-white/[0.03] grid grid-cols-4 gap-2">
              {[
                { icon: <Users className="w-4 h-4" />, label: "Agents" },
                { icon: <Zap className="w-4 h-4" />, label: "Flows" },
                { icon: <ShoppingCart className="w-4 h-4" />, label: "Ventes" },
                { icon: <Settings className="w-4 h-4" />, label: "Configs" }
              ].map((action, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl hover:bg-white/[0.05] transition-colors cursor-pointer group">
                  <div className="text-zinc-400 group-hover:text-amber-500 transition-colors">
                    {action.icon}
                  </div>
                  <span className="text-[9px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors">{action.label}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="px-8 pt-4 pb-8 border-t border-white/[0.05] flex justify-between items-center bg-[#09090b] sticky bottom-0 z-20">
        <div className="flex flex-col items-center gap-1 cursor-pointer">
           <BarChart3 className="w-6 h-6 text-amber-500" />
           <span className="text-[9px] font-bold text-amber-500">Stats</span>
        </div>
        <div className="flex flex-col items-center gap-1 cursor-pointer opacity-50 hover:opacity-100 transition-opacity">
           <Zap className="w-6 h-6 text-white" />
           <span className="text-[9px] font-bold text-white">Flows</span>
        </div>
        
        {/* Floating Action Button */}
        <div className="relative -mt-8">
          <div className="absolute -inset-4 bg-amber-500/20 blur-xl rounded-full" />
          <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/40 relative z-10 border-4 border-[#030303] hover:scale-95 transition-transform cursor-pointer">
             <Plus className="w-6 h-6 text-black" strokeWidth={3} />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 cursor-pointer opacity-50 hover:opacity-100 transition-opacity">
           <ShoppingCart className="w-6 h-6 text-white" />
           <span className="text-[9px] font-bold text-white">Ventes</span>
        </div>
        <div className="flex flex-col items-center gap-1 cursor-pointer opacity-50 hover:opacity-100 transition-opacity">
           <Activity className="w-6 h-6 text-white" />
           <span className="text-[9px] font-bold text-white">Logs</span>
        </div>
      </div>
    </div>
  );
};

export default SevenTMobileDashboard;

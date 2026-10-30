"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Database, 
  Languages, 
  Mic, 
  Sprout, 
  Home, 
  Package, 
  WifiOff, 
  CheckCircle2, 
  Layers,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { syncEngine, ConnectionState } from "@/lib/sync";

export default function Navbar() {
  const pathname = usePathname();
  const [connStatus, setConnStatus] = useState<ConnectionState>("disconnected");
  const [outboxCount, setOutboxCount] = useState<number>(0);

  useEffect(() => {
    syncEngine.start();
    setConnStatus(syncEngine.getStatus());
    setOutboxCount(syncEngine.getPendingCount());

    const handleStatus = (e: any) => {
      setConnStatus(e.detail.status);
    };

    const handleOutbox = (e: any) => {
      setOutboxCount(e.detail.count);
    };

    syncEngine.addEventListener("statusChange", handleStatus);
    syncEngine.addEventListener("outboxChange", handleOutbox);

    return () => {
      syncEngine.removeEventListener("statusChange", handleStatus);
      syncEngine.removeEventListener("outboxChange", handleOutbox);
    };
  }, []);

  const navLinks = [
    { href: "/", label: "Hub", kikLabel: "Kĩhumo", icon: Layers },
    { href: "/ikumbi", label: "Granary", kikLabel: "Ikũmbi", icon: Database },
    { href: "/taura", label: "Translation", kikLabel: "Taũra", icon: Languages },
    { href: "/mugambo", label: "Voice / Speech", kikLabel: "Mũgambo", icon: Mic },
    { href: "/agriculture", label: "Agriculture", kikLabel: "Ũrĩmĩ", icon: Sprout },
    { href: "/smarthome", label: "Smart Home", kikLabel: "Mũciĩ", icon: Home },
    { href: "/gitara", label: "Registry", kikLabel: "Gĩtara", icon: Package },
  ];

  return (
    <header className="border-b border-thitho-border bg-[#0f140e]/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-800 flex items-center justify-center shadow-lg shadow-green-950/40 border border-emerald-500/30 group-hover:scale-105 transition-transform">
            <span className="text-xl font-black text-amber-300">Ĩ</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white">THITHO</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
                v1.0 Offline
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 tracking-wider uppercase font-medium">
              Gĩkũyũ Machine Intelligence
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                  isActive
                    ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
                <span>{item.label}</span>
                <span className="text-[10px] text-zinc-400 font-mono">({item.kikLabel})</span>
              </Link>
            );
          })}
        </nav>

        {/* Live Bridge & Offline State Indicators */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Outbox Pending Sync Pill */}
          {outboxCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-700 text-xs text-amber-300 font-mono animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>{outboxCount} Queued</span>
            </div>
          )}

          {/* Offline Mode Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 font-mono">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-zinc-400">Mode:</span>
            <span className="text-amber-300 font-semibold">100% Offline</span>
          </div>

          {/* Dynamic FastAPI Bridge Status */}
          {connStatus === "connected" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline font-mono">Bridge:</span>
              <span className="font-semibold">Connected</span>
            </div>
          ) : connStatus === "syncing" ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/40 border border-blue-800/40 text-xs text-blue-400">
              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span className="hidden sm:inline font-mono">Bridge:</span>
              <span className="font-semibold">Syncing</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-amber-800/40 text-xs text-amber-400">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline font-mono">Bridge:</span>
              <span className="font-semibold text-zinc-300">IndexedDB Active</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

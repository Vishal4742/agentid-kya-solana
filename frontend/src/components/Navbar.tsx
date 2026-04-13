import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/hooks/useWallet";
import { truncateWallet } from "@/lib/display";
import { Menu, X, Copy, LogOut, Zap } from "lucide-react";
import { toast } from "sonner";

export default function Navbar() {
  const location = useLocation();
  const { connected, publicKey, connecting, connect, disconnect, walletProvider } = useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);

  const navLinks = [
    { label: "Agents", href: "/agents" },
    { label: "Verify", href: "/verify" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Docs", href: "/docs" },
  ];

  const handleCopyAddress = () => {
    if (publicKey) { navigator.clipboard.writeText(publicKey); toast.success("Address copied!"); }
    setWalletMenuOpen(false);
  };
  const handleDisconnect = () => { disconnect(); setWalletMenuOpen(false); toast("Wallet disconnected"); };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex h-14 items-center justify-between">

          {/* Logo — minimal text mark */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-6 h-6 bg-green flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-mono text-sm font-semibold tracking-tight">
              AgentID
            </span>
            <span className="hidden sm:block label-meta border-l border-border pl-3">
              KYA Protocol
            </span>
          </Link>

          {/* Desktop nav — pure text links with slide underline */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`link-underline label-meta transition-colors ${
                  location.pathname === link.href
                    ? "text-green"
                    : "hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: Register + Wallet */}
          <div className="hidden md:flex items-center gap-5">
            <Link to="/register" className="link-underline label-meta hover:text-green transition-colors">
              Register Agent
            </Link>

            {/* Divider */}
            <div className="w-px h-4 bg-border" />

            {connected ? (
              <div className="relative">
                <button
                  onClick={() => setWalletMenuOpen(!walletMenuOpen)}
                  className="flex items-center gap-2 font-mono text-xs text-green"
                >
                  <div className="w-1.5 h-1.5 bg-green animate-pulse" />
                  {truncateWallet(publicKey!)}
                </button>
                <AnimatePresence>
                  {walletMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className="absolute right-0 top-full mt-3 w-52 border border-border bg-background shadow-2xl"
                    >
                      <div className="px-4 py-3 border-b border-border">
                        <p className="label-meta mb-0.5">Connected · {walletProvider}</p>
                        <p className="font-mono text-xs text-foreground">{truncateWallet(publicKey!)}</p>
                      </div>
                      <button onClick={handleCopyAddress}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-secondary transition-colors text-left">
                        <Copy className="w-3 h-3" /> Copy address
                      </button>
                      <Link to="/dashboard" onClick={() => setWalletMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-secondary transition-colors">
                        <Zap className="w-3 h-3" /> My Dashboard
                      </Link>
                      <button onClick={handleDisconnect}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-destructive hover:bg-secondary transition-colors text-left border-t border-border">
                        <LogOut className="w-3 h-3" /> Disconnect
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setWalletPickerOpen(!walletPickerOpen)}
                  disabled={connecting}
                  className="btn-primary glow-green-sm"
                >
                  {connecting ? (
                    <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : "Connect Wallet"}
                </button>
                <AnimatePresence>
                  {walletPickerOpen && !connecting && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className="absolute right-0 top-full mt-3 w-48 border border-border bg-background shadow-2xl"
                    >
                      <div className="px-4 py-2.5 border-b border-border">
                        <p className="label-meta">Select wallet</p>
                      </div>
                      {(["phantom", "solflare"] as const).map((p) => (
                        <button key={p} onClick={() => { connect(p); setWalletPickerOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary transition-colors text-left">
                          <span>{p === "phantom" ? "👻" : "☀️"}</span>
                          <span className="font-mono text-xs">{p === "phantom" ? "Phantom" : "Solflare"}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background">
            <div className="px-6 py-5 space-y-4">
              {navLinks.map((link) => (
                <Link key={link.href} to={link.href} onClick={() => setMobileOpen(false)}
                  className={`block label-meta transition-colors ${location.pathname === link.href ? "text-green" : "hover:text-foreground"}`}>
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-border">
                <Link to="/register" onClick={() => setMobileOpen(false)} className="block label-meta text-green mb-4">
                  Register Agent
                </Link>
                {!connected ? (
                  <div className="flex gap-3">
                    {(["phantom", "solflare"] as const).map((p) => (
                      <button key={p} onClick={() => { connect(p); setMobileOpen(false); }}
                        className="flex-1 py-2 text-xs font-mono bg-green text-primary-foreground">
                        {p === "phantom" ? "👻 Phantom" : "☀️ Solflare"}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-green flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green animate-pulse" /> {truncateWallet(publicKey!)}
                    </span>
                    <button onClick={handleDisconnect} className="label-meta text-destructive">Disconnect</button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

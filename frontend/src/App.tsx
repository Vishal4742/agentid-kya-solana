import { Suspense, lazy, useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "@/hooks/useWallet";
import Navbar from "@/components/Navbar";
import CustomCursor from "@/components/CustomCursor";
import CornerTelemetry from "@/components/CornerTelemetry";
import Index from "./pages/Index";
import { SOLANA_RPC_ENDPOINT } from "@/lib/config";

/* ── Solana wallet adapter ─────────────────────────────────────── */
import {
  ConnectionProvider,
  WalletProvider as AdapterWalletProvider,
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
} from "@solana/wallet-adapter-phantom";
import {
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-solflare";
import "@solana/wallet-adapter-react-ui/styles.css";

const queryClient = new QueryClient();
const Register = lazy(() => import("./pages/Register"));
const AgentProfile = lazy(() => import("./pages/AgentProfile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Verify = lazy(() => import("./pages/Verify"));
const Agents = lazy(() => import("./pages/Agents"));
const Docs = lazy(() => import("./pages/Docs"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-foreground" />
        <span className="font-mono text-xs uppercase tracking-[0.24em]">Loading</span>
      </div>
    </div>
  );
}

const App = () => {
  /* Stable wallet list — recreated only once */
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* Solana connection + adapter layer */}
      <ConnectionProvider endpoint={SOLANA_RPC_ENDPOINT}>
        <AdapterWalletProvider wallets={wallets} autoConnect>
          {/* Our thin shim that preserves the existing useWallet() API */}
          <WalletProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner position="top-right" />
              <CustomCursor />
              <CornerTelemetry />
              <BrowserRouter>
                <Navbar />
                <div className="pt-16">
                  <Suspense fallback={<RouteFallback />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/agent/:id" element={<AgentProfile />} />
                      <Route path="/agents" element={<Agents />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/verify" element={<Verify />} />
                      <Route path="/docs" element={<Docs />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </div>
              </BrowserRouter>
            </TooltipProvider>
          </WalletProvider>
        </AdapterWalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
};

export default App;

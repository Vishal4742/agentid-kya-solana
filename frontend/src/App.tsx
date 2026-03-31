import { useMemo } from "react";
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
import Register from "./pages/Register";
import AgentProfile from "./pages/AgentProfile";
import Dashboard from "./pages/Dashboard";
import Verify from "./pages/Verify";
import Agents from "./pages/Agents";
import Docs from "./pages/Docs";
import NotFound from "./pages/NotFound";
import { SOLANA_RPC_ENDPOINT } from "@/lib/config";

/* ── Solana wallet adapter ─────────────────────────────────────── */
import {
  ConnectionProvider,
  WalletProvider as AdapterWalletProvider,
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";

const queryClient = new QueryClient();

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

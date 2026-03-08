/**
 * useWallet.tsx — Real Solana wallet adapter integration
 *
 * Wraps @solana/wallet-adapter-react and exposes the same interface that
 * the rest of the app already uses, so no other files need to change.
 *
 * Interface preserved:
 *   connected: boolean
 *   publicKey: string | null
 *   connecting: boolean
 *   connect: (provider?: "phantom" | "solflare") => Promise<void>
 *   disconnect: () => void
 *   walletProvider: "phantom" | "solflare" | null
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import {
  useWallet as useAdapterWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { WalletName } from "@solana/wallet-adapter-base";

/* ── Types ──────────────────────────────────────────────────────── */
interface WalletContextType {
  connected: boolean;
  publicKey: string | null;
  connecting: boolean;
  connect: (provider?: "phantom" | "solflare") => Promise<void>;
  disconnect: () => void;
  walletProvider: "phantom" | "solflare" | null;
}

const WalletContext = createContext<WalletContextType>({
  connected: false,
  publicKey: null,
  connecting: false,
  connect: async () => {},
  disconnect: () => {},
  walletProvider: null,
});

/* ── Provider ─────────────────────────────────────────────────────
   This sits INSIDE the @solana/wallet-adapter-react WalletProvider
   (wired in App.tsx). It bridges the adapter to our own context so
   all existing pages work without any changes.
──────────────────────────────────────────────────────────────────── */
export function WalletProvider({ children }: { children: ReactNode }) {
  const adapter = useAdapterWallet();
  const [walletProvider, setWalletProvider] = useState<"phantom" | "solflare" | null>(null);
  const [explicitConnecting, setExplicitConnecting] = useState(false);

  /* Derive provider name from currently selected wallet */
  useEffect(() => {
    if (!adapter.wallet) {
      setWalletProvider(null);
      return;
    }
    const name = adapter.wallet.adapter.name.toLowerCase();
    if (name.includes("phantom")) setWalletProvider("phantom");
    else if (name.includes("solflare")) setWalletProvider("solflare");
    else setWalletProvider(null);
  }, [adapter.wallet]);

  const connect = useCallback(
    async (provider: "phantom" | "solflare" = "phantom") => {
      setExplicitConnecting(true);
      try {
        const walletName: WalletName =
          provider === "phantom"
            ? ("Phantom" as WalletName)
            : ("Solflare" as WalletName);
        await adapter.select(walletName);
        await adapter.connect();
        setWalletProvider(provider);
      } catch (err) {
        // User rejected or wallet not installed — silently ignore
        console.warn("Wallet connect error:", err);
      } finally {
        setExplicitConnecting(false);
      }
    },
    [adapter]
  );

  const disconnect = useCallback(() => {
    adapter.disconnect();
    setWalletProvider(null);
  }, [adapter]);

  const publicKey = adapter.publicKey?.toBase58() ?? null;
  const connected = adapter.connected;
  const connecting = adapter.connecting || explicitConnecting;

  return (
    <WalletContext.Provider
      value={{ connected, publicKey, connecting, connect, disconnect, walletProvider }}
    >
      {children}
    </WalletContext.Provider>
  );
}

/* ── Hook ────────────────────────────────────────────────────────── */
export function useWallet() {
  return useContext(WalletContext);
}

/* Re-export connection hook for convenience */
export { useConnection };

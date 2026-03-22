/**
 * useProgram.ts — Anchor program singleton hook
 *
 * Returns a typed Anchor Program<AgentidProgram> wired to the connected wallet.
 * Uses the browser wallet adapter as the signer (no keypair on disk needed).
 */
import { useMemo } from "react";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import type { AgentidProgram } from "@/idl/agentid_program";
import IDL from "@/idl/agentid_program.json";

export const PROGRAM_ID = "Gv35udP7tnnVcNiCMLKYeyjx1rfkeos4e6cXsFGr4tcF";

export function useProgram() {
    const { connection } = useConnection();
    const wallet = useWallet();

    return useMemo(() => {
        if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
            return null;
        }

        // Anchor provider backed by the browser wallet (Phantom / Solflare)
        const provider = new AnchorProvider(
            connection,
            {
                publicKey: wallet.publicKey,
                signTransaction: wallet.signTransaction,
                signAllTransactions: wallet.signAllTransactions,
            },
            { commitment: "confirmed" }
        );

        return new Program<AgentidProgram>(IDL as AgentidProgram, provider);
    }, [connection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions]);
}

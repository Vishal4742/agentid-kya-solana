import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PublicKey } from "@solana/web3.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AgentProfile from "@/pages/AgentProfile";

const mockUseWallet = vi.fn();
const mockUseProgram = vi.fn();
const mockUseAllAgents = vi.fn();

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => mockUseWallet(),
}));

vi.mock("@/hooks/useProgram", () => ({
  useProgram: () => mockUseProgram(),
}));

vi.mock("@/hooks/useAgents", () => ({
  useAllAgents: () => mockUseAllAgents(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

function bnLike(value: number) {
  return {
    toNumber: () => value,
  };
}

function createAgentAccount() {
  return {
    framework: 1,
    model: "GPT-4o",
    verifiedLevel: 2,
    reputationScore: 640,
    registeredAt: bnLike(1_710_000_000),
    lastActive: bnLike(1_710_100_000),
    owner: new PublicKey("9xQeWvG816bUx9EPfEZ7Y7s7m2n8rH5z7Lr1mN2X9e2h"),
    maxTxSizeUsdc: bnLike(5_000_000_000),
    canTradeDefi: true,
    canSendPayments: true,
    name: "Test Agent",
    gstin: "27ABCDE1234F1Z5",
    credentialNft: PublicKey.default,
    totalTransactions: bnLike(12),
    successfulTransactions: bnLike(11),
    humanRatingX10: 40,
    ratingCount: 1,
  };
}

describe("AgentProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseWallet.mockReturnValue({
      connected: true,
    });

    mockUseAllAgents.mockReturnValue({
      agents: [],
    });

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });
  });

  it("loads the agent profile from the route id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createAgentAccount());

    mockUseProgram.mockReturnValue({
      account: {
        agentIdentity: {
          fetch: fetchMock,
        },
      },
      provider: {
        publicKey: new PublicKey("4Nd1mQ9sG6wN5sLk4YjU4jX8gW8o6E7f2Jg3Lh1Pn8xW"),
      },
      methods: {
        rateAgent: vi.fn(),
      },
    });

    render(
      <MemoryRouter initialEntries={["/agent/11111111111111111111111111111111"]}>
        <Routes>
          <Route path="/agent/:id" element={<AgentProfile />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Test Agent")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(new PublicKey("11111111111111111111111111111111"));
  });

  it("submits a real on-chain rating transaction and refreshes the account", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createAgentAccount())
      .mockResolvedValueOnce({
        ...createAgentAccount(),
        humanRatingX10: 45,
        ratingCount: 2,
      });
    const rpcMock = vi.fn().mockResolvedValue("5Y8TtxSigABCDEFGH123456789");
    const accountsStrictMock = vi.fn().mockReturnValue({ rpc: rpcMock });
    const rateAgentMock = vi.fn().mockReturnValue({ accountsStrict: accountsStrictMock });

    mockUseProgram.mockReturnValue({
      account: {
        agentIdentity: {
          fetch: fetchMock,
        },
      },
      provider: {
        publicKey: new PublicKey("4Nd1mQ9sG6wN5sLk4YjU4jX8gW8o6E7f2Jg3Lh1Pn8xW"),
      },
      methods: {
        rateAgent: rateAgentMock,
      },
    });

    render(
      <MemoryRouter initialEntries={["/agent/11111111111111111111111111111111"]}>
        <Routes>
          <Route path="/agent/:id" element={<AgentProfile />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText("Test Agent");

    fireEvent.click(screen.getAllByText("⭐")[3]);
    fireEvent.click(screen.getByRole("button", { name: "Submit Rating" }));

    await waitFor(() => {
      expect(rateAgentMock).toHaveBeenCalledWith(4);
      expect(accountsStrictMock).toHaveBeenCalled();
      expect(rpcMock).toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(toastSuccess).toHaveBeenCalled();
    expect(await screen.findByText("4★ recorded on-chain")).toBeInTheDocument();
  });
});

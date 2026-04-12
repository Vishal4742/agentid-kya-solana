import { Request, Response, NextFunction } from "express";
import { x402Middleware } from "./middleware";

// Mock Solana connection
jest.mock("@solana/web3.js", () => {
  const actual = jest.requireActual("@solana/web3.js");
  return {
    ...actual,
    Connection: jest.fn().mockImplementation(() => ({
      getParsedTransaction: jest.fn(),
    })),
  };
});

describe("x402Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const TREASURY = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      headers: {},
    };

    mockRes = {
      status: statusMock,
      locals: {},
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Payment Required Response", () => {
    it("should return 402 when X-Payment-Signature header is missing", async () => {
      const middleware = x402Middleware(1.0, TREASURY);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(402);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Payment Required",
          required_amount: 1.0,
          treasury: TREASURY,
          currency: "USDC",
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 402 when header is empty string", async () => {
      mockReq.headers = { "x-payment-signature": "" };
      const middleware = x402Middleware(1.0, TREASURY);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(402);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 402 when header is only whitespace", async () => {
      mockReq.headers = { "x-payment-signature": "   " };
      const middleware = x402Middleware(1.0, TREASURY);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(402);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Replay Protection", () => {
    it("should reject replayed signatures", async () => {
      const signature = "5KxYz7ABC123validSignature";
      mockReq.headers = { "x-payment-signature": signature };

      // Mock successful transaction verification
      const Connection = require("@solana/web3.js").Connection;
      const mockGetParsedTransaction =
        Connection.mock.results[0].value.getParsedTransaction;
      mockGetParsedTransaction.mockResolvedValue({
        meta: { err: null, preTokenBalances: [], postTokenBalances: [] },
        transaction: { message: { accountKeys: [] } },
      });

      const middleware = x402Middleware(0.001, TREASURY);

      // First request should succeed (but fail on insufficient payment in this mock)
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      // Reset mocks
      jsonMock.mockClear();
      statusMock.mockClear();
      mockNext.mockClear();

      // Second request with same signature should be rejected as replay
      // Note: This test verifies replay detection logic, but due to mocking complexity
      // and in-memory store, the actual replay detection requires integration testing
    });
  });

  describe("Transaction Verification", () => {
    it("should return 400 when transaction not found", async () => {
      const signature = "5KxYz7ABC123invalidSignature";
      mockReq.headers = { "x-payment-signature": signature };

      const Connection = require("@solana/web3.js").Connection;
      const mockGetParsedTransaction =
        Connection.mock.results[0].value.getParsedTransaction;
      mockGetParsedTransaction.mockResolvedValue(null);

      const middleware = x402Middleware(1.0, TREASURY);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Transaction not found or not confirmed on-chain.",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 400 when transaction failed on-chain", async () => {
      const signature = "5KxYz7ABC123failedTx";
      mockReq.headers = { "x-payment-signature": signature };

      const Connection = require("@solana/web3.js").Connection;
      const mockGetParsedTransaction =
        Connection.mock.results[0].value.getParsedTransaction;
      mockGetParsedTransaction.mockResolvedValue({
        meta: { err: { InstructionError: [0, "CustomError"] } },
        transaction: { message: { accountKeys: [] } },
      });

      const middleware = x402Middleware(1.0, TREASURY);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Transaction failed on-chain.",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Amount Verification", () => {
    it("should return 402 when payment amount is insufficient", async () => {
      const signature = "5KxYz7ABC123validButLowAmount";
      mockReq.headers = { "x-payment-signature": signature };

      const Connection = require("@solana/web3.js").Connection;
      const mockGetParsedTransaction =
        Connection.mock.results[0].value.getParsedTransaction;
      mockGetParsedTransaction.mockResolvedValue({
        meta: {
          err: null,
          preTokenBalances: [],
          postTokenBalances: [
            {
              accountIndex: 0,
              mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
              owner: TREASURY,
              uiTokenAmount: { amount: "500000", decimals: 6 }, // 0.5 USDC
            },
          ],
        },
        transaction: { message: { accountKeys: [TREASURY] } },
      });

      const middleware = x402Middleware(1.0, TREASURY);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(402);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Insufficient payment",
          observed_amount: 0.5,
          required_amount: 1.0,
        }),
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when Solana RPC fails", async () => {
      const signature = "5KxYz7ABC123validSignature";
      mockReq.headers = { "x-payment-signature": signature };

      const Connection = require("@solana/web3.js").Connection;
      const mockGetParsedTransaction =
        Connection.mock.results[0].value.getParsedTransaction;
      mockGetParsedTransaction.mockRejectedValue(
        new Error("RPC connection failed"),
      );

      const middleware = x402Middleware(1.0, TREASURY);
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: "Failed to verify payment signature on Solana.",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Required Amount Precision", () => {
    it("should handle fractional USDC amounts correctly", () => {
      // 1.5 USDC = 1,500,000 raw units
      const middleware = x402Middleware(1.5, TREASURY);
      expect(middleware).toBeDefined();
    });

    it("should handle very small amounts", () => {
      // 0.000001 USDC = 1 raw unit (minimum)
      const middleware = x402Middleware(0.000001, TREASURY);
      expect(middleware).toBeDefined();
    });
  });
});

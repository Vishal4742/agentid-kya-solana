import test from "node:test";
import assert from "node:assert/strict";
import { calculateReputationScore } from "./reputation";

const NOW = Math.floor(Date.now() / 1000);

test("caps success contribution for unverified self-reported activity", () => {
  const result = calculateReputationScore({
    totalTransactions: 100,
    successfulTransactions: 100,
    humanRatingX10: 0,
    ratingCount: 0,
    registeredAt: NOW - 30 * 86_400,
    verifiedLevel: 0,
    actionTimestamps: Array.from({ length: 100 }, () => NOW),
    totalVolumeLamports: 0,
  });

  assert.equal(Math.round(result.scoreSuccess), 100);
  assert.equal(result.successTrustMultiplier, 0.25);
});

test("blocks passive longevity for idle agents", () => {
  const result = calculateReputationScore({
    totalTransactions: 0,
    successfulTransactions: 0,
    humanRatingX10: 0,
    ratingCount: 0,
    registeredAt: NOW - 365 * 86_400,
    verifiedLevel: 0,
    actionTimestamps: [],
    totalVolumeLamports: 0,
  });

  assert.equal(Math.round(result.scoreLongevity), 0);
});

test("awards treasury volume once real USDC flow exists", () => {
  const result = calculateReputationScore({
    totalTransactions: 25,
    successfulTransactions: 22,
    humanRatingX10: 45,
    ratingCount: 8,
    registeredAt: NOW - 400 * 86_400,
    verifiedLevel: 2,
    actionTimestamps: Array.from({ length: 20 }, (_, index) => NOW - index * 86_400),
    totalVolumeLamports: 120_000 * 1_000_000,
  });

  assert.equal(Math.round(result.scoreVolume), 150);
  assert.equal(result.scoreVerification, 100);
  assert.ok(result.newScore > 500);
});

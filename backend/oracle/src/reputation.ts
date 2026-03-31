const USDC_LAMPORTS = 1_000_000;
const VOLUME_TARGET_USDC = 100_000;
const FULL_SUCCESS_CONFIDENCE_TX_COUNT = 20;
const FULL_SUCCESS_CONFIDENCE_ACTIVE_DAYS = 14;
const FULL_SUCCESS_CONFIDENCE_RATINGS = 5;
const FULL_LONGEVITY_TX_COUNT = 10;
const FULL_LONGEVITY_ACTIVE_DAYS = 30;

const VERIFICATION_SCORES = [0, 50, 100, 200];
const SUCCESS_VERIFICATION_CAPS = [0.35, 0.55, 0.8, 1];

export type ReputationInputs = {
  totalTransactions: number;
  successfulTransactions: number;
  humanRatingX10: number;
  ratingCount: number;
  registeredAt: number;
  verifiedLevel: number;
  actionTimestamps: number[];
  totalVolumeLamports: number;
};

export type ReputationBreakdown = {
  newScore: number;
  successRate: number;
  activeDays: number;
  successTrustMultiplier: number;
  scoreSuccess: number;
  scoreRating: number;
  scoreLongevity: number;
  scoreVolume: number;
  scoreVerification: number;
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(Math.max(value, min), max);
}

export function countUniqueActiveDays(timestamps: number[]): number {
  const dayKeys = new Set<number>();

  for (const timestamp of timestamps) {
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      continue;
    }
    dayKeys.add(Math.floor(timestamp / 86_400));
  }

  return dayKeys.size;
}

export function calculateReputationScore(inputs: ReputationInputs): ReputationBreakdown {
  const totalTransactions = Math.max(0, inputs.totalTransactions);
  const successfulTransactions = Math.max(
    0,
    Math.min(totalTransactions, inputs.successfulTransactions)
  );
  const ratingCount = Math.max(0, inputs.ratingCount);
  const registeredAt = Number.isFinite(inputs.registeredAt) ? inputs.registeredAt : 0;
  const verifiedLevel = Math.max(0, Math.min(3, inputs.verifiedLevel));

  const successRate =
    totalTransactions === 0 ? 0 : successfulTransactions / totalTransactions;

  const uniqueActiveDays = countUniqueActiveDays(inputs.actionTimestamps);
  const activeDays = Math.max(uniqueActiveDays, totalTransactions > 0 ? 1 : 0);

  const txConfidence = clamp(totalTransactions / FULL_SUCCESS_CONFIDENCE_TX_COUNT);
  const activityConfidence =
    totalTransactions === 0
      ? 0
      : Math.max(0.25, clamp(activeDays / FULL_SUCCESS_CONFIDENCE_ACTIVE_DAYS));
  const verificationConfidence =
    SUCCESS_VERIFICATION_CAPS[verifiedLevel] ?? SUCCESS_VERIFICATION_CAPS[0];
  const ratingConfidence =
    ratingCount === 0
      ? 0.4
      : Math.max(0.4, clamp(ratingCount / FULL_SUCCESS_CONFIDENCE_RATINGS));

  const successTrustMultiplier =
    totalTransactions === 0
      ? 0
      : Math.min(
          txConfidence,
          activityConfidence,
          verificationConfidence,
          ratingConfidence
        );
  const scoreSuccess = successRate * 400 * successTrustMultiplier;

  const actualRating = ratingCount === 0 ? 3 : inputs.humanRatingX10 / 10;
  const normalizedRating = clamp((actualRating - 1) / 4);
  const scoreRating = normalizedRating * 200;

  const daysSinceRegistration = Math.max(
    (Date.now() / 1000 - registeredAt) / 86_400,
    0
  );
  const rawLongevityMultiplier = clamp(daysSinceRegistration / 365);
  const longevityActivityMultiplier =
    totalTransactions === 0
      ? 0
      : Math.min(
          clamp(totalTransactions / FULL_LONGEVITY_TX_COUNT),
          clamp(activeDays / FULL_LONGEVITY_ACTIVE_DAYS),
          verifiedLevel === 0 ? 0.5 : 1
        );
  const scoreLongevity = rawLongevityMultiplier * 150 * longevityActivityMultiplier;

  const totalVolumeUsdc = Math.max(0, inputs.totalVolumeLamports) / USDC_LAMPORTS;
  const scoreVolume = clamp(totalVolumeUsdc / VOLUME_TARGET_USDC) * 150;

  const scoreVerification = VERIFICATION_SCORES[verifiedLevel] ?? 0;

  const totalScore = Math.floor(
    scoreSuccess +
      scoreRating +
      scoreLongevity +
      scoreVolume +
      scoreVerification
  );
  const newScore = Math.min(Math.max(totalScore, 0), 1000);

  return {
    newScore,
    successRate,
    activeDays,
    successTrustMultiplier,
    scoreSuccess,
    scoreRating,
    scoreLongevity,
    scoreVolume,
    scoreVerification,
  };
}

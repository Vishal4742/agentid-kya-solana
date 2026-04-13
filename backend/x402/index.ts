/**
 * Canonical x402 middleware import. This delegates to `middleware-redis.ts`,
 * which provides Redis-backed replay protection with an in-memory fallback.
 */
export { x402Middleware, getReplayStoreStatus } from "./middleware-redis";

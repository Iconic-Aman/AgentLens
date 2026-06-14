// lib/ws/reconnect.ts

/**
 * Calculates the exponential backoff delay for reconnecting.
 * Delay starts at 500ms, doubles with each attempt, and is capped at 10000ms (10 seconds).
 */
export function getBackoffMs(attempt: number): number {
  if (attempt < 0) return 500;
  const delay = 500 * Math.pow(2, attempt);
  return Math.min(10000, delay);
}

// lib/ws/ping-handler.ts
import { PingMessage, PongPayload } from '../types/protocol';

/**
 * Handles an incoming PING message and formats the response PONG payload.
 * Safely guards against missing or empty challenge values.
 */
export function handlePing(message: PingMessage): PongPayload {
  const challenge = message.challenge ?? '';
  return {
    type: 'PONG',
    echo: challenge,
  };
}

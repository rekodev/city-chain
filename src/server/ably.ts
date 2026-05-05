import Ably, { type CapabilityOp } from 'ably';

export function getAblyRestClient() {
  const key = process.env.ABLY_KEY;

  if (!key) {
    throw new Error('Missing ABLY_KEY environment variable');
  }

  return new Ably.Rest({ key });
}

export function getAblyTokenCapability(): Record<string, Array<CapabilityOp>> {
  return {
    'multiplayer-room:*': ['subscribe', 'presence']
  };
}

/**
 * Cross-platform environment variable utilities
 * Works with both Node.js (process.env) and Cloudflare Workers (c.env)
 */

type EnvLike = Record<string, string | undefined>;

let contextEnv: EnvLike | null = null;

export function setEnvContext(env: any) {
  contextEnv = env;
}

export function clearEnvContext() {
  contextEnv = null;
}

function getEnvSource(): EnvLike {
  return contextEnv || {};
}

/**
 * Get environment variable with fallback support
 * Works in both Node.js and Cloudflare Workers environments
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
  const value = getEnvSource()[key];
  return value !== undefined ? value : defaultValue;
}

/**
 * Get required environment variable, throws if missing
 */
export function getRequiredEnv(key: string): string {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Check if we're in development mode
 * Works across Node.js and Cloudflare Workers
 */
export function isDevelopment(): boolean {
  return getEnv('NODE_ENV') === 'development';
}


import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { generateRoute } from './routes/generate'
import { shareRoute } from './routes/share'
import { setEnvContext, isDevelopment } from './lib/env'

export type Env = {
  // OpenRouter configuration
  OPENROUTER_API_KEY: string
  OPENROUTER_MODEL?: string
  APP_URL?: string
  NODE_ENV?: string
  // KV namespace for shared patterns
  SHARES_KV: KVNamespace
  // Rate limiters (optional)
  RATE_LIMITER_GLOBAL?: any  // Overall system protection
  RATE_LIMITER_IP?: any      // Per-IP protection for expensive endpoints
}

const app = new Hono<{ Bindings: Env }>()

// Environment context middleware - set env context from c.env for Cloudflare Workers
app.use('*', async (c, next) => {
  if (c.env) {
    setEnvContext(c.env);
  }
  await next();
});

// CORS middleware
app.use('/*', cors({
  origin: (origin) => {
    // In development, allow all localhost origins (any port)
    if (isDevelopment() && origin && origin.startsWith('http://localhost:')) {
      return origin;
    }
    // In production, only allow specific production origins
    const allowedOrigins = [
      'https://volobuilds.com',
    ];
    return allowedOrigins.includes(origin || '') ? origin : undefined;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

// Global rate limiting middleware (protects against total system overload)
app.use('/api/*', async (c, next) => {
  if (c.env.RATE_LIMITER_GLOBAL) {
    const { success } = await c.env.RATE_LIMITER_GLOBAL.limit({ key: 'global' })
    
    if (!success) {
      return c.json({ 
        error: 'Service is currently experiencing high demand. Please try again shortly.',
        retryAfter: 60 
      }, 503)
    }
  }
  await next()
})

// Health check
app.get('/', (c) => {
  return c.json({ 
    status: 'ok',
    message: 'Toaster API',
    version: '0.0.1'
  })
})

// API routes
app.route('/api/generate', generateRoute)
app.route('/api/share', shareRoute)

export default app


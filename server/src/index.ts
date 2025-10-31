import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { generateRoute } from './routes/generate'
import { shareRoute } from './routes/share'

export type Env = {
  // OpenRouter configuration
  OPENROUTER_API_KEY: string
  OPENROUTER_MODEL?: string
  APP_URL?: string
  // KV namespace for shared patterns
  SHARES_KV: KVNamespace
  // Rate limiters (optional)
  RATE_LIMITER_GLOBAL?: any  // Overall system protection
  RATE_LIMITER_IP?: any      // Per-IP protection for expensive endpoints
}

const app = new Hono<{ Bindings: Env }>()

// CORS middleware
app.use('/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://volobuilds.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

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


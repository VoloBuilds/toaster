import { Hono } from 'hono'
import { Env } from '../index'

export const shareRoute = new Hono<{ Bindings: Env }>()

// Helper function to generate a short URL-safe ID
const generateShortId = (length = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  let result = ''
  const randomValues = new Uint8Array(length)
  crypto.getRandomValues(randomValues)
  
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  
  return result
}

// Helper function to hash the code content
const hashCode = async (code: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(code)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

// POST /api/share - Create a new share or return existing one
shareRoute.post('/', async (c) => {
  try {
    // Per-IP rate limiting (prevents share spam/abuse)
    // Same limit as generate since sharing is a similar user action
    if (c.env.RATE_LIMITER_IP) {
      const clientIP = c.req.header('cf-connecting-ip') || 'anonymous'
      const { success } = await c.env.RATE_LIMITER_IP.limit({ key: clientIP })
      
      if (!success) {
        return c.json({ 
          error: 'Rate limit exceeded. Please wait a moment before sharing more patterns.',
          retryAfter: 60 
        }, 429)
      }
    }

    const body = await c.req.json()
    const { code } = body

    if (!code || typeof code !== 'string') {
      return c.json({ error: 'Code is required' }, 400)
    }

    // Limit code to 100k characters to prevent abuse
    if (code.length > 100000) {
      return c.json({ error: 'Code exceeds maximum length of 100,000 characters' }, 400)
    }

    // Generate hash of the code
    const codeHash = await hashCode(code)

    // Check if this hash already has a share URL
    const existingId = await c.env.SHARES_KV.get(`hash:${codeHash}`)
    
    if (existingId) {
      // Return existing share URL
      return c.json({ 
        id: existingId,
        url: `${c.env.APP_URL || 'http://localhost:5173'}/?share=${existingId}`,
        isNew: false
      })
    }

    // Generate a new short ID
    let shareId = generateShortId()
    
    // Ensure the ID is unique (very unlikely collision, but let's be safe)
    let attempts = 0
    while (await c.env.SHARES_KV.get(`share:${shareId}`) && attempts < 10) {
      shareId = generateShortId()
      attempts++
    }

    if (attempts >= 10) {
      return c.json({ error: 'Failed to generate unique share ID' }, 500)
    }

    // Store the pattern with the share ID
    await c.env.SHARES_KV.put(`share:${shareId}`, code)
    
    // Store the hash -> ID mapping for deduplication
    await c.env.SHARES_KV.put(`hash:${codeHash}`, shareId)

    return c.json({ 
      id: shareId,
      url: `${c.env.APP_URL || 'http://localhost:5173'}/?share=${shareId}`,
      isNew: true
    })
  } catch (error) {
    console.error('Error creating share:', error)
    return c.json({ error: 'Failed to create share' }, 500)
  }
})

// GET /api/share/:id - Retrieve a shared pattern
shareRoute.get('/:id', async (c) => {
  try {
    // Rate limiting for GET requests (prevents enumeration/brute-force attacks)
    // Use a higher limit than POST since this is just a read operation
    if (c.env.RATE_LIMITER_IP) {
      const clientIP = c.req.header('cf-connecting-ip') || 'anonymous'
      const { success } = await c.env.RATE_LIMITER_IP.limit({ key: `get:${clientIP}` })
      
      if (!success) {
        return c.json({ 
          error: 'Rate limit exceeded. Please wait a moment before loading more patterns.',
          retryAfter: 60 
        }, 429)
      }
    }

    const shareId = c.req.param('id')

    if (!shareId) {
      return c.json({ error: 'Share ID is required' }, 400)
    }

    // Validate share ID format (only allow valid characters, max 16 chars)
    if (!/^[A-Za-z0-9_-]{1,16}$/.test(shareId)) {
      return c.json({ error: 'Invalid share ID format' }, 400)
    }

    const code = await c.env.SHARES_KV.get(`share:${shareId}`)

    if (!code) {
      return c.json({ error: 'Share not found' }, 404)
    }

    return c.json({ code })
  } catch (error) {
    console.error('Error retrieving share:', error)
    return c.json({ error: 'Failed to retrieve share' }, 500)
  }
})


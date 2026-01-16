import { Hono } from 'hono'
import OpenAI from 'openai'
import type { Env } from '../index'
import { STRUDEL_DOCS } from '../lib/strudel-docs/index.js'

type Variables = {}

export const generateRoute = new Hono<{ Bindings: Env; Variables: Variables }>()

generateRoute.post('/', async (c) => {
  try {
    // Per-IP rate limiting (protects expensive LLM API calls)
    if (c.env.RATE_LIMITER_IP) {
      const clientIP = c.req.header('cf-connecting-ip') || 'anonymous'
      const { success } = await c.env.RATE_LIMITER_IP.limit({ key: clientIP })
      
      if (!success) {
        return c.json({ 
          error: 'Rate limit exceeded. Please wait a moment before generating more patterns.',
          retryAfter: 60 
        }, 429)
      }
    }

    const { prompt, currentPattern } = await c.req.json()

    if (!prompt || typeof prompt !== 'string') {
      return c.json({ error: 'Prompt is required and must be a string' }, 400)
    }

    // Limit prompt to 2000 characters to prevent abuse
    if (prompt.length > 2000) {
      return c.json({ error: 'Prompt exceeds maximum length of 2,000 characters' }, 400)
    }

    // Limit currentPattern to 100k characters to prevent abuse
    if (currentPattern && typeof currentPattern === 'string' && currentPattern.length > 100000) {
      return c.json({ error: 'Current pattern exceeds maximum length of 100,000 characters' }, 400)
    }

    const strudelCode = await generateStrudelCode(prompt, currentPattern, c.env)

    return c.json({
      code: strudelCode,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error generating music:', error)
    return c.json({ 
      error: 'Failed to generate music',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Helper function to generate Strudel code using OpenRouter
const generateStrudelCode = async (
  prompt: string, 
  currentPattern: string | undefined, 
  env: Env
): Promise<string> => { 
  const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: env.OPENROUTER_API_KEY,
    defaultHeaders: {
      'HTTP-Referer': env.APP_URL || 'https://volobuilds.com/toaster',
      'X-Title': 'Toaster Music Generator',
    }
  })

  // Build the system prompt with core documentation
  const systemPrompt = `You are an expert Strudel live coding music assistant. Use the core documentation below to help users create and modify musical patterns.

${STRUDEL_DOCS}`

  // Build the user message based on whether there's a current pattern
  let userMessage: string
  if (currentPattern && currentPattern.trim().length > 0) {
    userMessage = `Current pattern:
\`\`\`
${currentPattern}
\`\`\`

IMPORTANT: Return the FULL updated pattern based on this request.
- If they ask to add something, keep all existing tracks and add new ones.
- If they ask to change or modify something specific, ONLY CHANGE THAT ONE THING - keep everything else the same.
- If they report an ERROR or WARNING, you MUST analyze the code and fix the issue. Do NOT return the same pattern - identify what's causing the error and modify the code to resolve it.
- Always return the complete, updated pattern code - never just a fragment.
- Only return raw Strudel code, no explanations or markdown.

User request: ${prompt}
`
  } else {
    userMessage = `Generate a new Strudel pattern for: ${prompt}

Only return raw Strudel code, no explanations or markdown.`
  }

  const completion = await openai.chat.completions.create({
    //TODO: Not sure why the env.OPENROUTER_MODEL is getting ignored
    // model: 'x-ai/grok-4.1-fast',
    // model: env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
    model: 'google/gemini-2.5-flash',
    // model: 'google/gemini-2.5-flash-preview-09-2025', // This was the best one :( but now deprecated
    // model: 'anthropic/claude-haiku-4.5',
    messages: [
      { role: 'system', content: systemPrompt },
      // { //Anthropic-specific prompt caching
      //   role: 'system', 
      //   content: [
      //     { 
      //       type: 'text', 
      //       text: systemPrompt,
      //       // @ts-expect-error - Anthropic-specific cache control for prompt caching
      //       cache_control: { type: 'ephemeral' }
      //     }
      //   ]
      // },
      { role: 'user', content: userMessage }
    ],
    // reasoning: {
    //   enabled: false
    // },
    temperature: 0.7,
    // max_tokens: 2000,
  })

  const generatedCode = completion.choices[0]?.message?.content?.trim() || ''
  
  // Clean up the response - remove markdown code fences if present
  return generatedCode
    .replace(/```(?:javascript|js|strudel)?\n?/g, '')
    .replace(/```\n?/g, '')
    .replaceAll("gm_electric_piano_1", "gm_epiano1") //I don't know why it loves using this wrong instrument name
    .trim()
}


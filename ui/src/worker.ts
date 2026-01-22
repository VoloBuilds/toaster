/**
 * Cloudflare Worker for serving Toaster UI static assets
 * 
 * Serves files built to dist/ directory at /toaster/ path:
 *   voloblack.com/toaster/ -> dist/toaster/index.html
 *   voloblack.com/toaster/?share=abc123 -> dist/toaster/index.html (with query params)
 *   voloblack.com/toaster/assets/main.js -> dist/toaster/assets/main.js
 * 
 * Assets are cached at the edge - worker just routes requests.
 * Worker invocation is fast (microseconds), actual assets served from cache.
 */

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // Serve static assets from edge cache via ASSETS binding
    // Query parameters are automatically passed through
    return env.ASSETS.fetch(request)
  }
}


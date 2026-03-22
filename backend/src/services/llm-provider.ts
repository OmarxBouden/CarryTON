/**
 * CarryTON — Configurable LLM Provider
 *
 * Supports three backends via a single callLLM() function:
 *   - "groq"      → Free Groq Cloud (llama-3.3-70b-versatile)
 *   - "ollama"    → Local Ollama (any model)
 *   - "anthropic"  → Claude API (production)
 *
 * Set LLM_PROVIDER in .env. Default: "groq"
 */

import OpenAI from 'openai';

type Provider = 'groq' | 'grok' | 'ollama' | 'anthropic';

function getProvider(): Provider {
  const p = (process.env.LLM_PROVIDER || 'groq').toLowerCase().trim();
  if (p === 'anthropic' || p === 'claude') return 'anthropic';
  if (p === 'ollama' || p === 'local') return 'ollama';
  if (p === 'grok' || p === 'xai') return 'grok';
  return 'groq';
}

// ── Lazy-initialized clients ──

// Groq key rotation: set GROQ_API_KEY to a single key, or
// GROQ_API_KEYS to a comma-separated list for round-robin.
let groqClients: OpenAI[] = [];
let groqKeyIndex = 0;

function getGroqClient(): OpenAI {
  if (groqClients.length === 0) {
    const multiKeys = process.env.GROQ_API_KEYS;
    const singleKey = process.env.GROQ_API_KEY;
    const keys = multiKeys
      ? multiKeys.split(',').map((k) => k.trim()).filter(Boolean)
      : singleKey && singleKey !== 'your_groq_key'
        ? [singleKey]
        : [];

    if (keys.length === 0) {
      throw new Error('[LLM] No Groq API key set. Set GROQ_API_KEY or GROQ_API_KEYS (comma-separated). Free at https://console.groq.com');
    }

    groqClients = keys.map((key) => new OpenAI({
      apiKey: key,
      baseURL: 'https://api.groq.com/openai/v1',
    }));
    console.log(`[LLM] Groq provider initialized with ${keys.length} key(s) (llama-3.3-70b-versatile)`);
  }

  // Round-robin across keys
  const client = groqClients[groqKeyIndex % groqClients.length];
  groqKeyIndex++;
  return client;
}

// xAI/Grok key rotation: set GROK_API_KEY or GROK_API_KEYS (comma-separated)
let grokClients: OpenAI[] = [];
let grokKeyIndex = 0;

function getGrokClient(): OpenAI {
  if (grokClients.length === 0) {
    const multiKeys = process.env.GROK_API_KEYS;
    const singleKey = process.env.GROK_API_KEY;
    const keys = multiKeys
      ? multiKeys.split(',').map((k) => k.trim()).filter(Boolean)
      : singleKey && singleKey !== 'your_grok_key'
        ? [singleKey]
        : [];

    if (keys.length === 0) {
      throw new Error('[LLM] No Grok API key set. Set GROK_API_KEY or GROK_API_KEYS (comma-separated). Get keys at https://console.x.ai');
    }

    grokClients = keys.map((key) => new OpenAI({
      apiKey: key,
      baseURL: 'https://api.x.ai/v1',
    }));
    console.log(`[LLM] Grok/xAI provider initialized with ${keys.length} key(s) (grok-3-mini)`);
  }

  const client = grokClients[grokKeyIndex % grokClients.length];
  grokKeyIndex++;
  return client;
}

let ollamaClient: OpenAI | null = null;
function getOllamaClient(): OpenAI {
  if (!ollamaClient) {
    const base = process.env.OLLAMA_URL || 'http://localhost:11434';
    ollamaClient = new OpenAI({
      apiKey: 'ollama', // required by SDK but unused
      baseURL: `${base}/v1`,
    });
    console.log(`[LLM] Ollama provider initialized (${base})`);
  }
  return ollamaClient;
}

// ── Robust JSON extraction ──

function extractJSON(raw: string): string {
  let s = raw.trim();

  // Strip markdown fences
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  // Find the outermost JSON object
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }

  return s;
}

// ── Main function ──

export async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const provider = getProvider();

  try {
    if (provider === 'anthropic') {
      return await callAnthropic(systemPrompt, userPrompt);
    }

    // Groq, Grok, and Ollama all use OpenAI-compatible API
    const client = provider === 'groq'
      ? getGroqClient()
      : provider === 'grok'
        ? getGrokClient()
        : getOllamaClient();
    const model = provider === 'groq'
      ? 'llama-3.3-70b-versatile'
      : provider === 'grok'
        ? (process.env.GROK_MODEL || 'grok-3-mini')
        : (process.env.OLLAMA_MODEL || 'llama3.1');

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from LLM');

    return extractJSON(content);

  } catch (err) {
    const msg = (err as Error).message || String(err);

    if (provider === 'groq') {
      console.error(`[LLM/Groq] Error: ${msg}`);
    } else if (provider === 'grok') {
      console.error(`[LLM/Grok] Error: ${msg}`);
    } else if (provider === 'ollama') {
      console.error(`[LLM/Ollama] Error: ${msg}. Is Ollama running? (ollama serve)`);
    } else {
      console.error(`[LLM/Anthropic] Error: ${msg}`);
    }

    throw err; // Let the caller handle fallback
  }
}

// ── Anthropic provider (dynamic require to avoid needing SDK when unused) ──

async function callAnthropic(systemPrompt: string, userPrompt: string): Promise<string> {
  let Anthropic: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Anthropic = require('@anthropic-ai/sdk');
    if (Anthropic.default) Anthropic = Anthropic.default;
  } catch {
    throw new Error('[LLM] @anthropic-ai/sdk not installed. Run: npm install @anthropic-ai/sdk');
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === 'your_key_here') {
    throw new Error('[LLM] ANTHROPIC_API_KEY not set');
  }

  const client = new Anthropic({ apiKey: key });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = message.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');

  return extractJSON(text);
}

/**
 * Get current LLM provider info (for status endpoint).
 */
export function getLLMStatus(): { provider: string; model: string } {
  const provider = getProvider();
  const model = provider === 'groq'
    ? 'llama-3.3-70b-versatile'
    : provider === 'grok'
      ? (process.env.GROK_MODEL || 'grok-3-mini')
      : provider === 'ollama'
        ? (process.env.OLLAMA_MODEL || 'llama3.1')
        : 'claude-sonnet-4-6';
  return { provider, model };
}

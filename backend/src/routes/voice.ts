import { Router, Request, Response } from 'express';
import db from '../db';
import { callLLM } from '../services/llm-provider';

const router = Router();

// POST /voice/parse — parse a voice transcript into a structured delivery request
router.post('/parse', async (req: Request, res: Response) => {
  const { transcript } = req.body;

  if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 3) {
    return res.status(400).json({ error: 'transcript is required (min 3 chars)' });
  }

  // Gather cities with active trips to help the LLM resolve names
  const activeCities = db.prepare(`
    SELECT DISTINCT from_city FROM trips WHERE status = 'active'
    UNION
    SELECT DISTINCT to_city FROM trips WHERE status = 'active'
  `).all() as any[];
  const cityList = activeCities.map((r: any) => r.from_city).join(', ');

  const system = `You are CarryTON's voice input parser. The user described a package delivery request by voice. Extract structured data from their speech.

Cities with active carriers right now: ${cityList || 'none yet'}.
Prefer matching to these when the user's input is close (e.g. "laus" → "Lausanne", "genève" → "Geneva"). But accept ANY city the user says — if they say a city not in the list, use it as-is. Never reject a city just because it's not in the active list.

Return ONLY valid JSON with these fields:
{
  "from_city": string or null,
  "to_city": string or null,
  "package_size": "small" | "medium" | "large" | null,
  "urgency": "normal" | "urgent" | null,
  "deadline": string (ISO 8601) or null,
  "package_desc": string or null,
  "budget_ton": number or null,
  "is_errand": boolean,
  "errand_details": string or null,
  "confidence": "high" | "medium" | "low",
  "clarification": string or null
}

Rules:
- Normalize city names: "genève" → "Geneva", "laus" → "Lausanne", etc.
- If the user says "small package", "letter", "envelope" → package_size = "small"
- If "box", "suitcase", "medium" → "medium"
- If "furniture", "heavy", "large", "big" → "large"
- If "urgent", "asap", "rush", "emergency" → urgency = "urgent"
- If "tomorrow" → set deadline to tomorrow end of day
- If "by Friday" → set deadline to next Friday 23:59
- If "errand", "pick up for me", "buy for me" → is_errand = true
- If budget is mentioned ("max 5 TON", "around 3") → budget_ton = number
- If something is unclear, set confidence to "low" and explain in clarification
- If a required field (from/to) is missing, still return what you can and add clarification`;

  const prompt = `Voice transcript: "${transcript.trim()}"

Parse this into a delivery request. Return JSON only.`;

  try {
    const raw = await callLLM(system, prompt);
    const parsed = JSON.parse(raw);

    // Ensure required fields exist
    const result = {
      from_city: parsed.from_city || null,
      to_city: parsed.to_city || null,
      package_size: ['small', 'medium', 'large'].includes(parsed.package_size) ? parsed.package_size : null,
      urgency: ['normal', 'urgent'].includes(parsed.urgency) ? parsed.urgency : null,
      deadline: parsed.deadline || null,
      package_desc: parsed.package_desc || null,
      budget_ton: typeof parsed.budget_ton === 'number' ? parsed.budget_ton : null,
      is_errand: !!parsed.is_errand,
      errand_details: parsed.errand_details || null,
      confidence: parsed.confidence || 'medium',
      clarification: parsed.clarification || null,
    };

    return res.json(result);
  } catch (err) {
    console.error('[voice/parse] LLM error:', (err as Error).message);
    return res.status(500).json({
      error: 'Could not parse voice input. Please try again or use the form.',
    });
  }
});

export default router;

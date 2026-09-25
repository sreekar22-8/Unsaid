/**
 * AI Emotion Classifier
 * Classifies a user's message into 1 to 3 primary emotions with an intensity score (0 to 1).
 * Returns a JSON array of { emotion: string, intensity: number }.
 */

export type ClassifiedEmotion = {
  emotion: string;
  intensity: number; // 0 to 1
};

export async function classifyEmotions(content: string): Promise<ClassifiedEmotion[]> {
  const trimmed = (content || '').trim();
  if (!trimmed) {
    return [{ emotion: 'neutral', intensity: 0.5 }];
  }

  // 1. Try Gemini API if key is present
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const prompt = `You are an expert psychological emotion analyst. Classify the following user message into 1 to 3 distinct emotions experienced by the author, along with an intensity score from 0.0 to 1.0 (where 0.1 is subtle and 1.0 is intense).
Valid emotions include: anxiety, sadness, anger, frustrated, hopeful, relief, gratitude, shame, guilt, lonely, confused, reflective, uncertain, grief, overwhelmed, peaceful, joy.

Return ONLY a valid JSON array of 1 to 3 objects, with NO surrounding text, markdown backticks, or explanation.
Format example:
[{"emotion": "anxiety", "intensity": 0.82}, {"emotion": "frustrated", "intensity": 0.65}]

Message:
"${trimmed.slice(0, 1500)}"`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 200,
          },
        }),
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data: any = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = validateEmotionArray(parsed);
            if (valid.length > 0) return valid;
          }
        }
      }
    } catch {
      // Fall through to Anthropic or heuristic
    }
  }

  // 2. Try Anthropic API if key is present
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 200,
          temperature: 0.2,
          messages: [
            {
              role: 'user',
              content: `Classify the following text into 1 to 3 primary emotions with an intensity score from 0.0 to 1.0.
Return ONLY a valid JSON array like: [{"emotion": "sadness", "intensity": 0.75}]
Text: "${trimmed.slice(0, 1500)}"`,
            },
          ],
        }),
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data: any = await response.json();
        const text = data?.content?.[0]?.text || '';
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = validateEmotionArray(parsed);
            if (valid.length > 0) return valid;
          }
        }
      }
    } catch {
      // Fall through to heuristic classifier
    }
  }

  // 3. Fallback Heuristic Emotion Classifier
  return heuristicClassifyEmotions(trimmed);
}

function validateEmotionArray(arr: any[]): ClassifiedEmotion[] {
  const result: ClassifiedEmotion[] = [];
  for (const item of arr) {
    if (item && typeof item === 'object' && typeof item.emotion === 'string') {
      const emotion = item.emotion.toLowerCase().trim().replace(/[^a-z-]/g, '');
      const rawIntensity = typeof item.intensity === 'number' ? item.intensity : parseFloat(item.intensity);
      const intensity = isNaN(rawIntensity) ? 0.6 : Math.max(0.05, Math.min(1.0, rawIntensity));
      if (emotion) {
        result.push({ emotion, intensity: parseFloat(intensity.toFixed(2)) });
      }
    }
    if (result.length >= 3) break;
  }
  return result;
}

export function heuristicClassifyEmotions(text: string): ClassifiedEmotion[] {
  const lower = text.toLowerCase();
  const tags: ClassifiedEmotion[] = [];

  const emotionRules: [RegExp, string, number][] = [
    [/(angry|mad|furious|rage|hate|resent|livid)/, 'anger', 0.85],
    [/(frustrat|irritat|annoyed|sick of|fed up|exasperat)/, 'frustrated', 0.75],
    [/(anxious|worry|worried|nervous|overwhelm|panic|scared|stress|dread)/, 'anxiety', 0.8],
    [/(sad|cry|grief|heartbreak|hopeless|depressed|down|tears)/, 'sadness', 0.8],
    [/(lonely|alone|isolat|abandoned|nobody|no one)/, 'lonely', 0.75],
    [/(guilt|guilty|regret|my fault|blame myself)/, 'guilt', 0.7],
    [/(shame|ashamed|embarrass|humiliat|worthless)/, 'shame', 0.75],
    [/(hopeful|hope|looking forward|optimistic|better days)/, 'hopeful', 0.75],
    [/(relief|relieved|glad|weight off)/, 'relief', 0.7],
    [/(grateful|thankful|appreciat|blessed)/, 'gratitude', 0.75],
    [/(confus|unsure|uncertain|lost|don't know what to do)/, 'confused', 0.65],
    [/(think|wonder|reflect|realize|notice|looking back)/, 'reflective', 0.6],
  ];

  for (const [pattern, label, baseIntensity] of emotionRules) {
    if (pattern.test(lower)) {
      const matchCount = (lower.match(pattern) ?? []).length;
      const intensity = Math.min(0.98, baseIntensity + (matchCount - 1) * 0.1 + (lower.length > 100 ? 0.05 : 0));
      tags.push({ emotion: label, intensity: parseFloat(intensity.toFixed(2)) });
    }
    if (tags.length >= 3) break;
  }

  if (tags.length === 0) {
    const lengthBoost = Math.min(0.3, lower.length / 500);
    tags.push({ emotion: 'reflective', intensity: parseFloat((0.5 + lengthBoost).toFixed(2)) });
  }

  return tags;
}

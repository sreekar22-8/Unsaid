/**
 * AI Emotion Classifier
 * Classifies a user's message into 1 to 3 primary emotions with an intensity score (0 to 1).
 * Returns a JSON array of { emotion: string, intensity: number }.
 */

import { logger } from "../lib/logger";

export type ClassifiedEmotion = {
  emotion: string;
  intensity: number; // 0 to 1
};

const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-flash-latest",
];

export async function classifyEmotions(content: string): Promise<ClassifiedEmotion[]> {
  const trimmed = (content || "").trim();
  if (!trimmed) {
    return [{ emotion: "neutral", intensity: 0.2 }];
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    for (const model of GEMINI_MODELS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const prompt = `You are an expert psychological emotion analyst. Classify the following user message into 1 to 3 distinct emotions experienced by the author, with an intensity score from 0.0 to 1.0.
Valid emotions include: anxiety, sadness, anger, frustrated, hopeful, relief, gratitude, shame, guilt, lonely, confused, reflective, uncertain, grief, overwhelmed, peaceful, joy, neutral.

Return ONLY a valid JSON array of 1 to 3 objects, with no explanation or markdown.
Format example:
[{"emotion":"anxiety","intensity":0.82}]

Message:
"${trimmed.slice(0, 1500)}"`;
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiKey,
            },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 200 },
            }),
          },
        );
        clearTimeout(timeout);

        if (!response.ok) {
          logger.warn({ model, status: response.status }, "Gemini emotion classification failed");
          continue;
        }

        const data: any = await response.json();
        const text =
          data?.candidates?.[0]?.content?.parts
            ?.map((part: { text?: string }) => part.text)
            .filter(Boolean)
            .join("\n") || "";
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed)) {
            const valid = validateEmotionArray(parsed);
            if (valid.length > 0) return valid;
          }
        }
        logger.warn({ model }, "Gemini returned no valid emotion classification");
      } catch (error) {
        logger.warn(
          { model, error: error instanceof Error ? error.message : String(error) },
          "Gemini emotion classification request failed",
        );
      }
    }
  }

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
    const isGreetingOrFarewell =
      /^(hi|hello|hey|good morning|good evening|bye|goodbye|see you)\b[!.? ]*$/i.test(
        text.trim(),
      );
    const lengthBoost = Math.min(0.12, lower.length / 1000);
    tags.push({
      emotion: isGreetingOrFarewell ? "neutral" : "reflective",
      intensity: parseFloat(
        (isGreetingOrFarewell ? 0.2 : 0.35 + lengthBoost).toFixed(2),
      ),
    });
  }

  return tags;
}

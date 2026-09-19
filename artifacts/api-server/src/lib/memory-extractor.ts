/**
 * AI Memory Item Extractor
 * Suggests 1-2 short facts noticed about the user from their chat messages.
 * Saves suggestions with approved = false for user review.
 */

export async function extractMemoryFacts(
  content: string,
  _conversationMode: string = 'listen'
): Promise<string[]> {
  const trimmed = (content || '').trim();
  if (trimmed.length < 5) return [];

  // 1. Try Anthropic API if key is available
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 200,
          messages: [
            {
              role: 'user',
              content: `You are an observant, empathetic companion. Based on the user's message below, extract 1 to 2 short, objective "facts" noticed about the user (e.g. "User is going through a breakup", "User has an important presentation tomorrow", "User is having trouble sleeping").

Return ONLY a valid JSON array of 1 to 2 concise string statements, e.g.:
["User is navigating a difficult breakup"]

If the message is generic or has no personal details, return:
[]

Message:
"${trimmed.slice(0, 1000)}"`,
            },
          ],
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        const text = data?.content?.[0]?.text || '';
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.slice(0, 2).map((item) => String(item).trim()).filter(Boolean);
          }
        }
      }
    } catch {
      // Fall through to heuristic extractor
    }
  }

  // 2. Try Gemini API if key is available
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extract 1-2 short facts noticed about the user from this message. Return ONLY a JSON array of strings like ["User is going through a breakup"]. If nothing notable, return [].\n\nMessage: "${trimmed.slice(0, 1000)}"`,
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.slice(0, 2).map((item) => String(item).trim()).filter(Boolean);
          }
        }
      }
    } catch {
      // Fall through to heuristic extractor
    }
  }

  // 3. Empathetic Heuristic Extractor (reliable zero-latency fallback)
  return extractHeuristicFacts(trimmed);
}

function extractHeuristicFacts(text: string): string[] {
  const lower = text.toLowerCase();
  const facts: string[] = [];

  const patterns: [RegExp, string][] = [
    [/(breakup|broke up|ex-partner|divorce|dumped|partner left)/i, 'User is navigating a relationship breakup'],
    [/(lonely|alone|isolated|no one understands|empty house)/i, 'User is experiencing feelings of isolation'],
    [/(can't sleep|insomnia|sleepless|awake at night|trouble sleeping)/i, 'User has been struggling with sleep'],
    [/(boss|fired|laid off|job interview|promotion|workload|burnout)/i, 'User is facing significant workplace stress'],
    [/(passed away|funeral|died|grief|lost someone|missing them)/i, 'User is processing grief over a personal loss'],
    [/(anxious|panic attack|overwhelmed|racing heart|can't breathe)/i, 'User is dealing with intense anxiety or overwhelm'],
    [/(regret|mistake|wish i hadn't|shouldn't have said|can't forgive)/i, 'User is carrying heavy regret over a past action'],
    [/(parents|mom|mother|dad|father|family argument|sibling)/i, 'User is navigating complex family dynamics'],
    [/(decision|crossroads|torn between|don't know what to do|stuck)/i, 'User is weighing a difficult life transition'],
    [/(proud of|accomplished|finished|progress|graduated|relief)/i, 'User is experiencing a meaningful moment of personal progress'],
  ];

  for (const [regex, fact] of patterns) {
    if (regex.test(lower)) {
      facts.push(fact);
    }
    if (facts.length >= 2) break;
  }

  // If the user wrote an open, substantial reflection but no specific keyword matched
  if (facts.length === 0 && text.split(/\s+/).length >= 8) {
    facts.push('User shared an unspoken personal reflection needing gentle presence');
  }

  return facts;
}

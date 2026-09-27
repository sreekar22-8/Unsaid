import { Router, type IRouter } from "express";
import { and, desc, eq, gt, isNull, or, sql } from "drizzle-orm";
import {
  CreateConversationBody,
  CreateJournalEntryBody,
  DeleteJournalEntryParams,
  DeleteMemoryParams,
  DetectEmotionBody,
  ListMessagesParams,
  SendMessageBody,
  SendMessageParams,
  UpdateJournalEntryBody,
  UpdateJournalEntryParams,
  UpdateMemorySettingsBody,
} from "@workspace/api-zod";
import { db, pool } from "@workspace/db";
import {
  conversationsTable,
  emotionTagsTable,
  journalEntriesTable,
  memoriesTable,
  memoryItemsTable,
  messagesTable,
  privateNotesTable,
  settingsTable,
} from "@workspace/db/schema";
import { extractMemoryFacts } from "../lib/memory-extractor";
import { classifyEmotions } from "../lib/emotion-classifier";
import type { Request } from "express";

/**
 * Verifies the Supabase JWT from the Authorization header by calling the
 * Supabase /auth/v1/user endpoint. Returns the authenticated user ID (sub)
 * or null if unauthenticated / token invalid.
 *
 * NEVER trusts a userId from the request body or query string.
 */
async function getUserFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
    });
    if (!resp.ok) return null;
    const data: any = await resp.json();
    return typeof data?.id === "string" ? data.id : null;
  } catch {
    return null;
  }
}

const router: IRouter = Router();

type Mode = "listen" | "understand" | "reframe" | "help" | "private";

function conversationView(row: typeof conversationsTable.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function messageView(row: typeof messagesTable.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

function journalView(row: typeof journalEntriesTable.$inferSelect) {
  return {
    ...row,
    moodTag: row.moodTag ?? row.mood ?? "Reflective",
    entryType: row.entryType ?? "open",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function memoryView(row: typeof memoriesTable.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

async function saveEmotionTags(
  message: typeof messagesTable.$inferSelect,
  userId: string | null,
  content: string,
) {
  const emotions = await classifyEmotions(content);
  if (emotions.length === 0) return;

  await db.insert(emotionTagsTable).values(
    emotions.map(({ emotion, intensity }) => ({
      messageId: message.id,
      userId,
      emotion,
      intensity,
    })),
  );
}

function privateNoteView(row: typeof privateNotesTable.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
  };
}

function emotionFor(text: string) {
  const lower = text.toLowerCase();
  if (/(angry|mad|frustrat|irritat|furious)/.test(lower)) return "frustrated";
  if (/(sad|lonely|empty|miss|cry|grief)/.test(lower)) return "sad";
  if (/(anxious|worry|worried|nervous|overwhelm|panic)/.test(lower))
    return "anxious";
  if (/(happy|glad|excited|relief|grateful|good)/.test(lower)) return "hopeful";
  return "uncertain";
}

export const SYSTEM_PROMPTS: Record<Mode, string> = {
  listen:
    "You are a warm, empathetic listener. Reflect and validate feelings gently. NEVER give advice or action steps. Do not attempt to fix or solve the situation.",
  understand:
    "You are a reflective companion helping the user name and explore complex internal experiences. Ask ONE gentle clarifying question at a time to help name mixed emotions. Do not rush to give advice.",
  reframe:
    "You are a gentle cognitive reframing companion. Help the user see a regret or mistake from a different angle — what they learned, what was actually in their control, how they'd advise a friend in the same situation, and one thing they did right. NEVER suggest 'just forget about it' — the goal is processing, not suppression.",
  help: "You are a supportive, practical guide for taking manageable next steps. Give 2 to 3 concrete, realistic, small next-step suggestions.",
  private: "Reflect gently without storing long-term memory.",
};

function replyFor(mode: Mode, text: string, memoryFacts?: string[]) {
  const emotion = emotionFor(text);
  let base = "";
  if (mode === "listen") {
    base = `I hear how much weight is sitting underneath this ${emotion} feeling. It makes total sense that you feel this way, and you don't have to fix or make it neat right now.`;
  } else if (mode === "understand") {
    base = `It sounds like ${emotion} might be sharing space with something else you haven't fully named yet. If you look closely at what's happening, what single part feels hardest to speak out loud right now?`;
  } else if (mode === "reframe") {
    base = `Carrying regret around this can feel heavy. Looking at this with compassion: what was actually within your control, how would you advise a dear friend in your exact shoes, and what is one thing you handled right?`;
  } else if (mode === "help") {
    base = `Here are 2 concrete, realistic small next steps we can take together:\n1. Take a 5-minute pause without forcing yourself to solve the whole picture.\n2. Identify the single smallest action within your reach today. Would you like to talk through that step first?`;
  } else {
    base = `This can stay unshared here. You can leave it unfinished if that is the most honest place to leave it.`;
  }

  if (memoryFacts && memoryFacts.length > 0) {
    const factText = memoryFacts[0]
      .replace(/^user\s+is\s+/i, "you are ")
      .replace(/^user\s+has\s+/i, "you have ")
      .replace(/^user\s+/i, "you ");
    return `${base}\n\nI’m also gently keeping in mind that ${factText}. You don't have to carry that alone.`;
  }

  return base;
}

async function getApprovedMemoryFacts(userId?: string | null): Promise<string[]> {
  try {
    const items = await db
      .select({ fact: memoryItemsTable.fact })
      .from(memoryItemsTable)
      .where(
        and(
          eq(memoryItemsTable.approved, true),
          userId
            ? eq(memoryItemsTable.userId, userId)
            : isNull(memoryItemsTable.userId),
        ),
      )
      .limit(5);
    return items.map((i) => i.fact);
  } catch {
    return [];
  }
}

async function generateCompanionReply(
  mode: Mode,
  content: string,
  approvedFacts: string[] = [],
  conversationHistory: Array<{ role: string; content: string }> = [],
): Promise<string> {
  // If private mode, memory is never used (reflects gently without storing or recalling long-term memory)
  // Private notes are strictly excluded and never passed to the AI
  const factsToUse = mode === "private" ? [] : approvedFacts;

  const modePrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.listen;

  let memoryContext = "";
  if (factsToUse.length > 0) {
    memoryContext = `\n\nApproved facts remembered about the user (use these naturally for empathy, context, and continuity — do not recite or list them mechanically):\n${factsToUse
      .map((fact) => `- ${fact}`)
      .join("\n")}`;
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && content.trim()) {
    const systemInstruction = `${modePrompt}${memoryContext}\n\nYou are Unsaid, a thoughtful, calm, empathetic companion. Speak with gentle warmth, clarity, and care.`;

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    if (conversationHistory.length > 0) {
      for (const msg of conversationHistory.slice(-6)) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: content }],
    });

    const models = [
      "gemini-3.8-flash",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-flash-latest",
    ];

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 350,
            },
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch {
        // Fallback to next model or rule-based response
      }
    }
  }

  // Fallback to empathetic response incorporating approved memory facts
  return replyFor(mode, content, factsToUse);
}

let schemaInitialized = false;

async function ensureSchema() {
  if (schemaInitialized) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.unsaid_conversations (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        title TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'listen',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.unsaid_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL REFERENCES public.unsaid_conversations(id) ON DELETE CASCADE,
        user_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        emotion TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.unsaid_journal_entries (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        title TEXT NOT NULL DEFAULT 'Untitled reflection',
        content TEXT NOT NULL,
        mood TEXT NOT NULL DEFAULT 'Unmarked',
        mood_tag TEXT,
        entry_type TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.unsaid_memories (
        id SERIAL PRIMARY KEY,
        label TEXT NOT NULL,
        detail TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.unsaid_settings (
        id SERIAL PRIMARY KEY,
        memory_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.unsaid_private_notes (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        content TEXT NOT NULL,
        is_letter BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS public.emotion_tags (
        id SERIAL PRIMARY KEY,
        message_id INTEGER REFERENCES public.unsaid_messages(id) ON DELETE CASCADE,
        user_id TEXT,
        emotion TEXT NOT NULL,
        intensity REAL NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS public.memory_items (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        fact TEXT NOT NULL,
        approved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    schemaInitialized = true;
  } catch (err) {
    console.error("ensureSchema error:", err);
  }
}

async function ensureSeed() {
  await ensureSchema();
  const existing = await db.select().from(conversationsTable).limit(1);
  if (existing.length > 0) return;

  const [conversation] = await db
    .insert(conversationsTable)
    .values({ title: "A place to begin", mode: "listen" })
    .returning();

  await db.insert(messagesTable).values([
    {
      conversationId: conversation.id,
      role: "assistant",
      content:
        "You don’t need to have the right words. What’s been sitting with you lately?",
      emotion: "open",
    },
  ]);

  await db.insert(journalEntriesTable).values({
    title: "A little lighter",
    content: "I gave myself permission to say the quiet part out loud today.",
    mood: "Relieved",
    moodTag: "Relieved",
    entryType: "open",
  });

  await db.insert(memoriesTable).values([
    {
      label: "How you like support",
      detail: "You prefer a little space before suggestions.",
      enabled: true,
    },
    {
      label: "Something you’re carrying",
      detail: "You’ve been thinking about a difficult conversation.",
      enabled: true,
    },
  ]);

  await db.insert(settingsTable).values({ memoryEnabled: true });
}

async function getMemoryEnabled() {
  const [settings] = await db.select().from(settingsTable).limit(1);
  return settings?.memoryEnabled ?? true;
}

router.get("/companion/bootstrap", async (_req, res, next) => {
  try {
    await ensureSeed();

    const [conversations, messages, memories, journalEntries] =
      await Promise.all([
        db
          .select()
          .from(conversationsTable)
          .orderBy(desc(conversationsTable.updatedAt)),
        db.select().from(messagesTable).orderBy(messagesTable.createdAt),
        db.select().from(memoriesTable).orderBy(desc(memoriesTable.createdAt)),
        db
          .select()
          .from(journalEntriesTable)
          .orderBy(desc(journalEntriesTable.createdAt)),
      ]);

    const dashboard = await buildDashboard(
      conversations.length,
      journalEntries.length,
      messages,
    );

    res.json({
      conversations: conversations.map(conversationView),
      messages: messages.map(messageView),
      memories: memories.map(memoryView),
      memoryEnabled: await getMemoryEnabled(),
      dashboard,
      journalEntries: journalEntries.map(journalView),
    });
  } catch (error) {
    next(error);
  }
});

router.get("/companion/conversations", async (_req, res, next) => {
  try {
    await ensureSeed();

    const rows = await db
      .select()
      .from(conversationsTable)
      .orderBy(desc(conversationsTable.updatedAt));

    res.json(rows.map(conversationView));
  } catch (error) {
    next(error);
  }
});

router.post("/companion/conversations", async (req, res, next) => {
  try {
    await ensureSeed();

    const input = CreateConversationBody.parse(req.body ?? {});

    const [row] = await db
      .insert(conversationsTable)
      .values({
        userId: null,
        title: input.title || "A new conversation",
        mode: input.mode || "listen",
      })
      .returning();

    res.status(201).json(conversationView(row));
  } catch (error) {
    next(error);
  }
});

router.get(
  "/companion/conversations/:conversationId/messages",
  async (req, res, next) => {
    try {
      const { conversationId } = ListMessagesParams.parse({
        conversationId: Number(req.params.conversationId),
      });

      const rows = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conversationId))
        .orderBy(messagesTable.createdAt);

      res.json(rows.map(messageView));
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/companion/conversations/:conversationId/messages",
  async (req, res, next) => {
    try {
      const { conversationId } = SendMessageParams.parse({
        conversationId: Number(req.params.conversationId),
      });

      const { content, mode: requestedMode } = SendMessageBody.parse(req.body);

      const [conversation] = await db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, conversationId))
        .limit(1);

      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      const userEmotion = emotionFor(content);
      const mode = (requestedMode || conversation.mode || "listen") as Mode;

      const [userMessage] = await db
        .insert(messagesTable)
        .values({
          conversationId,
          role: "user",
          content,
          emotion: userEmotion,
        })
        .returning();

      void saveEmotionTags(
        userMessage,
        userMessage.userId || conversation.userId || null,
        content,
      ).catch(() => {});

      const approvedFacts = await getApprovedMemoryFacts(
        userMessage.userId || conversation.userId || null,
      );

      const recentHistory = await db
        .select({
          role: messagesTable.role,
          content: messagesTable.content,
        })
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conversationId))
        .orderBy(messagesTable.createdAt)
        .limit(8);

      const replyContent = await generateCompanionReply(
        mode,
        content,
        approvedFacts,
        recentHistory,
      );

      const [assistantMessage] = await db
        .insert(messagesTable)
        .values({
          conversationId,
          role: "assistant",
          content: replyContent,
          emotion: userEmotion,
        })
        .returning();

      await db
        .update(conversationsTable)
        .set({ updatedAt: new Date() })
        .where(eq(conversationsTable.id, conversationId));

      if (requestedMode && requestedMode !== conversation.mode) {
        await db
          .update(conversationsTable)
          .set({
            mode: requestedMode,
            updatedAt: new Date(),
          })
          .where(eq(conversationsTable.id, conversationId));
      }

      // AI memory fact suggestion - saved as UNAPPROVED (approved = false)
      extractMemoryFacts(content, mode)
        .then(async (facts) => {
          if (facts.length > 0) {
            await db.insert(memoryItemsTable).values(
              facts.map((fact) => ({
                userId: userMessage.userId || conversation.userId || null,
                fact,
                approved: false,
              })),
            );
          }
        })
        .catch(() => {});

      // AI emotion classification - saves 1-3 emotion tags linked to the user message
      classifyEmotions(content)
        .then(async (tags) => {
          if (tags.length > 0) {
            await db.insert(emotionTagsTable).values(
              tags.map((tag) => ({
                messageId: userMessage.id,
                userId: userMessage.userId || conversation.userId || null,
                emotion: tag.emotion,
                intensity: tag.intensity,
              })),
            );
          }
        })
        .catch(() => {});

      res.json([messageView(userMessage), messageView(assistantMessage)]);
    } catch (error) {
      next(error);
    }
  },
);

router.post("/companion/emotions/detect", async (req, res, next) => {
  try {
    const { content } = DetectEmotionBody.parse(req.body);

    const primary = emotionFor(content);

    const secondary =
      primary === "uncertain"
        ? ["tenderness", "overthinking"]
        : ["self-protection", "hope"];

    res.json({
      primary,
      secondary,
      intensity: Math.min(0.94, Math.max(0.42, content.length / 150)),
      signals: ["word choice", "pace", "what is left unsaid"],
      reflection: `It sounds like ${primary} may be sharing space with something you haven't fully named yet.`,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/companion/journal", async (_req, res, next) => {
  try {
    await ensureSeed();

    const rows = await db
      .select()
      .from(journalEntriesTable)
      .orderBy(desc(journalEntriesTable.createdAt));

    res.json(rows.map(journalView));
  } catch (error) {
    next(error);
  }
});

router.post("/companion/journal", async (req, res, next) => {
  try {
    const input = CreateJournalEntryBody.parse(req.body);

    const rawDetected = emotionFor(input.content);
    const autoMood = rawDetected.charAt(0).toUpperCase() + rawDetected.slice(1);

    const finalMood = input.moodTag || input.mood || autoMood;

    const [row] = await db
      .insert(journalEntriesTable)
      .values({
        title:
          input.title ||
          (input.entryType === "guided"
            ? "Guided Reflection"
            : "Open Reflection"),
        content: input.content,
        mood: finalMood,
        moodTag: finalMood,
        entryType: input.entryType || "open",
      })
      .returning();

    res.status(201).json(journalView(row));
  } catch (error) {
    next(error);
  }
});

router.patch("/companion/journal/:entryId", async (req, res, next) => {
  try {
    const { entryId } = UpdateJournalEntryParams.parse({
      entryId: Number(req.params.entryId),
    });

    const input = UpdateJournalEntryBody.parse(req.body);
    const finalMood = input.moodTag ?? input.mood;

    const [row] = await db
      .update(journalEntriesTable)
      .set({
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.content === undefined ? {} : { content: input.content }),
        ...(finalMood === undefined
          ? {}
          : { mood: finalMood, moodTag: finalMood }),
        ...(input.entryType === undefined
          ? {}
          : { entryType: input.entryType }),
        updatedAt: new Date(),
      })
      .where(eq(journalEntriesTable.id, entryId))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Journal entry not found" });
      return;
    }

    res.json(journalView(row));
  } catch (error) {
    next(error);
  }
});

router.delete("/companion/journal/:entryId", async (req, res, next) => {
  try {
    const { entryId } = DeleteJournalEntryParams.parse({
      entryId: Number(req.params.entryId),
    });

    await db
      .delete(journalEntriesTable)
      .where(eq(journalEntriesTable.id, entryId));

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/companion/memory", async (_req, res, next) => {
  try {
    await ensureSeed();

    const rows = await db
      .select()
      .from(memoriesTable)
      .orderBy(desc(memoriesTable.createdAt));

    res.json(rows.map(memoryView));
  } catch (error) {
    next(error);
  }
});

router.patch("/companion/memory", async (req, res, next) => {
  try {
    const { enabled } = UpdateMemorySettingsBody.parse(req.body);

    const [existing] = await db.select().from(settingsTable).limit(1);

    const [row] = existing
      ? await db
          .update(settingsTable)
          .set({
            memoryEnabled: enabled,
            updatedAt: new Date(),
          })
          .where(eq(settingsTable.id, existing.id))
          .returning()
      : await db
          .insert(settingsTable)
          .values({ memoryEnabled: enabled })
          .returning();

    res.json({ enabled: row.memoryEnabled });
  } catch (error) {
    next(error);
  }
});

router.delete("/companion/memory/:memoryId", async (req, res, next) => {
  try {
    const { memoryId } = DeleteMemoryParams.parse({
      memoryId: Number(req.params.memoryId),
    });

    await db.delete(memoriesTable).where(eq(memoriesTable.id, memoryId));

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

async function buildDashboard(
  conversationCount?: number,
  journalCount?: number,
  existingMessages?: Array<typeof messagesTable.$inferSelect>,
) {
  const [conversations, journals, messages, emotionTagRows] = await Promise.all([
    conversationCount === undefined
      ? db.select().from(conversationsTable)
      : Promise.resolve([]),

    journalCount === undefined
      ? db.select().from(journalEntriesTable)
      : Promise.resolve([]),

    existingMessages
      ? Promise.resolve(existingMessages)
      : db.select().from(messagesTable),

    db.select().from(emotionTagsTable),
  ]);

  const allMessages = existingMessages ?? messages;

  const counts = new Map<string, number>();

  // Count from the single-emotion field on messages
  allMessages.forEach((message) => {
    if (message.emotion && message.role === "user") {
      counts.set(message.emotion, (counts.get(message.emotion) ?? 0) + 1);
    }
  });

  // Also count from the richer AI-classified emotion_tags table
  emotionTagRows.forEach((tag) => {
    const key = tag.emotion.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const palette = ["#c88770", "#7e9d99", "#c1a15d", "#8d83a8", "#7aab8a"];

  const topEmotions = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emotion, count], index) => ({
      emotion,
      count,
      color: palette[index],
    }));

  return {
    checkIns: allMessages.filter((message) => message.role === "user").length,

    journalEntries: journalCount ?? journals.length,

    conversations: conversationCount ?? conversations.length,

    streak: 4,

    topEmotions: topEmotions.length
      ? topEmotions
      : [
          {
            emotion: "uncertain",
            count: 1,
            color: palette[0],
          },
        ],

    weeklyIntensity: ["M", "T", "W", "T", "F", "S", "S"].map((day, index) => ({
      day,
      value: [0.42, 0.61, 0.48, 0.76, 0.57, 0.36, 0.29][index],
    })),
  };
}

router.post("/chat", async (req, res, next) => {
  try {
    const {
      content,
      conversationId: reqId,
      mode: requestedMode,
      userId: reqUserId,
    } = req.body ?? {};

    let conversationId = reqId ? Number(reqId) : null;
    let conversation;

    if (conversationId) {
      [conversation] = await db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, conversationId))
        .limit(1);
    }

    const effectiveUserId = reqUserId
      ? String(reqUserId)
      : (conversation?.userId ?? null);

    if (!conversation) {
      [conversation] = await db
        .insert(conversationsTable)
        .values({
          title: (content || "A new conversation").slice(0, 34),
          mode: requestedMode || "listen",
          userId: effectiveUserId,
        })
        .returning();

      conversationId = conversation.id;
    }

    const mode = (requestedMode || conversation.mode || "listen") as Mode;

    const userEmotion = emotionFor(content || "");

    const [userMessage] = await db
      .insert(messagesTable)
      .values({
        conversationId: conversation.id,
        role: "user",
        content: content || "",
        emotion: userEmotion,
        userId: effectiveUserId,
      })
      .returning();

    void saveEmotionTags(
      userMessage,
      effectiveUserId,
      content || "",
    ).catch(() => {});

    // Include the user's approved memory_items as context for the AI (never private_notes)
    const approvedFacts = await getApprovedMemoryFacts(effectiveUserId);

    const recentHistory = await db
      .select({
        role: messagesTable.role,
        content: messagesTable.content,
      })
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversation.id))
      .orderBy(messagesTable.createdAt)
      .limit(8);

    const replyContent = await generateCompanionReply(
      mode,
      content || "",
      approvedFacts,
      recentHistory,
    );

    const [assistantMessage] = await db
      .insert(messagesTable)
      .values({
        conversationId: conversation.id,
        role: "assistant",
        content: replyContent,
        emotion: userEmotion,
        userId: effectiveUserId,
      })
      .returning();

    await db
      .update(conversationsTable)
      .set({
        mode,
        updatedAt: new Date(),
      })
      .where(eq(conversationsTable.id, conversation.id));

    // AI memory fact suggestion - saved as UNAPPROVED (approved = false)
    extractMemoryFacts(content || "", mode)
      .then(async (facts) => {
        if (facts.length > 0) {
          await db.insert(memoryItemsTable).values(
            facts.map((fact) => ({
              userId: userMessage.userId || null,
              fact,
              approved: false,
            })),
          );
        }
      })
      .catch(() => {});

    // AI emotion classification - saves 1-3 emotion tags linked to the user message
    classifyEmotions(content || "")
      .then(async (tags) => {
        if (tags.length > 0) {
          await db.insert(emotionTagsTable).values(
            tags.map((tag) => ({
              messageId: userMessage.id,
              userId: userMessage.userId || null,
              emotion: tag.emotion,
              intensity: tag.intensity,
            })),
          );
        }
      })
      .catch(() => {});

    res.json({
      conversationId,
      userMessage: messageView(userMessage),
      assistantMessage: messageView(assistantMessage),
      messages: [messageView(userMessage), messageView(assistantMessage)],
    });
  } catch (error) {
    next(error);
  }
});

// Get emotion tags for a specific message
router.get(
  "/companion/messages/:messageId/emotion-tags",
  async (req, res, next) => {
    try {
      const messageId = Number(req.params.messageId);

      const rows = await db
        .select()
        .from(emotionTagsTable)
        .where(eq(emotionTagsTable.messageId, messageId))
        .orderBy(desc(emotionTagsTable.intensity));

      res.json(
        rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

// Get all emotion tags for every message in a conversation
router.get(
  "/companion/conversations/:conversationId/emotion-tags",
  async (req, res, next) => {
    try {
      const conversationId = Number(req.params.conversationId);

      const messages = await db
        .select({ id: messagesTable.id })
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conversationId));

      if (messages.length === 0) {
        res.json([]);
        return;
      }

      const msgIds = messages.map((m) => m.id);

      const rows = await db
        .select()
        .from(emotionTagsTable)
        .where(sql`${emotionTagsTable.messageId} = ANY(${msgIds})`)
        .orderBy(emotionTagsTable.createdAt);

      res.json(
        rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.get("/companion/memory-items", async (req, res, next) => {
  try {
    // userId is ALWAYS derived from the verified JWT — never from query params.
    const userId = await getUserFromRequest(req);

    let query = db.select().from(memoryItemsTable);

    if (userId) {
      query = query.where(eq(memoryItemsTable.userId, userId)) as any;
    } else {
      // Unauthenticated callers only see items with no userId (legacy/anon rows)
      query = query.where(isNull(memoryItemsTable.userId)) as any;
    }

    const rows = await query.orderBy(desc(memoryItemsTable.createdAt));

    res.json(
      rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/companion/memory-items", async (req, res, next) => {
  try {
    // userId is ALWAYS derived from the verified JWT — never from the request body.
    const userId = await getUserFromRequest(req);

    const { fact, approved = false } = req.body ?? {};
    if (!fact || typeof fact !== "string" || !fact.trim()) {
      res.status(400).json({ error: "Fact is required" });
      return;
    }

    const [created] = await db
      .insert(memoryItemsTable)
      .values({
        fact: fact.trim(),
        approved: Boolean(approved),
        userId,
      })
      .returning();

    res.status(201).json({
      ...created,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.patch(["/companion/memory-items/:id", "/companion/memory-items/:id/approve", "/companion/memory-items/:id/approval"], async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    // Verify ownership: userId from JWT must match the item's userId.
    const userId = await getUserFromRequest(req);

    const [existing] = await db
      .select()
      .from(memoryItemsTable)
      .where(eq(memoryItemsTable.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Memory item not found" });
      return;
    }

    // Ownership check: authenticated user must own this item
    if (existing.userId !== null && existing.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { approved, fact } = req.body ?? {};

    const updates: Record<string, any> = {};
    if (typeof approved === "boolean") {
      updates.approved = approved;
    } else if (req.body?.approved !== undefined) {
      updates.approved = Boolean(req.body.approved);
    }
    if (typeof fact === "string" && fact.trim()) {
      updates.fact = fact.trim();
    }
    if (Object.keys(updates).length === 0) {
      updates.approved = true;
    }

    const [updated] = await db
      .update(memoryItemsTable)
      .set(updates)
      .where(and(eq(memoryItemsTable.id, id), userId ? eq(memoryItemsTable.userId, userId) : isNull(memoryItemsTable.userId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Memory item not found" });
      return;
    }

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/companion/memory-items/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);

    // Verify ownership: only delete the row if it belongs to the authenticated user.
    const userId = await getUserFromRequest(req);

    const [existing] = await db
      .select()
      .from(memoryItemsTable)
      .where(eq(memoryItemsTable.id, id))
      .limit(1);

    if (!existing) {
      // Already gone — treat as success
      res.status(204).end();
      return;
    }

    if (existing.userId !== null && existing.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db
      .delete(memoryItemsTable)
      .where(
        and(
          eq(memoryItemsTable.id, id),
          userId
            ? eq(memoryItemsTable.userId, userId)
            : isNull(memoryItemsTable.userId),
        ),
      );

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/companion/private-notes", async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(privateNotesTable)
      .where(
        or(
          isNull(privateNotesTable.expiresAt),
          gt(privateNotesTable.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(privateNotesTable.createdAt));

    res.json(rows.map(privateNoteView));
  } catch (error) {
    next(error);
  }
});

router.post("/companion/private-notes", async (req, res, next) => {
  try {
    const { content, isLetter, expiresAt } = req.body ?? {};

    const [row] = await db
      .insert(privateNotesTable)
      .values({
        content: content || "",
        isLetter: Boolean(isLetter),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();

    res.status(201).json(privateNoteView(row));
  } catch (error) {
    next(error);
  }
});

router.delete("/companion/private-notes/:noteId", async (req, res, next) => {
  try {
    const noteId = Number(req.params.noteId);

    await db.delete(privateNotesTable).where(eq(privateNotesTable.id, noteId));

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/companion/dashboard", async (_req, res, next) => {
  try {
    await ensureSeed();
    res.json(await buildDashboard());
  } catch (error) {
    next(error);
  }
});

export default router;

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
import { db } from "@workspace/db";
import {
  conversationsTable,
  journalEntriesTable,
  memoriesTable,
  messagesTable,
  privateNotesTable,
  settingsTable,
} from "@workspace/db/schema";

const router: IRouter = Router();

type Mode = "listen" | "understand" | "reframe" | "help" | "private";

function conversationView(row: typeof conversationsTable.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
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
  if (/(anxious|worry|worried|nervous|overwhelm|panic)/.test(lower)) return "anxious";
  if (/(happy|glad|excited|relief|grateful|good)/.test(lower)) return "hopeful";
  return "uncertain";
}

export const SYSTEM_PROMPTS: Record<Mode, string> = {
  listen: "You are a warm, empathetic listener. Reflect and validate feelings gently. NEVER give advice or action steps. Do not attempt to fix or solve the situation.",
  understand: "You are a reflective companion helping the user name and explore complex internal experiences. Ask ONE gentle clarifying question at a time to help name mixed emotions. Do not rush to give advice.",
  reframe: "You are a gentle cognitive reframing companion. Help the user see a regret or mistake from a different angle — what they learned, what was actually in their control, how they'd advise a friend in the same situation, and one thing they did right. NEVER suggest 'just forget about it' — the goal is processing, not suppression.",
  help: "You are a supportive, practical guide for taking manageable next steps. Give 2 to 3 concrete, realistic, small next-step suggestions.",
  private: "Reflect gently without storing long-term memory.",
};

function replyFor(mode: Mode, text: string) {
  const emotion = emotionFor(text);
  if (mode === "listen") {
    return `I hear how much weight is sitting underneath this ${emotion} feeling. It makes total sense that you feel this way, and you don't have to fix or make it neat right now.`;
  }
  if (mode === "understand") {
    return `It sounds like ${emotion} might be sharing space with something else you haven't fully named yet. If you look closely at what's happening, what single part feels hardest to speak out loud right now?`;
  }
  if (mode === "reframe") {
    return `Carrying regret around this can feel heavy. Looking at this with compassion: what was actually within your control, how would you advise a dear friend in your exact shoes, and what is one thing you handled right?`;
  }
  if (mode === "help") {
    return `Here are 2 concrete, realistic small next steps we can take together:\n1. Take a 5-minute pause without forcing yourself to solve the whole picture.\n2. Identify the single smallest action within your reach today. Would you like to talk through that step first?`;
  }
  return `This can stay unshared here. You can leave it unfinished if that is the most honest place to leave it.`;
}

async function ensureSeed() {
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
      content: "You don’t need to have the right words. What’s been sitting with you lately?",
      emotion: "open",
    },
  ]);
  await db.insert(journalEntriesTable).values({
    title: "A little lighter",
    content: "I gave myself permission to say the quiet part out loud today.",
    mood: "Relieved",
  });
  await db.insert(memoriesTable).values([
    { label: "How you like support", detail: "You prefer a little space before suggestions.", enabled: true },
    { label: "Something you’re carrying", detail: "You’ve been thinking about a difficult conversation.", enabled: true },
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
    const [conversations, messages, memories, journalEntries] = await Promise.all([
      db.select().from(conversationsTable).orderBy(desc(conversationsTable.updatedAt)),
      db.select().from(messagesTable).orderBy(messagesTable.createdAt),
      db.select().from(memoriesTable).orderBy(desc(memoriesTable.createdAt)),
      db.select().from(journalEntriesTable).orderBy(desc(journalEntriesTable.createdAt)),
    ]);
    const dashboard = await buildDashboard(conversations.length, journalEntries.length, messages);
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
    const rows = await db.select().from(conversationsTable).orderBy(desc(conversationsTable.updatedAt));
    res.json(rows.map(conversationView));
  } catch (error) {
    next(error);
  }
});

router.post("/companion/conversations", async (req, res, next) => {
  try {
    const input = CreateConversationBody.parse(req.body ?? {});
    const [row] = await db.insert(conversationsTable).values({
      title: input.title || "A new conversation",
      mode: input.mode || "listen",
    }).returning();
    res.status(201).json(conversationView(row));
  } catch (error) {
    next(error);
  }
});

router.get("/companion/conversations/:conversationId/messages", async (req, res, next) => {
  try {
    const { conversationId } = ListMessagesParams.parse({ conversationId: Number(req.params.conversationId) });
    const rows = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, conversationId))
      .orderBy(messagesTable.createdAt);
    res.json(rows.map(messageView));
  } catch (error) {
    next(error);
  }
});

router.post("/companion/conversations/:conversationId/messages", async (req, res, next) => {
  try {
    const { conversationId } = SendMessageParams.parse({ conversationId: Number(req.params.conversationId) });
    const { content, mode: requestedMode } = SendMessageBody.parse(req.body);
    const [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId)).limit(1);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const userEmotion = emotionFor(content);
    const mode = (requestedMode || conversation.mode || "listen") as Mode;
    const [userMessage] = await db.insert(messagesTable).values({
      conversationId,
      role: "user",
      content,
      emotion: userEmotion,
    }).returning();
    const [assistantMessage] = await db.insert(messagesTable).values({
      conversationId,
      role: "assistant",
      content: replyFor(mode, content),
      emotion: userEmotion,
    }).returning();
    await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));
    if (requestedMode && requestedMode !== conversation.mode) {
      await db.update(conversationsTable).set({ mode: requestedMode, updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));
    }
    res.json([messageView(userMessage), messageView(assistantMessage)]);
  } catch (error) {
    next(error);
  }
});

router.post("/companion/emotions/detect", async (req, res, next) => {
  try {
    const { content } = DetectEmotionBody.parse(req.body);
    const primary = emotionFor(content);
    const secondary = primary === "uncertain" ? ["tenderness", "overthinking"] : ["self-protection", "hope"];
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
    const rows = await db.select().from(journalEntriesTable).orderBy(desc(journalEntriesTable.createdAt));
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
    const [row] = await db.insert(journalEntriesTable).values({
      title: input.title || (input.entryType === "guided" ? "Guided Reflection" : "Open Reflection"),
      content: input.content,
      mood: finalMood,
      moodTag: finalMood,
      entryType: input.entryType || "open",
    }).returning();
    res.status(201).json(journalView(row));
  } catch (error) {
    next(error);
  }
});

router.patch("/companion/journal/:entryId", async (req, res, next) => {
  try {
    const { entryId } = UpdateJournalEntryParams.parse({ entryId: Number(req.params.entryId) });
    const input = UpdateJournalEntryBody.parse(req.body);
    const finalMood = input.moodTag ?? input.mood;
    const [row] = await db.update(journalEntriesTable).set({
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.content === undefined ? {} : { content: input.content }),
      ...(finalMood === undefined ? {} : { mood: finalMood, moodTag: finalMood }),
      ...(input.entryType === undefined ? {} : { entryType: input.entryType }),
      updatedAt: new Date(),
    }).where(eq(journalEntriesTable.id, entryId)).returning();
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
    const { entryId } = DeleteJournalEntryParams.parse({ entryId: Number(req.params.entryId) });
    await db.delete(journalEntriesTable).where(eq(journalEntriesTable.id, entryId));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/companion/memory", async (_req, res, next) => {
  try {
    await ensureSeed();
    const rows = await db.select().from(memoriesTable).orderBy(desc(memoriesTable.createdAt));
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
      ? await db.update(settingsTable).set({ memoryEnabled: enabled, updatedAt: new Date() }).where(eq(settingsTable.id, existing.id)).returning()
      : await db.insert(settingsTable).values({ memoryEnabled: enabled }).returning();
    res.json({ enabled: row.memoryEnabled });
  } catch (error) {
    next(error);
  }
});

router.delete("/companion/memory/:memoryId", async (req, res, next) => {
  try {
    const { memoryId } = DeleteMemoryParams.parse({ memoryId: Number(req.params.memoryId) });
    await db.delete(memoriesTable).where(eq(memoriesTable.id, memoryId));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

async function buildDashboard(conversationCount?: number, journalCount?: number, existingMessages?: Array<typeof messagesTable.$inferSelect>) {
  const [conversations, journals, messages] = await Promise.all([
    conversationCount === undefined ? db.select().from(conversationsTable) : Promise.resolve([]),
    journalCount === undefined ? db.select().from(journalEntriesTable) : Promise.resolve([]),
    existingMessages ? Promise.resolve(existingMessages) : db.select().from(messagesTable),
  ]);
  const allMessages = existingMessages ?? messages;
  const counts = new Map<string, number>();
  allMessages.forEach((message) => {
    if (message.emotion && message.role === "user") counts.set(message.emotion, (counts.get(message.emotion) ?? 0) + 1);
  });
  const topEmotions = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([emotion, count], index) => ({ emotion, count, color: ["#c88770", "#7e9d99", "#c1a15d", "#8d83a8"][index] }));
  return {
    checkIns: allMessages.filter((message) => message.role === "user").length,
    journalEntries: journalCount ?? journals.length,
    conversations: conversationCount ?? conversations.length,
    streak: 4,
    topEmotions: topEmotions.length ? topEmotions : [{ emotion: "uncertain", count: 1, color: "#c88770" }],
    weeklyIntensity: ["M", "T", "W", "T", "F", "S", "S"].map((day, index) => ({ day, value: [0.42, 0.61, 0.48, 0.76, 0.57, 0.36, 0.29][index] })),
  };
}

router.post("/chat", async (req, res, next) => {
  try {
    const { content, conversationId: reqId, mode: requestedMode } = req.body ?? {};
    let conversationId = reqId ? Number(reqId) : null;
    let conversation;
    if (conversationId) {
      [conversation] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId)).limit(1);
    }
    if (!conversation) {
      [conversation] = await db.insert(conversationsTable).values({
        title: (content || "A new conversation").slice(0, 34),
        mode: requestedMode || "listen",
      }).returning();
      conversationId = conversation.id;
    }
    const mode = (requestedMode || conversation.mode || "listen") as Mode;
    const userEmotion = emotionFor(content || "");
    const [userMessage] = await db.insert(messagesTable).values({
      conversationId,
      role: "user",
      content: content || "",
      emotion: userEmotion,
    }).returning();

    const replyContent = replyFor(mode, content || "");
    const [assistantMessage] = await db.insert(messagesTable).values({
      conversationId,
      role: "assistant",
      content: replyContent,
      emotion: userEmotion,
    }).returning();

    await db.update(conversationsTable).set({ mode, updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));

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

router.get("/companion/private-notes", async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(privateNotesTable)
      .where(or(isNull(privateNotesTable.expiresAt), gt(privateNotesTable.expiresAt, new Date())))
      .orderBy(desc(privateNotesTable.createdAt));
    res.json(rows.map(privateNoteView));
  } catch (error) {
    next(error);
  }
});

router.post("/companion/private-notes", async (req, res, next) => {
  try {
    const { content, isLetter, expiresAt } = req.body ?? {};
    const [row] = await db.insert(privateNotesTable).values({
      content: content || "",
      isLetter: Boolean(isLetter),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }).returning();
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
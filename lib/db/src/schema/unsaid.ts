import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const conversationsTable = pgTable("unsaid_conversations", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  title: text("title").notNull(),
  mode: text("mode").notNull().default("listen"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messagesTable = pgTable("unsaid_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversationsTable.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  emotion: text("emotion"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const journalEntriesTable = pgTable("unsaid_journal_entries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("Untitled reflection"),
  content: text("content").notNull(),
  mood: text("mood").notNull().default("Unmarked"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const memoriesTable = pgTable("unsaid_memories", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  detail: text("detail").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const settingsTable = pgTable("unsaid_settings", {
  id: serial("id").primaryKey(),
  memoryEnabled: boolean("memory_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true,
  createdAt: true,
});
export const insertJournalEntrySchema = createInsertSchema(journalEntriesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMemorySchema = createInsertSchema(memoriesTable).omit({
  id: true,
  createdAt: true,
});
export const insertSettingsSchema = createInsertSchema(settingsTable).omit({
  id: true,
  updatedAt: true,
});

export type Conversation = typeof conversationsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
export type JournalEntry = typeof journalEntriesTable.$inferSelect;
export type Memory = typeof memoriesTable.$inferSelect;
export type Settings = typeof settingsTable.$inferSelect;
export type ConversationInput = z.infer<typeof insertConversationSchema>;
export type MessageInput = z.infer<typeof insertMessageSchema>;
export type JournalEntryInput = z.infer<typeof insertJournalEntrySchema>;
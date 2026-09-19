-- Migration: Create memory_items table with Row Level Security (RLS)

CREATE TABLE IF NOT EXISTS memory_items (
  id SERIAL PRIMARY KEY,
  user_id TEXT,
  fact TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE memory_items ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Select
CREATE POLICY "Users can view their own memory items"
  ON memory_items FOR SELECT
  USING (auth.uid()::text = user_id OR user_id IS NULL);

-- RLS Policy: Insert
CREATE POLICY "Users can insert their own memory items"
  ON memory_items FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id IS NULL);

-- RLS Policy: Update (approve/reject)
CREATE POLICY "Users can update their own memory items"
  ON memory_items FOR UPDATE
  USING (auth.uid()::text = user_id OR user_id IS NULL);

-- RLS Policy: Delete
CREATE POLICY "Users can delete their own memory items"
  ON memory_items FOR DELETE
  USING (auth.uid()::text = user_id OR user_id IS NULL);

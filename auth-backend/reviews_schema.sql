-- SQL for creating the reviews table in Supabase
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Basic RLS (Row Level Security)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read reviews
CREATE POLICY "Reviews are viewable by everyone" ON reviews
  FOR SELECT USING (true);

-- Allow authenticated users to insert reviews
CREATE POLICY "Users can insert their own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own reviews
CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

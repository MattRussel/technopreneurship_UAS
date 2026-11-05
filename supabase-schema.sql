-- ============================================================
-- SmartPark Mall - Supabase Database Schema (Fixed)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Drop old trigger if it exists (this causes the registration error)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  vehicle_plates TEXT[] DEFAULT '{}',
  preferred_floor TEXT,
  role TEXT DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  slot_id TEXT NOT NULL,
  floor TEXT NOT NULL,
  slot_number TEXT NOT NULL,
  vehicle_plate TEXT NOT NULL,
  reservation_code TEXT UNIQUE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_hours NUMERIC NOT NULL,
  cost NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (in case re-running)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can insert own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can update own reservations" ON reservations;
DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON feedback;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Reservations
-- Allow anyone to read reservations so reserved slots are visible to all users
DROP POLICY IF EXISTS "Anyone can view reservations" ON reservations;
CREATE POLICY "Anyone can view reservations"
  ON reservations FOR SELECT USING (true);
CREATE POLICY "Users can insert own reservations"
  ON reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reservations"
  ON reservations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reservations"
  ON reservations FOR DELETE USING (auth.uid() = user_id);

-- Allow updating expired reservations to 'completed' even if owner is logged out
DROP POLICY IF EXISTS "Allow updating expired reservations" ON reservations;
CREATE POLICY "Allow updating expired reservations"
  ON reservations FOR UPDATE
  USING (end_time <= NOW())
  WITH CHECK (status = 'completed');

-- Function to complete all expired reservations across all users automatically
CREATE OR REPLACE FUNCTION complete_expired_reservations()
RETURNS void AS $$
BEGIN
  UPDATE reservations
  SET status = 'completed', updated_at = NOW()
  WHERE status IN ('active', 'upcoming') AND end_time <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Feedback
CREATE POLICY "Users can view own feedback"
  ON feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feedback"
  ON feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Advertisements Table (Mall Sponsor & Tenant Promotions)
-- ============================================================
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  promo_code TEXT,
  discount TEXT,
  badge TEXT DEFAULT 'Featured',
  location TEXT,
  valid_until TEXT,
  icon TEXT DEFAULT '🎁',
  bg_gradient TEXT DEFAULT 'linear-gradient(135deg, #1B2A4A, #2C3E6B)',
  text_color TEXT DEFAULT '#FFFFFF',
  status TEXT DEFAULT 'active',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active advertisements" ON advertisements;
CREATE POLICY "Anyone can view active advertisements"
  ON advertisements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update impressions or clicks" ON advertisements;
CREATE POLICY "Anyone can update impressions or clicks"
  ON advertisements FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can insert advertisements" ON advertisements;
CREATE POLICY "Admins can insert advertisements"
  ON advertisements FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can delete advertisements" ON advertisements;
CREATE POLICY "Admins can delete advertisements"
  ON advertisements FOR DELETE USING (true);

-- Functions to increment impressions and clicks
CREATE OR REPLACE FUNCTION increment_ad_impressions(target_ad_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE advertisements
  SET impressions = COALESCE(impressions, 0) + 1
  WHERE id::TEXT = target_ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_ad_clicks(target_ad_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE advertisements
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE id::TEXT = target_ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

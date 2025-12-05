-- Social Features Migration for RealWorth.ai
-- This migration adds the friendships table and updates RLS policies
-- to support social features (friends, friend requests, user discovery)
--
-- Run this in Supabase SQL Editor

-- ============================================
-- PART 1: Ensure user columns exist
-- ============================================

-- Add username column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'username'
  ) THEN
    ALTER TABLE public.users
    ADD COLUMN username TEXT UNIQUE;
  END IF;
END $$;

-- Add streak columns to users table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'current_streak'
  ) THEN
    ALTER TABLE public.users
    ADD COLUMN current_streak INTEGER DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'longest_streak'
  ) THEN
    ALTER TABLE public.users
    ADD COLUMN longest_streak INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create index on username
CREATE INDEX IF NOT EXISTS idx_users_username
ON public.users(username)
WHERE username IS NOT NULL;

-- ============================================
-- PART 2: Create friendships table
-- ============================================

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Prevent duplicate friendships and self-friending
  CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id),
  CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_friendships_updated_at ON public.friendships;
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 3: RLS Policies for friendships
-- ============================================

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can view friendships where they are involved
DROP POLICY IF EXISTS "Users can view own friendships" ON public.friendships;
CREATE POLICY "Users can view own friendships"
  ON public.friendships
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can send friend requests (insert as requester)
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
CREATE POLICY "Users can send friend requests"
  ON public.friendships
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Users can respond to friend requests (update as addressee)
DROP POLICY IF EXISTS "Users can respond to friend requests" ON public.friendships;
CREATE POLICY "Users can respond to friend requests"
  ON public.friendships
  FOR UPDATE
  USING (auth.uid() = addressee_id);

-- Users can remove friendships they're part of
DROP POLICY IF EXISTS "Users can remove friendships" ON public.friendships;
CREATE POLICY "Users can remove friendships"
  ON public.friendships
  FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ============================================
-- PART 4: Update users RLS for social features
-- ============================================

-- Allow authenticated users to see basic profile info of other users
-- This is needed for friends list, friend requests, and user search
DROP POLICY IF EXISTS "Authenticated users can view basic user info" ON public.users;
CREATE POLICY "Authenticated users can view basic user info"
  ON public.users
  FOR SELECT
  USING (
    -- Users can always see their own full profile
    auth.uid() = id
    OR
    -- Authenticated users can see basic info of others
    auth.role() = 'authenticated'
  );

-- Note: The original "Users can view own data" policy may conflict
-- Drop it if it exists and rely on the new comprehensive policy
DROP POLICY IF EXISTS "Users can view own data" ON public.users;

-- ============================================
-- PART 5: Grant permissions
-- ============================================

GRANT ALL ON public.friendships TO authenticated;

-- ============================================
-- PART 6: Add comments for documentation
-- ============================================

COMMENT ON TABLE public.friendships IS 'Stores friend relationships between users';
COMMENT ON COLUMN public.friendships.requester_id IS 'User who sent the friend request';
COMMENT ON COLUMN public.friendships.addressee_id IS 'User who received the friend request';
COMMENT ON COLUMN public.friendships.status IS 'Request status: pending, accepted, or declined';
COMMENT ON COLUMN public.users.username IS 'Unique username for user identification and friend discovery';
COMMENT ON COLUMN public.users.current_streak IS 'Current consecutive days with appraisals';
COMMENT ON COLUMN public.users.longest_streak IS 'Longest consecutive days streak achieved';

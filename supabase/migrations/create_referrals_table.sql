/*
  # Create referrals table
  1. New Tables: referrals (id uuid, venue_id uuid, referrer_name text, referrer_email text, referral_code text unique, referred_by uuid nullable, accepted boolean, created_at timestamp)
  2. Security: Enable RLS, public can read/insert referrals, admins can read all referrals for their venues
*/
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  referrer_name text NOT NULL DEFAULT '',
  referrer_email text DEFAULT '',
  referral_code text UNIQUE NOT NULL,
  referred_by uuid REFERENCES referrals(id),
  accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read referrals" ON referrals
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert referrals" ON referrals
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update referrals" ON referrals
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_referrals_venue_id ON referrals(venue_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_by ON referrals(referred_by);

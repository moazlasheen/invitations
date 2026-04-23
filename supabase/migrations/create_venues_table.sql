/*
  # Create venues table
  1. New Tables: venues (id uuid, admin_id uuid, name text, description text, image_url text, created_at timestamp)
  2. Security: Enable RLS, admin can CRUD their own venues, anyone can read venues
*/
CREATE TABLE IF NOT EXISTS venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  description text DEFAULT '',
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their own venues" ON venues
  FOR ALL TO authenticated
  USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Anyone can read venues" ON venues
  FOR SELECT TO anon, authenticated
  USING (true);
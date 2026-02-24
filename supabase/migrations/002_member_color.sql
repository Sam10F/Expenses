-- Add color column to members table
-- Each member can have a user-assigned accent color for their avatar.
ALTER TABLE members ADD COLUMN color TEXT NOT NULL DEFAULT 'indigo';

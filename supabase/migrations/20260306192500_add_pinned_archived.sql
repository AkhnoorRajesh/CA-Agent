-- Add is_pinned and is_archived to conversations
ALTER TABLE public.conversations 
ADD COLUMN is_pinned BOOLEAN DEFAULT false,
ADD COLUMN is_archived BOOLEAN DEFAULT false;

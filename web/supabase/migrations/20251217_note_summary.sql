-- Add summary column to notes table
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS summary_type text CHECK (summary_type = ANY (ARRAY['concise'::text, 'bullet'::text, 'detailed'::text]));
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS summary_generated_at timestamp with time zone;

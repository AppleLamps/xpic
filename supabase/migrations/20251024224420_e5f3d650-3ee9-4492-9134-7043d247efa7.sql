-- Create usage tracking table for rate limiting
CREATE TABLE public.usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier text NOT NULL UNIQUE,
  premium_images_count integer DEFAULT 0,
  last_reset_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" 
  ON public.usage_tracking 
  FOR SELECT 
  TO public 
  USING (true);

-- Allow service role full access for edge functions
CREATE POLICY "Allow service role full access" 
  ON public.usage_tracking 
  FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX idx_usage_tracking_identifier ON public.usage_tracking(user_identifier);
CREATE INDEX idx_usage_tracking_reset ON public.usage_tracking(last_reset_at);
-- Create table to cache X account search results
CREATE TABLE IF NOT EXISTS public.x_account_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  x_handle text UNIQUE NOT NULL,
  search_response jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_handle_expiry ON public.x_account_cache(x_handle, expires_at);

-- Enable RLS
ALTER TABLE public.x_account_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access (since X posts are public data)
CREATE POLICY "Allow public read access" ON public.x_account_cache
  FOR SELECT
  USING (true);

-- Allow service role to insert/update cache entries
CREATE POLICY "Allow service role full access" ON public.x_account_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);
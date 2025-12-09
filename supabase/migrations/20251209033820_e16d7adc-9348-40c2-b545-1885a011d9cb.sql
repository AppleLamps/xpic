-- Fix usage_tracking RLS policy - restrict to service role only
DROP POLICY IF EXISTS "Allow public read access" ON public.usage_tracking;
CREATE POLICY "Deny public read access" ON public.usage_tracking
  FOR SELECT USING (false);

-- Fix x_account_cache RLS policy - restrict to service role only  
DROP POLICY IF EXISTS "Allow public read access" ON public.x_account_cache;
CREATE POLICY "Deny public read access" ON public.x_account_cache
  FOR SELECT USING (false);
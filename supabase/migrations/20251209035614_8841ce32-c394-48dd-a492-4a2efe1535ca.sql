-- Add explicit deny policies for write operations on x_account_cache
CREATE POLICY "Deny public insert" ON public.x_account_cache
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Deny public update" ON public.x_account_cache
  FOR UPDATE USING (false);

CREATE POLICY "Deny public delete" ON public.x_account_cache
  FOR DELETE USING (false);

-- Add explicit deny policies for write operations on usage_tracking
CREATE POLICY "Deny public insert" ON public.usage_tracking
  FOR INSERT WITH CHECK (false);

CREATE POLICY "Deny public update" ON public.usage_tracking
  FOR UPDATE USING (false);

CREATE POLICY "Deny public delete" ON public.usage_tracking
  FOR DELETE USING (false);
-- Allow automated scraper (anon and authenticated) to update and prune deals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'deals' AND policyname = 'Allow public update for deals'
  ) THEN
    CREATE POLICY "Allow public update for deals" ON public.deals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'deals' AND policyname = 'Allow public delete for dead deals'
  ) THEN
    CREATE POLICY "Allow public delete for dead deals" ON public.deals FOR DELETE TO anon, authenticated USING (true);
  END IF;
END $$;

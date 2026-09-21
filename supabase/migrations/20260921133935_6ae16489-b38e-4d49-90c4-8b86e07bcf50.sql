DROP POLICY IF EXISTS fitme_results_read_own ON storage.objects;
CREATE POLICY fitme_results_read_own ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'fitme-results'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );
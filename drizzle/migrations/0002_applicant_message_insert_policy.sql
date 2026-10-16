CREATE POLICY "Applicants can send messages on their own application"
  ON public.agent_application_messages FOR INSERT TO authenticated
  WITH CHECK (sender_type = 'applicant' AND EXISTS (
    SELECT 1 FROM public.agent_applications a
    WHERE a.id = application_id AND a.user_id = auth.uid()
  ));
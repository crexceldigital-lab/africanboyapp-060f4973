ALTER TABLE public.agent_applications ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.agent_application_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.agent_applications(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'admin',
  sender_name text,
  message text NOT NULL,
  is_internal_note boolean NOT NULL DEFAULT false,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivery_status text NOT NULL DEFAULT 'delivered',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.agent_application_messages TO authenticated;
GRANT ALL ON public.agent_application_messages TO service_role;

ALTER TABLE public.agent_application_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all application messages"
  ON public.agent_application_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Applicants can read their own non-internal messages"
  ON public.agent_application_messages FOR SELECT TO authenticated
  USING (NOT is_internal_note AND EXISTS (
    SELECT 1 FROM public.agent_applications a
    WHERE a.id = application_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "Admins can send messages"
  ON public.agent_application_messages FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update messages"
  ON public.agent_application_messages FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
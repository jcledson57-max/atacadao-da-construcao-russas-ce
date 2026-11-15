CREATE TABLE public.quote_reads (
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (quote_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.quote_reads TO authenticated;
GRANT ALL ON public.quote_reads TO service_role;
ALTER TABLE public.quote_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read own quote reads" ON public.quote_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins mark own quote reads" ON public.quote_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins unmark own quote reads" ON public.quote_reads FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
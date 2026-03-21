-- Floor plans table
CREATE TABLE public.floor_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Mein Grundriss',
  building_config JSONB NOT NULL,
  rooms JSONB NOT NULL DEFAULT '[]'::jsonb,
  furniture JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view floor plans" ON public.floor_plans FOR SELECT USING (true);
CREATE POLICY "Anyone can create floor plans" ON public.floor_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update floor plans" ON public.floor_plans FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete floor plans" ON public.floor_plans FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_floor_plans_updated_at
  BEFORE UPDATE ON public.floor_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
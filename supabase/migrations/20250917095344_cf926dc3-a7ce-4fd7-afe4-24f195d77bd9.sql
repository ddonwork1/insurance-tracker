-- Add role-based access control
CREATE TYPE public.user_role AS ENUM ('admin', 'super_admin');

-- Add role column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN role public.user_role NOT NULL DEFAULT 'admin';

-- Create global logs table
CREATE TABLE public.global_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  entity_type TEXT, -- 'policy', 'user', 'system'
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on global logs
ALTER TABLE public.global_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for global logs
CREATE POLICY "Admins can view all logs" 
ON public.global_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can insert logs" 
ON public.global_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy documents update policy (was missing)
CREATE POLICY "Users can update documents for their policies" 
ON public.policy_documents 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM insurance_policies 
  WHERE insurance_policies.id = policy_documents.policy_id 
  AND insurance_policies.user_id = auth.uid()
));

-- Function to log actions automatically
CREATE OR REPLACE FUNCTION public.log_policy_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.global_logs (user_id, action, description, entity_type, entity_id)
    VALUES (
      NEW.user_id,
      'CREATE_POLICY',
      'Created new ' || NEW.policy_type || ' insurance policy: ' || NEW.policy_number,
      'policy',
      NEW.id
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.global_logs (user_id, action, description, entity_type, entity_id)
    VALUES (
      NEW.user_id,
      'UPDATE_POLICY',
      'Updated ' || NEW.policy_type || ' insurance policy: ' || NEW.policy_number,
      'policy',
      NEW.id
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.global_logs (user_id, action, description, entity_type, entity_id)
    VALUES (
      OLD.user_id,
      'DELETE_POLICY',
      'Deleted ' || OLD.policy_type || ' insurance policy: ' || OLD.policy_number,
      'policy',
      OLD.id
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for automatic logging
CREATE TRIGGER log_policy_changes
AFTER INSERT OR UPDATE OR DELETE ON public.insurance_policies
FOR EACH ROW EXECUTE FUNCTION public.log_policy_action();

-- Add indexes for better performance
CREATE INDEX idx_global_logs_user_id ON public.global_logs(user_id);
CREATE INDEX idx_global_logs_created_at ON public.global_logs(created_at DESC);
CREATE INDEX idx_global_logs_entity ON public.global_logs(entity_type, entity_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
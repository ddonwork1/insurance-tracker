-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create insurance_policies table
CREATE TABLE public.insurance_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('motor', 'health')),
  policy_number TEXT NOT NULL,
  insurer_name TEXT NOT NULL,
  insured_name TEXT NOT NULL,
  vehicle_details TEXT, -- for motor insurance
  premium_amount DECIMAL(10,2) NOT NULL,
  coverage_amount DECIMAL(12,2),
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  agent_name TEXT,
  agent_phone TEXT,
  agent_email TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create policy_documents table
CREATE TABLE public.policy_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.insurance_policies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reminders table
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.insurance_policies(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  days_before INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS policies for insurance_policies
CREATE POLICY "Users can view their own policies"
  ON public.insurance_policies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own policies"
  ON public.insurance_policies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own policies"
  ON public.insurance_policies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own policies"
  ON public.insurance_policies FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for policy_documents
CREATE POLICY "Users can view documents for their policies"
  ON public.policy_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.insurance_policies 
    WHERE insurance_policies.id = policy_documents.policy_id 
    AND insurance_policies.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert documents for their policies"
  ON public.policy_documents FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.insurance_policies 
    WHERE insurance_policies.id = policy_documents.policy_id 
    AND insurance_policies.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete documents for their policies"
  ON public.policy_documents FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.insurance_policies 
    WHERE insurance_policies.id = policy_documents.policy_id 
    AND insurance_policies.user_id = auth.uid()
  ));

-- Create RLS policies for reminders
CREATE POLICY "Users can view reminders for their policies"
  ON public.reminders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.insurance_policies 
    WHERE insurance_policies.id = reminders.policy_id 
    AND insurance_policies.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert reminders for their policies"
  ON public.reminders FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.insurance_policies 
    WHERE insurance_policies.id = reminders.policy_id 
    AND insurance_policies.user_id = auth.uid()
  ));

CREATE POLICY "Users can update reminders for their policies"
  ON public.reminders FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.insurance_policies 
    WHERE insurance_policies.id = reminders.policy_id 
    AND insurance_policies.user_id = auth.uid()
  ));

-- Create storage bucket for policy documents
INSERT INTO storage.buckets (id, name, public) VALUES ('policy-documents', 'policy-documents', false);

-- Create storage policies for policy documents
CREATE POLICY "Users can view their own policy documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'policy-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own policy documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'policy-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own policy documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'policy-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own policy documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'policy-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_insurance_policies_updated_at
  BEFORE UPDATE ON public.insurance_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create reminders when policy is added
CREATE OR REPLACE FUNCTION public.create_policy_reminders()
RETURNS TRIGGER AS $$
BEGIN
  -- Create 30-day reminder
  INSERT INTO public.reminders (policy_id, reminder_date, days_before)
  VALUES (NEW.id, NEW.expiry_date - INTERVAL '30 days', 30);
  
  -- Create 7-day reminder
  INSERT INTO public.reminders (policy_id, reminder_date, days_before)
  VALUES (NEW.id, NEW.expiry_date - INTERVAL '7 days', 7);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create reminders
CREATE TRIGGER create_reminders_on_policy_insert
  AFTER INSERT ON public.insurance_policies
  FOR EACH ROW EXECUTE FUNCTION public.create_policy_reminders();

-- Create function to update policy status based on expiry date
CREATE OR REPLACE FUNCTION public.update_policy_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status to expired if expiry date has passed
  IF NEW.expiry_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status = 'expired';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update policy status
CREATE TRIGGER update_policy_status_trigger
  BEFORE UPDATE ON public.insurance_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_policy_status();

-- Create indexes for better performance
CREATE INDEX idx_insurance_policies_user_id ON public.insurance_policies(user_id);
CREATE INDEX idx_insurance_policies_expiry_date ON public.insurance_policies(expiry_date);
CREATE INDEX idx_insurance_policies_status ON public.insurance_policies(status);
CREATE INDEX idx_policy_documents_policy_id ON public.policy_documents(policy_id);
CREATE INDEX idx_reminders_policy_id ON public.reminders(policy_id);
CREATE INDEX idx_reminders_reminder_date ON public.reminders(reminder_date);
CREATE INDEX idx_reminders_status ON public.reminders(status);
-- Set ddonwork1@gmail.com as super_admin
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'ddonwork1@gmail.com';

-- Create claims table
CREATE TABLE public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.insurance_policies(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL UNIQUE,
  claim_date DATE NOT NULL,
  claim_amount NUMERIC NOT NULL,
  claim_status TEXT NOT NULL DEFAULT 'pending' CHECK (claim_status IN ('pending', 'approved', 'rejected', 'paid')),
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Enable RLS on claims
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for claims
CREATE POLICY "Users can view their own claims" 
ON public.claims 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own claims" 
ON public.claims 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own claims" 
ON public.claims 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own claims" 
ON public.claims 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates on claims
CREATE TRIGGER update_claims_updated_at
BEFORE UPDATE ON public.claims
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create claim documents table
CREATE TABLE public.claim_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on claim documents
ALTER TABLE public.claim_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for claim documents
CREATE POLICY "Users can view documents for their claims" 
ON public.claim_documents 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.claims 
  WHERE claims.id = claim_documents.claim_id 
  AND claims.user_id = auth.uid()
));

CREATE POLICY "Users can insert documents for their claims" 
ON public.claim_documents 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.claims 
  WHERE claims.id = claim_documents.claim_id 
  AND claims.user_id = auth.uid()
));

CREATE POLICY "Users can update documents for their claims" 
ON public.claim_documents 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.claims 
  WHERE claims.id = claim_documents.claim_id 
  AND claims.user_id = auth.uid()
));

CREATE POLICY "Users can delete documents for their claims" 
ON public.claim_documents 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.claims 
  WHERE claims.id = claim_documents.claim_id 
  AND claims.user_id = auth.uid()
));
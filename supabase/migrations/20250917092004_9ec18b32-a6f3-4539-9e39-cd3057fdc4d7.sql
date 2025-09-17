-- Fix security warnings by setting proper search_path for functions

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  RETURN NEW;
END;
$$;

-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update create_policy_reminders function
CREATE OR REPLACE FUNCTION public.create_policy_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create 30-day reminder
  INSERT INTO public.reminders (policy_id, reminder_date, days_before)
  VALUES (NEW.id, NEW.expiry_date - INTERVAL '30 days', 30);
  
  -- Create 7-day reminder
  INSERT INTO public.reminders (policy_id, reminder_date, days_before)
  VALUES (NEW.id, NEW.expiry_date - INTERVAL '7 days', 7);
  
  RETURN NEW;
END;
$$;

-- Update update_policy_status function
CREATE OR REPLACE FUNCTION public.update_policy_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Update status to expired if expiry date has passed
  IF NEW.expiry_date < CURRENT_DATE AND NEW.status = 'active' THEN
    NEW.status = 'expired';
  END IF;
  
  RETURN NEW;
END;
$$;
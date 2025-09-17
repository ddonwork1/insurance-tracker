import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useUserProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useIsAdmin = () => {
  const { data: profile } = useUserProfile();
  return profile?.role === 'admin' || profile?.role === 'super_admin';
};

export const useIsSuperAdmin = () => {
  const { data: profile } = useUserProfile();
  return profile?.role === 'super_admin';
};
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Phone, Mail, Download } from "lucide-react";

const PolicyDetail = () => {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: policy, isLoading } = useQuery({
    queryKey: ["policy", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("*")
        .eq("id", id)
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user?.id,
  });

  if (isLoading) {
    return <div className="text-center">Loading...</div>;
  }

  if (!policy) {
    return <div className="text-center">Policy not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/policies")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Policies
        </Button>
        <Button onClick={() => navigate(`/policies/${id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Policy
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{policy.insured_name}</CardTitle>
          <Badge>{policy.policy_type}</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Policy Number:</strong> {policy.policy_number}
            </div>
            <div>
              <strong>Insurer:</strong> {policy.insurer_name}
            </div>
            <div>
              <strong>Premium:</strong> ${Number(policy.premium_amount).toLocaleString()}
            </div>
            <div>
              <strong>Expiry Date:</strong> {policy.expiry_date}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PolicyDetail;
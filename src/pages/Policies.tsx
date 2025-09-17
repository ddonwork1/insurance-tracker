import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus,
  Search,
  Filter,
  Car,
  Heart,
  Eye,
  Edit,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const Policies = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: policies, isLoading, refetch } = useQuery({
    queryKey: ["policies", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("*")
        .eq("user_id", user?.id)
        .order("expiry_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const filteredPolicies = policies?.filter(policy => {
    const matchesSearch = 
      policy.policy_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.insured_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.insurer_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === "all" || policy.policy_type === filterType;
    const matchesStatus = filterStatus === "all" || policy.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm("Are you sure you want to delete this policy?")) return;

    try {
      const { error } = await supabase
        .from("insurance_policies")
        .delete()
        .eq("id", policyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Policy deleted successfully.",
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete policy. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (status === "expired") {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    if (daysUntilExpiry <= 7) {
      return <Badge variant="destructive">Expires Soon</Badge>;
    }
    
    if (daysUntilExpiry <= 30) {
      return <Badge className="bg-warning text-warning-foreground">Renewal Due</Badge>;
    }
    
    return <Badge className="bg-success text-success-foreground">Active</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Insurance Policies</h1>
          <p className="text-muted-foreground">
            Manage all your insurance policies in one place
          </p>
        </div>
        <Button 
          onClick={() => navigate("/policies/new")}
          className="bg-gradient-primary hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Policy
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by policy number, insured name, or insurer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full lg:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="motor">Motor Insurance</SelectItem>
                <SelectItem value="health">Health Insurance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Policies List */}
      {!filteredPolicies?.length ? (
        <Card className="shadow-card">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No policies found</h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || filterType !== "all" || filterStatus !== "all"
                ? "No policies match your current filters."
                : "Get started by adding your first insurance policy."
              }
            </p>
            <Button 
              onClick={() => navigate("/policies/new")}
              className="bg-gradient-primary hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Policy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPolicies.map((policy) => (
            <Card key={policy.id} className="shadow-card hover:shadow-dropdown transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                      {policy.policy_type === "motor" ? (
                        <Car className="h-6 w-6 text-primary-foreground" />
                      ) : (
                        <Heart className="h-6 w-6 text-primary-foreground" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{policy.insured_name}</h3>
                      <p className="text-muted-foreground">
                        {policy.insurer_name} • {policy.policy_number}
                      </p>
                      {policy.vehicle_details && (
                        <p className="text-sm text-muted-foreground">{policy.vehicle_details}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <span>Premium: ${Number(policy.premium_amount).toLocaleString()}</span>
                        <span>Expires: {format(new Date(policy.expiry_date), "MMM dd, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col lg:items-end gap-3">
                    {getStatusBadge(policy.status, policy.expiry_date)}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/policies/${policy.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/policies/${policy.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePolicy(policy.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Policies;
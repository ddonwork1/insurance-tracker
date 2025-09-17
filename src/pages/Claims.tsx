import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Edit, Trash2, FileText } from "lucide-react";
import { formatDateDDMMYYYY } from "@/lib/dateUtils";
import { formatINR } from "@/lib/currencyUtils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const Claims = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newClaim, setNewClaim] = useState({
    policy_id: "",
    claim_number: "",
    claim_date: "",
    claim_amount: "",
    description: "",
    notes: ""
  });

  // Fetch claims
  const { data: claims, isLoading } = useQuery({
    queryKey: ["claims", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("claims")
        .select(`
          *,
          insurance_policies!inner(
            id,
            policy_number,
            policy_type,
            insured_name
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch policies for dropdown
  const { data: policies } = useQuery({
    queryKey: ["policies", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("id, policy_number, policy_type, insured_name")
        .eq("user_id", user.id)
        .order("policy_number");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Add claim mutation
  const addClaimMutation = useMutation({
    mutationFn: async (claimData: any) => {
      const { data, error } = await supabase
        .from("claims")
        .insert({
          ...claimData,
          user_id: user?.id,
          claim_amount: parseFloat(claimData.claim_amount),
          claim_date: claimData.claim_date
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      toast({ title: "Success", description: "Claim added successfully" });
      setIsAddDialogOpen(false);
      setNewClaim({
        policy_id: "",
        claim_number: "",
        claim_date: "",
        claim_amount: "",
        description: "",
        notes: ""
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error", 
        description: "Failed to add claim",
        variant: "destructive" 
      });
    },
  });

  // Delete claim mutation
  const deleteClaimMutation = useMutation({
    mutationFn: async (claimId: string) => {
      const { error } = await supabase
        .from("claims")
        .delete()
        .eq("id", claimId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      toast({ title: "Success", description: "Claim deleted successfully" });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      approved: "default",
      rejected: "destructive",
      paid: "secondary"
    };
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredClaims = claims?.filter((claim) => {
    const matchesSearch = claim.claim_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.insurance_policies.policy_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || claim.claim_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Claims Management</h1>
          <p className="text-muted-foreground">Track and manage insurance claims</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Claim
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Claim</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="policy">Policy</Label>
                  <Select
                    value={newClaim.policy_id}
                    onValueChange={(value) => setNewClaim(prev => ({ ...prev, policy_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select policy" />
                    </SelectTrigger>
                    <SelectContent>
                      {policies?.map((policy) => (
                        <SelectItem key={policy.id} value={policy.id}>
                          {policy.policy_number} - {policy.insured_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="claim_number">Claim Number</Label>
                  <Input
                    id="claim_number"
                    value={newClaim.claim_number}
                    onChange={(e) => setNewClaim(prev => ({ ...prev, claim_number: e.target.value }))}
                    placeholder="Enter claim number"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="claim_date">Claim Date</Label>
                  <Input
                    id="claim_date"
                    type="date"
                    value={newClaim.claim_date}
                    onChange={(e) => setNewClaim(prev => ({ ...prev, claim_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="claim_amount">Claim Amount (₹)</Label>
                  <Input
                    id="claim_amount"
                    type="number"
                    value={newClaim.claim_amount}
                    onChange={(e) => setNewClaim(prev => ({ ...prev, claim_amount: e.target.value }))}
                    placeholder="Enter amount"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newClaim.description}
                  onChange={(e) => setNewClaim(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the claim"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newClaim.notes}
                  onChange={(e) => setNewClaim(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => addClaimMutation.mutate(newClaim)}>
                  Add Claim
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search claims..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredClaims?.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No claims found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterStatus !== "all" 
                  ? "No claims match your current filters" 
                  : "Start by adding your first claim"}
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Claim
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredClaims?.map((claim) => (
            <Card key={claim.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{claim.claim_number}</CardTitle>
                    <CardDescription>
                      Policy: {claim.insurance_policies.policy_number} - {claim.insurance_policies.insured_name}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(claim.claim_status)}
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => deleteClaimMutation.mutate(claim.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Claim Date</p>
                    <p className="text-muted-foreground">
                      {formatDateDDMMYYYY(claim.claim_date)}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Amount</p>
                    <p className="text-muted-foreground">
                      {formatINR(claim.claim_amount)}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Type</p>
                    <p className="text-muted-foreground">
                      {claim.insurance_policies.policy_type}
                    </p>
                  </div>
                </div>
                {claim.description && (
                  <div className="mt-3">
                    <p className="font-medium text-sm">Description</p>
                    <p className="text-muted-foreground text-sm">{claim.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Claims;
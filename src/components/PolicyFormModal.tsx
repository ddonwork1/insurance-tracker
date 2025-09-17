import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";
import { formatDateForInput } from "@/lib/dateUtils";

interface PolicyFormProps {
  policyId?: string;
  onSuccess: () => void;
}

const PolicyForm = ({ policyId, onSuccess }: PolicyFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditing = !!policyId;

  const [formData, setFormData] = useState({
    policy_type: "",
    policy_number: "",
    insurer_name: "",
    insured_name: "",
    vehicle_details: "",
    premium_amount: "",
    coverage_amount: "",
    start_date: "",
    expiry_date: "",
    agent_name: "",
    agent_phone: "",
    agent_email: "",
    notes: "",
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Fetch existing policy data if editing
  const { data: existingPolicy } = useQuery({
    queryKey: ["policy", policyId],
    queryFn: async () => {
      if (!policyId) return null;
      const { data, error } = await supabase
        .from("insurance_policies")
        .select("*")
        .eq("id", policyId)
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!policyId && !!user?.id,
  });

  useEffect(() => {
    if (existingPolicy) {
      setFormData({
        policy_type: existingPolicy.policy_type,
        policy_number: existingPolicy.policy_number,
        insurer_name: existingPolicy.insurer_name,
        insured_name: existingPolicy.insured_name,
        vehicle_details: existingPolicy.vehicle_details || "",
        premium_amount: existingPolicy.premium_amount.toString(),
        coverage_amount: existingPolicy.coverage_amount?.toString() || "",
        start_date: formatDateForInput(existingPolicy.start_date),
        expiry_date: formatDateForInput(existingPolicy.expiry_date),
        agent_name: existingPolicy.agent_name || "",
        agent_phone: existingPolicy.agent_phone || "",
        agent_email: existingPolicy.agent_email || "",
        notes: existingPolicy.notes || "",
      });
    }
  }, [existingPolicy]);

  const createPolicyMutation = useMutation({
    mutationFn: async (policyData: any) => {
      const { data, error } = await supabase
        .from("insurance_policies")
        .insert([{ ...policyData, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      // Upload files if any
      if (uploadedFiles.length > 0) {
        await uploadPolicyDocuments(data.id);
      }
      
      toast({
        title: "Success",
        description: "Policy created successfully.",
      });
      
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create policy. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePolicyMutation = useMutation({
    mutationFn: async (policyData: any) => {
      const { data, error } = await supabase
        .from("insurance_policies")
        .update(policyData)
        .eq("id", policyId)
        .eq("user_id", user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      // Upload new files if any
      if (uploadedFiles.length > 0) {
        await uploadPolicyDocuments(data.id);
      }
      
      toast({
        title: "Success",
        description: "Policy updated successfully.",
      });
      
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update policy. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadPolicyDocuments = async (policyId: string) => {
    for (const file of uploadedFiles) {
      const fileName = `${user?.id}/${policyId}/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("policy-documents")
        .upload(fileName, file);

      if (!uploadError) {
        await supabase
          .from("policy_documents")
          .insert({
            policy_id: policyId,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
          });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const policyData = {
      ...formData,
      premium_amount: parseFloat(formData.premium_amount),
      coverage_amount: formData.coverage_amount ? parseFloat(formData.coverage_amount) : null,
    };

    if (isEditing) {
      updatePolicyMutation.mutate(policyData);
    } else {
      createPolicyMutation.mutate(policyData);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(file => 
        file.type === "application/pdf" && file.size <= 10 * 1024 * 1024 // 10MB limit
      );
      
      if (files.length !== e.target.files.length) {
        toast({
          title: "File Error",
          description: "Only PDF files under 10MB are allowed.",
          variant: "destructive",
        });
      }
      
      setUploadedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="policy_type">Policy Type *</Label>
            <Select
              value={formData.policy_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, policy_type: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select policy type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="motor">Motor Insurance</SelectItem>
                <SelectItem value="health">Health Insurance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="policy_number">Policy Number *</Label>
            <Input
              id="policy_number"
              value={formData.policy_number}
              onChange={(e) => setFormData(prev => ({ ...prev, policy_number: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="insurer_name">Insurer Name *</Label>
            <Input
              id="insurer_name"
              value={formData.insurer_name}
              onChange={(e) => setFormData(prev => ({ ...prev, insurer_name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="insured_name">
              {formData.policy_type === "motor" ? "Vehicle Owner / Insured Name" : "Insured Name"} *
            </Label>
            <Input
              id="insured_name"
              value={formData.insured_name}
              onChange={(e) => setFormData(prev => ({ ...prev, insured_name: e.target.value }))}
              required
            />
          </div>
        </div>

        {formData.policy_type === "motor" && (
          <div className="space-y-2">
            <Label htmlFor="vehicle_details">Vehicle Details</Label>
            <Input
              id="vehicle_details"
              placeholder="e.g., Toyota Camry 2020, License: ABC123"
              value={formData.vehicle_details}
              onChange={(e) => setFormData(prev => ({ ...prev, vehicle_details: e.target.value }))}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="premium_amount">Premium Amount (₹) *</Label>
            <Input
              id="premium_amount"
              type="number"
              step="0.01"
              value={formData.premium_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, premium_amount: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coverage_amount">Coverage Amount (₹)</Label>
            <Input
              id="coverage_amount"
              type="number"
              step="0.01"
              value={formData.coverage_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, coverage_amount: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date *</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiry_date">Expiry Date *</Label>
            <Input
              id="expiry_date"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
              required
            />
          </div>
        </div>

        {/* Agent Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="agent_name">Agent Name</Label>
            <Input
              id="agent_name"
              value={formData.agent_name}
              onChange={(e) => setFormData(prev => ({ ...prev, agent_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent_phone">Agent Phone</Label>
            <Input
              id="agent_phone"
              type="tel"
              value={formData.agent_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, agent_phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent_email">Agent Email</Label>
            <Input
              id="agent_email"
              type="email"
              value={formData.agent_email}
              onChange={(e) => setFormData(prev => ({ ...prev, agent_email: e.target.value }))}
            />
          </div>
        </div>

        {/* Documents */}
        <div className="space-y-2">
          <Label htmlFor="documents">Upload PDF Documents</Label>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
            <input
              id="documents"
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="documents"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Click to upload PDF files (max 10MB each)
              </span>
            </label>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Files:</Label>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-muted p-2 rounded text-sm">
                    <span>{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Any additional information about this policy..."
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="submit"
            disabled={createPolicyMutation.isPending || updatePolicyMutation.isPending}
          >
            {createPolicyMutation.isPending || updatePolicyMutation.isPending
              ? "Saving..."
              : isEditing
              ? "Update Policy"
              : "Create Policy"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PolicyForm;
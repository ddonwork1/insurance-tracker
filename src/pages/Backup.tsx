import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Database, FileArchive, Calendar, Clock } from "lucide-react";
import { formatDateTimeDDMMYYYY } from "@/lib/dateUtils";
import { useToast } from "@/hooks/use-toast";

const Backup = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Fetch data counts for export summary
  const { data: stats } = useQuery({
    queryKey: ["backup-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const [policies, claims, documents, logs] = await Promise.all([
        supabase.from("insurance_policies").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("claims").select("id", { count: "exact" }).eq("user_id", user.id),
        supabase.from("policy_documents").select("id", { count: "exact" }),
        supabase.from("global_logs").select("id", { count: "exact" }).eq("user_id", user.id),
      ]);

      return {
        policies: policies.count || 0,
        claims: claims.count || 0,
        documents: documents.count || 0,
        logs: logs.count || 0,
      };
    },
    enabled: !!user?.id,
  });

  const exportData = async (format: 'json' | 'csv') => {
    if (!user?.id) return;
    
    setIsExporting(true);
    try {
      // Fetch all data
      const [policies, claims, documents, logs] = await Promise.all([
        supabase
          .from("insurance_policies")
          .select("*")
          .eq("user_id", user.id),
        supabase
          .from("claims")
          .select(`
            *,
            insurance_policies(policy_number, policy_type, insured_name)
          `)
          .eq("user_id", user.id),
        supabase
          .from("policy_documents")
          .select("*"),
        supabase
          .from("global_logs")
          .select("*")
          .eq("user_id", user.id),
      ]);

      const exportData = {
        export_info: {
          exported_at: new Date().toISOString(),
          exported_by: user.email,
          format: format,
          counts: {
            policies: policies.data?.length || 0,
            claims: claims.data?.length || 0,
            documents: documents.data?.length || 0,
            logs: logs.data?.length || 0,
          }
        },
        policies: policies.data || [],
        claims: claims.data || [],
        documents: documents.data || [],
        logs: logs.data || [],
      };

      let content: string;
      let fileName: string;
      let mimeType: string;

      if (format === 'json') {
        content = JSON.stringify(exportData, null, 2);
        fileName = `insurance-backup-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        // Simple CSV export for policies
        const csvHeaders = [
          'Policy Type', 'Policy Number', 'Insured Name', 'Insurer Name',
          'Start Date', 'Expiry Date', 'Premium Amount', 'Coverage Amount', 'Status'
        ];
        
        const csvRows = policies.data?.map(policy => [
          policy.policy_type,
          policy.policy_number,
          policy.insured_name,
          policy.insurer_name,
          policy.start_date,
          policy.expiry_date,
          policy.premium_amount,
          policy.coverage_amount || '',
          policy.status
        ]) || [];

        content = [
          csvHeaders.join(','),
          ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        fileName = `insurance-policies-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      }

      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `Data exported as ${format.toUpperCase()} successfully`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Backup & Export</h1>
        <p className="text-muted-foreground">
          Export your insurance data and create backups
        </p>
      </div>

      {/* Data Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Summary
          </CardTitle>
          <CardDescription>
            Overview of your data available for backup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {stats?.policies || 0}
              </div>
              <div className="text-sm text-muted-foreground">Policies</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {stats?.claims || 0}
              </div>
              <div className="text-sm text-muted-foreground">Claims</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {stats?.documents || 0}
              </div>
              <div className="text-sm text-muted-foreground">Documents</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {stats?.logs || 0}
              </div>
              <div className="text-sm text-muted-foreground">Log Entries</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileArchive className="h-5 w-5" />
              Complete Backup (JSON)
            </CardTitle>
            <CardDescription>
              Export all data including policies, claims, documents, and logs in JSON format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Policies</Badge>
              <Badge variant="secondary">Claims</Badge>
              <Badge variant="secondary">Documents</Badge>
              <Badge variant="secondary">Logs</Badge>
            </div>
            <Button 
              onClick={() => exportData('json')}
              disabled={isExporting}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export JSON Backup"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileArchive className="h-5 w-5" />
              Policies Export (CSV)
            </CardTitle>
            <CardDescription>
              Export insurance policies in CSV format for spreadsheet applications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Policies Only</Badge>
              <Badge variant="outline">Spreadsheet Ready</Badge>
            </div>
            <Button 
              onClick={() => exportData('csv')}
              disabled={isExporting}
              variant="outline"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export CSV File"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Backup Schedule Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Automated Backups
          </CardTitle>
          <CardDescription>
            Schedule automatic backups of your data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Daily Backup</div>
                  <div className="text-sm text-muted-foreground">
                    Automatic backup every day at 2:00 AM
                  </div>
                </div>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Weekly Backup</div>
                  <div className="text-sm text-muted-foreground">
                    Complete backup every Sunday
                  </div>
                </div>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Export Info */}
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
          <CardDescription>
            Track your recent backup activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileArchive className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No export history available</p>
            <p className="text-sm">Your export activities will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Backup;
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollText, User, FileText, Shield } from "lucide-react";
import { formatDateTimeDDMMYYYY } from "@/lib/dateUtils";

const GlobalLogs = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["global-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_logs")
        .select(`
          *,
          profiles!global_logs_user_id_fkey (
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE_POLICY':
        return <FileText className="h-4 w-4 text-success" />;
      case 'UPDATE_POLICY':
        return <FileText className="h-4 w-4 text-warning" />;
      case 'DELETE_POLICY':
        return <FileText className="h-4 w-4 text-destructive" />;
      case 'CREATE_USER':
        return <User className="h-4 w-4 text-success" />;
      case 'UPDATE_USER':
        return <User className="h-4 w-4 text-warning" />;
      default:
        return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE_POLICY':
        return <Badge variant="outline" className="border-success text-success">Create</Badge>;
      case 'UPDATE_POLICY':
        return <Badge variant="outline" className="border-warning text-warning">Update</Badge>;
      case 'DELETE_POLICY':
        return <Badge variant="outline" className="border-destructive text-destructive">Delete</Badge>;
      case 'CREATE_USER':
        return <Badge variant="outline" className="border-success text-success">User Created</Badge>;
      case 'UPDATE_USER':
        return <Badge variant="outline" className="border-warning text-warning">User Updated</Badge>;
      default:
        return <Badge variant="outline">System</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Global Logs</h1>
          <p className="text-muted-foreground">
            System-wide activity and audit trail
          </p>
        </div>
      </div>

      {/* Logs */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!logs?.length ? (
            <div className="text-center py-8">
              <ScrollText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Activity Yet</h3>
              <p className="text-muted-foreground">
                System activities will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log: any) => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(log.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getActionBadge(log.action)}
                      <span className="text-sm text-muted-foreground">
                        {formatDateTimeDDMMYYYY(log.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium mb-1">
                      {log.description}
                    </p>
                    
                    <p className="text-xs text-muted-foreground">
                      by {log.profiles?.full_name || log.profiles?.email || 'System'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalLogs;
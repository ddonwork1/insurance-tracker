import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardCard } from "@/components/DashboardCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign,
  Plus,
  Calendar,
  Car,
  Heart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isWithinInterval, addDays } from "date-fns";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: async () => {
      const { data: policies, error } = await supabase
        .from("insurance_policies")
        .select("*")
        .eq("user_id", user?.id);

      if (error) throw error;

      const today = new Date();
      const next30Days = addDays(today, 30);

      const activePolicies = policies?.filter(p => p.status === "active") || [];
      const expiredPolicies = policies?.filter(p => p.status === "expired") || [];
      const upcomingRenewals = activePolicies.filter(p => 
        isWithinInterval(new Date(p.expiry_date), { start: today, end: next30Days })
      );

      const totalPremium = activePolicies.reduce((sum, p) => sum + Number(p.premium_amount), 0);

      return {
        activePolicies: activePolicies.length,
        expiredPolicies: expiredPolicies.length,
        upcomingRenewals: upcomingRenewals.length,
        totalPremium,
        upcomingRenewalsList: upcomingRenewals.slice(0, 5),
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your insurance policies and stay on top of renewals
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

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Active Policies"
          value={dashboardData?.activePolicies || 0}
          icon={Shield}
          className="border-success/20"
        />
        <DashboardCard
          title="Upcoming Renewals"
          value={dashboardData?.upcomingRenewals || 0}
          icon={AlertTriangle}
          className="border-warning/20"
        />
        <DashboardCard
          title="Expired Policies"
          value={dashboardData?.expiredPolicies || 0}
          icon={CheckCircle}
          className="border-destructive/20"
        />
        <DashboardCard
          title="Total Premium (Annual)"
          value={`$${dashboardData?.totalPremium?.toLocaleString() || 0}`}
          icon={DollarSign}
          className="border-primary/20"
        />
      </div>

      {/* Upcoming Renewals */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Renewals (Next 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!dashboardData?.upcomingRenewalsList?.length ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">All Good!</h3>
              <p className="text-muted-foreground">
                No renewals needed in the next 30 days.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {dashboardData.upcomingRenewalsList.map((policy: any) => (
                <div 
                  key={policy.id} 
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {policy.policy_type === "motor" ? (
                      <Car className="h-5 w-5 text-primary" />
                    ) : (
                      <Heart className="h-5 w-5 text-accent" />
                    )}
                    <div>
                      <p className="font-medium">{policy.insured_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {policy.insurer_name} • {policy.policy_number}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant="outline" 
                      className="mb-1 border-warning text-warning"
                    >
                      Expires {format(new Date(policy.expiry_date), "MMM dd, yyyy")}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      ${Number(policy.premium_amount).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {dashboardData.upcomingRenewalsList.length >= 5 && (
                <div className="text-center pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/policies")}
                  >
                    View All Policies
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-6"
              onClick={() => navigate("/policies/new")}
            >
              <Car className="h-6 w-6" />
              <span>Add Motor Insurance</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-6"
              onClick={() => navigate("/policies/new")}
            >
              <Heart className="h-6 w-6" />
              <span>Add Health Insurance</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 p-6"
              onClick={() => navigate("/policies")}
            >
              <Shield className="h-6 w-6" />
              <span>View All Policies</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Shield, UserX, Settings } from "lucide-react";
import { formatDateTimeDDMMYYYY } from "@/lib/dateUtils";

const UserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "admin" as "admin" | "super_admin"
  });

  // Fetch all admin users
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["admin", "super_admin"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Create new admin user
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      // This would typically be handled by an edge function
      // For now, we'll show a placeholder
      throw new Error("User creation requires server-side implementation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Success",
        description: "User created successfully.",
      });
      setIsCreateDialogOpen(false);
      setNewUser({ email: "", password: "", full_name: "", role: "admin" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user.",
        variant: "destructive",
      });
    },
  });

  // Update user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: "admin" | "super_admin" }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("user_id", userId);

      if (error) throw error;

      // Log the action
      await supabase
        .from("global_logs")
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'UPDATE_USER',
          description: `Changed user role to ${role}`,
          entity_type: 'user',
          entity_id: userId
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({
        title: "Success",
        description: "User role updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update user role.",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    createUserMutation.mutate(newUser);
  };

  const handleRoleChange = (userId: string, role: "admin" | "super_admin") => {
    updateRoleMutation.mutate({ userId, role });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage admin users and permissions (Super Admin only)
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Create Admin User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Admin User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value as "admin" | "super_admin" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreateUser}
                  disabled={createUserMutation.isPending}
                  className="flex-1"
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users List */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Admin Users ({users?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!users?.length ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Admin Users</h3>
              <p className="text-muted-foreground">
                Create your first admin user to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user: any) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      {user.role === 'super_admin' ? (
                        <Shield className="h-5 w-5 text-primary" />
                      ) : (
                        <Users className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{user.full_name || user.email}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDateTimeDDMMYYYY(user.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'}>
                      {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </Badge>
                    
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(user.user_id, value as "admin" | "super_admin")}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note about implementation */}
      <Card className="border-warning/20 bg-warning/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <p className="font-medium text-warning-foreground">Implementation Note</p>
              <p className="text-sm text-muted-foreground mt-1">
                User creation requires a Supabase Edge Function for proper implementation. 
                This interface shows the UI structure and role management functionality.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
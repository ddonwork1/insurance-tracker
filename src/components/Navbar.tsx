import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUserProfile, useIsSuperAdmin } from "@/hooks/useUserProfile";
import { 
  Shield, 
  LayoutDashboard, 
  FileText, 
  Plus, 
  LogOut,
  User,
  ScrollText,
  Users
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: profile } = useUserProfile();
  const isSuperAdmin = useIsSuperAdmin();

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/policies", label: "Policies", icon: FileText },
    { path: "/logs", label: "Global Logs", icon: ScrollText },
    ...(isSuperAdmin ? [{ path: "/users", label: "User Management", icon: Users }] : []),
  ];

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-white/85 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Insurance Tracker</span>
          </div>

          {/* Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navItems.map(({ path, label, icon: Icon }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(path)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => navigate("/policies/new")}
              className="bg-gradient-primary hover:opacity-90"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Policy
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 shadow-dropdown">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};
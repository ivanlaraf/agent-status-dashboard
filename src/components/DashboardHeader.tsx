import { Cloud, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import nestleLogo from "@/assets/nestle-logo.png";

const DashboardHeader = () => {
  const { logout, user } = useAuth();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
  };

  return (
    <header className="bg-dashboard-header border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Cloud className="h-8 w-8 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">AWS Connect</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-xl font-semibold text-foreground">
            Amazon Connect Agent States – Daily History
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img src={nestleLogo} alt="Nestlé" className="h-8 w-auto" />
            <span className="text-sm font-medium text-muted-foreground">Nestlé</span>
          </div>
          
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-muted-foreground">{user.email}</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
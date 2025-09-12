import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

const LoadingScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-success/5 flex items-center justify-center p-4">
    <div className="relative w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-primary rounded-2xl shadow-hero animate-pulse">
          <Building2 className="w-10 h-10 text-primary-foreground" />
        </div>
      </div>
      
      <Card className="p-8 shadow-hero border-border/50 bg-white/95 backdrop-blur-sm">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
    </div>
  </div>
);

const UnauthorizedScreen = () => (
  <div className="min-h-screen bg-gradient-to-br from-destructive/10 via-background to-destructive/5 flex items-center justify-center p-4">
    <div className="relative w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-destructive rounded-2xl shadow-hero">
          <Building2 className="w-10 h-10 text-destructive-foreground" />
        </div>
      </div>
      
      <Card className="p-8 shadow-hero border-border/50 bg-white/95 backdrop-blur-sm text-center">
        <h2 className="text-2xl font-bold text-destructive mb-4">Access Denied</h2>
        <p className="text-muted-foreground mb-6">
          You don't have the required permissions to access this page.
        </p>
        <p className="text-sm text-muted-foreground">
          Please contact your administrator if you believe this is an error.
        </p>
      </Card>
    </div>
  </div>
);

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = [] 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if required roles are specified
  if (requiredRoles.length > 0 && user) {
    const hasRequiredRole = requiredRoles.some(role => 
      user.roles.includes(role)
    );
    
    if (!hasRequiredRole) {
      return <UnauthorizedScreen />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;



import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/lib/types';
import { hasRole } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading, isError } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    console.error('Error in ProtectedRoute: Authentication error');
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    console.warn('ProtectedRoute: No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(user.group_name, requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

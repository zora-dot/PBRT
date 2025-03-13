import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SkeletonLoader from './SkeletonLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is not authenticated and we're done loading, redirect to login
    if (!loading && !user) {
      navigate('/login', { 
        state: { from: location.pathname },
        replace: true 
      });
    }
  }, [user, loading, navigate, location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          <SkeletonLoader className="h-12 w-full" />
          <SkeletonLoader className="h-32 w-full" />
          <SkeletonLoader className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Let the useEffect handle the redirect
  }

  return <>{children}</>;
}
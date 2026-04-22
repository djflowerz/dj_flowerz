
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    adminOnly?: boolean;
    subscriberOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false, subscriberOnly = false }) => {
    const { user, loading, isProfileComplete } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0B0B0F]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 text-sm animate-pulse">Verifying Access...</p>
                </div>
            </div>
        );
    }

    // SILENT REDIRECT FOR STEALTH MODE: 
    // If the route is subscriber-only and we aren't a subscriber (and aren't the admin either), 
    // we redirect to '/' immediately without checking login. 
    // This hides the fact that a "Login" or "Access Denied" page even exists for this route.
    if (subscriberOnly && (!user || (!user.isSubscriber && !user.isAdmin))) {
        return <Navigate to="/" replace />;
    }

    if (!user) {
        // Normal protected pages go to login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // ✅ Redirect to community identity setup if handle hasn't been claimed yet
    if (user?.needsSetup && location.pathname !== '/setup-identity') {
        return <Navigate to="/setup-identity" replace />;
    }

    if (adminOnly && (!user || !['ianmuriithiflowerz@gmail.com', 'djflowerz254@gmail.com'].includes(user.email || ''))) {
        // Redirect to home invisibly if they are not an authorized admin
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;

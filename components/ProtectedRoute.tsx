
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
    const { user, loading } = useAuth();
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

    if (!user) {
        // Redirect to login and remember where they came from
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (adminOnly && !user.isAdmin) {
        // Redirect to home if they are not an admin
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;

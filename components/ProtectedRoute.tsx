
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
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    if (!user) {
        // Redirect to login page with return URL
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (adminOnly && user.role !== 'admin' && !user.isAdmin) {
        // Redirect non-admins to home
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;

import { Navigate, Outlet } from 'react-router-dom';
import { config } from '@/lib/config';

export const ProtectedAdminRoute = () => {
    const isAdmin = sessionStorage.getItem('isAdmin') === 'true';

    if (!isAdmin) {
        return <Navigate to="/admin" replace />;
    }

    return <Outlet />;
};

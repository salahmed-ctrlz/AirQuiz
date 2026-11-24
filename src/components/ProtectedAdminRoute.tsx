import { Navigate, Outlet } from 'react-router-dom';
import { getAdminToken } from '@/lib/api';

export const ProtectedAdminRoute = () =>
    getAdminToken() ? <Outlet /> : <Navigate to="/admin" replace />;

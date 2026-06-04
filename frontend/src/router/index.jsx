// src/router/index.jsx
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth }          from '../context/AuthContext'
import AppLayout            from '../components/layout/AppLayout'
import LoginPage            from '../pages/auth/LoginPage'
import PublicTrackingPage   from '../pages/tracking/PublicTrackingPage'
import DashboardPage        from '../pages/dashboard/DashboardPage'
import ParcelsPage          from '../pages/parcels/ParcelsPage'
import ParcelDetailPage     from '../pages/parcels/ParcelDetailPage'
import NewParcelPage        from '../pages/parcels/NewParcelPage'
import ScanPage             from '../pages/scan/ScanPage'
import BagsPage             from '../pages/bags/BagsPage'
import BagDetailPage        from '../pages/bags/BagDetailPage'
import ClientsPage          from '../pages/clients/ClientsPage'
import NotificationsPage    from '../pages/notifications/NotificationsPage'
import UsersPage from '../pages/users/UsersPage'
import UsersForm from '../pages/users/UsersForm'
import UserDetail from '../pages/users/UserDetail'
import ParcelEditPage from '../pages/parcels/ParcelEditPage'
import AgenciesPage from '../pages/agencies/AgenciesPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '../pages/auth/ResetPasswordPage'


function ProtectedRoute({ allowedRoles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role))
    return <Navigate to="/dashboard" replace />
  return <Outlet />
}

const router = createBrowserRouter([
  { path: '/login',            element: <LoginPage /> },
  { path: '/track/:qrcode',   element: <PublicTrackingPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/',                 element: <Navigate to="/dashboard" replace /> },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <AppLayout />,
      children: [
        { path: '/dashboard',    element: <DashboardPage /> },
        { path: '/parcels',      element: <ParcelsPage /> },
        { path: '/parcels/new',  element: <NewParcelPage /> },
        { path: '/parcels/:id',  element: <ParcelDetailPage /> },
        { path: '/parcels/:id/edit', element: <ParcelEditPage /> },
        { path: '/scan',         element: <ScanPage /> },
        { path: '/bags',         element: <BagsPage /> },
        { path: '/bags/:id',     element: <BagDetailPage /> },
        { path: '/clients',      element: <ClientsPage /> },
        { path: '/notifications',element: <NotificationsPage /> },
        { path: '/agencies',     element: <AgenciesPage /> },

        { path: '/users',        element: <UsersPage /> },
        { path: '/users/new',    element: <UsersForm /> },
        { path: '/users/:id',    element: <UserDetail /> },
        { path: '/users/:id/edit', element: <UsersForm /> }
      ],
    }],
  },
])

export default router
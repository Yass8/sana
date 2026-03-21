// src/router/index.jsx
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

import AppLayout          from '../components/layout/AppLayout'
import LoginPage          from '../pages/auth/LoginPage'
import PublicTrackingPage from '../pages/tracking/PublicTrackingPage'
import DashboardPage      from '../pages/dashboard/DashboardPage'
import ParcelsPage        from '../pages/parcels/ParcelsPage'
import ParcelDetailPage   from '../pages/parcels/ParcelDetailPage'
import NewParcelPage      from '../pages/parcels/NewParcelPage'
import ScanPage           from '../pages/scan/ScanPage'
import BagsPage           from '../pages/bags/BagsPage'
import BagDetailPage      from '../pages/bags/BagDetailPage'
import ShipmentsPage      from '../pages/shipments/ShipmentsPage'
import ClientsPage        from '../pages/clients/ClientsPage'
import NotificationsPage  from '../pages/notifications/NotificationsPage'
import PrintBarcodePage   from '../pages/parcels/PrintBarcodePage'

// ─── Garde de route ───────────────────────────────────────
function ProtectedRoute({ allowedRoles }) {
  const { user } = useAuth()

  if (!user)
    return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role))
    return <Navigate to="/dashboard" replace />

  return <Outlet />
}

// ─── Routes ───────────────────────────────────────────────
const router = createBrowserRouter([

  // Routes publiques (sans auth)
  { path: '/login',              element: <LoginPage /> },
  { path: '/track/:barcode',     element: <PublicTrackingPage /> },
  { path: '/',                   element: <Navigate to="/dashboard" replace /> },

  // Routes protégées — wrappées dans AppLayout
  {
    element: <ProtectedRoute />,   // connecté = suffit
    children: [{
      element: <AppLayout />,
      children: [

        { path: '/dashboard', element: <DashboardPage /> },
        { path: '/parcels/:id/print', element: <PrintBarcodePage /> },

        // Agents FR + Admin
        {
          element: <ProtectedRoute allowedRoles={['agent_fr', 'admin']} />,
          children: [
            { path: '/parcels/new', element: <NewParcelPage /> },
            { path: '/bags',        element: <BagsPage /> },
            { path: '/bags/:id',    element: <BagDetailPage /> },
          ],
        },

        // Tous les agents + Admin
        {
          element: <ProtectedRoute allowedRoles={['agent_fr', 'agent_af', 'admin']} />,
          children: [
            { path: '/parcels',     element: <ParcelsPage /> },
            { path: '/parcels/:id', element: <ParcelDetailPage /> },
            { path: '/scan',        element: <ScanPage /> },
            { path: '/shipments',   element: <ShipmentsPage /> },
          ],
        },

        // Admin uniquement
        {
          element: <ProtectedRoute allowedRoles={['admin']} />,
          children: [
            { path: '/clients',       element: <ClientsPage /> },
            { path: '/notifications', element: <NotificationsPage /> },
          ],
        },

      ],
    }],
  },
])

export default router
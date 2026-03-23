// src/components/layout/AppLayout.jsx
import { Outlet }   from 'react-router-dom'
import Sidebar      from './Sidebar'
import Topbar       from './Topbar'
import BottomNav    from './BottomNav'

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">

      {/* Sidebar — visible seulement desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Zone principale */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6
                         pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — visible seulement mobile/tablet */}
      <div className="lg:hidden">
        <BottomNav />
      </div>

    </div>
  )
}
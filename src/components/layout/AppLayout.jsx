import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, HardHat, FolderKanban, Truck,
  Package, DollarSign, Bell, ChevronLeft, ChevronRight,
  LogOut, Building2, ShoppingCart, BookOpen, Settings,
  FileBarChart, Users,
} from 'lucide-react'
import { useAuthStore }  from '../../store/authStore'
import { useUIStore }    from '../../store/uiStore'
import { alertsApi }     from '../../services/api'
import { useQuery }      from '@tanstack/react-query'
import { cn }            from '../../utils/helpers'

const NAV_MAIN = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/works',     icon: HardHat,         label: 'Obras' },
  { to: '/projects',  icon: FolderKanban,    label: 'Proyectos' },
  { to: '/clients',   icon: Users,           label: 'Clientes' },
  { to: '/suppliers', icon: Truck,           label: 'Proveedores' },
  { to: '/purchases', icon: ShoppingCart,    label: 'Compras' },
  { to: '/warehouse', icon: Package,         label: 'Bodega' },
  { to: '/finance',   icon: DollarSign,      label: 'Finanzas' },
  { to: '/reports',   icon: FileBarChart,    label: 'Informes' },
]

const NAV_TOOLS = [
  { to: '/catalog',  icon: BookOpen,      label: 'Catálogo de Rubros' },
  { to: '/products', icon: Package,       label: 'Productos' },
  { to: '/config',   icon: Settings,      label: 'Configuración' },
]

export default function AppLayout() {
  const { user, logout }  = useAuthStore()
  const { sidebarOpen, toggleSidebar, toast } = useUIStore()
  const navigate = useNavigate()

  const { data: alertData } = useQuery({
    queryKey: ['alerts-count'],
    queryFn:  () => alertsApi.getAll({ unread_only: true, limit: 1 }),
    refetchInterval: 60_000,
  })
  const unread = alertData?.data?.data?.total || 0

  const handleLogout = () => {
    logout(); navigate('/login')
    toast({ title: 'Sesión cerrada' })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className={cn(
        'flex flex-col border-r border-border bg-card transition-all duration-300 relative z-20',
        sidebarOpen ? 'w-56' : 'w-16'
      )}>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-navy-950" />
          </div>
          {sidebarOpen && (
            <span className="font-display font-bold text-base tracking-tight text-foreground">
              Civil<span className="text-amber-500">Desk</span>
            </span>
          )}
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_MAIN.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => cn('nav-item', isActive && 'active')}>
              <Icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </NavLink>
          ))}

          <div className={cn('my-2 border-t border-border', sidebarOpen ? 'mx-2' : 'mx-1')} />

          {NAV_TOOLS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => cn('nav-item', isActive && 'active')}>
              <Icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-border space-y-0.5">
          {sidebarOpen && (
            <div className="px-3 py-2 mb-1">
              <p className="text-xs font-medium text-foreground truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.role?.name || 'Admin'}</p>
            </div>
          )}
          <button onClick={handleLogout}
            className="nav-item w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Salir</span>}
          </button>
        </div>

        <button onClick={toggleSidebar}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border
                     flex items-center justify-center text-muted-foreground hover:text-foreground
                     hover:bg-secondary transition-all z-30">
          {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm
                           flex items-center justify-end px-6 gap-3 shrink-0">
          <button className="relative btn-ghost p-2" onClick={() => navigate('/dashboard')}>
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500
                               text-white text-[10px] font-bold flex items-center justify-center animate-pulse-slow">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30
                          flex items-center justify-center text-amber-400 font-bold text-sm">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-6 animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

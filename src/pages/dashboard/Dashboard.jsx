import { useQuery } from '@tanstack/react-query'
import { financeApi, alertsApi, worksApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, HardHat,
  Package, AlertTriangle, CheckCircle2, Clock,
  ArrowUpRight, Zap,
} from 'lucide-react'
import {
  formatCurrency, formatPct, formatDate,
  workStatusLabel, alertSeverityColor, progressColor, cn,
} from '../../utils/helpers'

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, trend, delay = '' }) {
  return (
    <div className={cn('stat-card animate-fade-up', delay)}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
          <Icon className="w-4 h-4" />
        </div>
        {trend != null && (
          <span className={cn('flex items-center gap-1 text-xs font-medium',
            trend >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
            {trend >= 0
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="font-num text-2xl font-bold text-foreground mb-0.5">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Custom Tooltip for charts ─────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return (
    <div className="glass-card p-3 text-xs border border-border shadow-lg">
      <p className="text-muted-foreground mb-2 font-medium">{months[(label||1)-1]}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-num font-medium text-foreground">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const currentYear = new Date().getFullYear()

  const { data: summary } = useQuery({
    queryKey: ['finance-summary'],
    queryFn:  () => financeApi.getSummary(),
  })

  const { data: cashflow } = useQuery({
    queryKey: ['cashflow', currentYear],
    queryFn:  () => financeApi.getCashflow({ year: currentYear }),
  })

  const { data: worksData } = useQuery({
    queryKey: ['works-list'],
    queryFn:  () => worksApi.getAll({ status: 'ACTIVE', limit: 6 }),
  })

  const { data: alertsData } = useQuery({
    queryKey: ['alerts-dashboard'],
    queryFn:  () => alertsApi.getAll({ limit: 5 }),
    refetchInterval: 60_000,
  })

  const fin     = summary?.data?.data
  const cfRows  = cashflow?.data?.data || []
  const works   = worksData?.data?.data || []
  const alerts  = alertsData?.data?.data?.alerts || []

  // PostgreSQL devuelve números como strings — forzar conversión
  const totalIncome   = parseFloat(fin?.total_income   || 0)
  const totalExpense  = parseFloat(fin?.total_expense  || 0)
  const balance       = parseFloat(fin?.balance        || 0)
  const wSavings      = parseFloat(fin?.warehouse_savings || 0)

  // Build 12-month cashflow (fill empty months with 0)
  const cfData = Array.from({ length: 12 }, (_, i) => {
    const found = cfRows.find(r => r.month === i + 1)
    return { month: i + 1, income: parseFloat(found?.income || 0), expense: parseFloat(found?.expense || 0), net: parseFloat(found?.net || 0) }
  })

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-display font-bold text-foreground">
          Buenos días, {user?.first_name} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Resumen ejecutivo — {new Date().toLocaleDateString('es-EC', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Ingresos del período"
          value={formatCurrency(totalIncome)}
          icon={TrendingUp}
          color="bg-emerald-500/15 text-emerald-400"
          delay="animate-fade-up"
        />
        <StatCard
          label="Egresos del período"
          value={formatCurrency(totalExpense)}
          icon={TrendingDown}
          color="bg-rose-500/15 text-rose-400"
          delay="animate-fade-up-200"
        />
        <StatCard
          label="Balance neto"
          value={formatCurrency(balance)}
          icon={DollarSign}
          color="bg-blue-500/15 text-blue-400"
          delay="animate-fade-up-400"
        />
        <StatCard
          label="Ahorro en bodega"
          value={formatCurrency(wSavings)}
          sub="Material reutilizado"
          icon={Package}
          color="bg-amber-500/15 text-amber-400"
          delay="animate-fade-up-600"
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Cashflow chart - 2/3 */}
        <div className="lg:col-span-2 glass-card p-5 animate-fade-up-200">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display font-semibold text-foreground">Flujo de Caja {currentYear}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Ingresos vs. Egresos mensuales</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full bg-emerald-500" />Ingresos
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full bg-rose-500" />Egresos
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cfData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.20} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F43F5E" stopOpacity={0.20} />
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 18% 14%)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }}
                tickFormatter={m => ['E','F','M','A','M','J','J','A','S','O','N','D'][m-1]}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`}
                axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="income"  name="Ingresos"
                stroke="#10B981" strokeWidth={2} fill="url(#gIncome)" dot={false} />
              <Area type="monotone" dataKey="expense" name="Egresos"
                stroke="#F43F5E" strokeWidth={2} fill="url(#gExpense)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alerts - 1/3 */}
        <div className="glass-card p-5 animate-fade-up-400">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-foreground">Alertas</h2>
            {alerts.filter(a => !a.is_read).length > 0 && (
              <span className="badge bg-rose-500/15 text-rose-400 border border-rose-500/20">
                {alerts.filter(a => !a.is_read).length} nuevas
              </span>
            )}
          </div>
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mb-2" />
                <p className="text-sm text-muted-foreground">Sin alertas activas</p>
              </div>
            ) : alerts.map(alert => (
              <div key={alert.id}
                className={cn('p-3 rounded-lg border text-xs transition-all',
                  !alert.is_read ? 'border-border bg-secondary/50' : 'border-transparent bg-transparent opacity-60'
                )}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', alertSeverityColor[alert.severity]?.split(' ')[0])} />
                  <div>
                    <p className="font-medium text-foreground leading-tight">{alert.title}</p>
                    <p className="text-muted-foreground mt-0.5 leading-snug line-clamp-2">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active works progress */}
      <div className="glass-card p-5 animate-fade-up-400">
        <div className="section-header">
          <div>
            <h2 className="font-display font-semibold text-foreground">Obras Activas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Avance y estado en tiempo real</p>
          </div>
          <a href="/works" className="btn-ghost text-xs">
            Ver todas <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-3">
          {works.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <HardHat className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No hay obras activas</p>
            </div>
          ) : works.map(work => {
            const pct    = parseFloat(work.actual_progress || 0)
            const status = workStatusLabel[work.status] || workStatusLabel.ACTIVE
            return (
              <div key={work.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50
                           transition-colors cursor-pointer group"
                onClick={() => window.location.href = `/works/${work.id}`}
              >
                {/* Name + client */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-amber-400 transition-colors">
                      {work.name}
                    </p>
                    <span className={cn('badge border text-[10px] shrink-0', status.color)}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {work.client?.name || '—'} · Fin est. {formatDate(work.estimated_end)}
                  </p>
                </div>

                {/* Progress */}
                <div className="w-32 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Avance</span>
                    <span className="font-num text-xs font-semibold text-foreground">{formatPct(pct)}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={cn('progress-fill', progressColor(pct))}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Budget */}
                <div className="text-right shrink-0 hidden md:block">
                  <p className="font-num text-sm font-semibold text-foreground">
                    {formatCurrency(work.initial_budget)}
                  </p>
                  <p className="text-xs text-muted-foreground">presupuesto</p>
                </div>

                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-400 transition-colors shrink-0" />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

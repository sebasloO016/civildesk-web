import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { worksApi } from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import {
  ArrowLeft, HardHat, DollarSign, FileText,
  BarChart2, Calendar, Package, TrendingUp,
  AlertTriangle, CheckCircle2, Clock, Plus,
  Camera, ShoppingCart, Edit2,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts'
import {
  formatCurrency, formatPct, formatDate,
  workStatusLabel, progressColor, cn,
} from '../../utils/helpers'

import SubcontractsTab  from './SubcontractsTab'
import GanttTab          from './GanttTab'
import WorkStockTab      from './WorkStockTab'
import ReportsTab        from './ReportsTab'
import CertificatesTab   from './CertificatesTab'
import WorkFinanceTab    from './WorkFinanceTab'
import CloseWorkModal    from './CloseWorkModal'

const TABS = [
  { key: 'overview',      label: 'Resumen',       icon: HardHat },
  { key: 'budget',        label: 'Presupuesto',   icon: DollarSign },
  { key: 'reports',       label: 'Reportes',      icon: FileText },
  { key: 'subcontracts',  label: 'Subcontratos',  icon: TrendingUp },
  { key: 'certificates',  label: 'Certificados',  icon: CheckCircle2 },
  { key: 'stock',         label: 'Stock Obra',    icon: Package },
  { key: 'schedule',      label: 'Gantt',         icon: Calendar },
  { key: 'finance',       label: 'Finanzas',      icon: DollarSign },
]

// ── Curve S Chart ─────────────────────────────────────────────
function CurveSChart({ workId }) {
  const { data } = useQuery({
    queryKey: ['curve-s', workId],
    queryFn:  () => worksApi.getCurveS(workId),
  })
  const rows = data?.data?.data || []

  if (!rows.length) return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
      Sin datos de avance registrados aún
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 18% 14%)" vertical={false} />
        <XAxis dataKey="snapshot_date" tick={{ fontSize: 10, fill: 'hsl(215 16% 47%)' }}
          tickFormatter={d => formatDate(d, { day:'numeric', month:'short' })}
          axisLine={false} tickLine={false} />
        <YAxis domain={[0,100]} tick={{ fontSize: 10, fill: 'hsl(215 16% 47%)' }}
          tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v, name) => [`${parseFloat(v).toFixed(1)}%`, name === 'planned_progress' ? 'Planificado' : 'Real']}
          contentStyle={{ background: 'hsl(220 22% 9%)', border: '1px solid hsl(220 18% 14%)', borderRadius: '8px', fontSize: 11 }}
        />
        <Legend iconType="circle" iconSize={8}
          formatter={v => v === 'planned_progress' ? 'Planificado' : 'Avance Real'}
          wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="planned_progress" stroke="#6366F1"
          strokeWidth={2} strokeDasharray="4 4" dot={false} />
        <Line type="monotone" dataKey="actual_progress"  stroke="#10B981"
          strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ── Budget tab ────────────────────────────────────────────────
function BudgetTab({ work }) {
  const { data } = useQuery({
    queryKey: ['work-budget', work.id],
    queryFn:  () => worksApi.getBudget(work.id),
  })
  const budget = data?.data?.data
  const items  = work.items || []

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      {budget && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Presupuesto inicial', value: formatCurrency(budget.initial_budget?.total || 0), color: 'text-blue-400' },
            { label: 'Costo real actual',   value: formatCurrency(budget.real_cost || 0),             color: 'text-rose-400' },
            { label: 'Ahorro de bodega',    value: formatCurrency(budget.warehouse_savings || 0),     color: 'text-amber-400' },
            { label: 'Avance ponderado',    value: formatPct(budget.actual_progress || 0),            color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="glass-card p-4">
              <p className={cn('font-num text-xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Burn rate alert */}
      {budget?.burn_rate?.is_over && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-400">Alerta de sobrecosto</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              El gasto real supera el esperado en {formatPct(budget.burn_rate.overrun_pct)}.
              Costo esperado: {formatCurrency(budget.burn_rate.expected_cost)}
            </p>
          </div>
        </div>
      )}

      {/* Items table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm text-foreground">Rubros de Obra</h3>
          <button className="btn-ghost text-xs"><Plus className="w-3 h-3" /> Agregar rubro</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Descripción','Unidad','Cant. Inicial','Cant. Real','P. Unitario','Total Real','Avance'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Sin rubros registrados</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="table-row">
                  <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">{item.description}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                  <td className="px-4 py-3 font-num">{item.initial_qty}</td>
                  <td className="px-4 py-3 font-num">{item.real_qty}</td>
                  <td className="px-4 py-3 font-num">{formatCurrency(item.unit_price)}</td>
                  <td className="px-4 py-3 font-num font-semibold">{formatCurrency(item.real_total)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="progress-bar w-16">
                        <div className={cn('progress-fill', progressColor(item.progress_pct))}
                          style={{ width: `${item.progress_pct}%` }} />
                      </div>
                      <span className="font-num text-foreground">{formatPct(item.progress_pct)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function WorkDetail() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const [tab, setTab]       = useState('overview')
  const [showClose, setShowClose] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['work', id],
    queryFn:  () => worksApi.getOne(id),
  })

  const work   = data?.data?.data
  const status = work ? (workStatusLabel[work.status] || workStatusLabel.ACTIVE) : null
  const pct    = parseFloat(work?.actual_progress || 0)

  if (isLoading) return (
    <div className="space-y-4 max-w-6xl">
      <div className="shimmer h-8 rounded w-64" />
      <div className="shimmer h-32 rounded-xl" />
    </div>
  )

  if (!work) return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-muted-foreground">Obra no encontrada</p>
      <button onClick={() => navigate('/works')} className="btn-primary mt-4">Volver</button>
    </div>
  )

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Header */}
      <div className="animate-fade-up">
        <button onClick={() => navigate('/works')} className="btn-ghost text-xs mb-4 -ml-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Obras
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-display font-bold text-foreground">{work.name}</h1>
              <span className={cn('badge border', status.color)}>{status.label}</span>
            </div>
            <p className="text-muted-foreground text-sm">
              {work.client?.name || '—'} · {work.location || 'Sin ubicación'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-num text-2xl font-bold text-foreground">
              {formatCurrency(work.initial_budget)}
            </p>
            <p className="text-xs text-muted-foreground">Presupuesto inicial</p>
            {work.status === 'ACTIVE' && (
              <button onClick={() => setShowClose(true)}
                className="mt-2 btn-ghost text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                Cerrar obra
              </button>
            )}
          </div>
        </div>

        {/* Master progress */}
        <div className="mt-5 glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Avance general de obra</span>
            <span className="font-num text-lg font-bold text-foreground">{formatPct(pct)}</span>
          </div>
          <div className="progress-bar h-2.5">
            <div className={cn('progress-fill', progressColor(pct))} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>Inicio: {formatDate(work.start_date)}</span>
            <span>Fin estimado: {formatDate(work.estimated_end)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 glass-card p-1 rounded-xl w-fit animate-fade-up-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-up-200">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Curve S */}
            <div className="glass-card p-5">
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">
                Curva S — Avance vs. Tiempo
              </h3>
              <CurveSChart workId={id} />
            </div>

            {/* Info */}
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-display font-semibold text-sm text-foreground">Información General</h3>
              {[
                { label: 'Ingeniero', value: work.assignedUser ? `${work.assignedUser.first_name} ${work.assignedUser.last_name}` : '—' },
                { label: 'Fecha inicio',    value: formatDate(work.start_date) },
                { label: 'Fin estimado',    value: formatDate(work.estimated_end) },
                { label: 'Presupuesto',     value: formatCurrency(work.initial_budget) },
                { label: 'Costo real',      value: formatCurrency(work.real_cost), highlight: true },
                { label: 'Utilidad %',      value: `${work.utility_pct}%` },
                { label: 'Imprevistos %',   value: `${work.contingency_pct}%` },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span className={cn('text-xs font-medium font-num', row.highlight ? 'text-amber-400' : 'text-foreground')}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'budget'        && <BudgetTab work={work} />}
        {tab === 'reports'       && <ReportsTab workId={id} />}
        {tab === 'subcontracts'  && <SubcontractsTab workId={id} />}
        {tab === 'certificates'  && <CertificatesTab work={work} />}
        {tab === 'stock'         && <WorkStockTab workId={id} />}
        {tab === 'schedule'      && <GanttTab work={work} />}
        {tab === 'finance'       && <WorkFinanceTab workId={id} work={work} />}
      </div>

      {/* Close work modal */}
      {showClose && (
        <CloseWorkModal
          work={work}
          onClose={() => setShowClose(false)}
          onSuccess={() => navigate('/works')}
        />
      )}
    </div>
  )
}

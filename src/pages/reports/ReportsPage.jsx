import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { financeApi, worksApi, warehouseApi } from '../../services/api'
import api from '../../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts'
import {
  FileBarChart, TrendingUp, Package, DollarSign,
  HardHat, ArrowUpRight, ArrowDownRight, Download,
} from 'lucide-react'
import { formatCurrency, formatPct, formatDate, progressColor, cn } from '../../utils/helpers'

const TABS = [
  { key: 'financial', label: 'Financiero',       icon: DollarSign },
  { key: 'works',     label: 'Avance de Obras',  icon: HardHat },
  { key: 'purchases', label: 'Compras & Bodega', icon: Package },
]

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const COLORS = ['#1E5C8E','#10B981','#F0A500','#8B5CF6','#F43F5E','#06B6D4','#84CC16']

// ── Custom tooltip ────────────────────────────────────────────
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card p-3 text-xs border border-border shadow-lg">
      <p className="text-muted-foreground mb-2 font-medium">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-num font-medium text-foreground">
            {typeof p.value === 'number' && p.value > 100
              ? formatCurrency(p.value)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Financial Report ──────────────────────────────────────────
function FinancialReport() {
  const [year, setYear] = useState(new Date().getFullYear())

  const { data: summaryData } = useQuery({
    queryKey: ['report-summary'],
    queryFn:  () => financeApi.getSummary(),
  })

  const { data: cashflowData } = useQuery({
    queryKey: ['report-cashflow', year],
    queryFn:  () => financeApi.getCashflow({ year }),
  })

  const { data: worksData } = useQuery({
    queryKey: ['report-works-summary'],
    queryFn:  () => financeApi.getWorksSummary(),
  })

  const summary  = summaryData?.data?.data
  const cfRows   = cashflowData?.data?.data || []
  const works    = worksData?.data?.data    || []

  const cfData = Array.from({ length: 12 }, (_, i) => {
    const found = cfRows.find(r => r.month === i + 1)
    return {
      name: MONTHS[i],
      Ingresos: parseFloat(found?.income  || 0),
      Egresos:  parseFloat(found?.expense || 0),
      Neto:     parseFloat(found?.net     || 0),
    }
  })

  // Pie data from breakdown
  const breakdown = summary?.breakdown || []
  const pieExpense = breakdown.filter(b => b.type === 'EXPENSE').map(b => ({
    name: {
      MATERIAL_PURCHASE: 'Materiales',
      SUBCONTRACT:       'Subcontratos',
      EXTRA:             'Otros gastos',
      ADVANCE_SUPPLIER:  'Anticipos',
    }[b.category] || b.category,
    value: parseFloat(b.total),
  }))

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos totales',  value: formatCurrency(summary?.total_income  || 0), icon: ArrowUpRight,   color: 'text-emerald-400 bg-emerald-500/15' },
          { label: 'Egresos totales',   value: formatCurrency(summary?.total_expense || 0), icon: ArrowDownRight, color: 'text-rose-400 bg-rose-500/15' },
          { label: 'Balance',           value: formatCurrency(summary?.balance       || 0), icon: DollarSign,     color: 'text-blue-400 bg-blue-500/15' },
          { label: 'Ahorro en bodega',  value: formatCurrency(summary?.warehouse_savings || 0), icon: Package, color: 'text-amber-400 bg-amber-500/15' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="font-num text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Cashflow + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground">Flujo de Caja {year}</h3>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}
              className="field-input py-1 text-xs w-24">
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cfData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 18% 14%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(215 16% 47%)' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="Ingresos" fill="#10B981" radius={[3,3,0,0]} maxBarSize={18} />
              <Bar dataKey="Egresos"  fill="#F43F5E" radius={[3,3,0,0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Egresos por Categoría</h3>
          {pieExpense.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieExpense} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value">
                  {pieExpense.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: 'hsl(220 22% 9%)', border: '1px solid hsl(220 18% 14%)', borderRadius: '8px', fontSize: 11 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sin datos</div>
          )}
        </div>
      </div>

      {/* Works ranking */}
      {works.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-display font-semibold text-foreground">Ranking de Rentabilidad por Obra</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Obra','Estado','Ingresos','Egresos','Balance','Presupuesto inicial'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {works.sort((a,b) => parseFloat(b.balance) - parseFloat(a.balance)).map(w => (
                <tr key={w.work_id} className="table-row">
                  <td className="px-4 py-3 font-medium text-foreground max-w-[160px] truncate">{w.work_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{w.status}</td>
                  <td className="px-4 py-3 font-num text-emerald-400">{formatCurrency(w.total_income)}</td>
                  <td className="px-4 py-3 font-num text-rose-400">{formatCurrency(w.total_expense)}</td>
                  <td className={cn('px-4 py-3 font-num font-bold',
                    parseFloat(w.balance) >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                    {formatCurrency(w.balance)}
                  </td>
                  <td className="px-4 py-3 font-num">{formatCurrency(w.initial_budget)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Works Progress Report ─────────────────────────────────────
function WorksProgressReport() {
  const { data } = useQuery({
    queryKey: ['report-all-works'],
    queryFn:  () => worksApi.getAll({ limit: 50 }),
  })

  const works = data?.data?.data || []

  const statusGroups = {
    ACTIVE:     works.filter(w => w.status === 'ACTIVE'),
    PAUSED:     works.filter(w => w.status === 'PAUSED'),
    FINISHED:   works.filter(w => w.status === 'FINISHED'),
    CLOSED:     works.filter(w => w.status === 'CLOSED'),
  }

  const avgProgress = works.length
    ? works.reduce((s, w) => s + parseFloat(w.actual_progress || 0), 0) / works.length
    : 0

  // Semáforo: verde ≥80%, amarillo ≥50%, rojo <50%
  const getStatus = (pct, planned) => {
    const diff = pct - (planned || pct)
    if (diff >= 0)    return { label: 'En tiempo',       color: 'text-emerald-400', bg: 'bg-emerald-500' }
    if (diff >= -10)  return { label: 'Leve retraso',    color: 'text-amber-400',   bg: 'bg-amber-500' }
    return              { label: 'Retraso crítico',    color: 'text-rose-400',    bg: 'bg-rose-500' }
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="font-num text-2xl font-bold text-foreground">{works.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total obras</p>
        </div>
        <div className="glass-card p-4">
          <p className="font-num text-2xl font-bold text-emerald-400">{statusGroups.ACTIVE.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Activas</p>
        </div>
        <div className="glass-card p-4">
          <p className="font-num text-2xl font-bold text-foreground">{formatPct(avgProgress)}</p>
          <p className="text-xs text-muted-foreground mt-1">Avance promedio</p>
        </div>
        <div className="glass-card p-4">
          <p className="font-num text-2xl font-bold text-blue-400">{statusGroups.FINISHED.length + statusGroups.CLOSED.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Terminadas</p>
        </div>
      </div>

      {/* Progress chart */}
      {works.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Avance por Obra</h3>
          <ResponsiveContainer width="100%" height={Math.max(120, works.length * 40)}>
            <BarChart data={works.map(w => ({
              name:    w.name.length > 25 ? w.name.substring(0,25) + '...' : w.name,
              Avance:  parseFloat(w.actual_progress || 0),
              Planificado: parseFloat(w.planned_progress || 0),
            }))} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 18% 14%)" horizontal={false} />
              <XAxis type="number" domain={[0,100]} tick={{ fontSize: 10, fill: 'hsl(215 16% 47%)' }}
                tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={180}
                tick={{ fontSize: 10, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} formatter={v => `${v.toFixed(1)}%`} />
              <Bar dataKey="Planificado" fill="#6366F1" radius={[0,3,3,0]} maxBarSize={8} opacity={0.5} />
              <Bar dataKey="Avance"      fill="#10B981" radius={[0,3,3,0]} maxBarSize={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detail table with semáforo */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">
            Detalle de Obras — Semáforo de Estado
          </h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Obra','Cliente','Avance Real','Avance Plan.','Estado','Inicio','Fin Est.','Presupuesto'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {works.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Sin obras</td></tr>
            ) : works.map(work => {
              const pct    = parseFloat(work.actual_progress || 0)
              const planned = parseFloat(work.planned_progress || 0)
              const st     = getStatus(pct, planned)
              return (
                <tr key={work.id} className="table-row">
                  <td className="px-4 py-3 font-medium text-foreground max-w-[150px] truncate">{work.name}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[120px] truncate">{work.client?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="progress-bar w-16">
                        <div className={cn('progress-fill', progressColor(pct))}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-num font-semibold">{formatPct(pct)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-num text-muted-foreground">{formatPct(planned)}</td>
                  <td className="px-4 py-3">
                    <div className={cn('flex items-center gap-1.5 text-xs font-medium', st.color)}>
                      <span className={cn('w-2 h-2 rounded-full', st.bg)} />
                      {st.label}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(work.start_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(work.estimated_end)}</td>
                  <td className="px-4 py-3 font-num">{formatCurrency(work.initial_budget)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Purchases & Warehouse Report ──────────────────────────────
function PurchasesWarehouseReport() {
  const { data: stockData } = useQuery({
    queryKey: ['report-stock'],
    queryFn:  () => warehouseApi.getStock({}),
  })

  const { data: effData } = useQuery({
    queryKey: ['report-efficiency'],
    queryFn:  () => warehouseApi.getEfficiency({}),
  })

  const stock      = stockData?.data?.data || []
  const efficiency = effData?.data?.data   || []

  const totalValue    = stock.reduce((s, i) => s + parseFloat(i.available_value || 0), 0)
  const totalSavings  = efficiency.reduce((s, r) => s + parseFloat(r.total_savings || 0), 0)
  const avgEfficiency = efficiency.length
    ? efficiency.reduce((s, r) => s + parseFloat(r.material_efficiency_pct || 0), 0) / efficiency.length
    : 0

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="font-num text-xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-muted-foreground mt-1">Valor inventario bodega</p>
        </div>
        <div className="glass-card p-4">
          <p className="font-num text-xl font-bold text-emerald-400">{formatCurrency(totalSavings)}</p>
          <p className="text-xs text-muted-foreground mt-1">Ahorro total reutilización</p>
        </div>
        <div className="glass-card p-4">
          <p className="font-num text-xl font-bold text-amber-400">{formatPct(avgEfficiency)}</p>
          <p className="text-xs text-muted-foreground mt-1">Eficiencia promedio</p>
        </div>
        <div className="glass-card p-4">
          <p className="font-num text-xl font-bold text-foreground">
            {stock.filter(s => s.below_minimum).length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Items bajo mínimo</p>
        </div>
      </div>

      {/* Inventory valorized */}
      {stock.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-display font-semibold text-foreground">Inventario Valorizado — Bodega</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Producto','Almacén','Cantidad','Costo Prom.','Valor Total','Estado'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stock.map((item, i) => (
                <tr key={i} className={cn('table-row', item.below_minimum && 'bg-rose-500/5')}>
                  <td className="px-4 py-3 font-medium text-foreground">{item.product_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.warehouse_name}</td>
                  <td className="px-4 py-3 font-num">{parseFloat(item.available_quantity).toFixed(2)} {item.unit}</td>
                  <td className="px-4 py-3 font-num">{formatCurrency(item.average_cost)}</td>
                  <td className="px-4 py-3 font-num font-bold text-amber-400">{formatCurrency(item.available_value)}</td>
                  <td className="px-4 py-3">
                    {item.below_minimum
                      ? <span className="badge bg-rose-500/15 text-rose-400 border border-rose-500/20">Bajo mínimo</span>
                      : <span className="badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-secondary/30">
                <td colSpan={4} className="px-4 py-3 font-semibold text-foreground text-xs">TOTAL INVENTARIO</td>
                <td className="px-4 py-3 font-num font-bold text-amber-400">{formatCurrency(totalValue)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Efficiency by work */}
      {efficiency.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-display font-semibold text-foreground">Ahorro por Reutilización de Materiales</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cada vez que se asigna material de bodega a una obra en lugar de comprarlo
            </p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Obra','Comprado','Reutilizado','Ahorro $','Eficiencia %','Desperdicio %'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {efficiency.map((row, i) => (
                <tr key={i} className="table-row">
                  <td className="px-4 py-3 font-medium text-foreground max-w-[160px] truncate">{row.work_name}</td>
                  <td className="px-4 py-3 font-num">{formatCurrency(row.total_purchased_cost)}</td>
                  <td className="px-4 py-3 font-num text-violet-400">{formatCurrency(row.total_reused_from_warehouse)}</td>
                  <td className="px-4 py-3 font-num font-bold text-emerald-400">{formatCurrency(row.total_savings)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="progress-bar w-12">
                        <div className="progress-fill bg-emerald-500"
                          style={{ width: `${Math.min(row.material_efficiency_pct, 100)}%` }} />
                      </div>
                      <span className={cn('font-num font-semibold',
                        row.material_efficiency_pct >= 80 ? 'text-emerald-400' :
                        row.material_efficiency_pct >= 60 ? 'text-amber-400' : 'text-rose-400')}>
                        {formatPct(row.material_efficiency_pct)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-num text-rose-400">{formatPct(row.waste_pct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main Reports Page ─────────────────────────────────────────
export default function ReportsPage() {
  const [tab, setTab] = useState('financial')

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="section-header animate-fade-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Informes & Reportería</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Análisis financiero · Avance de obras · Compras y bodega
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 glass-card p-1 rounded-xl w-fit animate-fade-up-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <div className="animate-fade-up-200">
        {tab === 'financial' && <FinancialReport />}
        {tab === 'works'     && <WorksProgressReport />}
        {tab === 'purchases' && <PurchasesWarehouseReport />}
      </div>
    </div>
  )
}

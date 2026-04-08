import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, TrendingDown, Filter, X,
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '../../utils/helpers'

const workFinanceApi = {
  getSummary:     (wid) => api.get(`/finance/summary?work_id=${wid}`),
  getTransactions:(wid, page, filters) => {
    const params = new URLSearchParams({
      work_id: wid, page, limit: 12,
      ...(filters.type      && { type:      filters.type }),
      ...(filters.category  && { category:  filters.category }),
      ...(filters.date_from && { date_from: filters.date_from }),
      ...(filters.date_to   && { date_to:   filters.date_to }),
    })
    return api.get(`/finance/transactions?${params}`)
  },
  getCashflow:    (wid) => api.get(`/finance/cashflow?work_id=${wid}&year=${new Date().getFullYear()}`),
}

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const COLORS  = ['#F0A500','#F43F5E','#8B5CF6','#06B6D4','#84CC16','#EC4899']

const TX_LABELS = {
  ADVANCE_CLIENT:   'Anticipo cliente',
  PARTIAL_PAYMENT:  'Pago parcial',
  FINAL_PAYMENT:    'Pago final',
  ADVANCE_SUPPLIER: 'Anticipo proveedor',
  MATERIAL_PURCHASE:'Compra material',
  SUBCONTRACT:      'Subcontrato',
  EXTRA:            'Gasto extra',
}

const CATEGORIES_INCOME  = ['ADVANCE_CLIENT','PARTIAL_PAYMENT','FINAL_PAYMENT']
const CATEGORIES_EXPENSE = ['ADVANCE_SUPPLIER','MATERIAL_PURCHASE','SUBCONTRACT','EXTRA']

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card p-3 text-xs border border-border shadow-lg">
      <p className="text-muted-foreground mb-2 font-medium">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-num font-medium text-foreground">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// Recibe totalObra (recursos + subcontratos) desde WorkDetail
export default function WorkFinanceTab({ workId, work, totalObra, subTotal }) {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ type: '', category: '', date_from: '', date_to: '' })
  const [showFilters, setShowFilters] = useState(false)

  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  const setFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({ type: '', category: '', date_from: '', date_to: '' })
    setPage(1)
  }

  // Categorías disponibles según el tipo seleccionado
  const availableCategories = filters.type === 'INCOME'
    ? CATEGORIES_INCOME
    : filters.type === 'EXPENSE'
    ? CATEGORIES_EXPENSE
    : [...CATEGORIES_INCOME, ...CATEGORIES_EXPENSE]

  const { data: summaryData } = useQuery({
    queryKey: ['work-finance-summary', workId],
    queryFn:  () => workFinanceApi.getSummary(workId),
  })

  const { data: txData } = useQuery({
    queryKey: ['work-finance-transactions', workId, page, filters],
    queryFn:  () => workFinanceApi.getTransactions(workId, page, filters),
  })

  const { data: cfData } = useQuery({
    queryKey: ['work-finance-cashflow', workId],
    queryFn:  () => workFinanceApi.getCashflow(workId),
  })

  const summary    = summaryData?.data?.data
  const txs        = txData?.data?.data || []
  const pagination = txData?.data?.pagination
  const cf         = cfData?.data?.data || []

  const cfFull = Array.from({ length: 12 }, (_, i) => {
    const found = cf.find(r => r.month === i + 1)
    return {
      name:     MONTHS[i],
      Ingresos: parseFloat(found?.income  || 0),
      Egresos:  parseFloat(found?.expense || 0),
    }
  })

  const breakdown        = summary?.breakdown || []
  const expenseBreakdown = breakdown
    .filter(b => b.type === 'EXPENSE')
    .map(b => ({ name: TX_LABELS[b.category] || b.category, value: parseFloat(b.total) }))

  // Presupuesto total = recursos propios + subcontratos
  const budget   = totalObra || parseFloat(work?.initial_budget || 0)
  const realCost = parseFloat(summary?.total_expense || 0)
  const progress = parseFloat(work?.actual_progress || 0)
  const expected = budget * (progress / 100)
  const burnPct  = expected > 0 ? ((realCost - expected) / expected) * 100 : 0
  const isOverBurning = burnPct > 5

  return (
    <div className="space-y-5">

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Ingresos obra',   value: formatCurrency(summary?.total_income  || 0), color: 'text-emerald-400', icon: ArrowUpRight },
          { label: 'Egresos obra',    value: formatCurrency(summary?.total_expense || 0), color: 'text-rose-400',    icon: ArrowDownRight },
          { label: 'Balance obra',    value: formatCurrency(summary?.balance       || 0), color: 'text-blue-400',    icon: DollarSign },
          { label: 'Presupuesto total', value: formatCurrency(budget),                   color: 'text-muted-foreground', icon: TrendingUp },
        ].map(s => (
          <div key={s.label} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <s.icon className={cn('w-4 h-4', s.color)} />
            </div>
            <p className={cn('font-num text-xl font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Burn rate alert */}
      {isOverBurning && (
        <div className="glass-card p-4 border-rose-500/30 bg-rose-500/5 flex items-start gap-3">
          <TrendingDown className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-400">
              Alerta de quema de presupuesto — {burnPct.toFixed(1)}% sobre lo esperado
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gasto real: {formatCurrency(realCost)} · Esperado para {progress.toFixed(1)}% de avance: {formatCurrency(expected)}
            </p>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cashflow bar */}
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Flujo de Caja — Esta Obra</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cfFull} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 18% 14%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(215 16% 47%)' }}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="Ingresos" fill="#10B981" radius={[3,3,0,0]} maxBarSize={16} />
              <Bar dataKey="Egresos"  fill="#F43F5E" radius={[3,3,0,0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense pie */}
        <div className="glass-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Egresos por Categoría</h3>
          {expenseBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={expenseBreakdown} cx="50%" cy="50%"
                  innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {expenseBreakdown.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)}
                  contentStyle={{ background: 'hsl(220 22% 9%)', border: '1px solid hsl(220 18% 14%)', borderRadius: '8px', fontSize: 11 }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-xs text-muted-foreground">
              Sin egresos registrados
            </div>
          )}
        </div>
      </div>

      {/* Transacciones con filtros */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <h3 className="font-display font-semibold text-sm text-foreground shrink-0">
            Transacciones de esta Obra
          </h3>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 btn-ghost py-1 px-2">
                <X className="w-3 h-3" /> Limpiar ({activeFiltersCount})
              </button>
            )}
            <button onClick={() => setShowFilters(f => !f)}
              className={cn('btn-ghost text-xs flex items-center gap-1.5',
                showFilters && 'bg-primary/10 text-primary')}>
              <Filter className="w-3.5 h-3.5" />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="p-4 border-b border-border bg-secondary/20 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Tipo */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo</label>
              <select className="field-input mt-1 text-xs"
                value={filters.type}
                onChange={e => { setFilter('type', e.target.value); setFilter('category', '') }}>
                <option value="">Todos</option>
                <option value="INCOME">Ingresos</option>
                <option value="EXPENSE">Egresos</option>
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Categoría</label>
              <select className="field-input mt-1 text-xs"
                value={filters.category}
                onChange={e => setFilter('category', e.target.value)}>
                <option value="">Todas</option>
                {availableCategories.map(c => (
                  <option key={c} value={c}>{TX_LABELS[c] || c}</option>
                ))}
              </select>
            </div>

            {/* Fecha desde */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Desde</label>
              <input type="date" className="field-input mt-1 text-xs"
                value={filters.date_from}
                onChange={e => setFilter('date_from', e.target.value)} />
            </div>

            {/* Fecha hasta */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Hasta</label>
              <input type="date" className="field-input mt-1 text-xs"
                value={filters.date_to}
                onChange={e => setFilter('date_to', e.target.value)} />
            </div>
          </div>
        )}
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Fecha','Tipo','Categoría','Descripción','Monto'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                Sin transacciones registradas para esta obra
              </td></tr>
            ) : txs.map(tx => (
              <tr key={tx.id} className="table-row">
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(tx.transaction_date)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {tx.type === 'INCOME'
                      ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                      : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
                    <span className={tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}>
                      {tx.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{TX_LABELS[tx.category] || tx.category}</td>
                <td className="px-4 py-3 text-foreground max-w-[220px] truncate">{tx.description}</td>
                <td className={cn('px-4 py-3 font-num font-bold',
                  tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400')}>
                  {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
            <button disabled={!pagination.hasPrev} onClick={() => setPage(p => p-1)}
              className="btn-ghost text-xs disabled:opacity-40">Anterior</button>
            <span className="text-xs text-muted-foreground font-num">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button disabled={!pagination.hasNext} onClick={() => setPage(p => p+1)}
              className="btn-ghost text-xs disabled:opacity-40">Siguiente</button>
          </div>
        )}
      </div>
    </div>
  )
}
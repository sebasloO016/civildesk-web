import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { financeApi } from '../../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { DollarSign, TrendingUp, TrendingDown, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '../../utils/helpers'

const currentYear = new Date().getFullYear()

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const TX_CATEGORY_LABEL = {
  ADVANCE_CLIENT:   'Anticipo cliente',
  PARTIAL_PAYMENT:  'Pago parcial',
  FINAL_PAYMENT:    'Pago final',
  ADVANCE_SUPPLIER: 'Anticipo proveedor',
  MATERIAL_PURCHASE:'Compra material',
  SUBCONTRACT:      'Subcontrato',
  EXTRA:            'Gasto extra',
}

export default function FinancePage() {
  const [tab, setTab]  = useState('summary')
  const [txPage, setTxPage] = useState(1)

  const { data: summary } = useQuery({
    queryKey: ['finance-summary-page'],
    queryFn:  () => financeApi.getSummary(),
  })

  const { data: cashflow } = useQuery({
    queryKey: ['cashflow-page', currentYear],
    queryFn:  () => financeApi.getCashflow({ year: currentYear }),
  })

  const { data: worksSummary } = useQuery({
    queryKey: ['works-summary'],
    queryFn:  () => financeApi.getWorksSummary(),
    enabled:  tab === 'works',
  })

  const { data: txData } = useQuery({
    queryKey: ['transactions', txPage],
    queryFn:  () => financeApi.getTransactions({ page: txPage, limit: 15 }),
    enabled:  tab === 'transactions',
  })

  const fin  = summary?.data?.data
  const cf   = cashflow?.data?.data || []
  const works = worksSummary?.data?.data || []
  const txs   = txData?.data?.data || []
  const txPag = txData?.data?.pagination

  const cfFull = Array.from({ length: 12 }, (_, i) => {
    const found = cf.find(r => r.month === i + 1)
    return { month: MONTHS[i], income: parseFloat(found?.income||0), expense: parseFloat(found?.expense||0), net: parseFloat(found?.net||0) }
  })

  const TABS = [
    { key: 'summary',      label: 'Resumen' },
    { key: 'works',        label: 'Por Obra' },
    { key: 'transactions', label: 'Transacciones' },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="section-header animate-fade-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Finanzas</h1>
          <p className="text-muted-foreground text-sm mt-1">Control financiero consolidado de todas las obras</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up-200">
        {[
          { label: 'Ingresos totales',   value: formatCurrency(fin?.total_income||0),        icon: TrendingUp,   color: 'text-emerald-400 bg-emerald-500/15' },
          { label: 'Egresos totales',    value: formatCurrency(fin?.total_expense||0),       icon: TrendingDown, color: 'text-rose-400 bg-rose-500/15' },
          { label: 'Balance neto',       value: formatCurrency(fin?.balance||0),             icon: DollarSign,   color: 'text-blue-400 bg-blue-500/15' },
          { label: 'Ahorro en bodega',   value: formatCurrency(fin?.warehouse_savings||0),   icon: Package,      color: 'text-amber-400 bg-amber-500/15' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', s.color)}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="font-num text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Cashflow chart */}
      <div className="glass-card p-5 animate-fade-up-200">
        <h2 className="font-display font-semibold text-foreground mb-5">Flujo de Caja {currentYear}</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={cfFull} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 18% 14%)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }}
              tickFormatter={v => `$${(v/1000).toFixed(0)}k`}
              axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v, name) => [formatCurrency(v), name === 'income' ? 'Ingresos' : name === 'expense' ? 'Egresos' : 'Neto']}
              contentStyle={{ background: 'hsl(220 22% 9%)', border: '1px solid hsl(220 18% 14%)', borderRadius: '8px', fontSize: 11 }}
            />
            <Bar dataKey="income"  fill="#10B981" radius={[3,3,0,0]} maxBarSize={20} />
            <Bar dataKey="expense" fill="#F43F5E" radius={[3,3,0,0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 glass-card p-1 rounded-xl w-fit animate-fade-up-400">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Works summary */}
      {tab === 'works' && (
        <div className="glass-card overflow-hidden animate-fade-up">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Obra','Estado','Ingresos','Egresos','Balance','Ahorro Bodega','Presupuesto'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {works.length === 0
                ? <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Sin datos</td></tr>
                : works.map(w => (
                  <tr key={w.work_id} className="table-row">
                    <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate">{w.work_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{w.status}</td>
                    <td className="px-4 py-3 font-num text-emerald-400">{formatCurrency(w.total_income)}</td>
                    <td className="px-4 py-3 font-num text-rose-400">{formatCurrency(w.total_expense)}</td>
                    <td className={cn('px-4 py-3 font-num font-semibold',
                      parseFloat(w.balance) >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                      {formatCurrency(w.balance)}
                    </td>
                    <td className="px-4 py-3 font-num text-amber-400">{formatCurrency(w.warehouse_savings)}</td>
                    <td className="px-4 py-3 font-num">{formatCurrency(w.initial_budget)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Transactions */}
      {tab === 'transactions' && (
        <div className="space-y-3 animate-fade-up">
          <div className="glass-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Fecha','Tipo','Categoría','Descripción','Obra','Monto'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txs.length === 0
                  ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Sin transacciones</td></tr>
                  : txs.map(tx => (
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
                      <td className="px-4 py-3 text-muted-foreground">
                        {TX_CATEGORY_LABEL[tx.category] || tx.category}
                      </td>
                      <td className="px-4 py-3 text-foreground max-w-[200px] truncate">{tx.description}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[120px] truncate">{tx.work?.name || '—'}</td>
                      <td className={cn('px-4 py-3 font-num font-bold',
                        tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400')}>
                        {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          {txPag && txPag.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={!txPag.hasPrev} onClick={() => setTxPage(p => p-1)} className="btn-ghost disabled:opacity-40">Anterior</button>
              <span className="text-xs text-muted-foreground font-num">{txPag.page} / {txPag.totalPages}</span>
              <button disabled={!txPag.hasNext} onClick={() => setTxPage(p => p+1)} className="btn-ghost disabled:opacity-40">Siguiente</button>
            </div>
          )}
        </div>
      )}

      {tab === 'summary' && fin?.breakdown?.length > 0 && (
        <div className="glass-card overflow-hidden animate-fade-up">
          <div className="p-4 border-b border-border">
            <h3 className="font-display font-semibold text-sm text-foreground">Desglose por Categoría</h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Tipo','Categoría','Total','Transacciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fin.breakdown.map((b, i) => (
                <tr key={i} className="table-row">
                  <td className="px-4 py-3">
                    <span className={cn('badge', b.type === 'INCOME' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400')}>
                      {b.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{TX_CATEGORY_LABEL[b.category] || b.category}</td>
                  <td className={cn('px-4 py-3 font-num font-semibold',
                    b.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400')}>
                    {formatCurrency(b.total)}
                  </td>
                  <td className="px-4 py-3 font-num text-muted-foreground">{b.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

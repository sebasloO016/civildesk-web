import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { warehouseApi } from '../../services/api'
import { Package, TrendingUp, AlertTriangle, ArrowRightLeft, Zap, ArrowRight } from 'lucide-react'
import { formatCurrency, formatNumber, formatPct, formatDate, cn } from '../../utils/helpers'
import AssignFromWarehouseModal from '../works/AssignFromWarehouseModal'

const MOVEMENT_COLORS = {
  COMPRA:           'text-blue-400 bg-blue-500/15',
  CONSUMO_OBRA:     'text-emerald-400 bg-emerald-500/15',
  TRASLADO_BODEGA:  'text-amber-400 bg-amber-500/15',
  ASIGNACION_OBRA:  'text-violet-400 bg-violet-500/15',
  RESERVA:          'text-orange-400 bg-orange-500/15',
  AJUSTE:           'text-gray-400 bg-gray-500/15',
}

const TABS = [
  { key: 'stock',      label: 'Stock General', icon: Package },
  { key: 'movements',  label: 'Movimientos',   icon: ArrowRightLeft },
  { key: 'efficiency', label: 'Eficiencia KPI', icon: Zap },
]

export default function WarehousePage() {
  const [tab, setTab]          = useState('stock')
  const [movPage, setMovPage]  = useState(1)
  const [showAssign, setShowAssign] = useState(false)

  const { data: stockData } = useQuery({
    queryKey: ['warehouse-stock', 'GENERAL'],
    queryFn:  () => warehouseApi.getStock({ type: 'GENERAL' }),
    enabled:  tab === 'stock',
  })
  const { data: movData } = useQuery({
    queryKey: ['warehouse-movements', movPage],
    queryFn:  () => warehouseApi.getMovements({ page: movPage, limit: 15 }),
    enabled:  tab === 'movements',
  })
  const { data: effData } = useQuery({
    queryKey: ['warehouse-efficiency'],
    queryFn:  () => warehouseApi.getEfficiency({}),
    enabled:  tab === 'efficiency',
  })

  const stock      = stockData?.data?.data || []
  const movements  = movData?.data?.data   || []
  const pagination = movData?.data?.pagination
  const efficiency = effData?.data?.data   || []

  const lowStock   = stock.filter(s => s.below_minimum)
  const totalValue = stock.reduce((sum, s) => sum + parseFloat(s.available_value || 0), 0)
  const hasStock   = stock.some(s => parseFloat(s.available_quantity) > 0)

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="section-header animate-fade-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Bodega & Stock</h1>
          <p className="text-muted-foreground text-sm mt-1">Inventario · Trazabilidad · KPIs de material</p>
        </div>
        {hasStock && (
          <button onClick={() => setShowAssign(true)} className="btn-primary">
            <ArrowRight className="w-4 h-4" /> Asignar a obra
          </button>
        )}
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-3 gap-4 animate-fade-up-200">
        <div className="stat-card">
          <Package className="w-5 h-5 text-blue-400 mb-2" />
          <p className="font-num text-xl font-bold text-foreground">{stock.length}</p>
          <p className="text-xs text-muted-foreground">Items en bodega</p>
        </div>
        <div className="stat-card">
          <TrendingUp className="w-5 h-5 text-amber-400 mb-2" />
          <p className="font-num text-xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-muted-foreground">Valor disponible total</p>
        </div>
        <div className="stat-card">
          <AlertTriangle className={cn('w-5 h-5 mb-2', lowStock.length ? 'text-rose-400' : 'text-emerald-400')} />
          <p className="font-num text-xl font-bold text-foreground">{lowStock.length}</p>
          <p className="text-xs text-muted-foreground">Items bajo mínimo</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 glass-card p-1 rounded-xl w-fit animate-fade-up-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Stock tab */}
      {tab === 'stock' && (
        <div className="glass-card overflow-hidden animate-fade-up">
          {lowStock.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-rose-500/10 border-b border-rose-500/20">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-xs text-rose-300">{lowStock.length} item(s) con stock por debajo del mínimo configurado</p>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Producto','Almacén','Disponible','Reservado','Total','Costo Prom.','Valor','Último Mov.','Estado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stock.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    Bodega vacía — los sobrantes aparecerán aquí al cerrar una obra
                  </td></tr>
                ) : stock.map((item, i) => (
                  <tr key={i} className={cn('table-row', item.below_minimum && 'bg-rose-500/5')}>
                    <td className="px-4 py-3 font-medium text-foreground">{item.product_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.warehouse_name}</td>
                    <td className="px-4 py-3 font-num font-semibold text-emerald-400">{formatNumber(item.available_quantity, 2)} {item.unit}</td>
                    <td className="px-4 py-3 font-num text-amber-400">{formatNumber(item.reserved_quantity, 2)}</td>
                    <td className="px-4 py-3 font-num">{formatNumber(item.quantity, 2)}</td>
                    <td className="px-4 py-3 font-num">{formatCurrency(item.average_cost)}</td>
                    <td className="px-4 py-3 font-num font-semibold">{formatCurrency(item.available_value)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(item.last_movement)}</td>
                    <td className="px-4 py-3">
                      {item.below_minimum
                        ? <span className="badge bg-rose-500/15 text-rose-400 border border-rose-500/20">Bajo mínimo</span>
                        : <span className="badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Movements tab */}
      {tab === 'movements' && (
        <div className="space-y-3 animate-fade-up">
          <div className="glass-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Fecha','Tipo','Producto','Cantidad','Costo Total','Origen','Destino','Obra'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Sin movimientos registrados</td></tr>
                ) : movements.map(m => (
                  <tr key={m.id} className="table-row">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(m.movement_date)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('badge text-[10px]', MOVEMENT_COLORS[m.movement_type] || 'text-gray-400 bg-gray-500/15')}>{m.movement_type}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{m.product?.name || '—'}</td>
                    <td className="px-4 py-3 font-num">{formatNumber(m.quantity, 2)} {m.product?.unit}</td>
                    <td className="px-4 py-3 font-num font-semibold">{formatCurrency(m.total_cost)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.fromWarehouse?.name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.toWarehouse?.name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[120px]">{m.work?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={!pagination.hasPrev} onClick={() => setMovPage(p => p-1)} className="btn-ghost disabled:opacity-40">Anterior</button>
              <span className="text-xs text-muted-foreground font-num">{pagination.page} / {pagination.totalPages}</span>
              <button disabled={!pagination.hasNext} onClick={() => setMovPage(p => p+1)} className="btn-ghost disabled:opacity-40">Siguiente</button>
            </div>
          )}
        </div>
      )}

      {/* Efficiency KPI tab */}
      {tab === 'efficiency' && (
        <div className="space-y-4 animate-fade-up">
          {efficiency.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 glass-card">
              <Zap className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Sin datos de eficiencia aún</p>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-display font-semibold text-sm text-foreground">Eficiencia de Material por Obra</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Eficiencia = Material consumido / Material comprado</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Obra','Ingeniero','Comprado','Consumido','Reutilizado','Ahorro $','Eficiencia %','Desperdicio %'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {efficiency.map((row, i) => (
                    <tr key={i} className="table-row">
                      <td className="px-4 py-3 font-medium text-foreground max-w-[150px] truncate">{row.work_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.engineer_name || '—'}</td>
                      <td className="px-4 py-3 font-num">{formatCurrency(row.total_purchased_cost)}</td>
                      <td className="px-4 py-3 font-num">{formatCurrency(row.total_consumed_cost)}</td>
                      <td className="px-4 py-3 font-num text-violet-400">{formatCurrency(row.total_reused_from_warehouse)}</td>
                      <td className="px-4 py-3 font-num font-semibold text-amber-400">{formatCurrency(row.total_savings)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="progress-bar w-16">
                            <div className="progress-fill bg-emerald-500" style={{ width: `${Math.min(row.material_efficiency_pct, 100)}%` }} />
                          </div>
                          <span className={cn('font-num font-semibold', row.material_efficiency_pct >= 80 ? 'text-emerald-400' : row.material_efficiency_pct >= 60 ? 'text-amber-400' : 'text-rose-400')}>
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
      )}

      {/* Assign from warehouse modal */}
      {showAssign && (
        <AssignFromWarehouseModal onClose={() => setShowAssign(false)} />
      )}
    </div>
  )
}

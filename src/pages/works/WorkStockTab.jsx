import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import {
  Package, TrendingDown, ArrowLeftRight,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { formatCurrency, formatNumber, formatDate, cn } from '../../utils/helpers'

const workWarehouseApi = {
  getStock:     (wid) => api.get(`/warehouses/stock?work_id=${wid}`),
  getMovements: (wid, page) => api.get(`/warehouses/movements?work_id=${wid}&page=${page}&limit=15`),
}

const MOVEMENT_COLORS = {
  COMPRA:          { color: 'text-blue-400',    bg: 'bg-blue-500/15',    label: 'Compra' },
  CONSUMO_OBRA:    { color: 'text-rose-400',    bg: 'bg-rose-500/15',    label: 'Consumo obra' },
  TRASLADO_BODEGA: { color: 'text-amber-400',   bg: 'bg-amber-500/15',   label: 'Traslado bodega' },
  ASIGNACION_OBRA: { color: 'text-violet-400',  bg: 'bg-violet-500/15',  label: 'Asignado desde bodega' },
  RESERVA:         { color: 'text-orange-400',  bg: 'bg-orange-500/15',  label: 'Reserva' },
  AJUSTE:          { color: 'text-slate-400',   bg: 'bg-slate-500/15',   label: 'Ajuste' },
}

export default function WorkStockTab({ workId }) {
  const [subTab, setSubTab] = useState('stock')
  const [movPage, setMovPage] = useState(1)

  const { data: stockData, isLoading: loadingStock } = useQuery({
    queryKey: ['work-stock', workId],
    queryFn:  () => workWarehouseApi.getStock(workId),
    enabled:  subTab === 'stock',
  })

  const { data: movData, isLoading: loadingMov } = useQuery({
    queryKey: ['work-movements', workId, movPage],
    queryFn:  () => workWarehouseApi.getMovements(workId, movPage),
    enabled:  subTab === 'movements',
  })

  const stock      = stockData?.data?.data  || []
  const movements  = movData?.data?.data    || []
  const pagination = movData?.data?.pagination

  const lowStock   = stock.filter(s => s.below_minimum)
  const totalValue = stock.reduce((s, i) => s + parseFloat(i.available_value || 0), 0)

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <Package className="w-4 h-4 text-blue-400 mb-2" />
          <p className="font-num text-xl font-bold text-foreground">{stock.length}</p>
          <p className="text-xs text-muted-foreground">Items en almacén</p>
        </div>
        <div className="glass-card p-4">
          <TrendingDown className="w-4 h-4 text-amber-400 mb-2" />
          <p className="font-num text-xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-muted-foreground">Valor en almacén</p>
        </div>
        <div className="glass-card p-4">
          <AlertTriangle className={cn('w-4 h-4 mb-2', lowStock.length ? 'text-rose-400' : 'text-emerald-400')} />
          <p className="font-num text-xl font-bold text-foreground">{lowStock.length}</p>
          <p className="text-xs text-muted-foreground">Bajo mínimo</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 glass-card p-1 rounded-lg w-fit">
        {[
          { key: 'stock',     label: 'Stock actual',  icon: Package },
          { key: 'movements', label: 'Movimientos',   icon: ArrowLeftRight },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={cn('flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              subTab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Stock table */}
      {subTab === 'stock' && (
        loadingStock ? (
          <div className="glass-card p-8 shimmer h-48 rounded-xl" />
        ) : stock.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-12">
            <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Sin materiales en el almacén de esta obra</p>
            <p className="text-xs text-muted-foreground mt-1">
              Los materiales aparecen aquí al registrar facturas de compras o asignaciones desde bodega
            </p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            {lowStock.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-rose-500/10 border-b border-rose-500/20">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <p className="text-xs text-rose-300">
                  {lowStock.length} item(s) con stock bajo el mínimo configurado
                </p>
              </div>
            )}
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Producto','Disponible','Reservado','Costo Prom.','Valor','Último Mov.','Estado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stock.map((item, i) => (
                  <tr key={i} className={cn('table-row', item.below_minimum && 'bg-rose-500/5')}>
                    <td className="px-4 py-3 font-medium text-foreground">{item.product_name}</td>
                    <td className="px-4 py-3 font-num font-semibold text-emerald-400">
                      {formatNumber(item.available_quantity, 2)} {item.unit}
                    </td>
                    <td className="px-4 py-3 font-num text-amber-400">
                      {formatNumber(item.reserved_quantity, 2)}
                    </td>
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
              <tfoot>
                <tr className="border-t border-border bg-secondary/30">
                  <td colSpan={4} className="px-4 py-3 font-semibold text-foreground text-xs">TOTAL ALMACÉN</td>
                  <td className="px-4 py-3 font-num font-bold text-amber-400">{formatCurrency(totalValue)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )
      )}

      {/* Movements table */}
      {subTab === 'movements' && (
        <div className="space-y-3">
          {loadingMov ? (
            <div className="glass-card p-8 shimmer h-48 rounded-xl" />
          ) : movements.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center py-12">
              <ArrowLeftRight className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">Sin movimientos de materiales registrados</p>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Fecha','Tipo','Producto','Cantidad','Costo Total','Origen','Notas'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movements.map(m => {
                    const mt = MOVEMENT_COLORS[m.movement_type] || { color: 'text-muted-foreground', bg: 'bg-muted', label: m.movement_type }
                    const isIn  = ['COMPRA','ASIGNACION_OBRA'].includes(m.movement_type)
                    return (
                      <tr key={m.id} className="table-row">
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(m.movement_date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('badge text-[10px]', mt.bg, mt.color)}>
                            {mt.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{m.product?.name || '—'}</td>
                        <td className="px-4 py-3">
                          <div className={cn('flex items-center gap-1 font-num font-semibold',
                            isIn ? 'text-emerald-400' : 'text-rose-400')}>
                            {isIn
                              ? <ArrowUpRight className="w-3 h-3" />
                              : <ArrowDownRight className="w-3 h-3" />}
                            {formatNumber(m.quantity, 2)} {m.product?.unit}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-num">{formatCurrency(m.total_cost)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{m.fromWarehouse?.name || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-[140px] truncate">
                          {m.reference_note || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={!pagination.hasPrev} onClick={() => setMovPage(p=>p-1)} className="btn-ghost disabled:opacity-40">Anterior</button>
              <span className="text-xs text-muted-foreground font-num">{pagination.page}/{pagination.totalPages}</span>
              <button disabled={!pagination.hasNext} onClick={() => setMovPage(p=>p+1)} className="btn-ghost disabled:opacity-40">Siguiente</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

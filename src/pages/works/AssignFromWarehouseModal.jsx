import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { warehouseApi, worksApi } from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { X, Warehouse, ArrowRight, Loader2, Package } from 'lucide-react'
import { formatCurrency, formatNumber, cn } from '../../utils/helpers'

/**
 * Modal para asignar material de Bodega General a una obra.
 * Se puede abrir desde WarehousePage o desde WorkDetail.
 * 
 * Props:
 *   preselectedWorkId - si viene desde una obra específica
 *   onClose
 */
export default function AssignFromWarehouseModal({ preselectedWorkId, onClose }) {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const [selectedWorkId, setSelectedWorkId] = useState(preselectedWorkId || '')
  const [assignments, setAssignments] = useState({}) // { product_id: qty }

  const { data: stockData } = useQuery({
    queryKey: ['warehouse-stock-general'],
    queryFn:  () => warehouseApi.getStock({ type: 'GENERAL' }),
  })

  const { data: worksData } = useQuery({
    queryKey: ['works-active-select'],
    queryFn:  () => worksApi.getAll({ status: 'ACTIVE', limit: 100 }),
  })

  const stock = (stockData?.data?.data || []).filter(i => parseFloat(i.available_quantity) > 0)
  const works = worksData?.data?.data || []

  const assignMut = useMutation({
    mutationFn: (d) => warehouseApi.assign(d),
    onSuccess: (res) => {
      qc.invalidateQueries(['warehouse-stock'])
      qc.invalidateQueries(['warehouse-movements'])
      qc.invalidateQueries(['work-stock', selectedWorkId])
      const saved = res.data?.data?.total_savings || 0
      toast({
        title: `Material asignado${saved > 0 ? ` · Ahorro: ${formatCurrency(saved)}` : ''}`,
        variant: 'success',
      })
      onClose()
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const handleQtyChange = (productId, warehouseItemId, qty, available) => {
    const parsed = Math.min(parseFloat(qty) || 0, available)
    setAssignments(prev => ({
      ...prev,
      [productId]: { qty: parsed, warehouse_item_id: warehouseItemId },
    }))
  }

  const itemsToAssign = Object.entries(assignments)
    .filter(([, v]) => v.qty > 0)

  const handleAssign = () => {
    if (!selectedWorkId) return toast({ title: 'Selecciona una obra', variant: 'destructive' })
    if (!itemsToAssign.length) return toast({ title: 'Ingresa cantidades a asignar', variant: 'destructive' })

    assignMut.mutate({
      work_id: parseInt(selectedWorkId),
      items: itemsToAssign.map(([product_id, v]) => ({
        product_id: parseInt(product_id),
        quantity: v.qty,
      })),
    })
  }

  const totalSavings = stock
    .filter(i => assignments[i.product_id]?.qty > 0)
    .reduce((s, i) => {
      const qty = assignments[i.product_id]?.qty || 0
      return s + qty * parseFloat(i.average_cost)
    }, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl mx-4 glass-card animate-fade-up max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-foreground">Asignar desde Bodega</h2>
              <p className="text-xs text-muted-foreground">Reutilizar material para nueva obra</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Work selector */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Obra destino *</label>
            <select
              className="field-input mt-1"
              value={selectedWorkId}
              onChange={e => setSelectedWorkId(e.target.value)}>
              <option value="">Seleccionar obra activa...</option>
              {works.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.client?.name ? `· ${w.client.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Stock items */}
          {stock.length === 0 ? (
            <div className="flex flex-col items-center py-10 border-2 border-dashed border-border rounded-xl">
              <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Bodega general vacía</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Los sobrantes aparecen aquí al cerrar una obra</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Materiales disponibles en bodega — ingresa cantidad a asignar
              </p>
              {stock.map(item => {
                const assigned = assignments[item.product_id]?.qty || ''
                const available = parseFloat(item.available_quantity)
                return (
                  <div key={item.product_id}
                    className={cn('flex items-center gap-3 p-3 rounded-xl transition-all',
                      assigned > 0 ? 'bg-violet-500/8 border border-violet-500/20' : 'glass-card')}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Disponible: <span className="text-emerald-400 font-semibold">
                          {formatNumber(available, 2)} {item.unit}
                        </span>
                        {item.average_cost > 0 && ` · Costo: ${formatCurrency(item.average_cost)}/u`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max={available}
                        step="0.01"
                        value={assigned}
                        onChange={e => handleQtyChange(item.product_id, item.warehouse_item_id, e.target.value, available)}
                        placeholder="0"
                        className="field-input w-24 text-xs text-center"
                      />
                      <span className="text-xs text-muted-foreground w-12">{item.unit}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Summary */}
          {itemsToAssign.length > 0 && (
            <div className="p-4 rounded-xl bg-violet-500/8 border border-violet-500/20 space-y-2">
              <p className="text-xs font-semibold text-violet-400 flex items-center gap-2">
                <ArrowRight className="w-3.5 h-3.5" />
                {itemsToAssign.length} item(s) a asignar
              </p>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Ahorro estimado (vs comprar nuevo)</span>
                <span className="font-num font-bold text-emerald-400">{formatCurrency(totalSavings)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/70">
                Este ahorro se registrará automáticamente en el reporte de eficiencia de bodega
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border shrink-0 flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
          <button
            onClick={handleAssign}
            disabled={assignMut.isPending || !itemsToAssign.length || !selectedWorkId}
            className="btn-primary flex-1 justify-center disabled:opacity-50">
            {assignMut.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Asignando...</>
              : <><ArrowRight className="w-4 h-4" /> Asignar a obra</>}
          </button>
        </div>
      </div>
    </div>
  )
}

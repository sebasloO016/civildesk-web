import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { worksApi } from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { X, PackageCheck, AlertTriangle, Loader2, ArrowRight } from 'lucide-react'
import { formatCurrency, formatNumber, cn } from '../../utils/helpers'

/**
 * Modal para cerrar una obra y trasladar sobrantes a Bodega General.
 * Se muestra en WorkDetail cuando status === 'ACTIVE' o 'PAUSED'.
 * 
 * Props:
 *   work      - objeto completo de la obra
 *   stockItems - items del almacén de la obra (WarehouseItems)
 *   onClose   - cerrar modal
 *   onSuccess - callback después de cerrar exitosamente
 */
export default function CloseWorkModal({ work, stockItems = [], onClose, onSuccess }) {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const [transferAll, setTransferAll] = useState(true)

  const hasStock = stockItems.some(i => parseFloat(i.available_quantity) > 0)

  const closeMut = useMutation({
    mutationFn: (d) => worksApi.close(work.id, d),
    onSuccess: (res) => {
      qc.invalidateQueries(['work', work.id])
      qc.invalidateQueries(['works'])
      qc.invalidateQueries(['warehouse-stock'])
      const transferred = res.data?.data?.transferred_items || 0
      toast({
        title: `Obra cerrada${transferred > 0 ? ` · ${transferred} items trasladados a bodega` : ''}`,
        variant: 'success',
      })
      onSuccess?.()
      onClose()
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const itemsWithStock = stockItems.filter(i => parseFloat(i.available_quantity) > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 glass-card animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <PackageCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-foreground">Cerrar Obra</h2>
              <p className="text-xs text-muted-foreground">{work.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300/90 space-y-1">
              <p className="font-semibold">Esta acción cambiará el estado de la obra a <strong>FINISHED</strong>.</p>
              <p>Los materiales sobrantes del almacén de obra pueden trasladarse automáticamente a la Bodega General para ser reutilizados en futuras obras.</p>
            </div>
          </div>

          {/* Stock summary */}
          {hasStock ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  Materiales sobrantes ({itemsWithStock.length} items)
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={transferAll}
                    onChange={e => setTransferAll(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <span className="text-xs text-muted-foreground">Trasladar todos a bodega</span>
                </label>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {itemsWithStock.map((item, i) => (
                  <div key={i}
                    className={cn('flex items-center justify-between p-2.5 rounded-lg text-xs',
                      transferAll ? 'bg-emerald-500/8 border border-emerald-500/15' : 'bg-secondary/40')}>
                    <div>
                      <p className="font-medium text-foreground">{item.product_name}</p>
                      <p className="text-muted-foreground">
                        {formatNumber(item.available_quantity, 2)} {item.unit}
                        {item.average_cost > 0 && ` · ${formatCurrency(item.average_cost)}/u`}
                      </p>
                    </div>
                    {transferAll && (
                      <div className="flex items-center gap-1 text-emerald-400">
                        <ArrowRight className="w-3 h-3" />
                        <span className="text-[10px]">Bodega</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {transferAll && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
                  <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-400">
                    {itemsWithStock.length} items se trasladarán a Bodega General — disponibles para nuevas obras sin costo adicional
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-secondary/40 text-center">
              <p className="text-xs text-muted-foreground">Sin materiales en el almacén de esta obra</p>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Avance final', value: `${work.actual_progress}%` },
              { label: 'Costo real', value: formatCurrency(work.real_cost) },
              { label: 'Presupuesto', value: formatCurrency(work.initial_budget) },
            ].map(s => (
              <div key={s.label} className="p-2.5 rounded-lg bg-secondary/40 text-center">
                <p className="font-num text-sm font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
          <button
            onClick={() => closeMut.mutate({ transfer_surplus: transferAll })}
            disabled={closeMut.isPending}
            className="btn-primary flex-1 justify-center bg-amber-600 hover:bg-amber-700">
            {closeMut.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Cerrando obra...</>
              : <><PackageCheck className="w-4 h-4" /> Confirmar cierre</>}
          </button>
        </div>
      </div>
    </div>
  )
}

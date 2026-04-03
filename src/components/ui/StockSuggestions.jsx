import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { Package, ArrowRight, CheckCircle2, X } from 'lucide-react'
import { formatNumber, formatCurrency, cn } from '../../utils/helpers'

// Muestra sugerencias de bodega para los productos de una solicitud
export default function StockSuggestions({ productIds = [], workId, onAssign }) {
  const { toast } = useUIStore()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['stock-suggestions', productIds.join(',')],
    queryFn:  () => api.get(`/warehouses/stock/suggestions?product_ids=${productIds.join(',')}`),
    enabled:  productIds.length > 0,
  })

  const assignMut = useMutation({
    mutationFn: ({ product_id, quantity }) =>
      api.post('/warehouses/assign', { product_id, quantity, to_work_id: workId }),
    onSuccess: (res) => {
      qc.invalidateQueries(['warehouse-stock'])
      qc.invalidateQueries(['work-stock', workId])
      const saved = res.data?.data?.saved_amount
      toast({
        title: `Material asignado desde bodega`,
        description: saved ? `Ahorro generado: ${formatCurrency(saved)}` : '',
        variant: 'success',
      })
      onAssign?.()
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const suggestions = data?.data?.data || []
  if (isLoading || suggestions.length === 0) return null

  return (
    <div className="glass-card border-amber-500/30 bg-amber-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/20">
        <Package className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-sm font-semibold text-amber-400">
          ¡Tienes materiales disponibles en Bodega General!
        </p>
        <span className="badge bg-amber-500/20 text-amber-400 text-[10px] ml-auto">
          {suggestions.length} item(s)
        </span>
      </div>

      <div className="p-4 space-y-2">
        <p className="text-xs text-muted-foreground mb-3">
          Antes de comprar, considera usar estos materiales disponibles en bodega:
        </p>
        {suggestions.map(s => (
          <div key={s.product_id}
            className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{s.product_name}</p>
              <p className="text-xs text-muted-foreground">
                Disponible: <span className="text-emerald-400 font-semibold">
                  {formatNumber(s.available_quantity, 2)} {s.unit}
                </span>
                {' · '}Costo: {formatCurrency(s.average_cost)}/{s.unit}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <p className="text-xs text-amber-400 font-medium">
                Ahorro est.: {formatCurrency(parseFloat(s.reference_price || s.average_cost) * parseFloat(s.available_quantity))}
              </p>
              {workId && (
                <button
                  onClick={() => assignMut.mutate({
                    product_id: s.product_id,
                    quantity:   parseFloat(s.available_quantity),
                  })}
                  disabled={assignMut.isPending}
                  className="btn-primary text-xs py-1 px-3 bg-amber-600 hover:bg-amber-700">
                  <ArrowRight className="w-3 h-3" />
                  Usar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

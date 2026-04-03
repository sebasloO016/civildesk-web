import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { useForm } from 'react-hook-form'
import { X, UserPlus } from 'lucide-react'
import { cn } from '../../utils/helpers'

/**
 * Modal rápido para crear un cliente desde cualquier formulario.
 * Uso:
 *   <QuickClientModal
 *     open={showQuickClient}
 *     onClose={() => setShowQuickClient(false)}
 *     onCreated={(client) => setValue('client_id', client.id)}
 *   />
 */
export default function QuickClientModal({ open, onClose, onCreated }) {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const createMut = useMutation({
    mutationFn: (d) => clientsApi.create(d),
    onSuccess: (res) => {
      const client = res.data?.data
      qc.invalidateQueries(['clients'])
      qc.invalidateQueries(['clients-select'])
      toast({ title: `Cliente "${client.name}" creado`, variant: 'success' })
      reset()
      onCreated?.(client)
      onClose()
    },
    onError: (e) => toast({
      title: 'Error al crear cliente',
      description: e.response?.data?.message,
      variant: 'destructive',
    }),
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 glass-card p-6 animate-fade-up">

        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base text-foreground">Nuevo Cliente</h2>
            <p className="text-xs text-muted-foreground">Se agregará al directorio automáticamente</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Nombre completo / Razón social *
            </label>
            <input
              className={cn('field-input mt-1', errors.name && 'border-rose-500')}
              placeholder="Ej: Juan Pérez / Constructora ABC"
              autoFocus
              {...register('name', { required: 'Nombre requerido' })}
            />
            {errors.name && (
              <p className="text-rose-400 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                Cédula / RUC
              </label>
              <input className="field-input mt-1" placeholder="1234567890"
                {...register('ruc_cedula')} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                Teléfono
              </label>
              <input className="field-input mt-1" placeholder="0999999999"
                {...register('phone')} />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Email</label>
            <input type="email" className="field-input mt-1"
              placeholder="cliente@email.com"
              {...register('email')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Ciudad</label>
              <input className="field-input mt-1" placeholder="Ambato"
                {...register('city')} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Dirección</label>
              <input className="field-input mt-1" placeholder="Dirección..."
                {...register('address')} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={createMut.isPending}
              className="btn-primary flex-1 justify-center">
              {createMut.isPending ? 'Creando...' : 'Crear y seleccionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

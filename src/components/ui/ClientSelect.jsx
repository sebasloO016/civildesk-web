import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { clientsApi } from '../../services/api'
import { UserPlus } from 'lucide-react'
import { cn } from '../../utils/helpers'
import QuickClientModal from './QuickClientModal'

/**
 * Dropdown de clientes con botón inline para crear uno nuevo.
 * Compatible con react-hook-form a través de onChange/value.
 *
 * Uso con react-hook-form:
 *   <ClientSelect
 *     value={watch('client_id')}
 *     onChange={(id) => setValue('client_id', id)}
 *     error={errors.client_id}
 *   />
 *
 * Uso sin react-hook-form:
 *   <ClientSelect
 *     value={clientId}
 *     onChange={setClientId}
 *   />
 */
export default function ClientSelect({ value, onChange, error, className, required = false }) {
  const [showQuickCreate, setShowQuickCreate] = useState(false)

  const { data } = useQuery({
    queryKey: ['clients-select'],
    queryFn:  () => clientsApi.getAll({ limit: 200 }),
    staleTime: 30_000,
  })

  const clients = data?.data?.data || []

  return (
    <>
      <div className="flex gap-2">
        <select
          value={value || ''}
          onChange={e => onChange?.(e.target.value ? parseInt(e.target.value) : '')}
          className={cn('field-input flex-1', error && 'border-rose-500', className)}
        >
          <option value="">— Seleccionar cliente —</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}{c.ruc_cedula ? ` · ${c.ruc_cedula}` : ''}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setShowQuickCreate(true)}
          title="Crear nuevo cliente"
          className="btn-ghost px-3 shrink-0 border border-border rounded-lg hover:border-primary/50
                     hover:bg-primary/10 hover:text-primary transition-all"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <p className="text-rose-400 text-xs mt-1">
          {error.message || 'Cliente requerido'}
        </p>
      )}

      <QuickClientModal
        open={showQuickCreate}
        onClose={() => setShowQuickCreate(false)}
        onCreated={(client) => onChange?.(client.id)}
      />
    </>
  )
}

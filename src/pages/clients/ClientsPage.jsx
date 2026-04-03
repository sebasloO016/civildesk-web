import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { useForm } from 'react-hook-form'
import {
  Plus, Search, User, Phone, Mail, MapPin,
  FileText, DollarSign, X, Pencil, ChevronRight,
  Building2, FolderKanban, HardHat,
} from 'lucide-react'
import { formatCurrency, formatDate, projectStatusLabel, workStatusLabel, cn } from '../../utils/helpers'

export default function ClientsPage() {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [selected, setSelected] = useState(null)   // cliente seleccionado para detalle
  const [editing, setEditing]   = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['clients', { search, page }],
    queryFn:  () => clientsApi.getAll({ search, page, limit: 16 }),
  })

  const { data: detailData } = useQuery({
    queryKey: ['client-detail', selected?.id],
    queryFn:  () => clientsApi.getOne(selected.id),
    enabled:  !!selected?.id,
  })

  const clients    = data?.data?.data     || []
  const pagination = data?.data?.pagination
  const detail     = detailData?.data?.data

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

  const createMut = useMutation({
    mutationFn: (d) => clientsApi.create(d),
    onSuccess: (res) => {
      qc.invalidateQueries(['clients'])
      qc.invalidateQueries(['clients-select'])
      reset()
      setEditing(false)
      setSelected(res.data?.data)
      toast({ title: 'Cliente creado', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => clientsApi.update(id, data),
    onSuccess: (res) => {
      qc.invalidateQueries(['clients'])
      qc.invalidateQueries(['client-detail', selected?.id])
      qc.invalidateQueries(['clients-select'])
      setEditing(false)
      setSelected(res.data?.data)
      toast({ title: 'Cliente actualizado', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const openNew = () => {
    setSelected(null)
    setEditing(true)
    reset({})
  }

  const openEdit = (client) => {
    setEditing(true)
    setValue('name',       client.name)
    setValue('ruc_cedula', client.ruc_cedula)
    setValue('phone',      client.phone)
    setValue('email',      client.email)
    setValue('address',    client.address)
    setValue('city',       client.city)
    setValue('notes',      client.notes)
  }

  const onSubmit = (data) => {
    if (selected && editing) updateMut.mutate({ id: selected.id, data })
    else                     createMut.mutate(data)
  }

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div className="section-header animate-fade-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pagination?.total || 0} clientes registrados
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: list */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar cliente..." className="field-input pl-9" />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="shimmer h-16 rounded-xl" />)}
            </div>
          ) : clients.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center py-10">
              <User className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Sin clientes</p>
              <button onClick={openNew} className="btn-primary mt-3 text-xs">
                <Plus className="w-3 h-3" /> Crear primero
              </button>
            </div>
          ) : clients.map(client => (
            <div key={client.id}
              onClick={() => { setSelected(client); setEditing(false) }}
              className={cn(
                'glass-card p-4 cursor-pointer hover:shadow-card-hover transition-all group',
                selected?.id === client.id && 'ring-1 ring-primary'
              )}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30
                                  flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {client.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate
                                  group-hover:text-amber-400 transition-colors">
                      {client.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {client.ruc_cedula || 'Sin RUC/CI'} · {client.city || 'Sin ciudad'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1
                                         group-hover:text-amber-400 transition-colors" />
              </div>
            </div>
          ))}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={!pagination.hasPrev} onClick={() => setPage(p=>p-1)}
                className="btn-ghost disabled:opacity-40 text-xs">Anterior</button>
              <span className="text-xs text-muted-foreground font-num">
                {pagination.page}/{pagination.totalPages}
              </span>
              <button disabled={!pagination.hasNext} onClick={() => setPage(p=>p+1)}
                className="btn-ghost disabled:opacity-40 text-xs">Siguiente</button>
            </div>
          )}
        </div>

        {/* Right: detail / form */}
        <div className="lg:col-span-2">

          {/* ── FORM: Crear / Editar ─────────────────────── */}
          {editing && (
            <div className="glass-card p-6 animate-fade-up">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-lg text-foreground">
                  {selected ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h2>
                <button onClick={() => setEditing(false)} className="btn-ghost p-1.5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Nombre completo / Razón social *
                  </label>
                  <input className={cn('field-input mt-1', errors.name && 'border-rose-500')}
                    placeholder="Ej: Juan Pérez / Empresa XYZ S.A."
                    {...register('name', { required: 'Nombre requerido' })} />
                  {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Cédula / RUC
                    </label>
                    <input className="field-input mt-1"
                      placeholder="1234567890 / 1234567890001"
                      {...register('ruc_cedula')} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Teléfono
                    </label>
                    <input className="field-input mt-1"
                      placeholder="0999999999 / 032345678"
                      {...register('phone')} />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Correo electrónico
                  </label>
                  <input type="email" className="field-input mt-1"
                    placeholder="cliente@email.com"
                    {...register('email')} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Ciudad
                    </label>
                    <input className="field-input mt-1"
                      placeholder="Ambato, Quito..."
                      {...register('city')} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Dirección
                    </label>
                    <input className="field-input mt-1"
                      placeholder="Cdla. La Joya, Mz. 5..."
                      {...register('address')} />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Notas internas
                  </label>
                  <textarea rows={2} className="field-input mt-1 resize-none text-xs"
                    placeholder="Observaciones, referencias, preferencias del cliente..."
                    {...register('notes')} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditing(false)}
                    className="btn-ghost flex-1 justify-center">
                    Cancelar
                  </button>
                  <button type="submit"
                    disabled={createMut.isPending || updateMut.isPending}
                    className="btn-primary flex-1 justify-center">
                    {createMut.isPending || updateMut.isPending
                      ? 'Guardando...'
                      : selected ? 'Guardar cambios' : 'Crear Cliente'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── DETAIL: Vista de cliente ─────────────────── */}
          {!editing && selected && (
            <div className="space-y-4 animate-fade-up">
              {/* Header card */}
              <div className="glass-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30
                                    flex items-center justify-center text-primary font-bold text-2xl">
                      {selected.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-xl text-foreground">
                        {selected.name}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {selected.ruc_cedula ? `CI/RUC: ${selected.ruc_cedula}` : 'Sin CI/RUC'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => openEdit(selected)} className="btn-ghost text-xs">
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                </div>

                {/* Contact info */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Phone,   value: selected.phone,   label: 'Teléfono' },
                    { icon: Mail,    value: selected.email,   label: 'Email' },
                    { icon: MapPin,  value: selected.address, label: 'Dirección' },
                    { icon: Building2, value: selected.city,  label: 'Ciudad' },
                  ].map(({ icon: Icon, value, label }) => value ? (
                    <div key={label} className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                        <p className="text-xs text-foreground truncate">{value}</p>
                      </div>
                    </div>
                  ) : null)}
                </div>

                {selected.notes && (
                  <div className="mt-3 p-3 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Notas: </span>
                      {selected.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Projects */}
              {detail?.projects?.length > 0 && (
                <div className="glass-card overflow-hidden">
                  <div className="p-4 border-b border-border flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-display font-semibold text-sm text-foreground">
                      Proyectos ({detail.projects.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-border">
                    {detail.projects.map(p => {
                      const st = projectStatusLabel[p.status] || projectStatusLabel.PROFORMA
                      return (
                        <div key={p.id} className="flex items-center justify-between p-4 hover:bg-secondary/30">
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.name}</p>
                            <span className={cn('badge border text-[10px] mt-1', st.color)}>
                              {st.label}
                            </span>
                          </div>
                          <p className="font-num font-semibold text-amber-400 text-sm">
                            {formatCurrency(p.contracted_amount || 0, 0)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Works (if any linked) */}
              {detail?.works?.length > 0 && (
                <div className="glass-card overflow-hidden">
                  <div className="p-4 border-b border-border flex items-center gap-2">
                    <HardHat className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-display font-semibold text-sm text-foreground">
                      Obras ({detail.works?.length || 0})
                    </h3>
                  </div>
                  <div className="divide-y divide-border">
                    {detail.works?.map(w => {
                      const st = workStatusLabel[w.status] || workStatusLabel.ACTIVE
                      return (
                        <div key={w.id} className="flex items-center justify-between p-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">{w.name}</p>
                            <span className={cn('badge border text-[10px] mt-1', st.color)}>
                              {st.label}
                            </span>
                          </div>
                          <p className="font-num font-semibold text-foreground text-sm">
                            {formatCurrency(w.initial_budget || 0, 0)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!detail?.projects?.length && !detail?.works?.length && (
                <div className="glass-card p-8 text-center">
                  <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Sin proyectos ni obras registradas</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Al crear un proyecto o una obra con este cliente, aparecerán aquí
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Empty state — nada seleccionado */}
          {!editing && !selected && (
            <div className="glass-card flex flex-col items-center justify-center py-20 h-full">
              <User className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground">Selecciona un cliente para ver su detalle</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                o crea uno nuevo con el botón de arriba
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

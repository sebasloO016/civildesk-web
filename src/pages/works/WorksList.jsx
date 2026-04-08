import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { worksApi } from '../../services/api'
import ClientSelect from '../../components/ui/ClientSelect'
import { useUIStore } from '../../store/uiStore'
import { useForm } from 'react-hook-form'
import {
  Plus, Search, HardHat, ArrowUpRight,
  Calendar, DollarSign, TrendingUp,
} from 'lucide-react'
import {
  formatCurrency, formatPct, formatDate,
  workStatusLabel, progressColor, cn,
} from '../../utils/helpers'

const STATUS_FILTERS = [
  { key: '',            label: 'Todas' },
  { key: 'ACTIVE',     label: 'Activas' },
  { key: 'PAUSED',     label: 'Pausadas' },
  { key: 'FINISHED',   label: 'Terminadas' },
  { key: 'CLOSED',     label: 'Cerradas' },
]

export default function WorksList() {
  const navigate     = useNavigate()
  const qc           = useQueryClient()
  const { toast, openModal, closeModal, activeModal } = useUIStore()
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState('')
  const [page, setPage]       = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['works', { search, status, page }],
    queryFn:  () => worksApi.getAll({ search, status, page, limit: 12 }),
  })

  const works      = data?.data?.data || []
  const pagination = data?.data?.pagination

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm()

  const createMutation = useMutation({
    mutationFn: (d) => worksApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries(['works'])
      closeModal()
      reset()
      toast({ title: 'Obra creada', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div className="section-header animate-fade-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Obras</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pagination?.total || 0} obras registradas
          </p>
        </div>
        <button onClick={() => openModal('createWork')} className="btn-primary">
          <Plus className="w-4 h-4" /> Nueva Obra
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 animate-fade-up-200">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar obra..."
            className="field-input pl-9"
          />
        </div>
        {/* Status tabs */}
        <div className="flex items-center gap-1 glass-card p-1 rounded-lg">
          {STATUS_FILTERS.map(f => (
            <button key={f.key}
              onClick={() => { setStatus(f.key); setPage(1) }}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                status === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div className="shimmer h-5 rounded w-3/4" />
              <div className="shimmer h-3 rounded w-1/2" />
              <div className="shimmer h-2 rounded w-full mt-4" />
            </div>
          ))}
        </div>
      ) : works.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 glass-card">
          <HardHat className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No se encontraron obras</p>
          <button onClick={() => openModal('createWork')} className="btn-primary mt-4">
            <Plus className="w-4 h-4" /> Crear primera obra
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up-200">
          {works.map(work => {
            const pct    = parseFloat(work.actual_progress || 0)
            const status = workStatusLabel[work.status] || workStatusLabel.ACTIVE
            return (
              <div key={work.id}
                onClick={() => navigate(`/works/${work.id}`)}
                className="glass-card p-5 cursor-pointer hover:shadow-card-hover
                           hover:border-navy-600 transition-all duration-200 group"
              >
                {/* Top */}
                <div className="flex items-start justify-between mb-3">
                  <span className={cn('badge border text-[10px]', status.color)}>
                    {status.label}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground
                                           group-hover:text-amber-400 transition-colors" />
                </div>

                {/* Name */}
                <h3 className="font-display font-semibold text-foreground mb-1
                               group-hover:text-amber-400 transition-colors line-clamp-2">
                  {work.name}
                </h3>
                <p className="text-xs text-muted-foreground mb-4 truncate">
                  {work.client?.name || '—'}
                </p>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Avance</span>
                    <span className="font-num font-semibold text-foreground">{formatPct(pct)}</span>
                  </div>
                  <div className="progress-bar">
                    <div className={cn('progress-fill', progressColor(pct))} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <DollarSign className="w-3 h-3 text-amber-500" />
                    <span className="font-num">{formatCurrency(work.total_obra || work.initial_budget, 0)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 text-blue-400" />
                    <span>{formatDate(work.estimated_end)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)} className="btn-ghost disabled:opacity-40">
            Anterior
          </button>
          <span className="text-xs text-muted-foreground font-num">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)} className="btn-ghost disabled:opacity-40">
            Siguiente
          </button>
        </div>
      )}

      {/* Create Work Modal */}
      {activeModal?.name === 'createWork' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-lg mx-4 glass-card p-6 animate-fade-up">
            <h2 className="font-display font-bold text-lg text-foreground mb-5">Nueva Obra</h2>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Nombre de la obra *</label>
                <input className={cn('field-input mt-1', errors.name && 'border-rose-500')}
                  placeholder="Ej: Edificio Residencial Norte"
                  {...register('name', { required: true })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Cliente</label>
                  <div className="mt-1">
                    <ClientSelect
                      value={watch('client_id')}
                      onChange={(id) => setValue('client_id', id)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Fecha inicio *</label>
                  <input type="date" className={cn('field-input mt-1', errors.start_date && 'border-rose-500')}
                    {...register('start_date', { required: true })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Fecha fin estimada</label>
                  <input type="date" className="field-input mt-1" {...register('estimated_end')} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Ubicación</label>
                  <input className="field-input mt-1" placeholder="Ciudad, dirección"
                    {...register('location')} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Descripción</label>
                <textarea rows={2} className="field-input mt-1 resize-none" placeholder="Descripción breve..."
                  {...register('description')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 justify-center">
                  {createMutation.isPending ? 'Creando...' : 'Crear Obra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

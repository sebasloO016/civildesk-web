import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '../../services/api'
import api from '../../services/api'
import ClientSelect from '../../components/ui/ClientSelect'
import { useUIStore } from '../../store/uiStore'
import { useForm } from 'react-hook-form'
import { Plus, Search, FolderKanban, ArrowUpRight, DollarSign, User } from 'lucide-react'
import { formatCurrency, formatDate, projectStatusLabel, cn } from '../../utils/helpers'

const STATUS_FILTERS = [
  { key: '',            label: 'Todos' },
  { key: 'PROFORMA',   label: 'Proforma' },
  { key: 'CONTRACT',   label: 'Contrato' },
  { key: 'EXECUTION',  label: 'Ejecución' },
  { key: 'LIQUIDATION',label: 'Liquidación' },
  { key: 'CLOSED',     label: 'Cerrado' },
]

export default function ProjectsList() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const { toast, openModal, closeModal, activeModal } = useUIStore()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage]     = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, status, page }],
    queryFn:  () => projectsApi.getAll({ search, status, page, limit: 12 }),
  })

  // Conteos reales por estado desde el backend
  const { data: countsRaw } = useQuery({
    queryKey: ['projects-counts'],
    queryFn:  () => api.get('/projects/counts').then(r => r.data?.data || {}),
  })
  const counts = countsRaw || {}

  const projects   = data?.data?.data || []
  const pagination = data?.data?.pagination

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm()

  const createMutation = useMutation({
    mutationFn: (d) => projectsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries(['projects'])
      qc.invalidateQueries(['projects-counts'])
      closeModal(); reset()
      toast({ title: 'Proyecto creado', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="section-header animate-fade-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Proyectos</h1>
          <p className="text-muted-foreground text-sm mt-1">{pagination?.total || 0} proyectos registrados</p>
        </div>
        <button onClick={() => openModal('createProject')} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo Proyecto
        </button>
      </div>

      {/* Pipeline summary con conteos reales */}
      <div className="grid grid-cols-5 gap-3 animate-fade-up-200">
        {STATUS_FILTERS.slice(1).map(f => {
          const s = projectStatusLabel[f.key]
          const count = counts[f.key] || 0
          return (
            <button key={f.key}
              onClick={() => { setStatus(f.key === status ? '' : f.key); setPage(1) }}
              className={cn('glass-card p-3 text-left transition-all hover:shadow-card-hover',
                status === f.key && 'ring-1 ring-primary')}>
              <span className={cn('badge border text-[10px] mb-2', s?.color)}>{f.label}</span>
              <p className="font-num text-2xl font-bold text-foreground">{count}</p>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 animate-fade-up-200">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar proyecto..." className="field-input pl-9" />
        </div>
        {status && (
          <button onClick={() => setStatus('')} className="btn-ghost text-xs text-rose-400">
            Limpiar filtro
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div className="shimmer h-5 rounded w-3/4" />
              <div className="shimmer h-3 rounded w-1/2" />
              <div className="shimmer h-8 rounded w-full mt-4" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 glass-card">
          <FolderKanban className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No se encontraron proyectos</p>
          <button onClick={() => openModal('createProject')} className="btn-primary mt-4">
            <Plus className="w-4 h-4" /> Crear primer proyecto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up-200">
          {projects.map(project => {
            const s = projectStatusLabel[project.status] || projectStatusLabel.PROFORMA
            return (
              <div key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="glass-card p-5 cursor-pointer hover:shadow-card-hover
                           hover:border-navy-600 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={cn('badge border text-[10px]', s.color)}>{s.label}</span>
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-400 transition-colors" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-1
                               group-hover:text-amber-400 transition-colors line-clamp-2">
                  {project.name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                  <User className="w-3 h-3" />
                  <span className="truncate">{project.client?.name || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Contrato</p>
                    <p className="font-num text-sm font-semibold text-foreground">
                      {formatCurrency(project.contracted_amount || 0, 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Inicio</p>
                    <p className="text-sm text-foreground">{formatDate(project.started_at)}</p>
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
          <button disabled={!pagination.hasPrev} onClick={() => setPage(p => p-1)} className="btn-ghost disabled:opacity-40">Anterior</button>
          <span className="text-xs text-muted-foreground font-num">{pagination.page} / {pagination.totalPages}</span>
          <button disabled={!pagination.hasNext} onClick={() => setPage(p => p+1)} className="btn-ghost disabled:opacity-40">Siguiente</button>
        </div>
      )}

      {/* Create Modal */}
      {activeModal?.name === 'createProject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-lg mx-4 glass-card p-6 animate-fade-up">
            <h2 className="font-display font-bold text-lg text-foreground mb-5">Nuevo Proyecto</h2>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Nombre del proyecto *</label>
                <input className={cn('field-input mt-1', errors.name && 'border-rose-500')}
                  placeholder="Ej: Renovación Oficinas Corporativas"
                  {...register('name', { required: true })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Cliente *</label>
                  <div className="mt-1">
                    <ClientSelect
                      value={watch('client_id')}
                      onChange={(id) => setValue('client_id', id)}
                      error={errors.client_id}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Ubicación</label>
                  <input className="field-input mt-1" placeholder="Ciudad, dirección"
                    {...register('location')} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Descripción</label>
                <textarea rows={2} className="field-input mt-1 resize-none"
                  placeholder="Descripción del proyecto..."
                  {...register('description')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 justify-center">
                  {createMutation.isPending ? 'Creando...' : 'Crear Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

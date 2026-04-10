import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { useForm } from 'react-hook-form'
import {
  Plus, X, Calendar, TrendingUp, Clock,
  CheckCircle2, AlertTriangle, Circle, User,
  Target, Zap,
} from 'lucide-react'
import { formatDate, formatPct, cn } from '../../utils/helpers'

const scheduleApi = {
  getAll:   (wid)        => api.get(`/works/${wid}/schedule`),
  create:   (wid, d)     => api.post(`/works/${wid}/schedule`, d),
  update:   (wid, id, d) => api.put(`/works/${wid}/schedule/${id}`, d),
  remove:   (wid, id)    => api.delete(`/works/${wid}/schedule/${id}`),
}

const STATUS_CONFIG = {
  PENDING:     { label: 'Pendiente',  color: 'bg-slate-500',   text: 'text-slate-400',   icon: Circle },
  IN_PROGRESS: { label: 'En curso',   color: 'bg-amber-500',   text: 'text-amber-400',   icon: Clock },
  COMPLETED:   { label: 'Completado', color: 'bg-emerald-500', text: 'text-emerald-400', icon: CheckCircle2 },
  DELAYED:     { label: 'Retrasado',  color: 'bg-rose-500',    text: 'text-rose-400',    icon: AlertTriangle },
}

// ── Helpers ───────────────────────────────────────────────────
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)
const addDays     = (date, days) => {
  const d = new Date(date); d.setDate(d.getDate() + days)
  return d.toISOString().substring(0, 10)
}

// ── Helpers para responsable guardado en description como JSON
const parseResponsable = (task) => {
  try {
    const d = JSON.parse(task.description || '{}')
    if (d.__meta) return { responsable: d.responsable || '', notes: d.notes || '' }
  } catch {}
  return { responsable: '', notes: task.description || '' }
}

const buildDescription = (responsable, notes) =>
  JSON.stringify({ __meta: true, responsable: responsable || '', notes: notes || '' })

// ── Gantt Bar ─────────────────────────────────────────────────
function GanttBar({ task, projectStart, totalDays, onClick }) {
  const startOffset = Math.max(0, daysBetween(projectStart, task.planned_start))
  const planned     = Math.max(1, daysBetween(task.planned_start, task.planned_end))
  const startPct    = (startOffset / totalDays) * 100
  const widthPct    = Math.max(0.5, (planned / totalDays) * 100)
  const pct         = parseFloat(task.actual_progress || 0)
  const { responsable } = parseResponsable(task)

  const barColor = task.status === 'COMPLETED'  ? '#10B981' :
                   task.status === 'DELAYED'     ? '#F43F5E' :
                   task.status === 'IN_PROGRESS' ? '#F59E0B' : '#1A5A8A'

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 rounded-md cursor-pointer group/bar transition-opacity hover:opacity-90"
      style={{ left: `${startPct}%`, width: `${widthPct}%`, height: '22px', background: `${barColor}33`, border: `1px solid ${barColor}` }}
      onClick={onClick}
    >
      {/* Progreso fill */}
      <div className="h-full rounded-md transition-all"
        style={{ width: `${pct}%`, background: barColor, opacity: 0.7 }} />
      {/* Label */}
      <div className="absolute inset-0 flex items-center px-1.5 overflow-hidden">
        <span className="text-[9px] font-semibold text-white truncate drop-shadow">
          {pct > 0 ? `${pct.toFixed(0)}%` : ''}
        </span>
      </div>
      {/* Tooltip */}
      <div className="absolute bottom-full left-0 mb-1 hidden group-hover/bar:block z-20 pointer-events-none">
        <div className="glass-card p-2 text-[10px] whitespace-nowrap shadow-xl border border-border">
          <p className="font-semibold text-foreground">{task.name}</p>
          {responsable && <p className="text-muted-foreground mt-0.5">👤 {responsable}</p>}
          <p className="text-muted-foreground">{formatDate(task.planned_start)} → {formatDate(task.planned_end)}</p>
          <p className="text-amber-400">Avance: {pct.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  )
}

// ── Timeline Header ───────────────────────────────────────────
function TimelineHeader({ projectStart, totalDays, viewMode }) {
  const step   = viewMode === 'week' ? 7 : 30
  const labels = []
  for (let i = 0; i < totalDays; i += step) {
    const date = addDays(projectStart, i)
    labels.push({ pct: (i / totalDays) * 100, label: formatDate(date, { day: 'numeric', month: 'short' }) })
  }
  return (
    <div className="relative h-8 border-b border-border bg-secondary/20">
      {labels.map((l, i) => (
        <span key={i} className="absolute text-[9px] text-muted-foreground -translate-x-1/2 top-1/2 -translate-y-1/2 whitespace-nowrap"
          style={{ left: `${l.pct}%` }}>
          {l.label}
        </span>
      ))}
    </div>
  )
}

// ── Main GanttTab ─────────────────────────────────────────────
export default function GanttTab({ work }) {
  const qc = useQueryClient()
  const { toast, openModal, closeModal, activeModal } = useUIStore()
  const [selectedTask, setSelectedTask] = useState(null)
  const [editTask,     setEditTask]     = useState(null)
  const [viewMode,     setViewMode]     = useState('month')
  const [customResp,   setCustomResp]   = useState(false)  // texto libre para responsable

  const { data, isLoading } = useQuery({
    queryKey: ['schedule', work.id],
    queryFn:  () => scheduleApi.getAll(work.id),
  })

  // Subcontratos de la obra para el selector de responsable
  const { data: subsData } = useQuery({
    queryKey: ['subcontracts', work.id],
    queryFn:  () => api.get(`/works/${work.id}/subcontracts`),
  })

  const tasks      = data?.data?.data    || []
  const subcontracts = subsData?.data?.data || []

  // Opciones de responsable: subcontratos + "Otro"
  const respOptions = [
    ...subcontracts.filter(s => s.status !== 'CANCELLED').map(s => ({
      value: `${s.specialty}${s.supplier?.name ? ` — ${s.supplier.name}` : ''}`,
      label: `${s.specialty}${s.supplier?.name ? ` — ${s.supplier.name}` : ''}`,
    })),
    { value: '__otro__', label: 'Otro (escribir)' },
  ]

  const { projectStart, totalDays } = useMemo(() => {
    const allDates = [work.start_date, work.estimated_end,
      ...tasks.map(t => t.planned_start), ...tasks.map(t => t.planned_end)].filter(Boolean)
    if (!allDates.length) {
      const start = work.start_date || new Date().toISOString().substring(0, 10)
      return { projectStart: start, totalDays: 90 }
    }
    const start = allDates.reduce((a, b) => a < b ? a : b)
    const end   = allDates.reduce((a, b) => a > b ? a : b)
    return { projectStart: start, totalDays: Math.max(30, daysBetween(start, end) + 14) }
  }, [work, tasks])

  const prediction = useMemo(() => {
    const progress = parseFloat(work.actual_progress || 0)
    if (progress <= 0 || !work.start_date) return null
    const daysElapsed  = daysBetween(work.start_date, new Date().toISOString().substring(0, 10))
    if (daysElapsed <= 0) return null
    const ratePerDay   = progress / daysElapsed
    const daysToFinish = Math.ceil((100 - progress) / ratePerDay)
    const predictedEnd = addDays(new Date().toISOString().substring(0, 10), daysToFinish)
    const delay        = work.estimated_end ? daysBetween(work.estimated_end, predictedEnd) : 0
    return { predictedEnd, delay, daysToFinish }
  }, [tasks, work])

  const { register, handleSubmit, reset, watch } = useForm()

  const createMut = useMutation({
    mutationFn: (d) => scheduleApi.create(work.id, d),
    onSuccess: () => { qc.invalidateQueries(['schedule', work.id]); closeModal(); reset(); toast({ title: 'Actividad creada', variant: 'success' }) },
    onError:   (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => scheduleApi.update(work.id, id, data),
    onSuccess: () => { qc.invalidateQueries(['schedule', work.id]); setEditTask(null); closeModal(); toast({ title: 'Actividad actualizada', variant: 'success' }) },
    onError:   (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })
  const removeMut = useMutation({
    mutationFn: (id) => scheduleApi.remove(work.id, id),
    onSuccess: () => { qc.invalidateQueries(['schedule', work.id]); setSelectedTask(null); toast({ title: 'Actividad eliminada' }) },
  })

  const openNew = () => {
    setEditTask(null)
    setCustomResp(false)
    reset({ status: 'PENDING', actual_progress: 0,
      planned_start: work.start_date, planned_end: work.estimated_end })
    openModal('taskForm')
  }

  const openEdit = (task) => {
    setEditTask(task)
    const { responsable, notes } = parseResponsable(task)
    // Detectar si es subcontratista conocido o texto libre
    const isKnown = respOptions.some(o => o.value === responsable && o.value !== '__otro__')
    setCustomResp(!!responsable && !isKnown)
    reset({
      name:            task.name,
      planned_start:   task.planned_start?.substring(0, 10),
      planned_end:     task.planned_end?.substring(0, 10),
      actual_progress: task.actual_progress,
      status:          task.status,
      responsable:     isKnown ? responsable : (responsable ? '__otro__' : ''),
      responsable_text: !isKnown ? responsable : '',
      notes,
    })
    openModal('taskForm')
  }

  const onSubmit = (data) => {
    const resp = data.responsable === '__otro__' ? data.responsable_text : data.responsable
    const payload = {
      name:            data.name,
      planned_start:   data.planned_start,
      planned_end:     data.planned_end,
      actual_progress: parseFloat(data.actual_progress || 0),
      status:          data.status,
      description:     buildDescription(resp, data.notes),
    }
    if (editTask) updateMut.mutate({ id: editTask.id, data: payload })
    else          createMut.mutate(payload)
  }

  const today    = new Date().toISOString().substring(0, 10)
  const todayPct = Math.max(0, Math.min(100, (daysBetween(projectStart, today) / totalDays) * 100))

  const completed  = tasks.filter(t => t.status === 'COMPLETED').length
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const delayed    = tasks.filter(t => t.status === 'DELAYED').length
  const pending    = tasks.filter(t => t.status === 'PENDING').length

  const respWatch = watch('responsable')

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Completadas', value: completed,     color: 'text-emerald-400' },
          { label: 'En curso',    value: inProgress,    color: 'text-amber-400' },
          { label: 'Retrasadas',  value: delayed,       color: 'text-rose-400' },
          { label: 'Pendientes',  value: pending,       color: 'text-muted-foreground' },
          { label: 'Total',       value: tasks.length,  color: 'text-foreground' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4">
            <p className={cn('font-num text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Prediction banner */}
      {prediction && (
        <div className={cn('glass-card p-4 flex items-center gap-4',
          prediction.delay > 0 ? 'border-rose-500/30 bg-rose-500/5' :
          prediction.delay > -7 ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5')}>
          <Zap className={cn('w-5 h-5 shrink-0', prediction.delay > 0 ? 'text-rose-400' : prediction.delay > -7 ? 'text-amber-400' : 'text-emerald-400')} />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Predicción: fin el {formatDate(prediction.predictedEnd)}
              {prediction.delay > 0 && <span className="text-rose-400 ml-2">({prediction.delay} días de retraso)</span>}
              {prediction.delay <= 0 && <span className="text-emerald-400 ml-2">({Math.abs(prediction.delay)} días adelantado)</span>}
            </p>
            <p className="text-xs text-muted-foreground">Basado en el ritmo actual de avance — {prediction.daysToFinish} días restantes</p>
          </div>
        </div>
      )}

      {/* Header toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 glass-card p-1 rounded-lg">
          {[['week','Semanas'],['month','Meses']].map(([m, l]) => (
            <button key={m} onClick={() => setViewMode(m)}
              className={cn('px-3 py-1.5 rounded text-xs font-medium transition-all',
                viewMode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={openNew} className="btn-primary text-xs">
          <Plus className="w-3.5 h-3.5" /> Nueva Actividad
        </button>
      </div>

      {/* Gantt Chart */}
      {isLoading ? (
        <div className="glass-card p-8 shimmer h-64 rounded-xl" />
      ) : tasks.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16">
          <Calendar className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Sin actividades en el cronograma</p>
          <button onClick={openNew} className="btn-primary mt-4 text-xs">
            <Plus className="w-3.5 h-3.5" /> Agregar primera actividad
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="flex">
            {/* Left panel */}
            <div className="w-64 shrink-0 border-r border-border">
              <div className="h-8 border-b border-border flex items-center px-3">
                <span className="text-xs font-semibold text-muted-foreground">ACTIVIDAD</span>
              </div>
              {tasks.map(task => {
                const st   = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING
                const Icon = st.icon
                const { responsable } = parseResponsable(task)
                return (
                  <div key={task.id}
                    className={cn('h-12 flex flex-col justify-center px-3 border-b border-border cursor-pointer',
                      'hover:bg-secondary/50 transition-colors',
                      selectedTask?.id === task.id && 'bg-secondary/70')}
                    onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}>
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn('w-3 h-3 shrink-0', st.text)} />
                      <span className="text-xs font-medium text-foreground truncate">{task.name}</span>
                    </div>
                    {responsable && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <User className="w-2.5 h-2.5 text-muted-foreground/60 shrink-0" />
                        <span className="text-[10px] text-muted-foreground truncate">{responsable}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Right panel: bars */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ minWidth: '600px' }}>
                <div className="relative">
                  <TimelineHeader projectStart={projectStart} totalDays={totalDays} viewMode={viewMode} />
                  <div className="absolute top-0 bottom-0 w-px bg-amber-500/70 z-10 pointer-events-none"
                    style={{ left: `${todayPct}%` }}>
                    <div className="absolute -top-1 -translate-x-1/2 text-[9px] font-bold text-amber-400 bg-background px-1 rounded whitespace-nowrap">HOY</div>
                  </div>
                </div>
                {tasks.map(task => (
                  <div key={task.id}
                    className={cn('h-12 flex items-center px-2 border-b border-border',
                      selectedTask?.id === task.id && 'bg-secondary/30')}>
                    <div className="relative w-full h-6">
                      <GanttBar task={task} projectStart={projectStart} totalDays={totalDays}
                        onClick={() => { setEditTask(task); openEdit(task) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-3 border-t border-border flex-wrap">
            {Object.entries(STATUS_CONFIG).map(([key, s]) => (
              <div key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={cn('w-3 h-1.5 rounded-full', s.color)} />
                {s.label}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground ml-auto">
              <span className="w-px h-3 bg-amber-500" /> Hoy
            </div>
          </div>
        </div>
      )}

      {/* Selected task detail */}
      {selectedTask && (
        <div className="glass-card p-5 animate-fade-up">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-foreground">{selectedTask.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(selectedTask.planned_start)} → {formatDate(selectedTask.planned_end)} · {daysBetween(selectedTask.planned_start, selectedTask.planned_end)} días
              </p>
              {(() => {
                const { responsable } = parseResponsable(selectedTask)
                return responsable ? (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-blue-400">
                    <User className="w-3.5 h-3.5" />
                    <span>{responsable}</span>
                  </div>
                ) : null
              })()}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(selectedTask)} className="btn-primary text-xs">Editar</button>
              <button onClick={() => setSelectedTask(null)} className="btn-ghost p-1.5"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Estado</p>
              <p className={cn('text-xs font-semibold mt-0.5', STATUS_CONFIG[selectedTask.status]?.text)}>
                {STATUS_CONFIG[selectedTask.status]?.label}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avance actual</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="progress-bar flex-1">
                  <div className="progress-fill bg-emerald-500" style={{ width: `${selectedTask.actual_progress}%` }} />
                </div>
                <span className="font-num text-xs font-semibold">{formatPct(selectedTask.actual_progress)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Notas</p>
              <p className="text-xs text-foreground mt-0.5">{parseResponsable(selectedTask).notes || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Actividad ──────────────────────────────── */}
      {activeModal?.name === 'taskForm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md mx-4 glass-card p-6 animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg text-foreground">
                {editTask ? 'Editar Actividad' : 'Nueva Actividad'}
              </h2>
              <button onClick={closeModal} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* Nombre */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Nombre *</label>
                <input className="field-input mt-1" placeholder="Ej: Instalación de porcelanato planta 1"
                  {...register('name', { required: true })} />
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Inicio *</label>
                  <input type="date" className="field-input mt-1" {...register('planned_start', { required: true })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Fin *</label>
                  <input type="date" className="field-input mt-1" {...register('planned_end', { required: true })} />
                </div>
              </div>

              {/* Responsable */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Responsable
                </label>
                {!customResp ? (
                  <select className="field-input mt-1"
                    {...register('responsable')}
                    onChange={e => {
                      if (e.target.value === '__otro__') setCustomResp(true)
                    }}>
                    <option value="">Sin asignar</option>
                    {respOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex gap-1 mt-1">
                    <input className="field-input flex-1"
                      placeholder="Nombre del responsable o empresa..."
                      {...register('responsable_text')}
                      autoFocus
                    />
                    <button type="button" onClick={() => { setCustomResp(false) }}
                      className="btn-ghost text-xs px-2" title="Volver a lista">↩</button>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  Los subcontratistas registrados en esta obra aparecen en la lista
                </p>
              </div>

              {/* Estado + Avance */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Estado</label>
                  <select className="field-input mt-1" {...register('status')}>
                    {Object.entries(STATUS_CONFIG).map(([k, s]) => (
                      <option key={k} value={k}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Avance: {watch('actual_progress') || 0}%
                  </label>
                  <input type="range" min="0" max="100" step="5"
                    className="w-full mt-2 accent-amber-500"
                    {...register('actual_progress', { valueAsNumber: true })} />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Notas</label>
                <textarea rows={2} className="field-input mt-1 resize-none text-xs"
                  placeholder="Observaciones, condiciones, detalles..."
                  {...register('notes')} />
              </div>

              <div className="flex gap-3 pt-2">
                {editTask && (
                  <button type="button"
                    onClick={() => { removeMut.mutate(editTask.id); closeModal() }}
                    className="btn-ghost text-rose-400 hover:bg-rose-500/10 px-3">
                    Eliminar
                  </button>
                )}
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={createMut.isPending || updateMut.isPending}
                  className="btn-primary flex-1 justify-center">
                  {createMut.isPending || updateMut.isPending ? 'Guardando...' : editTask ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
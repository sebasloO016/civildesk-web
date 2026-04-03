import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { useForm } from 'react-hook-form'
import {
  Plus, X, Calendar, TrendingUp, Clock,
  CheckCircle2, AlertTriangle, Circle, ChevronLeft, ChevronRight,
  Target, Zap,
} from 'lucide-react'
import { formatDate, formatPct, cn } from '../../utils/helpers'

const scheduleApi = {
  getAll:   (wid)       => api.get(`/works/${wid}/schedule`),
  create:   (wid, d)    => api.post(`/works/${wid}/schedule`, d),
  update:   (wid, id, d)=> api.put(`/works/${wid}/schedule/${id}`, d),
  remove:   (wid, id)   => api.delete(`/works/${wid}/schedule/${id}`),
}

const STATUS_CONFIG = {
  PENDING:     { label: 'Pendiente',   color: 'bg-slate-500',   text: 'text-slate-400',   icon: Circle },
  IN_PROGRESS: { label: 'En curso',    color: 'bg-amber-500',   text: 'text-amber-400',   icon: Clock },
  COMPLETED:   { label: 'Completado',  color: 'bg-emerald-500', text: 'text-emerald-400', icon: CheckCircle2 },
  DELAYED:     { label: 'Retrasado',   color: 'bg-rose-500',    text: 'text-rose-400',    icon: AlertTriangle },
}

// ── Helpers ───────────────────────────────────────────────────
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)
const addDays     = (date, days) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().substring(0, 10)
}

// ── Gantt Bar ─────────────────────────────────────────────────
function GanttBar({ task, projectStart, totalDays, onClick }) {
  const startOffset = Math.max(0, daysBetween(projectStart, task.planned_start))
  const planned     = Math.max(1, daysBetween(task.planned_start, task.planned_end))
  const startPct    = (startOffset / totalDays) * 100
  const widthPct    = (planned / totalDays) * 100

  const st = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING
  const pct = parseFloat(task.actual_progress || 0)

  // Color por estado
  const barColor = task.status === 'COMPLETED'  ? 'bg-emerald-500' :
                   task.status === 'DELAYED'     ? 'bg-rose-500' :
                   task.status === 'IN_PROGRESS' ? 'bg-amber-500' :
                                                   'bg-navy-600'

  return (
    <div className="relative h-8 flex items-center" style={{ marginLeft: `${startPct}%`, width: `${widthPct}%` }}>
      {/* Background bar */}
      <div className={cn('absolute inset-0 rounded-md opacity-25', barColor)} />
      {/* Progress fill */}
      <div
        className={cn('absolute top-0 left-0 h-full rounded-md transition-all duration-700', barColor)}
        style={{ width: `${pct}%` }}
      />
      {/* Label */}
      <span className="relative z-10 px-2 text-[10px] font-semibold text-white truncate w-full">
        {pct > 0 && `${Math.round(pct)}%`}
      </span>
      {/* Click overlay */}
      <div className="absolute inset-0 cursor-pointer rounded-md hover:ring-1 hover:ring-white/30 transition-all"
        onClick={onClick} />
    </div>
  )
}

// ── Timeline header ───────────────────────────────────────────
function TimelineHeader({ projectStart, totalDays, viewMode }) {
  const headers = []

  if (viewMode === 'week') {
    // Semanas
    for (let i = 0; i <= totalDays; i += 7) {
      const date = addDays(projectStart, i)
      const label = formatDate(date, { day: '2-digit', month: 'short' })
      headers.push({ label, pct: (i / totalDays) * 100 })
    }
  } else {
    // Meses
    let current = new Date(projectStart)
    current.setDate(1)
    while (daysBetween(projectStart, current.toISOString()) <= totalDays) {
      const offset = Math.max(0, daysBetween(projectStart, current.toISOString()))
      const label = current.toLocaleString('es-EC', { month: 'short', year: '2-digit' })
      headers.push({ label, pct: (offset / totalDays) * 100 })
      current.setMonth(current.getMonth() + 1)
    }
  }

  return (
    <div className="relative h-8 border-b border-border select-none">
      {headers.map((h, i) => (
        <div key={i} className="absolute top-0 flex items-center"
          style={{ left: `${h.pct}%` }}>
          <div className="w-px h-full bg-border" />
          <span className="ml-1 text-[10px] text-muted-foreground whitespace-nowrap">{h.label}</span>
        </div>
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
  const [viewMode,     setViewMode]     = useState('month') // week | month

  const { data, isLoading } = useQuery({
    queryKey: ['schedule', work.id],
    queryFn:  () => scheduleApi.getAll(work.id),
  })

  const tasks = data?.data?.data || []

  // ── Calcular rango del proyecto ───────────────────────────
  const { projectStart, projectEnd, totalDays } = useMemo(() => {
    const allDates = [
      work.start_date,
      work.estimated_end,
      ...tasks.map(t => t.planned_start),
      ...tasks.map(t => t.planned_end),
    ].filter(Boolean)

    if (!allDates.length) {
      const start = work.start_date || new Date().toISOString().substring(0, 10)
      return { projectStart: start, projectEnd: addDays(start, 180), totalDays: 180 }
    }

    const start = allDates.reduce((a, b) => a < b ? a : b)
    const end   = allDates.reduce((a, b) => a > b ? a : b)
    const days  = Math.max(30, daysBetween(start, end) + 14)
    return { projectStart: start, projectEnd: addDays(end, 14), totalDays: days }
  }, [work, tasks])

  // ── Predicción de fecha fin ───────────────────────────────
  const prediction = useMemo(() => {
    const activeTasks = tasks.filter(t => t.status === 'IN_PROGRESS' && t.actual_progress > 0)
    if (!activeTasks.length || !work.start_date) return null

    const progress = parseFloat(work.actual_progress || 0)
    if (progress <= 0) return null

    const daysElapsed  = daysBetween(work.start_date, new Date().toISOString().substring(0, 10))
    const ratePerDay   = progress / daysElapsed
    const remaining    = 100 - progress
    const daysToFinish = Math.ceil(remaining / ratePerDay)
    const predictedEnd = addDays(new Date().toISOString().substring(0, 10), daysToFinish)
    const plannedEnd   = work.estimated_end
    const delay        = daysBetween(plannedEnd, predictedEnd)

    return { predictedEnd, delay, daysToFinish }
  }, [tasks, work])

  const { register, handleSubmit, reset, setValue, watch } = useForm()

  const createMut = useMutation({
    mutationFn: (d) => scheduleApi.create(work.id, d),
    onSuccess: () => {
      qc.invalidateQueries(['schedule', work.id])
      closeModal(); reset()
      toast({ title: 'Actividad creada', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => scheduleApi.update(work.id, id, data),
    onSuccess: () => {
      qc.invalidateQueries(['schedule', work.id])
      setEditTask(null); closeModal()
      toast({ title: 'Actividad actualizada', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const removeMut = useMutation({
    mutationFn: (id) => scheduleApi.remove(work.id, id),
    onSuccess: () => {
      qc.invalidateQueries(['schedule', work.id])
      setSelectedTask(null)
      toast({ title: 'Actividad eliminada' })
    },
  })

  const openEdit = (task) => {
    setEditTask(task)
    reset({
      name:            task.name,
      planned_start:   task.planned_start?.substring(0, 10),
      planned_end:     task.planned_end?.substring(0, 10),
      actual_progress: task.actual_progress,
      status:          task.status,
      notes:           task.notes,
    })
    openModal('taskForm')
  }

  const onSubmit = (data) => {
    const payload = { ...data, actual_progress: parseFloat(data.actual_progress || 0) }
    if (editTask) updateMut.mutate({ id: editTask.id, data: payload })
    else          createMut.mutate(payload)
  }

  // ── Today marker position ─────────────────────────────────
  const today = new Date().toISOString().substring(0, 10)
  const todayPct = Math.max(0, Math.min(100, (daysBetween(projectStart, today) / totalDays) * 100))

  // ── Stats ─────────────────────────────────────────────────
  const completed   = tasks.filter(t => t.status === 'COMPLETED').length
  const inProgress  = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const delayed     = tasks.filter(t => t.status === 'DELAYED').length
  const pending     = tasks.filter(t => t.status === 'PENDING').length

  return (
    <div className="space-y-5">

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Completadas', value: completed,  color: 'text-emerald-400' },
          { label: 'En curso',    value: inProgress, color: 'text-amber-400' },
          { label: 'Retrasadas',  value: delayed,    color: 'text-rose-400' },
          { label: 'Pendientes',  value: pending,    color: 'text-muted-foreground' },
          { label: 'Total',       value: tasks.length, color: 'text-foreground' },
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
          prediction.delay > -7 ? 'border-amber-500/30 bg-amber-500/5' :
          'border-emerald-500/30 bg-emerald-500/5')}>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            prediction.delay > 0 ? 'bg-rose-500/20' : prediction.delay > -7 ? 'bg-amber-500/20' : 'bg-emerald-500/20')}>
            <Target className={cn('w-5 h-5',
              prediction.delay > 0 ? 'text-rose-400' : prediction.delay > -7 ? 'text-amber-400' : 'text-emerald-400')} />
          </div>
          <div>
            <p className={cn('text-sm font-semibold',
              prediction.delay > 0 ? 'text-rose-400' : prediction.delay > -7 ? 'text-amber-400' : 'text-emerald-400')}>
              {prediction.delay > 0
                ? `⚠️ Predicción: entrega con ${prediction.delay} días de retraso`
                : prediction.delay < -7
                  ? `✓ Predicción: entrega ${Math.abs(prediction.delay)} días antes de lo planificado`
                  : '✓ Predicción: entrega en tiempo'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fin estimado: <strong>{formatDate(work.estimated_end)}</strong> ·
              Fin predicho (ritmo actual): <strong>{formatDate(prediction.predictedEnd)}</strong> ·
              {prediction.daysToFinish} días para completar al ritmo actual
            </p>
          </div>
        </div>
      )}

      {/* Header: controls + add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{tasks.length} actividades</span>
          <div className="flex items-center gap-1 glass-card p-1 rounded-lg">
            {['week','month'].map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={cn('px-3 py-1 rounded-md text-xs font-medium transition-all',
                  viewMode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {m === 'week' ? 'Semanas' : 'Meses'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => { setEditTask(null); reset({ status: 'PENDING', actual_progress: 0 }); openModal('taskForm') }}
          className="btn-primary text-xs">
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
          <button onClick={() => { setEditTask(null); reset({ status: 'PENDING', actual_progress: 0 }); openModal('taskForm') }}
            className="btn-primary mt-4 text-xs">
            <Plus className="w-3.5 h-3.5" /> Agregar primera actividad
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="flex">
            {/* Left panel: task names */}
            <div className="w-56 shrink-0 border-r border-border">
              <div className="h-8 border-b border-border flex items-center px-3">
                <span className="text-xs font-semibold text-muted-foreground">ACTIVIDAD</span>
              </div>
              {tasks.map(task => {
                const st = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING
                const Icon = st.icon
                return (
                  <div key={task.id}
                    className={cn('h-12 flex items-center gap-2 px-3 border-b border-border cursor-pointer',
                      'hover:bg-secondary/50 transition-colors',
                      selectedTask?.id === task.id && 'bg-secondary/70')}
                    onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}>
                    <Icon className={cn('w-3.5 h-3.5 shrink-0', st.text)} />
                    <span className="text-xs font-medium text-foreground truncate">{task.name}</span>
                  </div>
                )
              })}
            </div>

            {/* Right panel: Gantt bars */}
            <div className="flex-1 overflow-x-auto">
              <div style={{ minWidth: '600px' }}>
                {/* Today line + Timeline header */}
                <div className="relative">
                  <TimelineHeader projectStart={projectStart} totalDays={totalDays} viewMode={viewMode} />
                  {/* Today vertical line */}
                  <div className="absolute top-0 bottom-0 w-px bg-amber-500/70 z-10 pointer-events-none"
                    style={{ left: `${todayPct}%` }}>
                    <div className="absolute -top-1 -translate-x-1/2 text-[9px] font-bold text-amber-400 bg-navy-900 px-1 rounded whitespace-nowrap">
                      HOY
                    </div>
                  </div>
                </div>

                {/* Bars */}
                {tasks.map(task => (
                  <div key={task.id}
                    className={cn('h-12 flex items-center px-2 border-b border-border',
                      selectedTask?.id === task.id && 'bg-secondary/30')}>
                    <div className="relative w-full h-6">
                      <GanttBar task={task} projectStart={projectStart}
                        totalDays={totalDays}
                        onClick={() => { setEditTask(task); openEdit(task) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-4 py-3 border-t border-border">
            {Object.entries(STATUS_CONFIG).map(([key, s]) => (
              <div key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={cn('w-3 h-1.5 rounded-full', s.color)} />
                {s.label}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground ml-auto">
              <span className="w-px h-3 bg-amber-500" />
              Hoy
            </div>
          </div>
        </div>
      )}

      {/* Selected task detail panel */}
      {selectedTask && (
        <div className="glass-card p-5 animate-fade-up">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-foreground">{selectedTask.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(selectedTask.planned_start)} → {formatDate(selectedTask.planned_end)} ·
                {daysBetween(selectedTask.planned_start, selectedTask.planned_end)} días planificados
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(selectedTask)} className="btn-primary text-xs">
                Editar
              </button>
              <button onClick={() => setSelectedTask(null)} className="btn-ghost p-1.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-3">
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
                  <div className="progress-fill bg-emerald-500"
                    style={{ width: `${selectedTask.actual_progress}%` }} />
                </div>
                <span className="font-num text-xs font-semibold text-foreground">
                  {formatPct(selectedTask.actual_progress)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Notas</p>
              <p className="text-xs text-foreground mt-0.5">{selectedTask.notes || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Actividad ──────────────────────────────── */}
      {activeModal?.name === 'taskForm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md mx-4 glass-card p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg text-foreground">
                {editTask ? 'Editar Actividad' : 'Nueva Actividad'}
              </h2>
              <button onClick={closeModal} className="btn-ghost p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Nombre *</label>
                <input className="field-input mt-1" placeholder="Ej: Estructura de hormigón planta 1"
                  {...register('name', { required: true })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Inicio planificado *</label>
                  <input type="date" className="field-input mt-1"
                    {...register('planned_start', { required: true })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Fin planificado *</label>
                  <input type="date" className="field-input mt-1"
                    {...register('planned_end', { required: true })} />
                </div>
              </div>
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
                    Avance actual: {watch('actual_progress') || 0}%
                  </label>
                  <input type="range" min="0" max="100" step="5" className="w-full mt-2 accent-amber-500"
                    {...register('actual_progress', { valueAsNumber: true })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Notas</label>
                <textarea rows={2} className="field-input mt-1 resize-none text-xs"
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
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">
                  Cancelar
                </button>
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

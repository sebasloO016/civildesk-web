import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { useForm } from 'react-hook-form'
import {
  Plus, X, FileCheck, CheckCircle2, Clock,
  Download, DollarSign, Trash2,
} from 'lucide-react'
import { formatCurrency, formatPct, formatDate, openPdf, cn } from '../../utils/helpers'

const certsApi = {
  getAll:  (wid)     => api.get(`/works/${wid}/certificates`),
  create:  (wid, d)  => api.post(`/works/${wid}/certificates`, d),
  approve: (wid, id) => api.patch(`/works/${wid}/certificates/${id}/approve`),
  remove:  (wid, id) => api.delete(`/works/${wid}/certificates/${id}`),
  pdf:     (id)      => openPdf(`/pdf/certificates/${id}`),
}

const STATUS_CONFIG = {
  DRAFT: { label: 'Borrador',         color: 'bg-slate-500/15 text-slate-400 border-slate-500/20',     icon: Clock },
  SENT:  { label: 'Enviado/Aprobado', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  PAID:  { label: 'Pagado',           color: 'bg-blue-500/15 text-blue-400 border-blue-500/20',         icon: CheckCircle2 },
}

// Recibe totalObra y subTotal desde WorkDetail
export default function CertificatesTab({ work, totalObra, subTotal }) {
  const qc = useQueryClient()
  const { toast, openModal, closeModal, activeModal } = useUIStore()

  const { data, isLoading } = useQuery({
    queryKey: ['certificates', work.id],
    queryFn:  () => certsApi.getAll(work.id),
  })

  const certs = data?.data?.data || []

  const totalBilled = certs
    .filter(c => c.status === 'SENT' || c.status === 'PAID')
    .reduce((s, c) => s + parseFloat(c.amount_to_bill || 0), 0)

  // Presupuesto total (recursos + subcontratos)
  const budgetTotal = totalObra || parseFloat(work.initial_budget || 0)

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      progress_pct: parseFloat(work.actual_progress || 0),
      period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10),
      period_end:   new Date().toISOString().substring(0, 10),
    },
  })

  const createMut = useMutation({
    mutationFn: (d) => certsApi.create(work.id, d),
    onSuccess: () => {
      qc.invalidateQueries(['certificates', work.id])
      closeModal(); reset()
      toast({ title: 'Certificado creado', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const approveMut = useMutation({
    mutationFn: (id) => certsApi.approve(work.id, id),
    onSuccess: () => {
      qc.invalidateQueries(['certificates', work.id])
      toast({ title: 'Certificado aprobado — ingreso registrado en finanzas', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const removeMut = useMutation({
    mutationFn: (id) => certsApi.remove(work.id, id),
    onSuccess: () => {
      qc.invalidateQueries(['certificates', work.id])
      toast({ title: 'Certificado eliminado' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const progressPct = watch('progress_pct')

  // Auto-calcular monto basado en presupuesto TOTAL (recursos + subcontratos)
  const autoAmount = () => {
    const pct      = parseFloat(progressPct || 0)
    const expected = (pct / 100) * budgetTotal
    const amount   = Math.max(0, expected - totalBilled)
    setValue('amount_to_bill', amount.toFixed(2))
  }

  const onSubmit = (data) => {
    const month = new Date(data.period_end).toLocaleString('es-EC', { month: 'long', year: 'numeric' })
    createMut.mutate({ ...data, period: data.period || month })
  }

  return (
    <div className="space-y-5">

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <p className="font-num text-xl font-bold text-foreground">{certs.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Certificados emitidos</p>
        </div>
        <div className="glass-card p-4">
          <p className="font-num text-xl font-bold text-emerald-400">{formatCurrency(totalBilled)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total facturado al cliente</p>
        </div>
        <div className="glass-card p-4">
          <p className="font-num text-xl font-bold text-amber-400">
            {formatCurrency(budgetTotal - totalBilled)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Saldo pendiente de facturar</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{certs.length} certificado(s)</p>
        <button
          onClick={() => {
            reset({
              progress_pct: parseFloat(work.actual_progress || 0),
              period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10),
              period_end:   new Date().toISOString().substring(0, 10),
            })
            openModal('certForm')
          }}
          className="btn-primary text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Nuevo Certificado
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="glass-card p-5 shimmer h-32 rounded-xl" />)}</div>
      ) : certs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 glass-card">
          <FileCheck className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Sin certificados de avance</p>
          <p className="text-xs text-muted-foreground mt-1">
            Los certificados sustentan cobros parciales al cliente según avance de obra
          </p>
          <button onClick={() => openModal('certForm')} className="btn-primary mt-4 text-xs">
            <Plus className="w-3.5 h-3.5" /> Generar primer certificado
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {certs.map(cert => {
            const st   = STATUS_CONFIG[cert.status] || STATUS_CONFIG.DRAFT
            const Icon = st.icon
            return (
              <div key={cert.id} className="glass-card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-semibold text-foreground">
                        {cert.certificate_number}
                      </h3>
                      <span className={cn('badge border text-[10px]', st.color)}>
                        <Icon className="w-3 h-3 mr-1" />
                        {st.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Período: <strong>{cert.period}</strong>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-num text-2xl font-bold text-amber-400">
                      {formatCurrency(cert.amount_to_bill)}
                    </p>
                    <p className="text-xs text-muted-foreground">a facturar al cliente</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Avance certificado</span>
                    <span className="font-num font-semibold text-foreground">
                      {formatPct(cert.progress_pct)}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill bg-emerald-500"
                      style={{ width: `${cert.progress_pct}%` }} />
                  </div>
                </div>

                {cert.notes && (
                  <p className="text-xs text-muted-foreground mb-4 italic">{cert.notes}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-border flex-wrap">
                  <button onClick={() => certsApi.pdf(cert.id)} className="btn-ghost text-xs">
                    <Download className="w-3.5 h-3.5" /> Descargar PDF
                  </button>

                  {cert.status === 'DRAFT' && (
                    <>
                      <button
                        onClick={() => approveMut.mutate(cert.id)}
                        disabled={approveMut.isPending}
                        className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {approveMut.isPending ? 'Aprobando...' : 'Aprobar y registrar ingreso'}
                      </button>
                      <button
                        onClick={() => removeMut.mutate(cert.id)}
                        className="btn-ghost text-xs hover:text-rose-400 hover:bg-rose-500/10 ml-auto">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {(cert.status === 'SENT' || cert.status === 'PAID') && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 ml-auto">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {cert.status === 'PAID' ? 'Pagado' : 'Aprobado'} el {formatDate(cert.issued_at || cert.created_at)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL: Nuevo Certificado ──────────────────────── */}
      {activeModal?.name === 'certForm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md mx-4 glass-card p-6 animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg text-foreground">
                Nuevo Certificado de Avance
              </h2>
              <button onClick={closeModal} className="btn-ghost p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Desglose presupuesto */}
            <div className="glass-card p-3 mb-4 space-y-1.5 text-xs">
              <p className="text-muted-foreground font-medium">{work.name}</p>
              <div className="flex justify-between text-muted-foreground">
                <span>Recursos propios</span>
                <span className="font-num">{formatCurrency(work.initial_budget)}</span>
              </div>
              {subTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Subcontratos</span>
                  <span className="font-num">{formatCurrency(subTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-border pt-1.5">
                <span className="text-foreground">Total obra</span>
                <span className="font-num text-foreground">{formatCurrency(budgetTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Ya facturado</span>
                <span className="font-num text-emerald-400">{formatCurrency(totalBilled)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-amber-400">Pendiente de facturar</span>
                <span className="font-num text-amber-400">{formatCurrency(budgetTotal - totalBilled)}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Período / Descripción *
                </label>
                <input className="field-input mt-1"
                  placeholder="Ej: Abril 2026, Mes 1, Avance 35%..."
                  {...register('period', { required: true })} />
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Avance acumulado: {progressPct || 0}%
                </label>
                <input type="range" min="0" max="100" step="1"
                  className="w-full mt-2 accent-amber-500"
                  {...register('progress_pct', { valueAsNumber: true })}
                  onMouseUp={autoAmount} onTouchEnd={autoAmount} />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>0%</span>
                  <span className="font-semibold text-amber-400">{progressPct || 0}%</span>
                  <span>100%</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Monto a facturar al cliente *
                </label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input type="number" step="0.01" className="field-input pl-8"
                    placeholder="0.00"
                    {...register('amount_to_bill', { required: true, valueAsNumber: true })} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Sugerido: {formatCurrency(Math.max(0, (parseFloat(progressPct || 0) / 100) * budgetTotal - totalBilled))}
                  {' '}(avance × total obra − ya facturado)
                </p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Notas</label>
                <textarea rows={2} className="field-input mt-1 resize-none text-xs"
                  placeholder="Observaciones del período..."
                  {...register('notes')} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">
                  Cancelar
                </button>
                <button type="submit" disabled={createMut.isPending} className="btn-primary flex-1 justify-center">
                  {createMut.isPending ? 'Creando...' : 'Crear Certificado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

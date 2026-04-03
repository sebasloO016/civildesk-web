import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { useForm } from 'react-hook-form'
import {
  Plus, X, DollarSign, TrendingUp, Clock,
  CheckCircle2, AlertTriangle, CreditCard, ChevronDown, ChevronUp,
} from 'lucide-react'
import { formatCurrency, formatDate, formatPct, progressColor, cn } from '../../utils/helpers'

const subApi = {
  getAll:     (wid)        => api.get(`/works/${wid}/subcontracts`),
  getSummary: (wid)        => api.get(`/works/${wid}/subcontracts/summary`),
  create:     (wid, data)  => api.post(`/works/${wid}/subcontracts`, data),
  update:     (wid, id, d) => api.put(`/works/${wid}/subcontracts/${id}`, d),
  remove:     (wid, id)    => api.delete(`/works/${wid}/subcontracts/${id}`),
  addPayment: (wid, id, d) => api.post(`/works/${wid}/subcontracts/${id}/payments`, d),
}

const suppliersApi = { getAll: () => api.get('/suppliers?limit=100') }

const STATUS_COLORS = {
  ACTIVE:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  COMPLETED: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  PAUSED:    'bg-amber-500/15 text-amber-400 border-amber-500/20',
  CANCELLED: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
}

const STATUS_LABELS = {
  ACTIVE: 'Activo', COMPLETED: 'Completado', PAUSED: 'Pausado', CANCELLED: 'Cancelado'
}

const PAYMENT_METHODS = ['Efectivo','Transferencia','Cheque','Depósito','Otro']

const SPECIALTIES = [
  'Estructura','Gypsum','Electricidad','Plomería','Pintura',
  'Carpintería','Cerrajería','Pisos','Fachada','Impermeabilización','Otro',
]

// ── SubcontractCard ───────────────────────────────────────────
function SubcontractCard({ sub, workId, onPayment, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const pct = parseFloat(sub.progress_pct || 0)
  const paid = parseFloat(sub.paid_amount || 0)
  const total = parseFloat(sub.contracted_amount || 0)
  const pending = total - paid
  const payPct = total > 0 ? (paid / total) * 100 : 0

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-semibold text-foreground">{sub.specialty}</h3>
              <span className={cn('badge border text-[10px]', STATUS_COLORS[sub.status])}>
                {STATUS_LABELS[sub.status]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {sub.supplier?.name || '—'} · {formatDate(sub.start_date)} — {formatDate(sub.end_date)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-num text-lg font-bold text-foreground">{formatCurrency(total)}</p>
            <p className="text-xs text-muted-foreground">contratado</p>
          </div>
        </div>

        {/* Progreso avance */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Avance físico</span>
            <span className="font-num font-semibold text-foreground">{formatPct(pct)}</span>
          </div>
          <div className="progress-bar">
            <div className={cn('progress-fill', progressColor(pct))} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Progreso pago */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Pagado</span>
            <span className="font-num font-semibold text-amber-400">
              {formatCurrency(paid)} / {formatCurrency(total)}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill bg-amber-500" style={{ width: `${payPct}%` }} />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
          <div className="text-center">
            <p className="font-num text-sm font-bold text-emerald-400">{formatCurrency(paid)}</p>
            <p className="text-[10px] text-muted-foreground">Pagado</p>
          </div>
          <div className="text-center">
            <p className="font-num text-sm font-bold text-rose-400">{formatCurrency(pending)}</p>
            <p className="text-[10px] text-muted-foreground">Pendiente</p>
          </div>
          <div className="text-center">
            <p className="font-num text-sm font-bold text-foreground">{sub.payments?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Pagos</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-4 flex gap-2 flex-wrap">
        {sub.status === 'ACTIVE' && pending > 0 && (
          <button onClick={() => onPayment(sub)}
            className="btn-primary text-xs">
            <CreditCard className="w-3.5 h-3.5" /> Registrar Pago
          </button>
        )}
        <button onClick={() => onEdit(sub)} className="btn-ghost text-xs">
          Editar
        </button>
        <button onClick={() => setExpanded(!expanded)} className="btn-ghost text-xs ml-auto">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Ocultar' : 'Ver pagos'}
        </button>
      </div>

      {/* Payments list */}
      {expanded && (
        <div className="border-t border-border bg-secondary/30 px-5 py-4">
          {!sub.payments?.length ? (
            <p className="text-xs text-muted-foreground text-center py-3">Sin pagos registrados</p>
          ) : (
            <div className="space-y-2">
              {sub.payments.map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-foreground font-medium">{formatDate(p.payment_date)}</span>
                    <span className="text-muted-foreground ml-2">{p.payment_method}</span>
                    {p.reference && <span className="text-muted-foreground ml-1">· {p.reference}</span>}
                  </div>
                  <span className="font-num font-bold text-emerald-400">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main SubcontractsTab ──────────────────────────────────────
export default function SubcontractsTab({ workId }) {
  const qc = useQueryClient()
  const { toast, openModal, closeModal, activeModal } = useUIStore()
  const [editSub, setEditSub]     = useState(null)
  const [paymentSub, setPaymentSub] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['subcontracts', workId],
    queryFn:  () => subApi.getAll(workId),
  })

  const { data: summaryData } = useQuery({
    queryKey: ['subcontracts-summary', workId],
    queryFn:  () => subApi.getSummary(workId),
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-select'],
    queryFn:  () => suppliersApi.getAll(),
  })

  const subs     = data?.data?.data     || []
  const summary  = summaryData?.data?.data
  const suppliers = suppliersData?.data?.data || []

  const subForm  = useForm()
  const payForm  = useForm()

  const createMut = useMutation({
    mutationFn: (d) => subApi.create(workId, d),
    onSuccess: () => {
      qc.invalidateQueries(['subcontracts', workId])
      qc.invalidateQueries(['subcontracts-summary', workId])
      closeModal(); subForm.reset()
      toast({ title: 'Subcontrato creado', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => subApi.update(workId, id, data),
    onSuccess: () => {
      qc.invalidateQueries(['subcontracts', workId])
      setEditSub(null); closeModal()
      toast({ title: 'Subcontrato actualizado', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const payMut = useMutation({
    mutationFn: ({ id, data }) => subApi.addPayment(workId, id, data),
    onSuccess: (res) => {
      qc.invalidateQueries(['subcontracts', workId])
      qc.invalidateQueries(['subcontracts-summary', workId])
      setPaymentSub(null); closeModal(); payForm.reset()
      toast({ title: 'Pago registrado', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const openEdit = (sub) => {
    setEditSub(sub)
    subForm.reset({
      specialty:         sub.specialty,
      supplier_id:       sub.supplier_id,
      contracted_amount: sub.contracted_amount,
      start_date:        sub.start_date?.substring(0,10),
      end_date:          sub.end_date?.substring(0,10),
      progress_pct:      sub.progress_pct,
      status:            sub.status,
      notes:             sub.notes,
    })
    openModal('subForm')
  }

  const openPayment = (sub) => {
    setPaymentSub(sub)
    payForm.reset({ payment_date: new Date().toISOString().substring(0,10) })
    openModal('payForm')
  }

  const onSubSubmit = (data) => {
    const payload = { ...data, contracted_amount: parseFloat(data.contracted_amount) }
    if (editSub) updateMut.mutate({ id: editSub.id, data: payload })
    else         createMut.mutate(payload)
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total contratado', value: formatCurrency(summary.total_contracted), color: 'text-foreground' },
            { label: 'Total pagado',     value: formatCurrency(summary.total_paid),       color: 'text-emerald-400' },
            { label: 'Pendiente',        value: formatCurrency(summary.total_pending),    color: 'text-rose-400' },
            { label: 'Avance promedio',  value: formatPct(summary.avg_progress),          color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="glass-card p-4">
              <p className={cn('font-num text-xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{subs.length} subcontrato(s)</p>
        <button onClick={() => { setEditSub(null); subForm.reset({ status: 'ACTIVE' }); openModal('subForm') }}
          className="btn-primary text-xs">
          <Plus className="w-3.5 h-3.5" /> Nuevo Subcontrato
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="glass-card p-5 shimmer h-40 rounded-xl" />)}</div>
      ) : subs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 glass-card">
          <CreditCard className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Sin subcontratos registrados</p>
          <button onClick={() => { setEditSub(null); subForm.reset({ status: 'ACTIVE' }); openModal('subForm') }}
            className="btn-primary mt-4 text-xs">
            <Plus className="w-3.5 h-3.5" /> Agregar subcontrato
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {subs.map(sub => (
            <SubcontractCard key={sub.id} sub={sub} workId={workId}
              onPayment={openPayment} onEdit={openEdit} />
          ))}
        </div>
      )}

      {/* ── MODAL: Subcontrato ─────────────────────────────── */}
      {activeModal?.name === 'subForm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-lg mx-4 glass-card p-6 animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg text-foreground">
                {editSub ? 'Editar Subcontrato' : 'Nuevo Subcontrato'}
              </h2>
              <button onClick={closeModal} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={subForm.handleSubmit(onSubSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Especialidad *</label>
                  <select className="field-input mt-1" {...subForm.register('specialty', { required: true })}>
                    <option value="">Seleccionar...</option>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Proveedor/Contratista *</label>
                  <select className="field-input mt-1" {...subForm.register('supplier_id', { required: true, valueAsNumber: true })}>
                    <option value="">Seleccionar...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Monto contratado *</label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input type="number" step="0.01" className="field-input pl-8" placeholder="0.00"
                    {...subForm.register('contracted_amount', { required: true, valueAsNumber: true })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Inicio</label>
                  <input type="date" className="field-input mt-1" {...subForm.register('start_date')} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Fin estimado</label>
                  <input type="date" className="field-input mt-1" {...subForm.register('end_date')} />
                </div>
              </div>
              {editSub && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Avance % actual</label>
                    <input type="number" step="0.1" min="0" max="100" className="field-input mt-1"
                      placeholder="0"
                      {...subForm.register('progress_pct', { valueAsNumber: true })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Estado</label>
                    <select className="field-input mt-1" {...subForm.register('status')}>
                      <option value="ACTIVE">Activo</option>
                      <option value="PAUSED">Pausado</option>
                      <option value="COMPLETED">Completado</option>
                      <option value="CANCELLED">Cancelado</option>
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Descripción / Alcance</label>
                <textarea rows={2} className="field-input mt-1 resize-none text-xs"
                  placeholder="Descripción del trabajo subcontratado..."
                  {...subForm.register('notes')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={createMut.isPending || updateMut.isPending}
                  className="btn-primary flex-1 justify-center">
                  {createMut.isPending || updateMut.isPending ? 'Guardando...' : editSub ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Pago ───────────────────────────────────── */}
      {activeModal?.name === 'payForm' && paymentSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md mx-4 glass-card p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-bold text-lg text-foreground">Registrar Pago</h2>
              <button onClick={closeModal} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center justify-between mb-5 p-3 rounded-lg bg-secondary/50">
              <div>
                <p className="text-xs text-muted-foreground">Subcontrato</p>
                <p className="text-sm font-semibold text-foreground">{paymentSub.specialty}</p>
                <p className="text-xs text-muted-foreground">{paymentSub.supplier?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Pendiente</p>
                <p className="font-num text-lg font-bold text-rose-400">
                  {formatCurrency(parseFloat(paymentSub.contracted_amount) - parseFloat(paymentSub.paid_amount))}
                </p>
              </div>
            </div>
            <form onSubmit={payForm.handleSubmit(d => payMut.mutate({ id: paymentSub.id, data: d }))}
              className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Monto *</label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input type="number" step="0.01" className="field-input pl-8"
                    placeholder="0.00" max={parseFloat(paymentSub.contracted_amount) - parseFloat(paymentSub.paid_amount)}
                    {...payForm.register('amount', { required: true, valueAsNumber: true })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Fecha *</label>
                  <input type="date" className="field-input mt-1"
                    {...payForm.register('payment_date', { required: true })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Método</label>
                  <select className="field-input mt-1" {...payForm.register('payment_method')}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Referencia / Comprobante</label>
                <input className="field-input mt-1" placeholder="N° transferencia, cheque..."
                  {...payForm.register('reference')} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={payMut.isPending}
                  className="btn-primary flex-1 justify-center bg-emerald-600 hover:bg-emerald-700">
                  {payMut.isPending ? 'Registrando...' : 'Registrar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

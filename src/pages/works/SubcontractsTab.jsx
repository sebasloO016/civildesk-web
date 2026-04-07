import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { useForm } from 'react-hook-form'
import {
  Plus, X, DollarSign, TrendingUp, Clock,
  CheckCircle2, AlertTriangle, CreditCard, ChevronDown, ChevronUp,
  Ruler, Calculator,
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
const UNITS = ['m²','ml','m³','unidad','punto','global','hora','día','kg','ton']

// ── Helpers para parsear medición guardada en description/notes ──
// Usamos description para guardar JSON de medición y notes para texto libre
const parseMedicion = (sub) => {
  try {
    const d = JSON.parse(sub.description || '{}')
    if (d.__medicion) return d
  } catch {}
  return null
}

const buildDescriptionJSON = (data) => {
  // Si tiene precio/u y cantidad estimada, guardamos en description como JSON
  if (data.unit_price && parseFloat(data.unit_price) > 0) {
    return JSON.stringify({
      __medicion:    true,
      unit_price:    parseFloat(data.unit_price),
      unit:          data.unit || 'unidad',
      estimated_qty: parseFloat(data.estimated_qty || 0),
      measured_qty:  parseFloat(data.measured_qty  || 0),
      alcance:       data.alcance || '',
    })
  }
  return data.alcance || ''
}

// ── SubcontractCard ───────────────────────────────────────────
function SubcontractCard({ sub, workId, onPayment, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const medicion = parseMedicion(sub)
  const pct     = parseFloat(sub.progress_pct || 0)
  const paid    = parseFloat(sub.paid_amount || 0)
  const total   = parseFloat(sub.contracted_amount || 0)
  const pending = total - paid
  const payPct  = total > 0 ? Math.min((paid / total) * 100, 100) : 0

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
            {/* Datos de medición si existen */}
            {medicion && (
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Ruler className="w-3 h-3" />
                  {formatCurrency(medicion.unit_price)}/{medicion.unit}
                </span>
                <span>Est: {medicion.estimated_qty} {medicion.unit}</span>
                {medicion.measured_qty > 0 && (
                  <span className="text-amber-400 font-semibold">
                    Medido: {medicion.measured_qty} {medicion.unit}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="font-num text-lg font-bold text-foreground">{formatCurrency(total)}</p>
            <p className="text-xs text-muted-foreground">contratado</p>
          </div>
        </div>

        {/* Progreso avance físico */}
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

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button onClick={() => onPayment(sub)} className="btn-primary text-xs flex-1 justify-center">
            <DollarSign className="w-3.5 h-3.5" /> Registrar Pago
          </button>
          <button onClick={() => onEdit(sub)} className="btn-ghost text-xs">
            Editar
          </button>
          <button onClick={() => setExpanded(!expanded)} className="btn-ghost text-xs">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Ocultar' : 'Ver pagos'}
          </button>
        </div>
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
  const [editSub, setEditSub]       = useState(null)
  const [paymentSub, setPaymentSub] = useState(null)

  // Modo de precio: 'global' o 'por_unidad'
  const [precioMode, setPrecioMode] = useState('por_unidad')
  const [customSpecialty, setCustomSpecialty] = useState(false)

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

  const subs      = data?.data?.data     || []
  const summary   = summaryData?.data?.data
  const suppliers = suppliersData?.data?.data || []

  const subForm = useForm()
  const payForm = useForm()

  // Watchers para cálculo en tiempo real
  const unitPrice    = parseFloat(subForm.watch('unit_price')    || 0)
  const estimatedQty = parseFloat(subForm.watch('estimated_qty') || 0)
  const measuredQty  = parseFloat(subForm.watch('measured_qty')  || 0)
  const estimatedTotal = precioMode === 'por_unidad' ? unitPrice * estimatedQty : 0
  const measuredTotal  = precioMode === 'por_unidad' && measuredQty > 0 ? unitPrice * measuredQty : 0

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
    onSuccess: () => {
      qc.invalidateQueries(['subcontracts', workId])
      qc.invalidateQueries(['subcontracts-summary', workId])
      setPaymentSub(null); closeModal(); payForm.reset()
      toast({ title: 'Pago registrado', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const openEdit = (sub) => {
    setEditSub(sub)
    // Detectar si la especialidad es personalizada (no está en la lista)
    setCustomSpecialty(!SPECIALTIES.includes(sub.specialty))
    const medicion = parseMedicion(sub)
    if (medicion) {
      setPrecioMode('por_unidad')
      subForm.reset({
        specialty:         sub.specialty,
        supplier_id:       sub.supplier_id,
        unit_price:        medicion.unit_price,
        unit:              medicion.unit,
        estimated_qty:     medicion.estimated_qty,
        measured_qty:      medicion.measured_qty,
        contracted_amount: sub.contracted_amount,
        start_date:        sub.start_date?.substring(0,10),
        end_date:          sub.end_date?.substring(0,10),
        progress_pct:      sub.progress_pct,
        status:            sub.status,
        alcance:           medicion.alcance,
      })
    } else {
      setPrecioMode('global')
      subForm.reset({
        specialty:         sub.specialty,
        supplier_id:       sub.supplier_id,
        contracted_amount: sub.contracted_amount,
        start_date:        sub.start_date?.substring(0,10),
        end_date:          sub.end_date?.substring(0,10),
        progress_pct:      sub.progress_pct,
        status:            sub.status,
        alcance:           sub.description || '',
      })
    }
    openModal('subForm')
  }

  const openPayment = (sub) => {
    setPaymentSub(sub)
    payForm.reset({ payment_date: new Date().toISOString().substring(0,10) })
    openModal('payForm')
  }

  const onSubSubmit = (data) => {
    let contracted_amount = parseFloat(data.contracted_amount || 0)

    // Si modo por unidad, calcular monto desde medición real o estimada
    if (precioMode === 'por_unidad') {
      const mQty = parseFloat(data.measured_qty || 0)
      const eQty = parseFloat(data.estimated_qty || 0)
      const uPrice = parseFloat(data.unit_price || 0)
      // Si hay medición real → usar esa, sino usar estimada
      contracted_amount = (mQty > 0 ? mQty : eQty) * uPrice
    }

    const payload = {
      specialty:         data.specialty,
      supplier_id:       data.supplier_id,
      contracted_amount,
      start_date:        data.start_date,
      end_date:          data.end_date,
      status:            data.status || 'ACTIVE',
      progress_pct:      parseFloat(data.progress_pct || 0),
      // Guardamos datos de medición en description como JSON
      description:       buildDescriptionJSON({ ...data, alcance: data.alcance }),
      notes:             data.notes || '',
    }

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
        <button
          onClick={() => { setEditSub(null); setPrecioMode('por_unidad'); setCustomSpecialty(false); subForm.reset({ status: 'ACTIVE' }); openModal('subForm') }}
          className="btn-primary text-xs"
        >
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
          <button
            onClick={() => { setEditSub(null); setPrecioMode('por_unidad'); setCustomSpecialty(false); subForm.reset({ status: 'ACTIVE' }); openModal('subForm') }}
            className="btn-primary mt-4 text-xs"
          >
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
          <div className="relative z-10 w-full max-w-lg mx-4 glass-card animate-fade-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-[hsl(220_22%_9%)] z-10">
              <h2 className="font-display font-bold text-lg text-foreground">
                {editSub ? 'Editar Subcontrato' : 'Nuevo Subcontrato'}
              </h2>
              <button onClick={closeModal} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={subForm.handleSubmit(onSubSubmit)} className="p-5 space-y-4">

              {/* Especialidad + Contratista */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Especialidad *</label>
                  {!customSpecialty ? (
                    <select className="field-input mt-1"
                      {...subForm.register('specialty', { required: true })}
                      onChange={e => {
                        subForm.setValue('specialty', e.target.value)
                        if (e.target.value === 'Otro') {
                          setCustomSpecialty(true)
                          subForm.setValue('specialty', '')
                        }
                      }}
                    >
                      <option value="">Seleccionar...</option>
                      {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <div className="flex gap-1 mt-1">
                      <input
                        className="field-input flex-1"
                        placeholder="Ej: Cielo raso 15cm, Cortineros ml..."
                        {...subForm.register('specialty', { required: true })}
                        autoFocus
                      />
                      <button type="button"
                        className="btn-ghost text-xs px-2"
                        onClick={() => { setCustomSpecialty(false); subForm.setValue('specialty', '') }}
                        title="Volver a lista"
                      >
                        ↩
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Contratista *</label>
                  <select className="field-input mt-1" {...subForm.register('supplier_id', { required: true, valueAsNumber: true })}>
                    <option value="">Seleccionar...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Modo de precio */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Tipo de precio</label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setPrecioMode('por_unidad')}
                    className={cn('flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                      precioMode === 'por_unidad'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : 'text-muted-foreground border-border hover:text-foreground')}
                  >
                    <Ruler className="w-3.5 h-3.5" /> Por unidad (m², ml, etc.)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrecioMode('global')}
                    className={cn('flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all',
                      precioMode === 'global'
                        ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        : 'text-muted-foreground border-border hover:text-foreground')}
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Monto global fijo
                  </button>
                </div>
              </div>

              {/* MODO: POR UNIDAD */}
              {precioMode === 'por_unidad' && (
                <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Precio acordado</p>

                  {/* Precio/u + Unidad */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Precio por unidad *</label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <input type="number" step="0.01" min="0" className="field-input pl-6"
                          placeholder="0.00"
                          {...subForm.register('unit_price', { valueAsNumber: true })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Unidad</label>
                      <select className="field-input mt-1" {...subForm.register('unit')}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Cantidad estimada */}
                  <div>
                    <label className="text-xs text-muted-foreground">Cantidad estimada (al inicio)</label>
                    <input type="number" step="0.01" min="0" className="field-input mt-1"
                      placeholder="0"
                      {...subForm.register('estimated_qty', { valueAsNumber: true })} />
                  </div>

                  {/* Total estimado */}
                  {estimatedTotal > 0 && (
                    <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-blue-500/8 border border-blue-500/20">
                      <span className="text-muted-foreground">Monto estimado ({estimatedQty} × ${unitPrice.toFixed(2)})</span>
                      <span className="font-num font-bold text-blue-400">{formatCurrency(estimatedTotal)}</span>
                    </div>
                  )}

                  {/* Separador medición real */}
                  <div className="border-t border-border/50 pt-3 mt-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Calculator className="w-3 h-3" />
                      Liquidación — cantidad real medida
                    </p>
                    <p className="text-[10px] text-muted-foreground mb-2">
                      Completa esto al finalizar el trabajo, cuando el contratista entregue la medición.
                    </p>
                    <input type="number" step="0.01" min="0" className="field-input"
                      placeholder={`Cantidad real medida (${subForm.watch('unit') || 'unidad'})`}
                      {...subForm.register('measured_qty', { valueAsNumber: true })} />

                    {measuredTotal > 0 && (
                      <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-amber-500/8 border border-amber-500/20 mt-2">
                        <span className="text-muted-foreground">Monto real ({measuredQty} × ${unitPrice.toFixed(2)})</span>
                        <span className="font-num font-bold text-amber-400">{formatCurrency(measuredTotal)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MODO: GLOBAL */}
              {precioMode === 'global' && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Monto contratado *</label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input type="number" step="0.01" className="field-input pl-8" placeholder="0.00"
                      {...subForm.register('contracted_amount', { required: precioMode === 'global', valueAsNumber: true })} />
                  </div>
                </div>
              )}

              {/* Fechas */}
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

              {/* Avance y Estado (solo en edición) */}
              {editSub && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Avance físico %</label>
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

              {/* Alcance */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Alcance / Descripción</label>
                <textarea rows={2} className="field-input mt-1 resize-none text-xs"
                  placeholder="Descripción del trabajo: qué incluye, condiciones, etc."
                  {...subForm.register('alcance')} />
              </div>

              <div className="flex gap-3 pt-1">
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
                    placeholder="0.00"
                    max={parseFloat(paymentSub.contracted_amount) - parseFloat(paymentSub.paid_amount)}
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
                <input className="field-input mt-1" placeholder="Nº transferencia, cheque, etc."
                  {...payForm.register('reference')} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={payMut.isPending}
                  className="btn-primary flex-1 justify-center">
                  {payMut.isPending ? 'Guardando...' : 'Registrar pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { projectsApi, catalogApi } from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { openPdf } from '../../utils/helpers'
import UploadDocBtn from '../../components/UploadDocBtn'
import {
  ArrowLeft, Plus, X, FileText, CheckCircle2, Pen,
  Loader2, ChevronDown, ChevronUp,
  FilePlus, FileSignature, Banknote, FolderKanban,
  GitCompare, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '../../utils/helpers'

// ── Status config ─────────────────────────────────────────────
const STATUS = {
  PROFORMA:    { label:'Proforma',    color:'bg-slate-500/15   text-slate-400   border-slate-500/20',   step:1 },
  CONTRACT:    { label:'Contrato',    color:'bg-amber-500/15   text-amber-400   border-amber-500/20',   step:2 },
  EXECUTION:   { label:'En Ejecución',color:'bg-blue-500/15    text-blue-400    border-blue-500/20',    step:3 },
  LIQUIDATION: { label:'Liquidación', color:'bg-purple-500/15  text-purple-400  border-purple-500/20',  step:4 },
  CLOSED:      { label:'Cerrado',     color:'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', step:5 },
}
const PROFORMA_STATUS = {
  DRAFT:    { label:'Borrador',  color:'text-slate-400'   },
  SENT:     { label:'Enviada',   color:'text-amber-400'   },
  APPROVED: { label:'Aprobada', color:'text-emerald-400' },
  REJECTED: { label:'Rechazada',color:'text-rose-400'    },
}
const CONTRACT_STATUS = {
  DRAFT:  { label:'Borrador', color:'text-slate-400'   },
  SENT:   { label:'Enviado',  color:'text-amber-400'   },
  SIGNED: { label:'Firmado',  color:'text-emerald-400' },
  ACTIVE: { label:'Activo',   color:'text-blue-400'    },
  CLOSED: { label:'Cerrado',  color:'text-purple-400'  },
}

// ── Proforma Items Builder ──────────────────────────────────────
function ProformaItemsBuilder({ control, register, watch, setValue }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const [showCatalog, setShowCatalog] = useState(null)
  const { data: catalogData } = useQuery({
    queryKey: ['catalog-rubros-select'],
    queryFn:  () => catalogApi.getRubros({ limit: 200 }),
  })
  const rubros = catalogData?.data?.data || []
  const subtotal = fields.reduce((s, _, idx) => {
    return s + ((parseFloat(watch(`items.${idx}.quantity`)) || 0) * (parseFloat(watch(`items.${idx}.unit_price`)) || 0))
  }, 0)
  const selectRubro = (idx, r) => {
    setValue(`items.${idx}.description`, r.name)
    setValue(`items.${idx}.unit`, r.unit)
    setValue(`items.${idx}.unit_price`, parseFloat(r.reference_price || 0))
    setShowCatalog(null)
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground uppercase tracking-wider">Ítems del presupuesto *</label>
        <button type="button" onClick={() => append({ description:'', unit:'m²', quantity:1, unit_price:0 })} className="btn-ghost text-xs">
          <Plus className="w-3.5 h-3.5" /> Agregar ítem
        </button>
      </div>
      {fields.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-border rounded-xl">
          <p className="text-xs text-muted-foreground">Sin ítems — agrega o selecciona del catálogo</p>
        </div>
      )}
      <div className="space-y-2">
        {fields.map((field, idx) => {
          const qty = parseFloat(watch(`items.${idx}.quantity`)) || 0
          const price = parseFloat(watch(`items.${idx}.unit_price`)) || 0
          return (
            <div key={field.id} className="glass-card p-3 space-y-2">
              <div className="relative">
                <div className="flex gap-2">
                  <input className="field-input flex-1 text-xs" placeholder="Descripción del rubro..."
                    {...register(`items.${idx}.description`, { required: true })}
                    onFocus={() => setShowCatalog(idx)}
                    onBlur={() => setTimeout(() => setShowCatalog(null), 200)} />
                  <button type="button" onClick={() => remove(idx)} className="btn-ghost p-1.5 text-rose-400 hover:bg-rose-500/10 shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {showCatalog === idx && rubros.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-8 mt-1 glass-card border border-border rounded-lg overflow-hidden shadow-lg max-h-44 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-secondary/50 border-b border-border">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Catálogo — click para autocompletar</p>
                    </div>
                    {rubros.map(r => (
                      <button key={r.id} type="button" onMouseDown={() => selectRubro(idx, r)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-secondary/80 transition-colors text-left gap-2">
                        <span className="font-medium text-foreground">{r.name} <span className="text-muted-foreground">{r.unit}</span></span>
                        <span className="text-amber-400 font-num shrink-0">${r.reference_price}/{r.unit}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">Cantidad</label>
                  <input type="number" step="0.01" min="0" className="field-input text-xs mt-0.5" {...register(`items.${idx}.quantity`, { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Unidad</label>
                  <input className="field-input text-xs mt-0.5" {...register(`items.${idx}.unit`)} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">P. Unitario</label>
                  <input type="number" step="0.01" min="0" className="field-input text-xs mt-0.5" {...register(`items.${idx}.unit_price`, { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Total</label>
                  <div className="field-input text-xs mt-0.5 bg-secondary/50 font-num text-amber-400 select-none">{formatCurrency(qty * price)}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {fields.length > 0 && (
        <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-secondary/40 text-sm">
          <span className="text-muted-foreground">Subtotal ítems</span>
          <span className="font-num font-bold text-foreground">{formatCurrency(subtotal)}</span>
        </div>
      )}
    </div>
  )
}

// ── Proforma Comparison Panel ─────────────────────────────────
function ProformaComparison({ proformas, onClose }) {
  const [vA, setVA] = useState(proformas[proformas.length - 2]?.id || proformas[0]?.id)
  const [vB, setVB] = useState(proformas[proformas.length - 1]?.id)

  const pfA = proformas.find(p => p.id === parseInt(vA))
  const pfB = proformas.find(p => p.id === parseInt(vB))

  if (!pfA || !pfB) return null

  // Build comparison map by description
  const itemsA = pfA.items || []
  const itemsB = pfB.items || []
  const allDescs = Array.from(new Set([...itemsA.map(i => i.description), ...itemsB.map(i => i.description)]))

  const diff = pfB.total - pfA.total
  const diffPct = pfA.total > 0 ? ((diff / pfA.total) * 100).toFixed(1) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl mx-4 glass-card animate-fade-up">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <GitCompare className="w-5 h-5 text-violet-400" />
            <h2 className="font-display font-bold text-foreground">Comparativo de Proformas</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Selector */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Versión A (base)</label>
              <select className="field-input mt-1" value={vA} onChange={e => setVA(parseInt(e.target.value))}>
                {proformas.map(p => <option key={p.id} value={p.id}>v{p.version} — {formatCurrency(p.total)} ({PROFORMA_STATUS[p.status]?.label})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Versión B (nueva)</label>
              <select className="field-input mt-1" value={vB} onChange={e => setVB(parseInt(e.target.value))}>
                {proformas.map(p => <option key={p.id} value={p.id}>v{p.version} — {formatCurrency(p.total)} ({PROFORMA_STATUS[p.status]?.label})</option>)}
              </select>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-secondary/40">
              <p className="text-xs text-muted-foreground mb-1">Total v{pfA.version}</p>
              <p className="font-num text-xl font-bold text-foreground">{formatCurrency(pfA.total)}</p>
            </div>
            <div className={cn('p-4 rounded-xl border', diff > 0 ? 'bg-rose-500/8 border-rose-500/20' : diff < 0 ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-secondary/40 border-border')}>
              <p className="text-xs text-muted-foreground mb-1">Diferencia</p>
              <div className="flex items-center gap-2">
                {diff > 0 ? <TrendingUp className="w-5 h-5 text-rose-400" /> : diff < 0 ? <TrendingDown className="w-5 h-5 text-emerald-400" /> : <Minus className="w-5 h-5 text-muted-foreground" />}
                <p className={cn('font-num text-xl font-bold', diff > 0 ? 'text-rose-400' : diff < 0 ? 'text-emerald-400' : 'text-muted-foreground')}>
                  {diff > 0 ? '+' : ''}{formatCurrency(diff)} ({diffPct}%)
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-secondary/40">
              <p className="text-xs text-muted-foreground mb-1">Total v{pfB.version}</p>
              <p className="font-num text-xl font-bold text-foreground">{formatCurrency(pfB.total)}</p>
            </div>
          </div>

          {/* Items comparison table */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-sm text-foreground">Comparativo ítem por ítem</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-muted-foreground font-medium">Descripción</th>
                    <th className="px-4 py-3 text-right text-muted-foreground font-medium">v{pfA.version}</th>
                    <th className="px-4 py-3 text-right text-muted-foreground font-medium">v{pfB.version}</th>
                    <th className="px-4 py-3 text-right text-muted-foreground font-medium">Δ</th>
                    <th className="px-4 py-3 text-center text-muted-foreground font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {allDescs.map((desc, i) => {
                    const iA = itemsA.find(x => x.description === desc)
                    const iB = itemsB.find(x => x.description === desc)
                    const totA = iA ? parseFloat(iA.total || (iA.quantity * iA.unit_price)) : 0
                    const totB = iB ? parseFloat(iB.total || (iB.quantity * iB.unit_price)) : 0
                    const delta = totB - totA
                    const isNew = !iA
                    const isRemoved = !iB
                    return (
                      <tr key={i} className={cn('border-b border-border/40 last:border-0',
                        isNew ? 'bg-emerald-500/5' : isRemoved ? 'bg-rose-500/5' : delta > 0 ? 'bg-amber-500/3' : '')}>
                        <td className="px-4 py-2.5 font-medium text-foreground">{desc}</td>
                        <td className="px-4 py-2.5 text-right font-num">{iA ? formatCurrency(totA) : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-num">{iB ? formatCurrency(totB) : '—'}</td>
                        <td className={cn('px-4 py-2.5 text-right font-num font-semibold', delta > 0 ? 'text-rose-400' : delta < 0 ? 'text-emerald-400' : 'text-muted-foreground')}>
                          {delta !== 0 ? `${delta > 0 ? '+' : ''}${formatCurrency(delta)}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {isNew      && <span className="badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px]">Nuevo</span>}
                          {isRemoved  && <span className="badge bg-rose-500/15 text-rose-400 border border-rose-500/20 text-[10px]">Eliminado</span>}
                          {!isNew && !isRemoved && delta > 0  && <span className="badge bg-amber-500/15 text-amber-400 border border-amber-500/20 text-[10px]">↑ Sube</span>}
                          {!isNew && !isRemoved && delta < 0  && <span className="badge bg-blue-500/15 text-blue-400 border border-blue-500/20 text-[10px]">↓ Baja</span>}
                          {!isNew && !isRemoved && delta === 0 && <span className="badge bg-secondary text-muted-foreground text-[10px]">Igual</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td className="px-4 py-3 font-bold text-foreground">TOTAL</td>
                    <td className="px-4 py-3 text-right font-num font-bold">{formatCurrency(pfA.total)}</td>
                    <td className="px-4 py-3 text-right font-num font-bold">{formatCurrency(pfB.total)}</td>
                    <td className={cn('px-4 py-3 text-right font-num font-bold text-sm', diff > 0 ? 'text-rose-400' : diff < 0 ? 'text-emerald-400' : 'text-muted-foreground')}>
                      {diff !== 0 ? `${diff > 0 ? '+' : ''}${formatCurrency(diff)}` : 'Sin cambio'}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Params comparison */}
          <div className="grid grid-cols-2 gap-4">
            {[pfA, pfB].map(pf => (
              <div key={pf.id} className="p-4 glass-card space-y-2">
                <p className="text-xs font-semibold text-foreground">Proforma v{pf.version}</p>
                <div className="space-y-1">
                  {[
                    { label: 'Subtotal', val: formatCurrency(pf.subtotal) },
                    { label: `Utilidad (${pf.utility_pct}%)`, val: formatCurrency(pf.utility_amount) },
                    { label: `Imprevistos (${pf.contingency_pct}%)`, val: formatCurrency(pf.contingency_amt) },
                    { label: 'TOTAL', val: formatCurrency(pf.total), highlight: true },
                  ].map(row => (
                    <div key={row.label} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className={cn('font-num font-semibold', row.highlight ? 'text-amber-400' : 'text-foreground')}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-border flex justify-end">
          <button onClick={onClose} className="btn-primary">Cerrar comparativo</button>
        </div>
      </div>
    </div>
  )
}

// ── Simple modals (NewProforma, NewContract, SignContract, Addendum, Liquidation) ─
function NewProformaModal({ projectId, onClose }) {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const { register, handleSubmit, control, watch, setValue } = useForm({
    defaultValues: { utility_pct: 18, contingency_pct: 10, valid_until: '', notes: '', items: [] }
  })
  const createMut = useMutation({
    mutationFn: (d) => projectsApi.createProforma(projectId, d),
    onSuccess: () => { qc.invalidateQueries(['project', projectId]); toast({ title: 'Proforma creada', variant: 'success' }); onClose() },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 glass-card animate-fade-up max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h2 className="font-display font-bold text-foreground">Nueva Proforma</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          <form id="proforma-form" onSubmit={handleSubmit(d => createMut.mutate(d))} className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Utilidad %</label><input type="number" step="0.1" className="field-input mt-1" {...register('utility_pct', { valueAsNumber: true })} /></div>
              <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Imprevistos %</label><input type="number" step="0.1" className="field-input mt-1" {...register('contingency_pct', { valueAsNumber: true })} /></div>
              <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Válida hasta</label><input type="date" className="field-input mt-1" {...register('valid_until')} /></div>
            </div>
            <ProformaItemsBuilder control={control} register={register} watch={watch} setValue={setValue} />
            <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Notas</label><textarea rows={2} className="field-input mt-1 resize-none" placeholder="Condiciones, alcance, exclusiones..." {...register('notes')} /></div>
          </form>
        </div>
        <div className="p-5 border-t border-border shrink-0 flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
          <button type="submit" form="proforma-form" disabled={createMut.isPending} className="btn-primary flex-1 justify-center">
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Proforma'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NewContractModal({ projectId, proformas, onClose }) {
  const qc = useQueryClient(); const { toast } = useUIStore()
  const { register, handleSubmit } = useForm({ defaultValues: { contracted_amount: proformas?.[0]?.total || '', proforma_id: proformas?.[0]?.id || '', payment_terms: '30% anticipo, 40% al 50% de avance, 30% al entregar', start_date: '', end_date: '' } })
  const createMut = useMutation({
    mutationFn: (d) => projectsApi.createContract(projectId, d),
    onSuccess: () => { qc.invalidateQueries(['project', projectId]); toast({ title: 'Contrato creado', variant: 'success' }); onClose() },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 glass-card animate-fade-up">
        <div className="flex items-center justify-between p-5 border-b border-border"><h2 className="font-display font-bold text-foreground">Nuevo Contrato</h2><button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button></div>
        <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="p-5 space-y-4">
          {proformas?.length > 0 && (<div><label className="text-xs text-muted-foreground uppercase tracking-wider">Proforma base</label><select className="field-input mt-1" {...register('proforma_id')}><option value="">Sin proforma</option>{proformas.map(p => <option key={p.id} value={p.id}>v{p.version} — {formatCurrency(p.total)}</option>)}</select></div>)}
          <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Monto contratado *</label><div className="relative mt-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span><input type="number" step="0.01" min="0" className="field-input pl-7" {...register('contracted_amount', { required: true, valueAsNumber: true })} /></div></div>
          <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Condiciones de pago</label><textarea rows={2} className="field-input mt-1 resize-none" {...register('payment_terms')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Fecha inicio</label><input type="date" className="field-input mt-1" {...register('start_date')} /></div>
            <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Fecha fin</label><input type="date" className="field-input mt-1" {...register('end_date')} /></div>
          </div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button><button type="submit" disabled={createMut.isPending} className="btn-primary flex-1 justify-center">{createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear Contrato'}</button></div>
        </form>
      </div>
    </div>
  )
}

function SignContractModal({ projectId, onClose }) {
  const qc = useQueryClient(); const { toast } = useUIStore()
  const { register, handleSubmit } = useForm()
  const signMut = useMutation({
    mutationFn: (d) => projectsApi.signContract(projectId, d),
    onSuccess: () => { qc.invalidateQueries(['project', projectId]); toast({ title: 'Contrato firmado — proyecto en ejecución', variant: 'success' }); onClose() },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 glass-card animate-fade-up">
        <div className="flex items-center justify-between p-5 border-b border-border"><h2 className="font-display font-bold text-foreground">Firmar Contrato</h2><button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button></div>
        <form onSubmit={handleSubmit(d => signMut.mutate(d))} className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/15"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /><p className="text-xs text-emerald-300">Al firmar, el proyecto pasará a estado <strong>En Ejecución</strong>.</p></div>
          <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Nombre del firmante (cliente)</label><input className="field-input mt-1" placeholder="Pedro Ramírez" {...register('client_signer_name')} /></div>
          <div><label className="text-xs text-muted-foreground uppercase tracking-wider">CI/RUC del firmante</label><input className="field-input mt-1" placeholder="1803456789" {...register('client_signer_id')} /></div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button><button type="submit" disabled={signMut.isPending} className="btn-primary flex-1 justify-center bg-emerald-600 hover:bg-emerald-700">{signMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Pen className="w-4 h-4" /> Confirmar firma</>}</button></div>
        </form>
      </div>
    </div>
  )
}

function AddendumModal({ projectId, onClose }) {
  const qc = useQueryClient(); const { toast } = useUIStore()
  const { register, handleSubmit, formState: { errors } } = useForm()
  const addMut = useMutation({
    mutationFn: (d) => projectsApi.addAddendum(projectId, d),
    onSuccess: () => { qc.invalidateQueries(['project', projectId]); toast({ title: 'Adicional registrado', variant: 'success' }); onClose() },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 glass-card animate-fade-up">
        <div className="flex items-center justify-between p-5 border-b border-border"><h2 className="font-display font-bold text-foreground">Adicional / Adenda</h2><button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button></div>
        <form onSubmit={handleSubmit(d => addMut.mutate(d))} className="p-5 space-y-4">
          <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Descripción *</label><textarea rows={3} className={cn('field-input mt-1 resize-none', errors.description && 'border-rose-500')} placeholder="Describe el trabajo adicional..." {...register('description', { required: true })} /></div>
          <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Monto adicional *</label><div className="relative mt-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span><input type="number" step="0.01" min="0" className={cn('field-input pl-7', errors.amount && 'border-rose-500')} {...register('amount', { required: true, valueAsNumber: true })} /></div></div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button><button type="submit" disabled={addMut.isPending} className="btn-primary flex-1 justify-center">{addMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar adicional'}</button></div>
        </form>
      </div>
    </div>
  )
}

function LiquidationModal({ projectId, contract, onClose }) {
  const qc = useQueryClient(); const { toast } = useUIStore()
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: { initial_amount: contract?.contracted_amount || '', addendums_total: 0, notes: '' } })
  const createMut = useMutation({
    mutationFn: (d) => projectsApi.createLiquidation(projectId, d),
    onSuccess: () => { qc.invalidateQueries(['project', projectId]); toast({ title: 'Acta de liquidación creada', variant: 'success' }); onClose() },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 glass-card animate-fade-up">
        <div className="flex items-center justify-between p-5 border-b border-border"><h2 className="font-display font-bold text-foreground">Acta de Liquidación</h2><button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button></div>
        <form onSubmit={handleSubmit(d => createMut.mutate(d))} className="p-5 space-y-4">
          <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Monto inicial contratado *</label><div className="relative mt-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span><input type="number" step="0.01" min="0" className={cn('field-input pl-7', errors.initial_amount && 'border-rose-500')} {...register('initial_amount', { required: true, valueAsNumber: true })} /></div></div>
          <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Total adicionales</label><div className="relative mt-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span><input type="number" step="0.01" min="0" className="field-input pl-7" {...register('addendums_total', { valueAsNumber: true })} /></div></div>
          <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Observaciones</label><textarea rows={3} className="field-input mt-1 resize-none" placeholder="Observaciones del acta..." {...register('notes')} /></div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button><button type="submit" disabled={createMut.isPending} className="btn-primary flex-1 justify-center">{createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear acta'}</button></div>
        </form>
      </div>
    </div>
  )
}

// ── Main ProjectDetail ─────────────────────────────────────────
export default function ProjectDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const { toast } = useUIStore()

  const [modal, setModal]         = useState(null)
  const [expandedPf, setExpandedPf] = useState(null)
  const [showCompare, setShowCompare] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn:  () => projectsApi.getOne(id),
  })

  const updateStatusMut = useMutation({
    mutationFn: ({ pid, status }) => projectsApi.updateProforma(id, pid, { status }),
    onSuccess: (_, v) => { qc.invalidateQueries(['project', id]); toast({ title: `Proforma ${v.status.toLowerCase()}`, variant: 'success' }) },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const signLiqMut = useMutation({
    mutationFn: (d) => projectsApi.signLiquidation(id, d),
    onSuccess: () => { qc.invalidateQueries(['project', id]); toast({ title: 'Proyecto cerrado exitosamente', variant: 'success' }) },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  // Adjuntar documentos al contrato
  const updateContractMut = useMutation({
    mutationFn: (d) => projectsApi.update(id, { contract: d }),
    onSuccess: () => { qc.invalidateQueries(['project', id]); toast({ title: 'Documento guardado', variant: 'success' }) },
  })

  const project     = data?.data?.data
  const status      = project ? (STATUS[project.status] || STATUS.PROFORMA) : null
  const proformas   = project?.proformas   || []
  const contract    = project?.contract
  const liquidation = project?.liquidation
  const addendums   = contract?.addendums  || []
  const approvedPf  = proformas.find(p => p.status === 'APPROVED')

  if (isLoading) return (
    <div className="space-y-4 max-w-5xl">{[1,2,3].map(i => <div key={i} className="shimmer h-28 rounded-xl" />)}</div>
  )
  if (!project) return (
    <div className="flex flex-col items-center justify-center py-20">
      <FolderKanban className="w-12 h-12 text-muted-foreground/30 mb-3" />
      <p className="text-muted-foreground">Proyecto no encontrado</p>
      <button onClick={() => navigate('/projects')} className="btn-primary mt-4">Volver</button>
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="animate-fade-up">
        <button onClick={() => navigate('/projects')} className="btn-ghost text-xs mb-4 -ml-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Proyectos
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-display font-bold text-foreground">{project.name}</h1>
              <span className={cn('badge border', status.color)}>{status.label}</span>
            </div>
            <p className="text-sm text-muted-foreground">{project.client?.name || '—'} · {project.location || 'Sin ubicación'}</p>
            {project.description && <p className="text-xs text-muted-foreground/70 mt-1">{project.description}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="font-num text-2xl font-bold text-foreground">{formatCurrency(project.contracted_amount || 0)}</p>
            <p className="text-xs text-muted-foreground">Valor contratado</p>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="glass-card p-4 animate-fade-up-200">
        <div className="flex items-center justify-between">
          {Object.entries(STATUS).map(([key, val], i, arr) => (
            <div key={key} className="flex items-center gap-2 flex-1">
              <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all w-full justify-center',
                project.status === key ? 'bg-primary text-primary-foreground' : val.step < status.step ? 'bg-emerald-500/15 text-emerald-400' : 'bg-secondary text-muted-foreground')}>
                {val.step < status.step && <CheckCircle2 className="w-3 h-3" />}{val.label}
              </div>
              {i < arr.length - 1 && <div className={cn('w-4 h-0.5 shrink-0', val.step < status.step ? 'bg-emerald-500/40' : 'bg-border')} />}
            </div>
          ))}
        </div>
      </div>

      {/* ── PROFORMAS ──────────────────────────────────────────── */}
      <div className="glass-card p-5 animate-fade-up-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
            <FilePlus className="w-4 h-4 text-muted-foreground" /> Proformas ({proformas.length})
          </h2>
          <div className="flex gap-2">
            {proformas.length >= 2 && (
              <button onClick={() => setShowCompare(true)} className="btn-ghost text-xs text-violet-400">
                <GitCompare className="w-3.5 h-3.5" /> Comparar versiones
              </button>
            )}
            {!contract && (
              <button onClick={() => setModal('proforma')} className="btn-primary text-xs">
                <Plus className="w-3.5 h-3.5" /> Nueva Proforma
              </button>
            )}
          </div>
        </div>

        {proformas.length === 0 ? (
          <div className="flex flex-col items-center py-8 border-2 border-dashed border-border rounded-xl">
            <FilePlus className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Sin proformas — crea la primera</p>
            <button onClick={() => setModal('proforma')} className="btn-primary mt-3 text-xs"><Plus className="w-3.5 h-3.5" /> Crear proforma</button>
          </div>
        ) : (
          <div className="space-y-3">
            {proformas.map(pf => {
              const pfSt = PROFORMA_STATUS[pf.status] || PROFORMA_STATUS.DRAFT
              const isExpanded = expandedPf === pf.id
              return (
                <div key={pf.id} className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => setExpandedPf(isExpanded ? null : pf.id)}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">v{pf.version}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">Proforma v{pf.version}</span>
                          <span className={cn('text-xs font-medium', pfSt.color)}>{pfSt.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{pf.items?.length || 0} ítems{pf.valid_until && ` · Válida hasta ${formatDate(pf.valid_until)}`}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-num font-bold text-foreground">{formatCurrency(pf.total)}</p>
                        <p className="text-[10px] text-muted-foreground">Util. {pf.utility_pct}% · Impr. {pf.contingency_pct}%</p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border p-4 space-y-4">
                      {pf.items?.length > 0 && (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border">
                              {['Descripción','Cant.','Unidad','P. Unit.','Total'].map(h => <th key={h} className="pb-2 text-left text-muted-foreground">{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {pf.items.map(item => (
                              <tr key={item.id} className="border-b border-border/40">
                                <td className="py-1.5 text-foreground">{item.description}</td>
                                <td className="py-1.5 font-num">{item.quantity}</td>
                                <td className="py-1.5 text-muted-foreground">{item.unit}</td>
                                <td className="py-1.5 font-num">{formatCurrency(item.unit_price)}</td>
                                <td className="py-1.5 font-num text-amber-400">{formatCurrency(item.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-border"><td colSpan={4} className="pt-2 text-muted-foreground">Subtotal</td><td className="pt-2 font-num font-semibold">{formatCurrency(pf.subtotal)}</td></tr>
                            <tr><td colSpan={4} className="text-muted-foreground">Utilidad ({pf.utility_pct}%)</td><td className="font-num">{formatCurrency(pf.utility_amount)}</td></tr>
                            <tr><td colSpan={4} className="text-muted-foreground">Imprevistos ({pf.contingency_pct}%)</td><td className="font-num">{formatCurrency(pf.contingency_amt)}</td></tr>
                            <tr className="border-t border-border"><td colSpan={4} className="pt-2 font-bold text-foreground">TOTAL</td><td className="pt-2 font-num font-bold text-amber-400 text-sm">{formatCurrency(pf.total)}</td></tr>
                          </tfoot>
                        </table>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => openPdf(`/pdf/proformas/${pf.id}`)} className="btn-ghost text-xs"><FileText className="w-3.5 h-3.5" /> Ver PDF</button>
                        {pf.status === 'DRAFT' && <button onClick={() => updateStatusMut.mutate({ pid: pf.id, status: 'SENT' })} className="btn-ghost text-xs">Marcar enviada</button>}
                        {pf.status === 'SENT' && (<>
                          <button onClick={() => updateStatusMut.mutate({ pid: pf.id, status: 'APPROVED' })} className="btn-ghost text-xs text-emerald-400 hover:bg-emerald-500/10"><CheckCircle2 className="w-3.5 h-3.5" /> Aprobar</button>
                          <button onClick={() => updateStatusMut.mutate({ pid: pf.id, status: 'REJECTED' })} className="btn-ghost text-xs text-rose-400 hover:bg-rose-500/10"><X className="w-3.5 h-3.5" /> Rechazar</button>
                        </>)}
                        {pf.status === 'APPROVED' && !contract && <button onClick={() => setModal('contract')} className="btn-primary text-xs bg-amber-600 hover:bg-amber-700"><FileSignature className="w-3.5 h-3.5" /> Crear Contrato</button>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── CONTRATO ──────────────────────────────────────────── */}
      <div className="glass-card p-5 animate-fade-up-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-muted-foreground" /> Contrato
          </h2>
          {!contract && approvedPf && <button onClick={() => setModal('contract')} className="btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> Crear Contrato</button>}
          {!contract && !approvedPf && proformas.length > 0 && <button onClick={() => setModal('contract')} className="btn-ghost text-xs"><Plus className="w-3.5 h-3.5" /> Crear sin proforma</button>}
        </div>

        {!contract ? (
          <div className="flex flex-col items-center py-8 border-2 border-dashed border-border rounded-xl">
            <FileSignature className="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Sin contrato</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label:'Número',    value: contract.contract_number },
                { label:'Estado',    value: CONTRACT_STATUS[contract.status]?.label, color: CONTRACT_STATUS[contract.status]?.color },
                { label:'Monto',     value: formatCurrency(contract.contracted_amount) },
                { label:'Inicio',    value: formatDate(contract.start_date) },
                { label:'Fin',       value: formatDate(contract.end_date) },
                { label:'Firmante',  value: contract.client_signer_name || '—' },
              ].map(r => (
                <div key={r.label} className="p-3 rounded-lg bg-secondary/40">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.label}</p>
                  <p className={cn('text-sm font-semibold mt-0.5', r.color || 'text-foreground')}>{r.value || '—'}</p>
                </div>
              ))}
            </div>

            {contract.payment_terms && (
              <div className="p-3 rounded-lg bg-secondary/40">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Condiciones de pago</p>
                <p className="text-xs text-foreground">{contract.payment_terms}</p>
              </div>
            )}

            {/* Adjuntar contrato firmado escaneado */}
            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
              <p className="text-xs font-semibold text-blue-400 mb-2">Documentos adjuntos</p>
              <UploadDocBtn
                label="Adjuntar contrato firmado (PDF)"
                labelReplace="Reemplazar contrato firmado"
                currentUrl={contract.signed_document_url}
                onUploaded={(url) => updateContractMut.mutate({ signed_document_url: url })}
              />
            </div>

            {addendums.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Adicionales / Adendas</p>
                {addendums.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 mb-1.5">
                    <span className="text-xs text-foreground">{a.description}</span>
                    <span className="font-num text-xs text-amber-400 font-semibold">{formatCurrency(a.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button onClick={() => openPdf(`/pdf/contracts/${id}`)} className="btn-ghost text-xs"><FileText className="w-3.5 h-3.5" /> Ver PDF contrato</button>
              {contract.status !== 'SIGNED' && contract.status !== 'CLOSED' && <button onClick={() => setModal('sign')} className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700"><Pen className="w-3.5 h-3.5" /> Registrar firma</button>}
              {(contract.status === 'SIGNED' || contract.status === 'ACTIVE') && <button onClick={() => setModal('addendum')} className="btn-ghost text-xs"><Plus className="w-3.5 h-3.5" /> Agregar adicional</button>}
              {contract.status === 'SIGNED' && !liquidation && <button onClick={() => setModal('liquidation')} className="btn-ghost text-xs text-purple-400 hover:bg-purple-500/10"><Banknote className="w-3.5 h-3.5" /> Crear liquidación</button>}
            </div>
          </div>
        )}
      </div>

      {/* ── LIQUIDACIÓN ──────────────────────────────────────── */}
      {(liquidation || (contract?.status === 'SIGNED' && !liquidation)) && (
        <div className="glass-card p-5 animate-fade-up-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-foreground flex items-center gap-2"><Banknote className="w-4 h-4 text-muted-foreground" /> Liquidación</h2>
          </div>
          {!liquidation ? (
            <div className="flex flex-col items-center py-8 border-2 border-dashed border-border rounded-xl">
              <Banknote className="w-8 h-8 text-muted-foreground/30 mb-2" /><p className="text-sm text-muted-foreground">Sin acta de liquidación</p>
              <button onClick={() => setModal('liquidation')} className="btn-primary mt-3 text-xs"><Plus className="w-3.5 h-3.5" /> Crear acta</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:'Monto inicial',  value: formatCurrency(liquidation.initial_amount) },
                  { label:'Adicionales',    value: formatCurrency(liquidation.addendums_total) },
                  { label:'Monto final',    value: formatCurrency(liquidation.final_amount), highlight: true },
                  { label:'Firmado',        value: liquidation.signed_at ? formatDate(liquidation.signed_at) : '— Pendiente' },
                ].map(r => (
                  <div key={r.label} className={cn('p-3 rounded-lg', r.highlight ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-secondary/40')}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.label}</p>
                    <p className={cn('text-sm font-semibold mt-0.5', r.highlight ? 'text-amber-400' : 'text-foreground')}>{r.value}</p>
                  </div>
                ))}
              </div>
              {liquidation.notes && <div className="p-3 rounded-lg bg-secondary/40"><p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Observaciones</p><p className="text-xs text-foreground">{liquidation.notes}</p></div>}
              
              {/* Adjuntar acta firmada */}
              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
                <p className="text-xs font-semibold text-purple-400 mb-2">Acta firmada escaneada</p>
                <UploadDocBtn
                  label="Adjuntar acta firmada (PDF)"
                  labelReplace="Reemplazar acta firmada"
                  currentUrl={liquidation.signed_document_url}
                  onUploaded={(url) => {
                    // PATCH /projects/:id/liquidation with signed_document_url
                    projectsApi.signLiquidation(id, { signed_document_url: url })
                      .then(() => qc.invalidateQueries(['project', id]))
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => openPdf(`/pdf/liquidations/${id}`)} className="btn-ghost text-xs"><FileText className="w-3.5 h-3.5" /> Ver PDF liquidación</button>
                {!liquidation.signed_at && (
                  <button onClick={() => signLiqMut.mutate({ client_name: project.client?.name })} disabled={signLiqMut.isPending} className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700">
                    {signLiqMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Pen className="w-3.5 h-3.5" /> Cerrar proyecto</>}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {modal === 'proforma'    && <NewProformaModal  projectId={id} onClose={() => setModal(null)} />}
      {modal === 'contract'    && <NewContractModal   projectId={id} proformas={proformas} onClose={() => setModal(null)} />}
      {modal === 'sign'        && <SignContractModal  projectId={id} onClose={() => setModal(null)} />}
      {modal === 'addendum'    && <AddendumModal      projectId={id} onClose={() => setModal(null)} />}
      {modal === 'liquidation' && <LiquidationModal   projectId={id} contract={contract} onClose={() => setModal(null)} />}

      {/* Comparativo */}
      {showCompare && proformas.length >= 2 && (
        <ProformaComparison proformas={proformas} onClose={() => setShowCompare(false)} />
      )}
    </div>
  )
}

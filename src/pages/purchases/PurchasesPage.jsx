import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { purchasesApi, warehouseApi, worksApi, suppliersApi, productsApi } from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  Plus, X, ShoppingCart, Package, FileText,
  CheckCircle2, Clock, Truck, AlertTriangle,
  ChevronDown, ChevronUp, Download, Upload,
  Loader2, Warehouse, Sparkles,
} from 'lucide-react'
import { formatCurrency, formatDate, openPdf, cn } from '../../utils/helpers'

const STATUS_ORDER = {
  PENDING:   { label: 'Pendiente',   color: 'bg-slate-500/15 text-slate-400 border-slate-500/20',   icon: Clock },
  QUOTED:    { label: 'Cotizado',    color: 'bg-amber-500/15 text-amber-400 border-amber-500/20',   icon: FileText },
  ORDERED:   { label: 'Ordenado',    color: 'bg-blue-500/15 text-blue-400 border-blue-500/20',      icon: ShoppingCart },
  RECEIVED:  { label: 'Recibido',    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelado',   color: 'bg-rose-500/15 text-rose-400 border-rose-500/20',     icon: X },
}

const STATUS_OC = {
  DRAFT:     { label: 'Borrador',    color: 'bg-slate-500/15 text-slate-400' },
  SENT:      { label: 'Enviada',     color: 'bg-amber-500/15 text-amber-400' },
  CONFIRMED: { label: 'Confirmada',  color: 'bg-blue-500/15 text-blue-400' },
  RECEIVED:  { label: 'Recibida',    color: 'bg-emerald-500/15 text-emerald-400' },
  CANCELLED: { label: 'Cancelada',   color: 'bg-rose-500/15 text-rose-400' },
}

const TABS = [
  { key: 'requests', label: 'Solicitudes',   icon: FileText },
  { key: 'orders',   label: 'Órdenes (O/C)', icon: ShoppingCart },
  { key: 'invoices', label: 'Facturas',       icon: CheckCircle2 },
]

// ── Warehouse Suggestions Banner ──────────────────────────────
function WarehouseSuggestions({ productIds, onUseFromWarehouse }) {
  const { data } = useQuery({
    queryKey: ['warehouse-suggestions', productIds?.join(',')],
    queryFn:  () => warehouseApi.getSuggestions(productIds),
    enabled:  !!productIds?.length,
  })
  const suggestions = data?.data?.data || []
  if (!suggestions.length) return null

  return (
    <div className="p-4 rounded-xl bg-emerald-500/8 border border-emerald-500/20 space-y-2">
      <div className="flex items-center gap-2">
        <Warehouse className="w-4 h-4 text-emerald-400 shrink-0" />
        <p className="text-sm font-semibold text-emerald-400">
          Material disponible en bodega
        </p>
        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
      </div>
      <p className="text-xs text-muted-foreground">
        Antes de generar una nueva compra, tienes estos materiales disponibles en bodega:
      </p>
      <div className="space-y-1.5">
        {suggestions.map(s => (
          <div key={s.product_id}
            className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <div>
              <p className="text-xs font-semibold text-foreground">{s.product_name}</p>
              <p className="text-[10px] text-muted-foreground">
                Disponible: <span className="text-emerald-400 font-semibold">
                  {s.available_quantity} {s.unit}
                </span> · Costo prom: {formatCurrency(s.average_cost)}/{s.unit}
              </p>
            </div>
            <button
              onClick={() => onUseFromWarehouse(s)}
              className="btn-ghost text-xs text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10">
              Usar de bodega
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── New Request Modal ─────────────────────────────────────────
function NewRequestModal({ onClose }) {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const { register, handleSubmit, control, watch } = useForm({
    defaultValues: { items: [{ description: '', quantity: 1, unit: 'unidad', product_id: null, supplier_id: null }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const { data: worksData }     = useQuery({ queryKey: ['works-select'],     queryFn: () => worksApi.getAll({ limit: 100, status: 'ACTIVE' }) })
  const { data: suppliersData } = useQuery({ queryKey: ['suppliers-select'], queryFn: () => suppliersApi.getAll({ limit: 100 }) })
  const { data: productsData }  = useQuery({ queryKey: ['products-select'],  queryFn: () => productsApi.getAll({ limit: 200 }) })

  const works     = worksData?.data?.data    || []
  const suppliers = suppliersData?.data?.data || []
  const products  = productsData?.data?.data  || []

  // Collect product_ids for warehouse suggestions
  const watchedItems = watch('items')
  const productIds = watchedItems
    .map(i => parseInt(i.product_id))
    .filter(Boolean)

  const createMut = useMutation({
    mutationFn: (d) => purchasesApi.createRequest(d),
    onSuccess: () => {
      qc.invalidateQueries(['purchase-requests'])
      toast({ title: 'Solicitud creada', variant: 'success' })
      onClose()
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const onSubmit = (data) => {
    createMut.mutate({
      ...data,
      items: data.items.filter(i => i.description?.trim()).map(i => ({
        ...i,
        quantity:    parseFloat(i.quantity),
        product_id:  i.product_id ? parseInt(i.product_id) : null,
        supplier_id: i.supplier_id ? parseInt(i.supplier_id) : null,
      })),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 glass-card animate-fade-up max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h2 className="font-display font-bold text-lg text-foreground">Nueva Solicitud de Compra</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Obra *</label>
              <select className="field-input mt-1" {...register('work_id', { required: true, valueAsNumber: true })}>
                <option value="">Seleccionar obra...</option>
                {works.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Fecha requerida</label>
              <input type="date" className="field-input mt-1" {...register('required_date')} />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Notas</label>
            <input className="field-input mt-1" placeholder="Observaciones generales..." {...register('notes')} />
          </div>

          {/* Warehouse suggestions */}
          {productIds.length > 0 && (
            <WarehouseSuggestions
              productIds={productIds}
              onUseFromWarehouse={(s) => {
                toast({
                  title: `Asignar ${s.available_quantity} ${s.unit} de bodega`,
                  description: 'Ve a Bodega → Asignar para mover el material a la obra',
                  variant: 'default',
                })
              }}
            />
          )}

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Ítems *</label>
              <button type="button" onClick={() => append({ description: '', quantity: 1, unit: 'unidad', product_id: null, supplier_id: null })}
                className="btn-ghost text-xs">
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="glass-card p-3 space-y-2">
                  <div className="flex gap-2">
                    <select className="field-input flex-1 text-xs"
                      {...register(`items.${idx}.product_id`)}
                      onChange={e => {
                        register(`items.${idx}.product_id`).onChange(e)
                        const prod = products.find(p => p.id === parseInt(e.target.value))
                        if (prod) {
                          const descField = document.querySelector(`[name="items.${idx}.description"]`)
                          const unitField = document.querySelector(`[name="items.${idx}.unit"]`)
                          if (descField && !descField.value) descField.value = prod.name
                          if (unitField) unitField.value = prod.unit || 'unidad'
                        }
                      }}>
                      <option value="">— Del catálogo (opcional) —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                    </select>
                    <button type="button" onClick={() => remove(idx)}
                      className="btn-ghost p-1.5 text-rose-400 hover:bg-rose-500/10 shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input className="field-input text-xs w-full" placeholder="Descripción *"
                    {...register(`items.${idx}.description`, { required: true })} />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="number" step="0.01" className="field-input text-xs" placeholder="Cantidad"
                      {...register(`items.${idx}.quantity`, { valueAsNumber: true })} />
                    <input className="field-input text-xs" placeholder="Unidad"
                      {...register(`items.${idx}.unit`)} />
                    <select className="field-input text-xs"
                      {...register(`items.${idx}.supplier_id`)}>
                      <option value="">Proveedor preferido</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border shrink-0 flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
          <button onClick={handleSubmit(onSubmit)} disabled={createMut.isPending}
            className="btn-primary flex-1 justify-center">
            {createMut.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</>
              : <><ShoppingCart className="w-4 h-4" /> Crear Solicitud</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Order Card with PDF attachment ────────────────────────────
function OrderCard({ order }) {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const [expanded, setExpanded] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)

  const st = STATUS_OC[order.status] || STATUS_OC.DRAFT

  const updateMut = useMutation({
    mutationFn: (d) => purchasesApi.updateOrder(order.id, d),
    onSuccess: () => {
      qc.invalidateQueries(['purchase-orders'])
      toast({ title: 'Orden actualizada', variant: 'success' })
    },
  })

  // Upload proforma PDF from supplier
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPdf(true)
    try {
      // Upload to Cloudinary if configured, else use base64
      const cloudName    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
      let url = null

      if (cloudName && uploadPreset) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('upload_preset', uploadPreset)
        const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, { method: 'POST', body: fd })
        const data = await res.json()
        url = data.secure_url
      } else {
        url = await new Promise((r) => {
          const reader = new FileReader()
          reader.onload = (ev) => r(ev.target.result)
          reader.readAsDataURL(file)
        })
      }
      await updateMut.mutateAsync({ proforma_pdf_url: url })
      toast({ title: 'PDF de proforma guardado', variant: 'success' })
    } catch {
      toast({ title: 'Error al subir PDF', variant: 'destructive' })
    } finally {
      setUploadingPdf(false)
    }
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-semibold text-foreground">{order.order_number}</h3>
              <span className={cn('badge border text-[10px]', st.color)}>{st.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {order.supplier?.name} · {formatDate(order.created_at)}
              {order.work?.name && ` · ${order.work.name}`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-num text-xl font-bold text-amber-400">{formatCurrency(order.total)}</p>
            <p className="text-[10px] text-muted-foreground">{order.items?.length || 0} items</p>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => openPdf(`/pdf/purchase-orders/${order.id}`)}
            className="btn-ghost text-xs">
            <Download className="w-3.5 h-3.5" /> PDF O/C
          </button>

          {/* Adjuntar proforma del proveedor */}
          <label className={cn('btn-ghost text-xs cursor-pointer', uploadingPdf && 'opacity-50 pointer-events-none')}>
            {uploadingPdf
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo...</>
              : <><Upload className="w-3.5 h-3.5" /> {order.proforma_pdf_url ? 'Reemplazar proforma' : 'Adjuntar proforma proveedor'}</>}
            <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={handlePdfUpload} />
          </label>

          {order.proforma_pdf_url && (
            <a href={order.proforma_pdf_url} target="_blank" rel="noopener noreferrer"
              className="btn-ghost text-xs text-emerald-400">
              <FileText className="w-3.5 h-3.5" /> Ver proforma proveedor
            </a>
          )}

          {order.status === 'DRAFT' && (
            <button onClick={() => updateMut.mutate({ status: 'SENT' })}
              className="btn-primary text-xs">
              <Truck className="w-3.5 h-3.5" /> Marcar enviada
            </button>
          )}
          {order.status === 'SENT' && (
            <button onClick={() => updateMut.mutate({ status: 'CONFIRMED' })}
              className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar recepción
            </button>
          )}

          <button onClick={() => setExpanded(!expanded)} className="btn-ghost text-xs ml-auto">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? 'Ocultar items' : 'Ver items'}
          </button>
        </div>
      </div>

      {expanded && order.items?.length > 0 && (
        <div className="border-t border-border bg-secondary/20 px-5 py-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Descripción','Cantidad','P. Unitario','Total','Var. %'].map(h => (
                  <th key={h} className="pb-2 text-left text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.items.map(item => (
                <tr key={item.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2 font-medium text-foreground">{item.description}</td>
                  <td className="py-2 font-num">{item.quantity} {item.unit}</td>
                  <td className="py-2 font-num">{formatCurrency(item.unit_price)}</td>
                  <td className="py-2 font-num font-semibold">{formatCurrency(item.total)}</td>
                  <td className="py-2">
                    {item.variation_pct != null && (
                      <span className={cn('font-num text-[10px] font-semibold',
                        parseFloat(item.variation_pct) > 10 ? 'text-rose-400' :
                        parseFloat(item.variation_pct) > 0  ? 'text-amber-400' : 'text-emerald-400')}>
                        {parseFloat(item.variation_pct) > 0 ? '+' : ''}{parseFloat(item.variation_pct).toFixed(1)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main PurchasesPage ────────────────────────────────────────
export default function PurchasesPage() {
  const [tab, setTab]       = useState('requests')
  const [showNew, setShowNew] = useState(false)
  const [page, setPage]     = useState(1)

  const { data: reqData }  = useQuery({
    queryKey: ['purchase-requests', page],
    queryFn:  () => purchasesApi.getRequests({ page, limit: 10 }),
    enabled:  tab === 'requests',
  })
  const { data: ordData }  = useQuery({
    queryKey: ['purchase-orders', page],
    queryFn:  () => purchasesApi.getOrders({ page, limit: 10 }),
    enabled:  tab === 'orders',
  })
  const { data: invData }  = useQuery({
    queryKey: ['purchase-invoices', page],
    queryFn:  () => purchasesApi.getInvoices({ page, limit: 10 }),
    enabled:  tab === 'invoices',
  })

  const requests   = reqData?.data?.data   || []
  const orders     = ordData?.data?.data   || []
  const invoices   = invData?.data?.data   || []
  const pagination = (reqData || ordData || invData)?.data?.pagination

  const { toast } = useUIStore()
  const qc = useQueryClient()

  const generateMut = useMutation({
    mutationFn: (id) => purchasesApi.generateOrders(id),
    onSuccess: (res) => {
      qc.invalidateQueries(['purchase-requests'])
      qc.invalidateQueries(['purchase-orders'])
      const count = res.data?.data?.length || 0
      toast({ title: `${count} Orden(es) de compra generadas`, variant: 'success' })
      setTab('orders')
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="section-header animate-fade-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Compras</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Solicitudes · Órdenes por proveedor · Facturas · Inventario automático
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nueva Solicitud
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 glass-card p-1 rounded-xl w-fit animate-fade-up-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setTab(key); setPage(1) }}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <div className="space-y-4 animate-fade-up-200">

        {/* SOLICITUDES */}
        {tab === 'requests' && (
          requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 glass-card">
              <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">Sin solicitudes de compra</p>
              <button onClick={() => setShowNew(true)} className="btn-primary mt-4 text-xs">
                <Plus className="w-3.5 h-3.5" /> Crear primera solicitud
              </button>
            </div>
          ) : requests.map(req => {
            const st = STATUS_ORDER[req.status] || STATUS_ORDER.PENDING
            const Icon = st.icon
            return (
              <div key={req.id} className="glass-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-semibold text-foreground">{req.request_number}</h3>
                      <span className={cn('badge border text-[10px]', st.color)}>
                        <Icon className="w-3 h-3 mr-1" />{st.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {req.work?.name || '—'} · {formatDate(req.created_at)}
                      {req.required_date && ` · Requerido: ${formatDate(req.required_date)}`}
                    </p>
                    {req.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{req.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-num text-lg font-bold text-foreground">{req.items?.length || 0} items</p>
                  </div>
                </div>

                {/* Items preview */}
                {req.items?.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {req.items.slice(0, 3).map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{item.description}</span>
                        <span className="font-num text-foreground">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                    {req.items.length > 3 && (
                      <p className="text-[10px] text-muted-foreground">+{req.items.length - 3} más...</p>
                    )}
                  </div>
                )}

                {req.status === 'PENDING' && (
                  <button
                    onClick={() => generateMut.mutate(req.id)}
                    disabled={generateMut.isPending}
                    className="btn-primary text-xs">
                    {generateMut.isPending
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando...</>
                      : <><ShoppingCart className="w-3.5 h-3.5" /> Generar O/C por proveedor</>}
                  </button>
                )}
              </div>
            )
          })
        )}

        {/* ÓRDENES */}
        {tab === 'orders' && (
          orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 glass-card">
              <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">Sin órdenes de compra</p>
              <p className="text-xs text-muted-foreground mt-1">
                Crea una solicitud y genera las O/C desde ahí
              </p>
            </div>
          ) : orders.map(order => <OrderCard key={order.id} order={order} />)
        )}

        {/* FACTURAS */}
        {tab === 'invoices' && (
          invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 glass-card">
              <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">Sin facturas registradas</p>
            </div>
          ) : invoices.map(inv => (
            <div key={inv.id} className="glass-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{inv.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.supplier?.name} · {formatDate(inv.issue_date)}
                    {inv.work?.name && ` · ${inv.work.name}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-num text-xl font-bold text-amber-400">{formatCurrency(inv.total)}</p>
                  <span className={cn('badge text-[10px]',
                    inv.status === 'PAID' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400')}>
                    {inv.status === 'PAID' ? 'Pagada' : 'Pendiente'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button disabled={!pagination.hasPrev} onClick={() => setPage(p => p-1)} className="btn-ghost disabled:opacity-40">Anterior</button>
            <span className="text-xs text-muted-foreground font-num">{pagination.page}/{pagination.totalPages}</span>
            <button disabled={!pagination.hasNext} onClick={() => setPage(p => p+1)} className="btn-ghost disabled:opacity-40">Siguiente</button>
          </div>
        )}
      </div>

      {showNew && <NewRequestModal onClose={() => setShowNew(false)} />}
    </div>
  )
}

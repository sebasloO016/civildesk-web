import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  Plus, X, Camera, ShoppingCart, Users,
  FileText, AlertTriangle, CloudUpload,
  Sun, Cloud, CloudRain, Wind, Loader2,
  ChevronDown, ChevronUp, Search,
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '../../utils/helpers'

const reportsApi = {
  getAll:      (wid, page)   => api.get(`/works/${wid}/reports?page=${page}&limit=8`),
  getStats:    (wid)         => api.get(`/works/${wid}/reports/stats`),
  create:      (wid, data)   => api.post(`/works/${wid}/reports`, data),
  removePhoto: (wid, id, pid)=> api.delete(`/works/${wid}/reports/${id}/photos/${pid}`),
}

const WEATHER_OPTIONS = [
  { value: 'Soleado', icon: Sun,       color: 'text-amber-400' },
  { value: 'Nublado', icon: Cloud,     color: 'text-slate-400' },
  { value: 'Lluvia',  icon: CloudRain, color: 'text-blue-400'  },
  { value: 'Viento',  icon: Wind,      color: 'text-cyan-400'  },
]

async function uploadToCloudinary(file) {
  const cloudName    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !uploadPreset) {
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target.result)
      reader.readAsDataURL(file)
    })
  }
  const fd = new FormData()
  fd.append('file', file)
  fd.append('upload_preset', uploadPreset)
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method:'POST', body:fd })
  const data = await res.json()
  return data.secure_url
}

// ── Purchase Row ─────────────────────────────────────────────
function PurchaseRow({ idx, register, watch, setValue, remove, suppliers, workId }) {
  const [showSearch, setShowSearch] = useState(false)
  const [search, setSearch]         = useState('')
  const [matches, setMatches]       = useState([])

  const qty       = parseFloat(watch(`purchases.${idx}.quantity`))   || 0
  const unitPrice = parseFloat(watch(`purchases.${idx}.unit_price`)) || 0
  const autoTotal = (qty * unitPrice).toFixed(2)

  // Fetch matches from backend on typing
  useEffect(() => {
    if (search.length < 2) { setMatches([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/works/${workId}/reports/match-products?q=${encodeURIComponent(search)}`)
        setMatches(res.data?.data || [])
      } catch { setMatches([]) }
    }, 300)
    return () => clearTimeout(timer)
  }, [search, workId])

  const selectProduct = (product) => {
    setValue(`purchases.${idx}.description`, product.name)
    setValue(`purchases.${idx}.unit`,        product.unit)
    setValue(`purchases.${idx}.unit_price`,  parseFloat(product.reference_price || 0))
    setValue(`purchases.${idx}.product_id`,  product.id)
    setShowSearch(false)
    setSearch('')
    setMatches([])
  }

  const supplierId = watch(`purchases.${idx}.supplier_id`)
  const productId  = watch(`purchases.${idx}.product_id`)

  return (
    <div className="glass-card p-3 space-y-2">
      {/* Selector de producto con búsqueda */}
      <div className="relative">
        <div className="flex gap-2">
          <input
            className="field-input flex-1 text-xs"
            placeholder="Busca en el catálogo o escribe libremente..."
            {...register(`purchases.${idx}.description`)}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            onChange={e => {
              register(`purchases.${idx}.description`).onChange(e)
              setSearch(e.target.value)
              setShowSearch(true)
              // Si el usuario edita el texto, limpiar product_id previo
              setValue(`purchases.${idx}.product_id`, null)
            }}
          />
          <button type="button" onClick={() => remove(idx)}
            className="btn-ghost p-1.5 text-rose-400 hover:bg-rose-500/10 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dropdown de coincidencias */}
        {showSearch && matches.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-8 mt-1 glass-card border border-border
                          rounded-lg overflow-hidden shadow-lg max-h-52 overflow-y-auto">
            <div className="px-3 py-1.5 bg-secondary/50 border-b border-border">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Coincidencias en catálogo — selecciona para autocompletar precio
              </p>
            </div>
            {matches.map(p => (
              <button key={p.id} type="button"
                onMouseDown={() => selectProduct(p)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs
                           hover:bg-secondary/80 transition-colors text-left gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-foreground">{p.name}</span>
                  {p.code && <span className="text-muted-foreground ml-2 font-mono">{p.code}</span>}
                  <span className="text-muted-foreground ml-2">· {p.unit}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-amber-400 font-num font-semibold">${p.reference_price}</span>
                  <span className="text-[10px] text-muted-foreground ml-1 block">ref/{p.unit}</span>
                </div>
              </button>
            ))}
            <div className="px-3 py-2 bg-secondary/30 border-t border-border">
              <p className="text-[10px] text-muted-foreground">
                ¿No está en la lista? Escribe libremente y se registrará como compra sin vincular al catálogo.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden field for product_id */}
      <input type="hidden" {...register(`purchases.${idx}.product_id`)} />

      {/* Badge si está vinculado al catálogo */}
      {productId && (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Vinculado al catálogo — el precio se actualizará automáticamente
        </div>
      )}

      {/* Cantidad · Unidad · Precio · Total */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Cantidad *</label>
          <input type="number" step="0.01" min="0" className="field-input text-xs mt-0.5"
            placeholder="0"
            {...register(`purchases.${idx}.quantity`, { valueAsNumber: true })} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Unidad</label>
          <input className="field-input text-xs mt-0.5" placeholder="saco, m², ..."
            {...register(`purchases.${idx}.unit`)} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Precio unitario</label>
          <input type="number" step="0.01" min="0" className="field-input text-xs mt-0.5"
            placeholder="0.00"
            {...register(`purchases.${idx}.unit_price`, { valueAsNumber: true })} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Total (auto)</label>
          <div className="field-input text-xs mt-0.5 bg-secondary/50 font-num text-amber-400
                          flex items-center select-none">
            ${autoTotal}
          </div>
        </div>
      </div>

      {/* Proveedor */}
      <div>
        <label className="text-[10px] text-muted-foreground">
          Proveedor / Tienda
          {productId && supplierId && (
            <span className="ml-2 text-emerald-400">
              → precio actualizado en catálogo automáticamente
            </span>
          )}
        </label>
        <select className="field-input text-xs mt-0.5"
          {...register(`purchases.${idx}.supplier_id`, { valueAsNumber: true })}>
          <option value="">Sin proveedor registrado</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name} · {s.category || ''}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ── Contractor Row ───────────────────────────────────────────
function ContractorRow({ value, subcontracts, suppliers, onChange, onRemove }) {
  return (
    <div className="flex gap-2">
      <select
        value={value.supplier_id || ''}
        onChange={e => {
          const sid = parseInt(e.target.value) || null
          const opt = [...subcontracts, ...suppliers].find(s => s.supplier_id === sid || s.id === sid)
          const name = opt ? (opt.specialty ? `${opt.specialty} — ${opt.supplier?.name || ''}` : opt.name) : ''
          onChange({ ...value, supplier_id: sid, name })
        }}
        className="field-input flex-1 text-xs">
        <option value="">— Seleccionar subcontratista/proveedor —</option>
        {subcontracts.length > 0 && (
          <optgroup label="Subcontratos de esta obra">
            {subcontracts.map(s => (
              <option key={`sub_${s.id}`} value={s.supplier_id}>
                {s.specialty} — {s.supplier?.name || 'Sin nombre'}
              </option>
            ))}
          </optgroup>
        )}
        <optgroup label="Otros proveedores">
          {suppliers.map(s => (
            <option key={`sup_${s.id}`} value={s.id}>{s.name}</option>
          ))}
        </optgroup>
      </select>

      <input
        type="number" min="0"
        value={value.workers_count || ''}
        onChange={e => onChange({ ...value, workers_count: parseInt(e.target.value) || 0 })}
        className="field-input w-20 text-xs"
        placeholder="# trabaj."
      />

      <button type="button" onClick={onRemove}
        className="btn-ghost p-1.5 text-rose-400 hover:bg-rose-500/10 shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Report Card ──────────────────────────────────────────────
function ReportCard({ report, workId }) {
  const [expanded, setExpanded] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const { toast } = useUIStore()
  const qc = useQueryClient()

  const removePhotoMut = useMutation({
    mutationFn: (pid) => reportsApi.removePhoto(workId, report.id, pid),
    onSuccess: () => { qc.invalidateQueries(['daily-reports', workId]); toast({ title: 'Foto eliminada' }) },
  })

  const WeatherIcon  = WEATHER_OPTIONS.find(w => w.value === report.weather)?.icon || Sun
  const weatherColor = WEATHER_OPTIONS.find(w => w.value === report.weather)?.color || 'text-muted-foreground'

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-display font-semibold text-foreground">
                {formatDate(report.report_date, { weekday:'long', day:'numeric', month:'long' })}
              </h3>
              <WeatherIcon className={cn('w-4 h-4 shrink-0', weatherColor)} />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {report.workers_count || 0} trabajadores
              </span>
              {report.purchases?.length > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <ShoppingCart className="w-3 h-3" />
                  {report.purchases.length} compra(s) ·{' '}
                  {formatCurrency(report.purchases.reduce((s,p) => s + parseFloat(p.total||0), 0))}
                </span>
              )}
              {report.photos?.length > 0 && (
                <span className="flex items-center gap-1 text-blue-400">
                  <Camera className="w-3 h-3" /> {report.photos.length} foto(s)
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="btn-ghost p-1.5">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <p className={cn('text-sm text-muted-foreground leading-relaxed', !expanded && 'line-clamp-2')}>
          {report.activities}
        </p>

        {report.novelties && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-500/8 border border-amber-500/15">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300/90">{report.novelties}</p>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border">
          {/* Photos */}
          {report.photos?.length > 0 && (
            <div className="p-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Fotos ({report.photos.length})
              </p>
              <div className="grid grid-cols-4 gap-2">
                {report.photos.map(photo => (
                  <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-secondary">
                    <img src={photo.url} alt={photo.caption || 'Foto de obra'}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setLightbox(photo.url)}
                      onError={e => { e.target.style.display = 'none' }} />
                    {photo.caption && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1.5 py-1 text-[9px] text-white truncate">
                        {photo.caption}
                      </div>
                    )}
                    <button onClick={() => removePhotoMut.mutate(photo.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500/80 text-white
                                 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Purchases */}
          {report.purchases?.length > 0 && (
            <div className="p-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Compras del día
              </p>
              <div className="space-y-1.5">
                {report.purchases.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-foreground font-medium">{p.description}</span>
                      <span className="text-muted-foreground ml-2">{p.quantity} {p.unit}</span>
                    </div>
                    <span className="font-num font-bold text-amber-400 shrink-0 ml-2">
                      {formatCurrency(p.total)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-1.5 border-t border-border">
                  <span className="text-muted-foreground font-semibold">Total</span>
                  <span className="font-num font-bold text-amber-400">
                    {formatCurrency(report.purchases.reduce((s, p) => s + parseFloat(p.total || 0), 0))}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Contractors */}
          {report.contractors?.length > 0 && (
            <div className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Contratistas presentes
              </p>
              <div className="flex flex-wrap gap-2">
                {report.contractors.map(c => (
                  <span key={c.id} className="badge bg-secondary text-foreground text-xs">
                    {c.name || c.activity} {c.workers_count > 0 && `(${c.workers_count})`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Foto obra" className="max-w-4xl max-h-screen object-contain p-4" />
          <button className="absolute top-4 right-4 btn-ghost text-white">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── New Report Modal ─────────────────────────────────────────
function NewReportModal({ workId, onClose }) {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const fileInputRef = useRef(null)
  const [photos, setPhotos]             = useState([])
  const [uploadingPhoto, setUploading]  = useState(false)
  const [contractors, setContractors]   = useState([])

  // Load suppliers and subcontracts for selectors
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-report'],
    queryFn:  () => api.get('/suppliers?limit=100'),
  })
  const { data: subcontractsData } = useQuery({
    queryKey: ['subcontracts-report', workId],
    queryFn:  () => api.get(`/works/${workId}/subcontracts`),
  })

  const suppliers    = suppliersData?.data?.data   || []
  const subcontracts = subcontractsData?.data?.data || []

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      report_date:   new Date().toISOString().substring(0, 10),
      weather:       'Soleado',
      workers_count: 0,
      purchases:     [],
    },
  })
  const { fields: purchaseFields, append: addPurchase, remove: removePurchase } =
    useFieldArray({ control, name: 'purchases' })

  const createMut = useMutation({
    mutationFn: (d) => reportsApi.create(workId, d),
    onSuccess: () => {
      qc.invalidateQueries(['daily-reports', workId])
      qc.invalidateQueries(['daily-reports-stats', workId])
      toast({ title: 'Reporte creado', variant: 'success' })
      onClose()
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const url = await uploadToCloudinary(file)
        setPhotos(prev => [...prev, { url, caption: '' }])
      }
    } catch (err) {
      toast({ title: 'Error al subir foto', description: err.message, variant: 'destructive' })
    } finally { setUploading(false) }
  }

  const onSubmit = (data) => {
    const purchases = (data.purchases || [])
      .filter(p => p.description?.trim())
      .map(p => ({
        description: p.description,
        quantity:    parseFloat(p.quantity || 1),
        unit:        p.unit || 'unidad',
        unit_price:  parseFloat(p.unit_price || 0),
        supplier_id: p.supplier_id || null,
      }))

    createMut.mutate({
      ...data,
      workers_count: parseInt(data.workers_count || 0),
      photos:      photos.map(p => ({ url: p.url, caption: p.caption })),
      purchases,
      contractors: contractors
        .filter(c => c.name?.trim())
        .map(c => ({ name: c.name, workers_count: parseInt(c.workers_count || 0), supplier_id: c.supplier_id || null })),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 glass-card animate-fade-up max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h2 className="font-display font-bold text-lg text-foreground">Nuevo Reporte Diario</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          <form id="report-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Fecha + Clima + Trabajadores */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Fecha *</label>
                <input type="date" className={cn('field-input mt-1', errors.report_date && 'border-rose-500')}
                  {...register('report_date', { required: true })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Clima</label>
                <select className="field-input mt-1" {...register('weather')}>
                  {WEATHER_OPTIONS.map(w => (
                    <option key={w.value} value={w.value}>{w.value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Trabajadores propios
                </label>
                <input type="number" min="0" className="field-input mt-1"
                  {...register('workers_count', { valueAsNumber: true })} />
              </div>
            </div>

            {/* Actividades */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                Actividades realizadas *
              </label>
              <textarea rows={3}
                className={cn('field-input mt-1 resize-none', errors.activities && 'border-rose-500')}
                placeholder="Describe las actividades: avance de estructura, mampostería al 60%, instalación puntos eléctricos zona norte..."
                {...register('activities', { required: 'Requerido' })} />
              {errors.activities && <p className="text-rose-400 text-xs mt-1">{errors.activities.message}</p>}
            </div>

            {/* Novedades */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                Novedades / Problemas
              </label>
              <textarea rows={2} className="field-input mt-1 resize-none"
                placeholder="Ej: Lluvia suspendió labores 2h · Falta material · Accidente leve..."
                {...register('novelties')} />
            </div>

            {/* Fotos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Fotos de avance ({photos.length})
                </label>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto} className="btn-ghost text-xs gap-1.5">
                  {uploadingPhoto
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <CloudUpload className="w-3.5 h-3.5" />}
                  {uploadingPhoto ? 'Subiendo...' : 'Agregar fotos'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple
                  className="hidden" onChange={handlePhotoUpload} />
              </div>

              {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-secondary group">
                        <img src={photo.url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500/80 text-white
                                     opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <input value={photo.caption}
                        onChange={e => setPhotos(prev => prev.map((p, i) => i === idx ? { ...p, caption: e.target.value } : p))}
                        placeholder="Descripción (opcional)" className="field-input text-xs py-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer
                             hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <Camera className="w-7 h-7 text-muted-foreground/30 mx-auto mb-1.5" />
                  <p className="text-xs text-muted-foreground">Click para subir fotos de avance</p>
                </div>
              )}
            </div>

            {/* Compras del día */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Compras del día
                  </label>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    Compras urgentes de campo · Se registran como egreso automáticamente
                  </p>
                </div>
                <button type="button"
                  onClick={() => addPurchase({ description:'', quantity:1, unit:'', unit_price:0, supplier_id:'' })}
                  className="btn-ghost text-xs">
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>

              {purchaseFields.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4 rounded-lg border border-dashed border-border">
                  Sin compras de campo hoy
                </div>
              ) : (
                <div className="space-y-2">
                  {purchaseFields.map((field, idx) => (
                    <PurchaseRow
                      key={field.id}
                      idx={idx}
                      register={register}
                      watch={watch}
                      setValue={setValue}
                      remove={removePurchase}
                      suppliers={suppliers}
                      workId={workId}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Contratistas presentes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Contratistas presentes hoy
                  </label>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    Selecciona los subcontratistas que trabajaron hoy en la obra
                  </p>
                </div>
                <button type="button"
                  onClick={() => setContractors(prev => [...prev, { name:'', workers_count:0 }])}
                  className="btn-ghost text-xs">
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>

              {contractors.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4 rounded-lg border border-dashed border-border">
                  Sin contratistas externos hoy
                </div>
              ) : (
                <div className="space-y-2">
                  {contractors.map((c, idx) => (
                    <ContractorRow
                      key={idx}
                      value={c}
                      subcontracts={subcontracts}
                      suppliers={suppliers}
                      onChange={val => setContractors(prev => prev.map((x, i) => i === idx ? val : x))}
                      onRemove={() => setContractors(prev => prev.filter((_, i) => i !== idx))}
                    />
                  ))}
                </div>
              )}
            </div>

          </form>
        </div>

        <div className="p-5 border-t border-border shrink-0 flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
            Cancelar
          </button>
          <button type="submit" form="report-form" disabled={createMut.isPending}
            className="btn-primary flex-1 justify-center">
            {createMut.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              : <><FileText className="w-4 h-4" /> Guardar Reporte</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ReportsTab ──────────────────────────────────────────
export default function ReportsTab({ workId }) {
  const [page, setPage]         = useState(1)
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['daily-reports', workId, page],
    queryFn:  () => reportsApi.getAll(workId, page),
  })
  const { data: statsData } = useQuery({
    queryKey: ['daily-reports-stats', workId],
    queryFn:  () => reportsApi.getStats(workId),
  })

  const reports    = data?.data?.data     || []
  const pagination = data?.data?.pagination
  const stats      = statsData?.data?.data

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label:'Reportes totales',    value: stats.total_reports },
            { label:'Esta semana',         value: stats.reports_last_week },
            { label:'Trabajadores prom.',  value: Math.round(parseFloat(stats.avg_workers || 0)) },
            { label:'Total compras campo', value: formatCurrency(stats.total_purchases) },
          ].map(s => (
            <div key={s.label} className="glass-card p-4">
              <p className="font-num text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{pagination?.total || 0} reportes</p>
        <button onClick={() => setShowForm(true)} className="btn-primary text-xs">
          <Plus className="w-3.5 h-3.5" /> Nuevo Reporte
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card p-5 shimmer h-28 rounded-xl" />)}</div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 glass-card">
          <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Sin reportes diarios</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4 text-xs">
            <Plus className="w-3.5 h-3.5" /> Crear primer reporte
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <ReportCard key={report.id} report={report} workId={workId} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={!pagination.hasPrev} onClick={() => setPage(p=>p-1)} className="btn-ghost disabled:opacity-40">Anterior</button>
          <span className="text-xs text-muted-foreground font-num">{pagination.page}/{pagination.totalPages}</span>
          <button disabled={!pagination.hasNext} onClick={() => setPage(p=>p+1)} className="btn-ghost disabled:opacity-40">Siguiente</button>
        </div>
      )}

      {showForm && <NewReportModal workId={workId} onClose={() => setShowForm(false)} />}
    </div>
  )
}

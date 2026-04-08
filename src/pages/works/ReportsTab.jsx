import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  Plus, X, Camera, ShoppingCart, Users,
  FileText, AlertTriangle, CloudUpload,
  Sun, Cloud, CloudRain, Wind, Loader2,
  ChevronDown, ChevronUp, Search, Pencil,
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '../../utils/helpers'

const reportsApi = {
  getAll:           (wid, page)    => api.get(`/works/${wid}/reports?page=${page}&limit=8`),
  getStats:         (wid)          => api.get(`/works/${wid}/reports/stats`),
  create:           (wid, data)    => api.post(`/works/${wid}/reports`, data),
  update:           (wid, id, data)=> api.put(`/works/${wid}/reports/${id}`, data),
  addPhoto:         (wid, id, data)=> api.post(`/works/${wid}/reports/${id}/photos`, data),
  removePhoto:      (wid, id, pid) => api.delete(`/works/${wid}/reports/${id}/photos/${pid}`),
  addContractor:    (wid, id, data)=> api.post(`/works/${wid}/reports/${id}/contractors`, data),
  removeContractor: (wid, id, cid) => api.delete(`/works/${wid}/reports/${id}/contractors/${cid}`),
}

const WEATHER_OPTIONS = [
  { value: 'Soleado', icon: Sun,       color: 'text-amber-400' },
  { value: 'Nublado', icon: Cloud,     color: 'text-slate-400' },
  { value: 'Lluvia',  icon: CloudRain, color: 'text-blue-400'  },
  { value: 'Viento',  icon: Wind,      color: 'text-cyan-400'  },
]

const TODAY = new Date().toISOString().substring(0, 10)

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
  const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd })
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
  const productId = watch(`purchases.${idx}.product_id`)
  const supplierId = watch(`purchases.${idx}.supplier_id`)

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
    setSearch(''); setShowSearch(false); setMatches([])
  }

  return (
    <div className="glass-card p-3 space-y-2 text-xs">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <label className="text-[10px] text-muted-foreground">Descripción *</label>
          <div className="relative mt-0.5">
            <input className="field-input text-xs pr-7"
              placeholder="Buscar en catálogo o escribir..."
              {...register(`purchases.${idx}.description`)}
              onChange={e => { register(`purchases.${idx}.description`).onChange(e); setSearch(e.target.value); setShowSearch(true) }}
              onFocus={() => setShowSearch(true)}
              autoComplete="off"
            />
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowSearch(s => !s)}>
              <Search className="w-3 h-3" />
            </button>
            {showSearch && matches.length > 0 && (
              <div className="absolute z-20 left-0 right-0 top-full mt-0.5 glass-card border border-border rounded-lg shadow-xl overflow-hidden max-h-36 overflow-y-auto">
                {matches.map(m => (
                  <button key={m.id} type="button"
                    className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-secondary/60 text-left"
                    onClick={() => selectProduct(m)}>
                    <span className="text-xs text-foreground">{m.name}</span>
                    <span className="text-[10px] text-amber-400 ml-2">${parseFloat(m.reference_price||0).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button type="button" onClick={() => remove(idx)}
          className="btn-ghost p-1.5 text-rose-400 hover:bg-rose-500/10 shrink-0 mt-3.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <input type="hidden" {...register(`purchases.${idx}.product_id`)} />

      {productId && (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Vinculado al catálogo
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="text-[10px] text-muted-foreground">Cantidad *</label>
          <input type="number" step="0.01" min="0" className="field-input text-xs mt-0.5"
            placeholder="0" {...register(`purchases.${idx}.quantity`, { valueAsNumber: true })} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Unidad</label>
          <input className="field-input text-xs mt-0.5" placeholder="saco, m²..."
            {...register(`purchases.${idx}.unit`)} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Precio unitario</label>
          <input type="number" step="0.01" min="0" className="field-input text-xs mt-0.5"
            placeholder="0.00" {...register(`purchases.${idx}.unit_price`, { valueAsNumber: true })} />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground">Total (auto)</label>
          <div className="field-input text-xs mt-0.5 bg-secondary/50 font-num text-amber-400 flex items-center select-none">
            ${autoTotal}
          </div>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-muted-foreground">Proveedor / Tienda</label>
        <select className="field-input text-xs mt-0.5" {...register(`purchases.${idx}.supplier_id`, { valueAsNumber: true })}>
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
        className="field-input text-xs flex-1"
      >
        <option value="">Seleccionar contratista...</option>
        {subcontracts.map(s => (
          <option key={`sub-${s.id}`} value={s.supplier_id}>
            {s.specialty} — {s.supplier?.name || ''}
          </option>
        ))}
        {suppliers.filter(s => !subcontracts.some(sc => sc.supplier_id === s.id)).map(s => (
          <option key={`sup-${s.id}`} value={s.id}>{s.name}</option>
        ))}
      </select>
      <input type="number" min="0" value={value.workers_count || 0}
        onChange={e => onChange({ ...value, workers_count: parseInt(e.target.value) || 0 })}
        className="field-input text-xs w-16" placeholder="# " title="Trabajadores" />
      <button type="button" onClick={onRemove}
        className="btn-ghost p-1.5 text-rose-400 hover:bg-rose-500/10 shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── EditContractorsSection — edición en vivo de contratistas ──
function EditContractorsSection({ workId, reportId, existingContractors, suppliers, subcontracts, toast, qc, reportsApi }) {
  const [contractors, setContractors] = useState(existingContractors)
  const [adding, setAdding]           = useState(false)
  const [newSid, setNewSid]           = useState('')
  const [newWc, setNewWc]             = useState(1)

  const addMut = useMutation({
    mutationFn: () => reportsApi.addContractor(workId, reportId, {
      supplier_id:   parseInt(newSid),
      workers_count: parseInt(newWc || 1),
    }),
    onSuccess: (res) => {
      const added = res.data?.data
      setContractors(prev => [...prev, added])
      setAdding(false); setNewSid(''); setNewWc(1)
      qc.invalidateQueries(['daily-reports', workId])
      toast({ title: 'Contratista agregado', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const removeMut = useMutation({
    mutationFn: (cid) => reportsApi.removeContractor(workId, reportId, cid),
    onSuccess: (_, cid) => {
      setContractors(prev => prev.filter(c => c.id !== cid))
      qc.invalidateQueries(['daily-reports', workId])
      toast({ title: 'Contratista eliminado' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const getContractorName = (c) => {
    // Buscar nombre desde subcontratos o suppliers
    const sub = subcontracts.find(s => s.supplier_id === c.supplier_id)
    if (sub) return `${sub.specialty} — ${sub.supplier?.name || ''}`
    const sup = suppliers.find(s => s.id === c.supplier_id)
    if (sup) return sup.name
    return c.activity || `Proveedor #${c.supplier_id}`
  }

  const allOptions = [
    ...subcontracts.map(s => ({ id: s.supplier_id, label: `${s.specialty} — ${s.supplier?.name || ''}` })),
    ...suppliers.filter(s => !subcontracts.some(sc => sc.supplier_id === s.id))
               .map(s => ({ id: s.id, label: s.name })),
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider">Contratistas presentes</label>
        <button type="button" onClick={() => setAdding(a => !a)} className="btn-ghost text-xs">
          <Plus className="w-3.5 h-3.5" /> Agregar
        </button>
      </div>

      {/* Lista existente */}
      {contractors.length === 0 && !adding ? (
        <div className="text-xs text-muted-foreground text-center py-3 rounded-lg border border-dashed border-border">
          Sin contratistas registrados
        </div>
      ) : (
        <div className="space-y-1.5 mb-2">
          {contractors.map(c => (
            <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/40">
              <div className="flex items-center gap-2">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span className="text-foreground">{getContractorName(c)}</span>
                <span className="text-muted-foreground">{c.workers_count} trab.</span>
              </div>
              <button type="button" onClick={() => removeMut.mutate(c.id)}
                className="btn-ghost p-1 text-rose-400 hover:bg-rose-500/10">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulario agregar */}
      {adding && (
        <div className="flex gap-2 mt-2">
          <select value={newSid} onChange={e => setNewSid(e.target.value)} className="field-input text-xs flex-1">
            <option value="">Seleccionar...</option>
            {allOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <input type="number" min="1" value={newWc} onChange={e => setNewWc(e.target.value)}
            className="field-input text-xs w-16" placeholder="# " title="Trabajadores" />
          <button type="button" onClick={() => addMut.mutate()} disabled={!newSid || addMut.isPending}
            className="btn-primary text-xs px-3 disabled:opacity-40">
            {addMut.isPending ? '...' : '✓'}
          </button>
          <button type="button" onClick={() => setAdding(false)} className="btn-ghost text-xs px-2">✕</button>
        </div>
      )}
    </div>
  )
}

// ── Report Modal (crear o editar) ─────────────────────────────
function ReportModal({ workId, report, onClose }) {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const isEdit   = !!report
  const isOldDay = isEdit && report.report_date?.substring(0,10) < TODAY
  const [confirmed, setConfirmed] = useState(!isOldDay)  // si es día pasado, pedir confirmación
  const fileInputRef = useRef(null)
  const [photos, setPhotos]           = useState(report?.photos || [])
  const [newPhotos, setNewPhotos]     = useState([])  // fotos nuevas a subir en edición
  const [uploadingPhoto, setUploading] = useState(false)
  const [contractors, setContractors] = useState(
    report?.contractors?.map(c => ({ supplier_id: c.supplier_id, workers_count: c.workers_count, name: c.activity || '' })) || []
  )

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
      report_date:   report?.report_date?.substring(0,10) || TODAY,
      weather:       report?.weather       || 'Soleado',
      workers_count: report?.workers_count || 0,
      activities:    report?.activities    || '',
      novelties:     report?.novelties     || '',
      purchases:     report?.purchases?.map(p => ({
        description: p.description,
        quantity:    p.quantity,
        unit:        p.unit,
        unit_price:  p.unit_price,
        supplier_id: p.supplier_id,
        product_id:  p.product_id,
      })) || [],
    },
  })

  const { fields: purchaseFields, append: addPurchase, remove: removePurchase } =
    useFieldArray({ control, name: 'purchases' })

  const saveMut = useMutation({
    mutationFn: async (data) => {
      if (isEdit) {
        // Actualizar datos del reporte
        await reportsApi.update(workId, report.id, {
          weather:       data.weather,
          activities:    data.activities,
          novelties:     data.novelties,
          workers_count: parseInt(data.workers_count || 0),
        })
        // Subir fotos nuevas que se agregaron
        for (const photo of newPhotos) {
          await reportsApi.addPhoto(workId, report.id, { url: photo.url, caption: photo.caption || '' })
        }
      } else {
        await reportsApi.create(workId, {
          ...data,
          workers_count: parseInt(data.workers_count || 0),
          photos:      photos.map(p => ({ url: p.url, caption: p.caption || '' })),
          purchases:   (data.purchases || [])
            .filter(p => p.description?.trim())
            .map(p => ({
              description: p.description,
              quantity:    parseFloat(p.quantity || 1),
              unit:        p.unit || 'unidad',
              unit_price:  parseFloat(p.unit_price || 0),
              supplier_id: p.supplier_id || null,
              product_id:  p.product_id  || null,
            })),
          contractors: contractors
            .filter(c => c.supplier_id)
            .map(c => ({ name: c.name, workers_count: parseInt(c.workers_count || 0), supplier_id: c.supplier_id })),
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['daily-reports', workId])
      qc.invalidateQueries(['daily-reports-stats', workId])
      toast({ title: isEdit ? 'Reporte actualizado' : 'Reporte creado', variant: 'success' })
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
        if (isEdit) {
          setNewPhotos(prev => [...prev, { url, caption: '' }])
        } else {
          setPhotos(prev => [...prev, { url, caption: '' }])
        }
      }
    } catch (err) {
      toast({ title: 'Error al subir foto', description: err.message, variant: 'destructive' })
    } finally { setUploading(false) }
  }

  const removeExistingPhoto = async (photoId) => {
    try {
      await reportsApi.removePhoto(workId, report.id, photoId)
      setPhotos(prev => prev.filter(p => p.id !== photoId))
      qc.invalidateQueries(['daily-reports', workId])
    } catch (e) {
      toast({ title: 'Error al eliminar foto', variant: 'destructive' })
    }
  }

  const allPhotos = isEdit ? [...photos, ...newPhotos] : photos

  // Si es día pasado y no confirmó, mostrar pantalla de confirmación
  if (isOldDay && !confirmed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-sm mx-4 glass-card p-6 animate-fade-up">
          <div className="flex items-start gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground">Editar reporte pasado</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Estás a punto de editar el reporte del <strong>{formatDate(report.report_date)}</strong>.
              </p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 mb-5">
            <p className="text-xs text-amber-400 font-medium mb-1">⚠ Posible impacto en registros contabilizados</p>
            <p className="text-[11px] text-muted-foreground">
              Los cambios en actividades y novedades son seguros. Si agregas fotos, también es seguro.
              Las compras de este reporte ya fueron contabilizadas en finanzas — no se pueden modificar desde aquí.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button onClick={() => setConfirmed(true)} className="btn-primary flex-1 justify-center bg-amber-600 hover:bg-amber-700">
              Entiendo, continuar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl mx-4 glass-card animate-fade-up max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">
              {isEdit ? 'Editar Reporte' : 'Nuevo Reporte Diario'}
            </h2>
            {isEdit && isOldDay && (
              <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-3 h-3" />
                Editando reporte de fecha pasada
              </p>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          <form id="report-form" onSubmit={handleSubmit(d => saveMut.mutate(d))} className="space-y-5">

            {/* Fecha + Clima + Trabajadores */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Fecha *</label>
                <input type="date"
                  className={cn('field-input mt-1', errors.report_date && 'border-rose-500', isEdit && 'opacity-60 cursor-not-allowed')}
                  disabled={isEdit}
                  {...register('report_date', { required: true })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Clima</label>
                <select className="field-input mt-1" {...register('weather')}>
                  {WEATHER_OPTIONS.map(w => <option key={w.value} value={w.value}>{w.value}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Trabajadores propios</label>
                <input type="number" min="0" className="field-input mt-1"
                  {...register('workers_count', { valueAsNumber: true })} />
              </div>
            </div>

            {/* Actividades */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Actividades realizadas *</label>
              <textarea rows={3}
                className={cn('field-input mt-1 resize-none', errors.activities && 'border-rose-500')}
                placeholder="Describe las actividades: avance de estructura, mampostería al 60%..."
                {...register('activities', { required: 'Requerido' })} />
              {errors.activities && <p className="text-rose-400 text-xs mt-1">{errors.activities.message}</p>}
            </div>

            {/* Novedades */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Novedades / Problemas</label>
              <textarea rows={2} className="field-input mt-1 resize-none"
                placeholder="Ej: Lluvia suspendió labores 2h · Falta material..."
                {...register('novelties')} />
            </div>

            {/* Fotos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Fotos de avance ({allPhotos.length})
                  {newPhotos.length > 0 && <span className="ml-1 text-emerald-400">+{newPhotos.length} nuevas</span>}
                </label>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto} className="btn-ghost text-xs gap-1.5">
                  {uploadingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                  {uploadingPhoto ? 'Subiendo...' : 'Agregar fotos'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple
                  className="hidden" onChange={handlePhotoUpload} />
              </div>

              {allPhotos.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {(isEdit ? photos : allPhotos).map((photo, idx) => (
                    <div key={photo.id || idx} className="relative group aspect-square rounded-lg overflow-hidden bg-secondary">
                      <img src={photo.url} alt="Foto" className="w-full h-full object-cover"
                        onError={e => { e.target.style.display = 'none' }} />
                      <button type="button"
                        onClick={() => isEdit ? removeExistingPhoto(photo.id) : setPhotos(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500/80 text-white
                                   opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {newPhotos.map((photo, idx) => (
                    <div key={`new-${idx}`} className="relative group aspect-square rounded-lg overflow-hidden bg-secondary border-2 border-emerald-500/30">
                      <img src={photo.url} alt="Nueva foto" className="w-full h-full object-cover"
                        onError={e => { e.target.style.display = 'none' }} />
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-500/80 text-white text-[9px]">Nueva</div>
                      <button type="button" onClick={() => setNewPhotos(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500/80 text-white
                                   opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => fileInputRef.current?.click()}>
                  <div className="text-center">
                    <Camera className="w-5 h-5 text-muted-foreground/40 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Click para agregar fotos</p>
                  </div>
                </div>
              )}
            </div>

            {/* Compras — solo en modo nuevo */}
            {!isEdit && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Compras del día</label>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">Se registran como egresos en finanzas automáticamente</p>
                  </div>
                  <button type="button" onClick={() => addPurchase({ description:'', quantity:1, unit:'unidad', unit_price:0 })}
                    className="btn-ghost text-xs"><Plus className="w-3.5 h-3.5" /> Agregar</button>
                </div>
                {purchaseFields.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4 rounded-lg border border-dashed border-border">
                    Sin compras de campo hoy
                  </div>
                ) : (
                  <div className="space-y-2">
                    {purchaseFields.map((field, idx) => (
                      <PurchaseRow key={field.id} idx={idx} register={register} watch={watch}
                        setValue={setValue} remove={removePurchase} suppliers={suppliers} workId={workId} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Aviso compras en modo edición */}
            {isEdit && report?.purchases?.length > 0 && (
              <div className="p-3 rounded-xl bg-secondary/40 border border-border">
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                  Este reporte tiene {report.purchases.length} compra(s) por{' '}
                  <strong className="text-amber-400">
                    {formatCurrency(report.purchases.reduce((s,p) => s + parseFloat(p.total||0), 0))}
                  </strong>{' '}
                  ya contabilizadas en finanzas — no se pueden modificar desde aquí.
                </p>
              </div>
            )}

            {/* Contratistas — edición completa en ambos modos */}
            {isEdit && (
              <EditContractorsSection workId={workId} reportId={report.id}
                existingContractors={report.contractors || []}
                suppliers={suppliers} subcontracts={subcontracts} toast={toast} qc={qc}
                reportsApi={reportsApi}
              />
            )}

            {/* Contratistas — solo en modo nuevo */}
            {!isEdit && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Contratistas presentes hoy</label>
                  <button type="button" onClick={() => setContractors(prev => [...prev, { name:'', workers_count:0 }])}
                    className="btn-ghost text-xs"><Plus className="w-3.5 h-3.5" /> Agregar</button>
                </div>
                {contractors.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4 rounded-lg border border-dashed border-border">
                    Sin contratistas externos hoy
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contractors.map((c, idx) => (
                      <ContractorRow key={idx} value={c} subcontracts={subcontracts} suppliers={suppliers}
                        onChange={val => setContractors(prev => prev.map((x, i) => i === idx ? val : x))}
                        onRemove={() => setContractors(prev => prev.filter((_, i) => i !== idx))} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        <div className="p-5 border-t border-border shrink-0 flex gap-3">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
          <button type="submit" form="report-form" disabled={saveMut.isPending} className="btn-primary flex-1 justify-center">
            {saveMut.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              : <><FileText className="w-4 h-4" /> {isEdit ? 'Guardar cambios' : 'Guardar Reporte'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Report Card ──────────────────────────────────────────────
function ReportCard({ report, workId, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const { toast } = useUIStore()
  const qc = useQueryClient()

  const removePhotoMut = useMutation({
    mutationFn: (pid) => reportsApi.removePhoto(workId, report.id, pid),
    onSuccess:  () => { qc.invalidateQueries(['daily-reports', workId]); toast({ title: 'Foto eliminada' }) },
  })

  const WeatherIcon  = WEATHER_OPTIONS.find(w => w.value === report.weather)?.icon || Sun
  const weatherColor = WEATHER_OPTIONS.find(w => w.value === report.weather)?.color || 'text-muted-foreground'
  const isToday      = report.report_date?.substring(0,10) === TODAY

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
              {isToday && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-400">Hoy</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {report.workers_count || 0} trabajadores
              </span>
              {report.purchases?.length > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <ShoppingCart className="w-3 h-3" />
                  {report.purchases.length} compra(s) · {formatCurrency(report.purchases.reduce((s,p) => s + parseFloat(p.total||0), 0))}
                </span>
              )}
              {report.photos?.length > 0 && (
                <span className="flex items-center gap-1 text-blue-400">
                  <Camera className="w-3 h-3" /> {report.photos.length} foto(s)
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(report)} className="btn-ghost p-1.5 text-xs" title="Editar reporte">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setExpanded(!expanded)} className="btn-ghost p-1.5">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
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
                Compras del día ({report.purchases.length})
              </p>
              <div className="space-y-1.5">
                {report.purchases.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{p.description}</span>
                    <div className="flex items-center gap-3 text-muted-foreground shrink-0">
                      <span>{p.quantity} {p.unit}</span>
                      <span className="font-num text-amber-400">{formatCurrency(p.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contractors */}
          {report.contractors?.length > 0 && (
            <div className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Contratistas presentes ({report.contractors.length})
              </p>
              <div className="space-y-1.5">
                {report.contractors.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{c.activity || c.supplier?.name || '—'}</span>
                    <span className="text-foreground">{c.workers_count || 0} trab.</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
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

// ── Main ReportsTab ──────────────────────────────────────────
export default function ReportsTab({ workId }) {
  const [page, setPage]           = useState(1)
  const [modal, setModal]         = useState(null)  // null | 'new' | report-object (editar)

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

  // Detectar si ya existe reporte de hoy
  const todayReport = reports.find(r => r.report_date?.substring(0,10) === TODAY)

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Reportes totales',         value: stats.total_reports },
            { label: 'Esta semana',              value: stats.reports_last_week },
            { label: 'Trab. propios prom.',      value: Math.round(parseFloat(stats.avg_workers || 0)) },
            { label: 'Trab. contratistas prom.', value: Math.round(parseFloat(stats.avg_contractor_workers || 0)) },
            { label: 'Total compras campo',      value: formatCurrency(stats.total_purchases) },
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
        {todayReport ? (
          <button onClick={() => setModal(todayReport)} className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700">
            <Pencil className="w-3.5 h-3.5" /> Editar reporte de hoy
          </button>
        ) : (
          <button onClick={() => setModal('new')} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" /> Nuevo Reporte
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card p-5 shimmer h-28 rounded-xl" />)}</div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 glass-card">
          <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">Sin reportes registrados</p>
          <p className="text-xs text-muted-foreground mt-1">Registra el primer reporte del día</p>
          <button onClick={() => setModal('new')} className="btn-primary mt-4 text-xs">
            <Plus className="w-3.5 h-3.5" /> Nuevo Reporte
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <ReportCard key={report.id} report={report} workId={workId} onEdit={setModal} />
          ))}
        </div>
      )}

      {/* Paginación */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={!pagination.hasPrev} onClick={() => setPage(p => p-1)}
            className="btn-ghost text-xs disabled:opacity-40">Anterior</button>
          <span className="text-xs text-muted-foreground font-num">{pagination.page} / {pagination.totalPages}</span>
          <button disabled={!pagination.hasNext} onClick={() => setPage(p => p+1)}
            className="btn-ghost text-xs disabled:opacity-40">Siguiente</button>
        </div>
      )}

      {/* Modal crear o editar */}
      {modal && (
        <ReportModal
          workId={workId}
          report={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
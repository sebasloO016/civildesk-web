import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { productsApi } from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { useForm } from 'react-hook-form'
import {
  Plus, Search, Edit2, Trash2, X, Loader2,
  Package, Upload, Download, FileSpreadsheet,
  CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  ChevronRight, Info, Tag, Ruler, DollarSign,
} from 'lucide-react'
import { formatCurrency, cn } from '../../utils/helpers'

// ── Constants ─────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'estructural', label: 'Estructural',  color: 'text-blue-400  bg-blue-500/15' },
  { value: 'eléctrico',   label: 'Eléctrico',    color: 'text-amber-400 bg-amber-500/15' },
  { value: 'plomería',    label: 'Plomería',     color: 'text-cyan-400  bg-cyan-500/15' },
  { value: 'acabados',    label: 'Acabados',     color: 'text-emerald-400 bg-emerald-500/15' },
  { value: 'muebles',     label: 'Muebles',      color: 'text-purple-400 bg-purple-500/15' },
  { value: 'herramienta', label: 'Herramienta',  color: 'text-orange-400 bg-orange-500/15' },
  { value: 'otros',       label: 'Otros',        color: 'text-slate-400  bg-slate-500/15' },
]

const UNITS = ['saco','unidad','metro','m²','m³','kg','ton','galón','litro',
               'rollo','plancha','punto','global','hora','día','ml']

const catConfig = (cat) =>
  CATEGORIES.find(c => c.value === cat) || { label: cat || 'Otros', color: 'text-slate-400 bg-slate-500/15' }

// ── Template columns for Excel ────────────────────────────────
const TEMPLATE_COLS = [
  { key:'code',            label:'Código',            example:'CEM-001',                    hint:'Código interno. Opcional pero recomendado.' },
  { key:'name',            label:'Nombre',            example:'Cemento Portland 50kg',      hint:'Nombre completo. REQUERIDO.' },
  { key:'unit',            label:'Unidad',            example:'saco',                       hint:'saco | unidad | metro | m² | m³ | kg | galón | litro | rollo | plancha | punto | global | hora | día' },
  { key:'category',        label:'Categoría',         example:'estructural',                hint:'estructural | eléctrico | plomería | acabados | muebles | herramienta | otros' },
  { key:'reference_price', label:'Precio Referencia', example:'9.50',                       hint:'Precio base de referencia. Solo números.' },
  { key:'supplier_name',   label:'Proveedor',         example:'Ferretería El Constructor',  hint:'Nombre exacto del proveedor ya registrado en el sistema.' },
  { key:'supplier_price',  label:'Precio Proveedor',  example:'9.20',                       hint:'Precio de ese proveedor. Requiere que el proveedor exista.' },
]

const downloadTemplate = () => {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_COLS.map(c => c.label),
    TEMPLATE_COLS.map(c => c.example),
    ['VAR-002','Varilla corrugada 12mm','unidad','estructural','14.80','Ferretería El Constructor','14.50'],
    ['PIN-001','Pintura interior látex galón','galón','acabados','12.50','Maderera Ambato S.A.','12.00'],
  ])
  ws['!cols'] = [{ wch:12 },{ wch:35 },{ wch:10 },{ wch:14 },{ wch:18 },{ wch:35 },{ wch:18 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Productos')

  const wsInfo = XLSX.utils.aoa_to_sheet([
    ['INSTRUCCIONES — CivilDesk Importación de Productos'],
    [''],
    ...TEMPLATE_COLS.map(c => [`${c.label}`, c.hint]),
    [''],
    ['NOTAS:'],
    ['• Nombre es obligatorio. El resto son opcionales.'],
    ['• El sistema detecta duplicados por Código o Nombre (no distingue mayúsculas).'],
    ['• Si el producto ya existe → actualiza precio de referencia.'],
    ['• Proveedor debe existir en el sistema para vincular el precio.'],
    ['• Elimina las filas de ejemplo antes de importar.'],
  ])
  wsInfo['!cols'] = [{ wch:22 },{ wch:85 }]
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Instrucciones')
  XLSX.writeFile(wb, 'CivilDesk_Plantilla_Productos.xlsx')
}

const parseExcel = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const wb   = XLSX.read(e.target.result, { type: 'binary' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
      const colMap = {
        'Código':'code', 'Nombre':'name', 'Unidad':'unit', 'Categoría':'category',
        'Precio Referencia':'reference_price', 'Proveedor':'supplier_name', 'Precio Proveedor':'supplier_price',
      }
      const rows = data.map(row => {
        const m = {}
        Object.entries(row).forEach(([k, v]) => { const key = colMap[k.trim()]; if (key) m[key] = String(v).trim() })
        return m
      }).filter(r => r.name)
      resolve(rows)
    } catch { reject(new Error('No se pudo leer el archivo. ¿Es un Excel válido?')) }
  }
  reader.onerror = () => reject(new Error('Error al leer el archivo'))
  reader.readAsBinaryString(file)
})

// ── Product Form Modal ────────────────────────────────────────
function ProductModal({ product, onClose }) {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const isEdit = !!product

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: product || { code:'', name:'', unit:'unidad', category:'otros', reference_price:0, description:'' }
  })

  const saveMut = useMutation({
    mutationFn: (d) => isEdit ? productsApi.update(product.id, d) : productsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries(['products'])
      toast({ title: isEdit ? 'Producto actualizado' : 'Producto creado', variant: 'success' })
      onClose()
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 glass-card animate-fade-up">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display font-bold text-foreground">
            {isEdit ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit(d => saveMut.mutate(d))} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Código</label>
              <input className="field-input mt-1" placeholder="CEM-001"
                {...register('code')} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Nombre *</label>
              <input className={cn('field-input mt-1', errors.name && 'border-rose-500')}
                placeholder="Cemento Portland 50kg"
                {...register('name', { required: true })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Unidad *</label>
              <select className="field-input mt-1" {...register('unit', { required: true })}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Categoría</label>
              <select className="field-input mt-1" {...register('category')}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Precio de Referencia</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input type="number" step="0.01" min="0"
                className="field-input pl-7"
                placeholder="0.00"
                {...register('reference_price', { valueAsNumber: true })} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Precio orientativo interno. Los precios por proveedor se gestionan en el módulo Proveedores.
            </p>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Descripción</label>
            <textarea rows={2} className="field-input mt-1 resize-none"
              placeholder="Especificaciones adicionales..."
              {...register('description')} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={saveMut.isPending} className="btn-primary flex-1 justify-center">
              {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Products List Tab ─────────────────────────────────────────
function ProductsListTab() {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('')
  const [page,     setPage]     = useState(1)
  const [modal,    setModal]    = useState(null) // null | 'new' | product object

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search, category],
    queryFn:  () => productsApi.getAll({ page, limit: 15, search: search || undefined, category: category || undefined }),
    keepPreviousData: true,
  })

  const removeMut = useMutation({
    mutationFn: (id) => productsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries(['products']); toast({ title: 'Producto eliminado' }) },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const products   = data?.data?.data        || []
  const pagination = data?.data?.pagination

  const confirmRemove = (product) => {
    if (window.confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) {
      removeMut.mutate(product.id)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por nombre o código..."
            className="field-input pl-9 text-sm"
          />
        </div>
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1) }}
          className="field-input text-sm w-44">
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <button onClick={() => setModal('new')} className="btn-primary shrink-0">
          <Plus className="w-4 h-4" /> Nuevo Producto
        </button>
      </div>

      {/* Stats row */}
      {pagination && (
        <p className="text-xs text-muted-foreground">
          {pagination.total} producto{pagination.total !== 1 ? 's' : ''} encontrado{pagination.total !== 1 ? 's' : ''}
          {category && ` en ${catConfig(category).label}`}
          {search && ` · búsqueda: "${search}"`}
        </p>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="glass-card p-4 shimmer h-14 rounded-xl" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 glass-card">
          <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">
            {search || category ? 'Sin resultados para esta búsqueda' : 'Sin productos registrados'}
          </p>
          <button onClick={() => setModal('new')} className="btn-primary mt-4 text-xs">
            <Plus className="w-3.5 h-3.5" /> Crear primer producto
          </button>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Código</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Unidad</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Categoría</th>
                <th className="px-4 py-3 text-right text-xs text-muted-foreground uppercase tracking-wider">P. Referencia</th>
                <th className="px-4 py-3 text-center text-xs text-muted-foreground uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => {
                const cat = catConfig(product.category)
                return (
                  <tr key={product.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors group">
                    <td className="px-4 py-3">
                      {product.code
                        ? <span className="font-mono text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">{product.code}</span>
                        : <span className="text-muted-foreground/40 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-foreground">{product.name}</span>
                      {product.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">{product.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Ruler className="w-3 h-3" /> {product.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge text-xs', cat.color)}>{cat.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-num text-sm text-amber-400 font-semibold">
                        {product.reference_price > 0 ? formatCurrency(product.reference_price) : <span className="text-muted-foreground/40">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setModal(product)}
                          className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-400">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => confirmRemove(product)}
                          disabled={removeMut.isPending}
                          className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-400 hover:bg-rose-500/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={!pagination.hasPrev} onClick={() => setPage(p => p-1)}
            className="btn-ghost text-xs disabled:opacity-40">Anterior</button>
          <span className="text-xs text-muted-foreground font-num">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button disabled={!pagination.hasNext} onClick={() => setPage(p => p+1)}
            className="btn-ghost text-xs disabled:opacity-40">Siguiente</button>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ── Import Tab ────────────────────────────────────────────────
function ImportTab() {
  const qc      = useQueryClient()
  const { toast } = useUIStore()
  const fileRef = useRef(null)

  const [rows,     setRows]     = useState([])
  const [filename, setFilename] = useState('')
  const [results,  setResults]  = useState(null)
  const [step,     setStep]     = useState('idle')

  const importMut = useMutation({
    mutationFn: (rows) => productsApi.import(rows),
    onSuccess: (res) => {
      setResults(res.data?.data)
      setStep('done')
      qc.invalidateQueries(['products'])
    },
    onError: (e) => {
      toast({ title: 'Error en importación', description: e.response?.data?.message, variant: 'destructive' })
      setStep('preview')
    },
  })

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({ title: 'Archivo no válido', description: 'Solo .xlsx, .xls o .csv', variant: 'destructive' })
      return
    }
    try {
      const parsed = await parseExcel(file)
      setRows(parsed); setFilename(file.name); setResults(null); setStep('preview')
    } catch (err) {
      toast({ title: 'Error al leer archivo', description: err.message, variant: 'destructive' })
    }
    e.target.value = ''
  }

  const reset = () => { setRows([]); setFilename(''); setResults(null); setStep('idle') }
  const validRows = rows.filter(r => r.name?.trim())

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Steps */}
      <div className="flex items-center gap-2">
        {['idle','preview','done'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              step === s ? 'bg-primary text-primary-foreground' :
              ['preview','done'].indexOf(step) > ['preview','done'].indexOf(s)
                ? 'bg-emerald-500/15 text-emerald-400' : 'bg-secondary text-muted-foreground'
            )}>
              {i+1}. {s === 'idle' ? 'Preparar' : s === 'preview' ? 'Revisar' : 'Resultado'}
            </div>
            {i < 2 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* IDLE */}
      {step === 'idle' && (
        <div className="space-y-4">
          <div className="glass-card p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">1. Descarga la plantilla</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Incluye las columnas correctas, 3 ejemplos y una hoja de instrucciones.
              </p>
              <button onClick={downloadTemplate} className="btn-primary text-sm">
                <Download className="w-4 h-4" /> Descargar Plantilla Excel
              </button>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" /> Columnas del archivo
            </h3>
            <div className="space-y-1.5">
              {TEMPLATE_COLS.map(col => (
                <div key={col.key} className="flex gap-3 p-2.5 rounded-lg bg-secondary/40 text-xs">
                  <span className="w-32 shrink-0 font-medium text-foreground">
                    {col.label}{col.key === 'name' && <span className="text-rose-400 ml-1">*</span>}
                  </span>
                  <span className="text-muted-foreground flex-1">{col.hint}</span>
                  <span className="font-mono text-amber-400 shrink-0">{col.example}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            className="glass-card p-10 flex flex-col items-center cursor-pointer border-2
                       border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all group">
            <Upload className="w-9 h-9 text-muted-foreground/40 group-hover:text-primary/60 mb-3 transition-colors" />
            <p className="font-semibold text-foreground">2. Sube tu archivo Excel</p>
            <p className="text-sm text-muted-foreground mt-1">.xlsx · .xls · .csv</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-foreground">{filename}</p>
                <p className="text-xs text-muted-foreground">
                  {validRows.length} filas válidas
                  {rows.length - validRows.length > 0 && ` · ${rows.length - validRows.length} sin nombre (ignoradas)`}
                  {rows.filter(r => r.supplier_name).length > 0 && ` · ${rows.filter(r => r.supplier_name).length} con proveedor`}
                </p>
              </div>
            </div>
            <button onClick={reset} className="btn-ghost text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Cambiar
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-3 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Vista previa — primeras {Math.min(validRows.length, 8)} filas
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    {TEMPLATE_COLS.map(c => (
                      <th key={c.key} className="px-3 py-2 text-left text-muted-foreground whitespace-nowrap">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validRows.slice(0, 8).map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/20">
                      {TEMPLATE_COLS.map(c => (
                        <td key={c.key} className="px-3 py-2 max-w-[150px] truncate text-foreground">
                          {row[c.key] || <span className="text-muted-foreground/40">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button
              onClick={() => { setStep('done'); importMut.mutate(validRows) }}
              disabled={!validRows.length || importMut.isPending}
              className="btn-primary flex-1 justify-center">
              {importMut.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
                : <><Upload className="w-4 h-4" /> Importar {validRows.length} productos</>}
            </button>
          </div>
        </div>
      )}

      {/* DONE */}
      {step === 'done' && (
        <div className="space-y-4">
          {importMut.isPending ? (
            <div className="glass-card p-12 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4" />
              <p className="font-semibold text-foreground">Importando productos...</p>
            </div>
          ) : results && (
            <>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label:'Creados',      value:results.created,           color:'text-emerald-400', bg:'bg-emerald-500/15', Icon:CheckCircle2 },
                  { label:'Actualizados', value:results.updated,           color:'text-blue-400',    bg:'bg-blue-500/15',    Icon:RefreshCw },
                  { label:'Sin cambios',  value:results.skipped,           color:'text-muted-foreground', bg:'bg-secondary', Icon:Package },
                  { label:'Errores',      value:results.errors?.length||0, color:'text-rose-400',    bg:'bg-rose-500/15',    Icon:XCircle },
                ].map(s => (
                  <div key={s.label} className="glass-card p-4">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center mb-2', s.bg)}>
                      <s.Icon className={cn('w-3.5 h-3.5', s.color)} />
                    </div>
                    <p className={cn('font-num text-2xl font-bold', s.color)}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {results.errors?.length > 0 && (
                <div className="glass-card overflow-hidden">
                  <div className="p-3 border-b border-border">
                    <p className="text-xs font-semibold text-rose-400">Filas con error</p>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="px-3 py-2 text-left text-muted-foreground">Fila</th>
                        <th className="px-3 py-2 text-left text-muted-foreground">Nombre</th>
                        <th className="px-3 py-2 text-left text-muted-foreground">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.errors.map((e, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-3 py-2 font-num text-muted-foreground">{e.row}</td>
                          <td className="px-3 py-2 text-foreground">{e.name}</td>
                          <td className="px-3 py-2 text-rose-400">{e.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={reset} className="btn-ghost flex-1 justify-center">
                  <Upload className="w-4 h-4" /> Importar otro archivo
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ProductsPage ─────────────────────────────────────────
export default function ProductsPage() {
  const [tab, setTab] = useState('list')

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-display font-bold text-foreground">Productos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Catálogo de materiales con precios de referencia y por proveedor
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl w-fit animate-fade-up-200">
        {[
          { key:'list',   label:'Listado',          Icon:Package },
          { key:'import', label:'Importar Excel',   Icon:FileSpreadsheet },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}>
            <t.Icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-up-200">
        {tab === 'list'   && <ProductsListTab />}
        {tab === 'import' && <ImportTab />}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { useForm } from 'react-hook-form'
import {
  BookOpen, Plus, Search, Tag, Pencil, Trash2,
  ChevronRight, X, DollarSign, Layers,
} from 'lucide-react'
import { formatCurrency, cn } from '../../utils/helpers'

// ── API helpers ───────────────────────────────────────────────
const catalogApi = {
  getCategories: ()       => api.get('/catalog/categories'),
  createCategory:(data)   => api.post('/catalog/categories', data),
  updateCategory:(id,data)=> api.put(`/catalog/categories/${id}`, data),
  deleteCategory:(id)     => api.delete(`/catalog/categories/${id}`),
  getAll:        (params) => api.get('/catalog', { params }),
  create:        (data)   => api.post('/catalog', data),
  update:        (id,data)=> api.put(`/catalog/${id}`, data),
  remove:        (id)     => api.delete(`/catalog/${id}`),
  getStats:      ()       => api.get('/catalog/stats'),
}

const UNITS = ['m²','m³','ml','kg','ton','unidad','saco','galón','litro',
               'rollo','plancha','punto','global','hora','día']

const COLORS = ['#1E5C8E','#17713A','#B85A0A','#5427A0','#0E7090',
                '#C0392B','#D4920A','#2C3E50','#8E44AD','#27AE60']

// ── Color dot ────────────────────────────────────────────────
const ColorDot = ({ color, size = 'w-3 h-3' }) => (
  <span className={cn('rounded-full inline-block shrink-0', size)}
    style={{ background: color || '#1E5C8E' }} />
)

// ── Category badge ────────────────────────────────────────────
const CatBadge = ({ cat }) => (
  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium"
    style={{ background: `${cat?.color || '#1E5C8E'}20`, color: cat?.color || '#1E5C8E' }}>
    <ColorDot color={cat?.color} />
    {cat?.name}
  </span>
)

export default function CatalogPage() {
  const qc = useQueryClient()
  const { toast, openModal, closeModal, activeModal } = useUIStore()
  const [search, setSearch]     = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [page, setPage]         = useState(1)
  const [editRubro, setEditRubro] = useState(null)
  const [editCat, setEditCat]   = useState(null)

  const { data: catsData } = useQuery({
    queryKey: ['catalog-categories'],
    queryFn:  () => catalogApi.getCategories(),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['catalog-rubros', { search, catFilter, page }],
    queryFn:  () => catalogApi.getAll({ search, category_id: catFilter, page, limit: 20 }),
  })

  const { data: statsData } = useQuery({
    queryKey: ['catalog-stats'],
    queryFn:  () => catalogApi.getStats(),
  })

  const categories = catsData?.data?.data || []
  const rubros     = data?.data?.data     || []
  const pagination = data?.data?.pagination
  const stats      = statsData?.data?.data || []

  // ── Forms ─────────────────────────────────────────────────
  const rubroForm = useForm()
  const catForm   = useForm()

  // ── Mutations ─────────────────────────────────────────────
  const createRubroMut = useMutation({
    mutationFn: (d) => catalogApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries(['catalog-rubros'])
      qc.invalidateQueries(['catalog-stats'])
      closeModal(); rubroForm.reset()
      toast({ title: 'Rubro creado', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const updateRubroMut = useMutation({
    mutationFn: ({ id, data }) => catalogApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['catalog-rubros'])
      setEditRubro(null); closeModal()
      toast({ title: 'Rubro actualizado', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const removeRubroMut = useMutation({
    mutationFn: (id) => catalogApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries(['catalog-rubros'])
      qc.invalidateQueries(['catalog-stats'])
      toast({ title: 'Rubro eliminado', variant: 'default' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const createCatMut = useMutation({
    mutationFn: (d) => catalogApi.createCategory(d),
    onSuccess: () => {
      qc.invalidateQueries(['catalog-categories'])
      qc.invalidateQueries(['catalog-stats'])
      closeModal(); catForm.reset()
      toast({ title: 'Categoría creada', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const updateCatMut = useMutation({
    mutationFn: ({ id, data }) => catalogApi.updateCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['catalog-categories'])
      setEditCat(null); closeModal()
      toast({ title: 'Categoría actualizada', variant: 'success' })
    },
  })

  const deleteCatMut = useMutation({
    mutationFn: (id) => catalogApi.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries(['catalog-categories'])
      qc.invalidateQueries(['catalog-stats'])
      toast({ title: 'Categoría eliminada', variant: 'default' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const openEditRubro = (rubro) => {
    setEditRubro(rubro)
    rubroForm.reset({
      name:            rubro.name,
      code:            rubro.code,
      unit:            rubro.unit,
      reference_price: rubro.reference_price,
      description:     rubro.description,
      category_id:     rubro.category_id,
    })
    openModal('editRubro')
  }

  const openEditCat = (cat) => {
    setEditCat(cat)
    catForm.reset({ name: cat.name, color: cat.color, description: cat.description })
    openModal('editCat')
  }

  const onRubroSubmit = (data) => {
    const payload = { ...data, reference_price: parseFloat(data.reference_price) || 0 }
    if (editRubro) updateRubroMut.mutate({ id: editRubro.id, data: payload })
    else           createRubroMut.mutate(payload)
  }

  const onCatSubmit = (data) => {
    if (editCat) updateCatMut.mutate({ id: editCat.id, data })
    else         createCatMut.mutate(data)
  }

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div className="section-header animate-fade-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Catálogo de Rubros</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Banco de rubros reutilizables para presupuestar obras más rápido
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { openModal('createCat') }} className="btn-ghost">
            <Tag className="w-4 h-4" /> Nueva Categoría
          </button>
          <button onClick={() => { setEditRubro(null); rubroForm.reset(); openModal('createRubro') }}
            className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo Rubro
          </button>
        </div>
      </div>

      {/* Stats por categoría */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up-200">
          {stats.slice(0, 4).map(s => (
            <div key={s.id} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <ColorDot color={s.color} size="w-2.5 h-2.5" />
                <span className="text-xs font-medium text-foreground">{s.name}</span>
              </div>
              <p className="font-num text-xl font-bold text-foreground">{s.rubro_count || 0}</p>
              <p className="text-xs text-muted-foreground">rubros</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 animate-fade-up-200">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar rubro..." className="field-input pl-9" />
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-1 glass-card p-1 rounded-lg flex-wrap">
          <button
            onClick={() => { setCatFilter(''); setPage(1) }}
            className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              !catFilter ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            Todos
          </button>
          {categories.map(cat => (
            <button key={cat.id}
              onClick={() => { setCatFilter(catFilter === String(cat.id) ? '' : String(cat.id)); setPage(1) }}
              className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5',
                catFilter === String(cat.id) ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              <ColorDot color={cat.color} />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main grid: sidebar categorías + tabla rubros */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 animate-fade-up-200">

        {/* Sidebar categorías */}
        <div className="glass-card p-4 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm text-foreground">Categorías</h3>
            <button onClick={() => { setEditCat(null); catForm.reset({ color: COLORS[0] }); openModal('createCat') }}
              className="btn-ghost p-1.5">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sin categorías</p>
            ) : categories.map(cat => (
              <div key={cat.id}
                className={cn('flex items-center justify-between p-2.5 rounded-lg cursor-pointer group transition-all',
                  catFilter === String(cat.id) ? 'bg-secondary' : 'hover:bg-secondary/50')}
                onClick={() => setCatFilter(catFilter === String(cat.id) ? '' : String(cat.id))}>
                <div className="flex items-center gap-2 min-w-0">
                  <ColorDot color={cat.color} />
                  <span className="text-xs font-medium text-foreground truncate">{cat.name}</span>
                  <span className="text-[10px] text-muted-foreground font-num shrink-0">
                    ({cat.rubros?.length || 0})
                  </span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); openEditCat(cat) }}
                    className="p-1 hover:text-amber-400 text-muted-foreground transition-colors">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteCatMut.mutate(cat.id) }}
                    className="p-1 hover:text-rose-400 text-muted-foreground transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabla rubros */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="glass-card p-8 space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="shimmer h-10 rounded" />)}
            </div>
          ) : rubros.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center py-16">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No hay rubros en el catálogo</p>
              <button onClick={() => { setEditRubro(null); rubroForm.reset(); openModal('createRubro') }}
                className="btn-primary mt-4 text-xs">
                <Plus className="w-3.5 h-3.5" /> Crear primer rubro
              </button>
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Código','Nombre','Categoría','Unidad','Precio Ref.',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rubros.map(rubro => (
                    <tr key={rubro.id} className="table-row group">
                      <td className="px-4 py-3 font-mono text-muted-foreground text-[10px]">
                        {rubro.code || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{rubro.name}</p>
                        {rubro.description && (
                          <p className="text-muted-foreground mt-0.5 line-clamp-1">{rubro.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {rubro.category ? <CatBadge cat={rubro.category} /> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{rubro.unit}</td>
                      <td className="px-4 py-3 font-num font-semibold text-amber-400">
                        {formatCurrency(rubro.reference_price)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditRubro(rubro)}
                            className="btn-ghost p-1.5 text-xs">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => removeRubroMut.mutate(rubro.id)}
                            className="btn-ghost p-1.5 text-xs hover:text-rose-400 hover:bg-rose-500/10">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
                  <button disabled={!pagination.hasPrev} onClick={() => setPage(p=>p-1)}
                    className="btn-ghost disabled:opacity-40">Anterior</button>
                  <span className="text-xs text-muted-foreground font-num">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button disabled={!pagination.hasNext} onClick={() => setPage(p=>p+1)}
                    className="btn-ghost disabled:opacity-40">Siguiente</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL: Crear/Editar Rubro ─────────────────────────── */}
      {(activeModal?.name === 'createRubro' || activeModal?.name === 'editRubro') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-lg mx-4 glass-card p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg text-foreground">
                {editRubro ? 'Editar Rubro' : 'Nuevo Rubro'}
              </h2>
              <button onClick={closeModal} className="btn-ghost p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={rubroForm.handleSubmit(onRubroSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Código</label>
                  <input className="field-input mt-1" placeholder="EST-001"
                    {...rubroForm.register('code')} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Categoría</label>
                  <select className="field-input mt-1" {...rubroForm.register('category_id')}>
                    <option value="">Sin categoría</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Nombre *</label>
                <input className={cn('field-input mt-1', rubroForm.formState.errors.name && 'border-rose-500')}
                  placeholder="Ej: Hormigón armado columnas"
                  {...rubroForm.register('name', { required: true })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Descripción</label>
                <textarea rows={2} className="field-input mt-1 resize-none text-xs"
                  placeholder="Descripción técnica del rubro..."
                  {...rubroForm.register('description')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Unidad *</label>
                  <select className={cn('field-input mt-1', rubroForm.formState.errors.unit && 'border-rose-500')}
                    {...rubroForm.register('unit', { required: true })}>
                    <option value="">Seleccionar...</option>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Precio referencia</label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input type="number" step="0.01" className="field-input pl-8"
                      placeholder="0.00"
                      {...rubroForm.register('reference_price')} />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">
                  Cancelar
                </button>
                <button type="submit"
                  disabled={createRubroMut.isPending || updateRubroMut.isPending}
                  className="btn-primary flex-1 justify-center">
                  {createRubroMut.isPending || updateRubroMut.isPending
                    ? 'Guardando...'
                    : editRubro ? 'Guardar cambios' : 'Crear Rubro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Crear/Editar Categoría ─────────────────────── */}
      {(activeModal?.name === 'createCat' || activeModal?.name === 'editCat') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-sm mx-4 glass-card p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg text-foreground">
                {editCat ? 'Editar Categoría' : 'Nueva Categoría'}
              </h2>
              <button onClick={closeModal} className="btn-ghost p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={catForm.handleSubmit(onCatSubmit)} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Nombre *</label>
                <input className={cn('field-input mt-1', catForm.formState.errors.name && 'border-rose-500')}
                  placeholder="Ej: Estructura, Acabados, Instalaciones..."
                  {...catForm.register('name', { required: true })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Color</label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} type="button"
                      onClick={() => catForm.setValue('color', c)}
                      className={cn('w-7 h-7 rounded-full transition-all',
                        catForm.watch('color') === c ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110' : '')}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">
                  Cancelar
                </button>
                <button type="submit"
                  disabled={createCatMut.isPending || updateCatMut.isPending}
                  className="btn-primary flex-1 justify-center">
                  {createCatMut.isPending || updateCatMut.isPending
                    ? 'Guardando...'
                    : editCat ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

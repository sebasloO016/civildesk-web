import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { suppliersApi, productsApi } from '../../services/api'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { useForm } from 'react-hook-form'
import {
  Plus, Search, Truck, Star, Phone, Mail,
  TrendingUp, TrendingDown, X, BarChart2, History,
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '../../utils/helpers'

const TABS = [
  { key: 'directory', label: 'Directorio',           icon: Truck },
  { key: 'compare',   label: 'Comparador de Precios', icon: BarChart2 },
  { key: 'history',   label: 'Historial de Precios',  icon: History },
]

// ── Directory Tab ─────────────────────────────────────────────
function DirectoryTab() {
  const qc = useQueryClient()
  const { toast, openModal, closeModal, activeModal } = useUIStore()
  const [search, setSearch] = useState('')
  const [page, setPage]     = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', { search, page }],
    queryFn:  () => suppliersApi.getAll({ search, page, limit: 16 }),
  })

  const suppliers  = data?.data?.data || []
  const pagination = data?.data?.pagination
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const createMutation = useMutation({
    mutationFn: (d) => suppliersApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries(['suppliers'])
      closeModal(); reset()
      toast({ title: 'Proveedor creado', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const categories = ['ferretería','eléctrico','plomería','acabados','muebles','estructural','otros']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{pagination?.total || 0} proveedores</p>
        <button onClick={() => openModal('createSupplier')} className="btn-primary text-xs">
          <Plus className="w-3.5 h-3.5" /> Nuevo Proveedor
        </button>
      </div>

      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar proveedor..." className="field-input pl-9" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="glass-card p-5 shimmer h-40 rounded-xl" />)}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 glass-card">
          <Truck className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">No se encontraron proveedores</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {suppliers.map(supplier => (
            <div key={supplier.id} className="glass-card p-5 hover:shadow-card-hover
                                              hover:border-navy-600 transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <span className="badge bg-navy-700/50 text-muted-foreground border border-border text-[10px]">
                  {supplier.category || 'General'}
                </span>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-num text-amber-400">
                    {parseFloat(supplier.rating || 5).toFixed(1)}
                  </span>
                </div>
              </div>
              <h3 className="font-display font-semibold text-foreground text-sm mb-1 line-clamp-2">
                {supplier.name}
              </h3>
              {supplier.contact_name && (
                <p className="text-xs text-muted-foreground mb-3">{supplier.contact_name}</p>
              )}
              <div className="space-y-1.5 pt-3 border-t border-border">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span className="truncate">{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
              </div>
            </div>
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

      {activeModal?.name === 'createSupplier' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-lg mx-4 glass-card p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg text-foreground">Nuevo Proveedor</h2>
              <button onClick={closeModal} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Nombre / Empresa *</label>
                  <input className={cn('field-input mt-1', errors.name && 'border-rose-500')}
                    {...register('name', { required: true })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">RUC / Cédula</label>
                  <input className="field-input mt-1" {...register('ruc')} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Categoría</label>
                  <select className="field-input mt-1" {...register('category')}>
                    <option value="">Seleccionar...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Contacto</label>
                  <input className="field-input mt-1" {...register('contact_name')} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Teléfono</label>
                  <input className="field-input mt-1" {...register('phone')} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Email</label>
                  <input type="email" className="field-input mt-1" {...register('email')} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 justify-center">
                  {createMutation.isPending ? 'Guardando...' : 'Crear Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Price Comparator Tab ──────────────────────────────────────
function ComparatorTab() {
  const [selectedProduct, setSelectedProduct] = useState('')
  const [search, setSearch] = useState('')

  const { data: productsData } = useQuery({
    queryKey: ['products-comparator', search],
    queryFn:  () => productsApi.getAll({ search, limit: 50 }),
  })

  const { data: compareData, isLoading: comparing } = useQuery({
    queryKey: ['price-compare', selectedProduct],
    queryFn:  () => api.get(`/suppliers/compare/${selectedProduct}`),
    enabled:  !!selectedProduct,
  })

  const products = productsData?.data?.data || []
  const prices   = compareData?.data?.data  || []
  const selectedProd = products.find(p => String(p.id) === String(selectedProduct))

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <h3 className="font-display font-semibold text-foreground mb-1">Comparador de Precios</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Selecciona un producto para comparar el precio entre todos los proveedores registrados.
        </p>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Filtrar productos..." className="field-input pl-9" />
          </div>
          <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
            className="field-input flex-1 min-w-64">
            <option value="">— Seleccionar producto —</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.unit}) · Ref: {formatCurrency(p.reference_price)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedProduct && selectedProd && (
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">{selectedProd.name}</p>
            <p className="text-xs text-muted-foreground">Unidad: {selectedProd.unit} · Categoría: {selectedProd.category}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Precio referencia interno</p>
            <p className="font-num font-bold text-lg text-foreground">{formatCurrency(selectedProd.reference_price)}</p>
          </div>
        </div>
      )}

      {selectedProduct && (
        comparing ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card p-5 shimmer h-24 rounded-xl" />)}</div>
        ) : prices.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-12">
            <BarChart2 className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Ningún proveedor tiene precio registrado para este producto</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prices.map((row, idx) => {
              const pct         = parseFloat(row.vs_reference_pct || 0)
              const isCheapest  = row.is_cheapest === true || row.is_cheapest === 'true'
              const isExpensive = pct > 10
              const maxPrice    = Math.max(...prices.map(p => parseFloat(p.unit_price)))

              return (
                <div key={row.supplier_id}
                  className={cn('glass-card p-5', isCheapest && 'ring-1 ring-emerald-500/40')}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                        idx === 0 ? 'bg-emerald-500/20 text-emerald-400' :
                        idx === 1 ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-muted text-muted-foreground')}>
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">{row.supplier_name}</p>
                          {isCheapest && (
                            <span className="badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px]">
                              ✓ Más económico
                            </span>
                          )}
                          {isExpensive && (
                            <span className="badge bg-rose-500/15 text-rose-400 border border-rose-500/20 text-[10px]">
                              ↑ Precio alto
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            {parseFloat(row.rating || 5).toFixed(1)}
                          </span>
                          <span>Actualizado: {formatDate(row.last_updated)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-num text-2xl font-bold text-foreground">
                        {formatCurrency(row.unit_price)}
                      </p>
                      <p className="text-xs text-muted-foreground">por {selectedProd?.unit}</p>
                      {row.vs_reference_pct !== null && (
                        <div className={cn('flex items-center justify-end gap-1 text-xs font-semibold mt-0.5',
                          pct <= 0 ? 'text-emerald-400' : pct <= 10 ? 'text-amber-400' : 'text-rose-400')}>
                          {pct <= 0
                            ? <TrendingDown className="w-3 h-3" />
                            : <TrendingUp className="w-3 h-3" />}
                          {pct > 0 ? '+' : ''}{pct.toFixed(1)}% vs referencia
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual bar */}
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-700',
                        isCheapest ? 'bg-emerald-500' : isExpensive ? 'bg-rose-500' : 'bg-amber-500')}
                      style={{ width: `${Math.min(100, (parseFloat(row.unit_price) / maxPrice) * 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {!selectedProduct && (
        <div className="flex flex-col items-center justify-center py-16 glass-card">
          <BarChart2 className="w-12 h-12 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground">Selecciona un producto para comparar precios</p>
          <p className="text-xs text-muted-foreground mt-1">
            El sistema resaltará automáticamente el proveedor más económico
          </p>
        </div>
      )}
    </div>
  )
}

// ── Price History Tab ─────────────────────────────────────────
function HistoryTab() {
  const [selectedSupplier, setSelectedSupplier] = useState('')

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-select'],
    queryFn:  () => suppliersApi.getAll({ limit: 100 }),
  })

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['price-history', selectedSupplier],
    queryFn:  () => api.get(`/suppliers/${selectedSupplier}/price-history`),
    enabled:  !!selectedSupplier,
  })

  const suppliers = suppliersData?.data?.data || []
  const history   = historyData?.data?.data   || []

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <h3 className="font-display font-semibold text-foreground mb-1">Historial de Variaciones de Precio</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Detecta tendencias de inflación en materiales clave por proveedor.
        </p>
        <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}
          className="field-input max-w-xs">
          <option value="">— Seleccionar proveedor —</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {selectedSupplier && (
        isLoading ? (
          <div className="glass-card p-8 shimmer h-32 rounded-xl" />
        ) : history.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-12">
            <History className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Sin historial de cambios de precio</p>
            <p className="text-xs text-muted-foreground mt-1">
              Los cambios de precio se registran automáticamente cuando actualizas el precio de un producto
            </p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-display font-semibold text-sm text-foreground">
                Cambios de precio registrados
              </h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Fecha','Producto','Precio anterior','Precio nuevo','Variación','Impacto'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(h => {
                  const pct = parseFloat(h.variation_pct || 0)
                  return (
                    <tr key={h.id} className="table-row">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(h.recorded_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{h.product?.name || '—'}</td>
                      <td className="px-4 py-3 font-num text-muted-foreground line-through">
                        {formatCurrency(h.old_price)}
                      </td>
                      <td className="px-4 py-3 font-num font-semibold text-foreground">
                        {formatCurrency(h.new_price)}
                      </td>
                      <td className="px-4 py-3">
                        <div className={cn('flex items-center gap-1 font-semibold',
                          pct > 0 ? 'text-rose-400' : 'text-emerald-400')}>
                          {pct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('badge text-[10px]',
                          Math.abs(pct) > 15 ? 'bg-rose-500/15 text-rose-400' :
                          Math.abs(pct) > 5  ? 'bg-amber-500/15 text-amber-400' :
                                               'bg-emerald-500/15 text-emerald-400')}>
                          {Math.abs(pct) > 15 ? 'Alerta' : Math.abs(pct) > 5 ? 'Moderado' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {!selectedSupplier && (
        <div className="flex flex-col items-center justify-center py-16 glass-card">
          <History className="w-12 h-12 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground">Selecciona un proveedor para ver el historial</p>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function SuppliersList() {
  const [tab, setTab] = useState('directory')

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="section-header animate-fade-up">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Proveedores</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Directorio · Comparador de precios · Historial de variaciones
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 glass-card p-1 rounded-xl w-fit animate-fade-up-200">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <div className="animate-fade-up-200">
        {tab === 'directory' && <DirectoryTab />}
        {tab === 'compare'   && <ComparatorTab />}
        {tab === 'history'   && <HistoryTab />}
      </div>
    </div>
  )
}

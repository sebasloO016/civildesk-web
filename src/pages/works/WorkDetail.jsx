import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { worksApi } from '../../services/api'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import {
  ArrowLeft, HardHat, DollarSign, FileText,
  BarChart2, Calendar, Package, TrendingUp,
  AlertTriangle, CheckCircle2, Clock, Plus,
  Camera, ShoppingCart, Edit2, Trash2, X,
  Pencil, TrendingDown, Loader2,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts'
import {
  formatCurrency, formatPct, formatDate,
  workStatusLabel, progressColor, cn,
} from '../../utils/helpers'

import SubcontractsTab  from './SubcontractsTab'
import GanttTab          from './GanttTab'
import WorkStockTab      from './WorkStockTab'
import ReportsTab        from './ReportsTab'
import CertificatesTab   from './CertificatesTab'
import WorkFinanceTab    from './WorkFinanceTab'
import CloseWorkModal    from './CloseWorkModal'

const TABS = [
  { key: 'overview',      label: 'Resumen',       icon: HardHat },
  { key: 'budget',        label: 'Presupuesto',   icon: DollarSign },
  { key: 'reports',       label: 'Reportes',      icon: FileText },
  { key: 'subcontracts',  label: 'Subcontratos',  icon: TrendingUp },
  { key: 'certificates',  label: 'Certificados',  icon: CheckCircle2 },
  { key: 'stock',         label: 'Stock Obra',    icon: Package },
  { key: 'schedule',      label: 'Gantt',         icon: Calendar },
  { key: 'finance',       label: 'Finanzas',      icon: DollarSign },
]

const UNITS = ['m²','m³','ml','m','kg','ton','saco','unidad','rollo','plancha','galón','litro','punto','global','hora','día']

// ── Curve S Chart ─────────────────────────────────────────────
// ── Calcular planificado lineal dado una fecha y las fechas de la obra
function calcPlanned(dateStr, startDate, endDate) {
  if (!startDate || !endDate) return null
  const start   = new Date(startDate).getTime()
  const end     = new Date(endDate).getTime()
  const current = new Date(dateStr).getTime()
  if (end <= start) return null
  const pct = Math.min(100, Math.max(0, ((current - start) / (end - start)) * 100))
  return Math.round(pct * 10) / 10
}

function CurveSChart({ workId, work }) {
  const { data } = useQuery({
    queryKey: ['curve-s', workId],
    queryFn:  () => worksApi.getCurveS(workId),
  })
  const snapshots = data?.data?.data || []

  // Enriquecer snapshots con planificado calculado por fechas
  // y agregar punto de hoy si la obra sigue activa
  const today     = new Date().toISOString().substring(0, 10)
  const startDate = work?.start_date
  const endDate   = work?.estimated_end

  const enriched = snapshots.map(row => ({
    ...row,
    planned_progress: calcPlanned(row.snapshot_date, startDate, endDate),
  }))

  // Si la obra tiene fechas y no hay snapshot de hoy, agregar punto actual
  const hasToday = enriched.some(r => r.snapshot_date?.substring(0,10) === today)
  if (startDate && endDate && !hasToday && work?.status === 'ACTIVE') {
    enriched.push({
      snapshot_date:    today,
      actual_progress:  null,  // no hay snapshot real hoy
      planned_progress: calcPlanned(today, startDate, endDate),
    })
    enriched.sort((a, b) => a.snapshot_date > b.snapshot_date ? 1 : -1)
  }

  // Agregar punto 0% al inicio si no existe
  const rows = enriched.length > 0 ? enriched : []
  if (rows.length === 0 && startDate) {
    rows.push({
      snapshot_date: startDate,
      actual_progress: 0,
      planned_progress: 0,
    })
    if (endDate) rows.push({
      snapshot_date: endDate,
      actual_progress: null,
      planned_progress: 100,
    })
  }

  if (!rows.length) return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
      Sin datos de avance registrados aún
    </div>
  )

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={rows} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 18% 14%)" vertical={false} />
          <XAxis dataKey="snapshot_date" tick={{ fontSize: 10, fill: 'hsl(215 16% 47%)' }}
            tickFormatter={d => formatDate(d, { day:'numeric', month:'short' })}
            axisLine={false} tickLine={false} />
          <YAxis domain={[0,100]} tick={{ fontSize: 10, fill: 'hsl(215 16% 47%)' }}
            tickFormatter={v => `${v}%`} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v, name) => [
              v !== null && v !== undefined ? `${parseFloat(v).toFixed(1)}%` : '—',
              name === 'planned_progress' ? 'Planificado' : 'Avance Real'
            ]}
            contentStyle={{ background: 'hsl(220 22% 9%)', border: '1px solid hsl(220 18% 14%)', borderRadius: '8px', fontSize: 11 }}
          />
          <Legend iconType="circle" iconSize={8}
            formatter={v => v === 'planned_progress' ? 'Planificado (lineal)' : 'Avance Real'}
            wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="planned_progress" stroke="#6366F1"
            strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls={false} />
          <Line type="monotone" dataKey="actual_progress" stroke="#10B981"
            strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
      {endDate && (
        <p className="text-[10px] text-muted-foreground text-right mt-1 pr-1">
          Planificado = progresión lineal entre {formatDate(startDate)} y {formatDate(endDate)}
        </p>
      )}
    </div>
  )
}

// ── Modal Agregar / Editar Rubro (con búsqueda en catálogo) ───
function RubroModal({ workId, item, work, onClose, onSuccess }) {
  const { toast } = useUIStore()
  const qc = useQueryClient()

  // Estado de búsqueda en catálogo
  const [search, setSearch]           = useState(item?.description || '')
  const [selectedCatalog, setSelectedCatalog] = useState(
    item?.catalog_rubro_id ? { id: item.catalog_rubro_id } : null
  )
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [updateCatalog, setUpdateCatalog]     = useState(false) // checkbox actualizar precio en catálogo
  const [showConfirm, setShowConfirm]         = useState(false) // modal confirmación
  const [pendingData, setPendingData]         = useState(null)

  const [form, setForm] = useState({
    description: item?.description || '',
    unit:        item?.unit        || 'm²',
    initial_qty: item?.initial_qty || 1,
    unit_cost:   parseFloat(item?.unit_cost || 0),
  })

  const qty         = parseFloat(form.initial_qty || 0)
  const cost        = parseFloat(form.unit_cost   || 0)
  const utilityPct  = parseFloat(work?.utility_pct     ?? 18)
  const contingPct  = parseFloat(work?.contingency_pct ?? 10)
  // Fórmula encadenada — igual que backend costToPrice()
  const unitPrice   = cost * (1 + utilityPct / 100) * (1 + contingPct / 100)
  const total       = (qty * unitPrice).toFixed(2)

  // Buscar en catálogo al tipear
  const { data: catalogData } = useQuery({
    queryKey: ['catalog-search', search],
    queryFn:  () => api.get(`/catalog?search=${encodeURIComponent(search)}&limit=8`),
    enabled:  search.length >= 2 && !item, // solo en modo nuevo
  })

  const catalogResults = catalogData?.data?.data || []

  // Mostrar sugerencias cuando llegan resultados del catálogo
  useEffect(() => {
    if (catalogResults.length > 0 && search.length >= 2 && !selectedCatalog) {
      setShowSuggestions(true)
    }
  }, [catalogResults.length, search, selectedCatalog])

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Guardar el rubro en la obra
      const res = item
        ? await api.put(`/works/${workId}/items/${item.id}`, data)
        : await api.post(`/works/${workId}/items`, data)

      // 2. Si marcó "actualizar catálogo" y viene de uno existente
      if (updateCatalog && selectedCatalog?.id) {
        await api.put(`/catalog/${selectedCatalog.id}`, {
          reference_price: parseFloat(data.unit_cost),
        })
        qc.invalidateQueries(['catalog-rubros'])
        qc.invalidateQueries(['catalog-search'])
      }

      // 3. Si es un rubro nuevo (sin catálogo), crearlo en el catálogo
      if (!selectedCatalog?.id && !item && updateCatalog) {
        await api.post('/catalog', {
          name:            data.description,
          unit:            data.unit,
          reference_price: parseFloat(data.unit_cost),
        })
        qc.invalidateQueries(['catalog-rubros'])
      }

      return res
    },
    onSuccess: () => {
      toast({ title: item ? 'Rubro actualizado' : 'Rubro agregado', variant: 'success' })
      onSuccess()
      onClose()
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message || 'Error al guardar', variant: 'destructive' }),
  })

  // Seleccionar del catálogo
  const selectFromCatalog = (rubro) => {
    setSelectedCatalog(rubro)
    setSearch(rubro.name)
    setForm(f => ({
      ...f,
      description: rubro.name,
      unit:        rubro.unit,
      unit_cost:   parseFloat(rubro.reference_price || 0),  // reference_price = costo proveedor en catálogo
    }))
    setShowSuggestions(false)
  }

  const handleDescriptionChange = (val) => {
    setSearch(val)
    setForm(f => ({ ...f, description: val }))
    if (selectedCatalog && val !== selectedCatalog.name) {
      setSelectedCatalog(null) // desvinculó del catálogo
    }
    setShowSuggestions(val.length >= 2)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.description.trim()) return
    if (parseFloat(form.initial_qty) <= 0) return
    // Mostrar modal de confirmación
    setPendingData({
      description:      form.description,
      unit:             form.unit,
      initial_qty:      form.initial_qty,
      unit_cost:        cost,
      unit_price:       unitPrice,   // calculado automáticamente
      catalog_rubro_id: selectedCatalog?.id || null,
    })
    setShowConfirm(true)
  }

  const confirmSave = () => {
    setShowConfirm(false)
    saveMutation.mutate(pendingData)
  }

  const priceChanged = selectedCatalog && parseFloat(form.unit_cost) !== parseFloat(selectedCatalog.reference_price || 0)

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 glass-card animate-fade-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-[hsl(220_22%_9%)] z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-foreground">
                {item ? 'Editar Rubro' : 'Agregar Rubro'}
              </h2>
              {!item && (
                <p className="text-xs text-muted-foreground">Busca en el catálogo o ingresa uno nuevo</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* ── Descripción con búsqueda en catálogo ── */}
          <div className="relative">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Descripción del rubro *
            </label>
            <div className="relative mt-1">
              <input
                className="field-input pr-8"
                placeholder="Escribe para buscar en catálogo..."
                value={search}
                onChange={e => handleDescriptionChange(e.target.value)}
                onFocus={() => search.length >= 2 && setShowSuggestions(true)}
                autoComplete="off"
              />
              {selectedCatalog && (
                <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
              )}
            </div>

            {/* Badge catálogo vinculado */}
            {selectedCatalog && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Vinculado al catálogo
                </span>
                <button type="button" onClick={() => { setSelectedCatalog(null); setSearch(form.description) }}
                  className="text-[10px] text-muted-foreground hover:text-rose-400 transition-colors">
                  Desvincular
                </button>
              </div>
            )}

            {/* Dropdown sugerencias */}
            {showSuggestions && catalogResults.length > 0 && !selectedCatalog && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1 glass-card border border-border rounded-xl shadow-xl overflow-hidden">
                <div className="p-2 border-b border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">
                    Sugerencias del catálogo
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {catalogResults.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/60 transition-colors text-left"
                      onClick={() => selectFromCatalog(r)}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.unit} · {r.category?.name || 'Sin categoría'}</p>
                      </div>
                      <span className="font-num text-xs text-amber-400 shrink-0 ml-3">
                        ${parseFloat(r.reference_price || 0).toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-border">
                  <p className="text-[10px] text-muted-foreground px-1">
                    ¿No aparece? Continúa escribiendo para agregar uno nuevo al catálogo.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Unidad + Cantidad ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Unidad *</label>
              <select
                className="field-input mt-1"
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Cantidad inicial *</label>
              <input
                type="number" step="0.001" min="0"
                className="field-input mt-1"
                placeholder="0"
                value={form.initial_qty}
                onChange={e => setForm(f => ({ ...f, initial_qty: e.target.value }))}
              />
            </div>
          </div>

          {/* ── Costo proveedor ── */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">
              Costo unitario (proveedor) *
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number" step="0.01" min="0"
                className="field-input pl-6"
                placeholder="0.00"
                value={form.unit_cost}
                onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))}
              />
            </div>
            {selectedCatalog && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Precio referencia catálogo: ${parseFloat(selectedCatalog.reference_price || 0).toFixed(2)}
              </p>
            )}
          </div>

          {/* ── Desglose de márgenes (calculado automáticamente) ── */}
          {parseFloat(form.unit_cost) > 0 && (
            <div className="p-4 rounded-xl bg-secondary/40 border border-border space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-3">
                Desglose — precio al cliente
              </p>
              {[
                { label: `Costo proveedor (${form.initial_qty} ${form.unit})`, value: parseFloat(form.unit_cost) * parseFloat(form.initial_qty || 0), color: 'text-foreground' },
                { label: `+ Utilidad (${work?.utility_pct ?? 18}%)`, value: parseFloat(form.unit_cost) * parseFloat(form.initial_qty || 0) * ((work?.utility_pct ?? 18) / 100), color: 'text-emerald-400' },
                { label: `+ Imprevistos (${work?.contingency_pct ?? 10}%)`, value: parseFloat(form.unit_cost) * parseFloat(form.initial_qty || 0) * ((work?.contingency_pct ?? 10) / 100), color: 'text-amber-400' },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={`font-num font-medium ${row.color}`}>${row.value.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-1 flex justify-between items-center">
                <span className="text-xs font-semibold text-foreground">Total al cliente</span>
                <span className="font-num font-bold text-blue-400 text-base">${total}</span>
              </div>
            </div>
          )}

          {/* ── Opciones catálogo ── */}
          {!item && (
            <div className="space-y-2">
              {/* Si tiene catálogo vinculado y cambió precio */}
              {selectedCatalog && priceChanged && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateCatalog}
                    onChange={e => setUpdateCatalog(e.target.checked)}
                    className="mt-0.5 accent-amber-400"
                  />
                  <div>
                    <p className="text-xs font-medium text-amber-400">Actualizar precio en catálogo</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Cambiará el precio de referencia de "{selectedCatalog.name}" de
                      ${parseFloat(selectedCatalog.reference_price || 0).toFixed(2)} a ${parseFloat(form.unit_cost || 0).toFixed(2)}
                    </p>
                  </div>
                </label>
              )}
              {/* Si es rubro nuevo (sin catálogo) */}
              {!selectedCatalog && search.length >= 3 && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={updateCatalog}
                    onChange={e => setUpdateCatalog(e.target.checked)}
                    className="mt-0.5 accent-blue-400"
                  />
                  <div>
                    <p className="text-xs font-medium text-blue-400">Agregar al catálogo de rubros</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Se creará "{search}" en el catálogo con precio de referencia ${parseFloat(form.unit_cost || 0).toFixed(2)}
                    </p>
                  </div>
                </label>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button
              type="submit"
              disabled={!form.description.trim() || parseFloat(form.initial_qty) <= 0}
              className="btn-primary flex-1 justify-center"
            >
              {item ? 'Revisar y guardar' : 'Revisar y agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* ── Modal de confirmación ── */}
    {showConfirm && pendingData && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-sm mx-4 glass-card p-6 animate-fade-up">
          <h3 className="font-display font-bold text-foreground mb-4">Confirmar rubro</h3>
          <div className="space-y-2 text-sm mb-5">
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Descripción</span>
              <span className="font-medium text-foreground text-right max-w-[60%]">{pendingData.description}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Cantidad</span>
              <span className="font-num text-foreground">{pendingData.initial_qty} {pendingData.unit}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Costo proveedor / u</span>
              <span className="font-num text-foreground">${parseFloat(pendingData.unit_cost).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Precio cliente / u (con márgenes)</span>
              <span className="font-num text-emerald-400">${parseFloat(pendingData.unit_price).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold">
              <span className="text-foreground">Total al cliente</span>
              <span className="font-num text-blue-400">
                ${(parseFloat(pendingData.initial_qty) * parseFloat(pendingData.unit_price)).toFixed(2)}
              </span>
            </div>
            {updateCatalog && selectedCatalog && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                ⚠ Se actualizará el precio en catálogo de "{selectedCatalog.name}"
              </div>
            )}
            {updateCatalog && !selectedCatalog && (
              <div className="mt-3 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                ＋ Se agregará "{pendingData.description}" al catálogo de rubros
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="btn-ghost flex-1 justify-center"
            >
              Corregir
            </button>
            <button
              onClick={confirmSave}
              disabled={saveMutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {saveMutation.isPending ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// ── Panel de rentabilidad (contrato vs presupuesto) ────────────
function ProfitabilityPanel({ budget }) {
  const contract = budget?.contract
  if (!contract) return null

  const contracted  = contract.contracted_amount
  const addendums   = contract.addendums_total
  const totalBill   = contract.total_to_bill
  const budgetTotal = budget?.initial_budget?.total || 0
  const margin      = totalBill - budgetTotal
  const marginPct   = totalBill > 0 ? ((margin / totalBill) * 100).toFixed(1) : 0
  const isPositive  = margin >= 0

  return (
    <div className="glass-card p-5 border border-border">
      <h3 className="font-display font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        Panel de Rentabilidad
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center py-1.5 border-b border-border/50">
          <span className="text-muted-foreground">Contrato original</span>
          <span className="font-num text-foreground">{formatCurrency(contracted)}</span>
        </div>
        {addendums > 0 && (
          <div className="flex justify-between items-center py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">+ Adicionales</span>
            <span className="font-num text-emerald-400">+ {formatCurrency(addendums)}</span>
          </div>
        )}
        <div className="flex justify-between items-center py-1.5 border-b border-border/50 font-semibold">
          <span className="text-foreground">Total a cobrar</span>
          <span className="font-num text-foreground">{formatCurrency(totalBill)}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 border-b border-border/50">
          <span className="text-muted-foreground">Presupuesto de obra</span>
          <span className="font-num text-foreground">{formatCurrency(budgetTotal)}</span>
        </div>
        <div className={cn(
          'flex justify-between items-center py-2 px-3 rounded-lg font-bold',
          isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
        )}>
          <span>Margen estimado</span>
          <span className="font-num">
            {formatCurrency(margin)} ({marginPct}%)
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Budget tab ────────────────────────────────────────────────
function BudgetTab({ work }) {
  const qc = useQueryClient()
  const { toast } = useUIStore()
  const [rubroModal, setRubroModal] = useState(null) // null | 'new' | item object

  const { data: budgetData, refetch: refetchBudget } = useQuery({
    queryKey: ['work-budget', work.id],
    queryFn:  () => worksApi.getBudget(work.id),
  })

  const { data: itemsData, refetch: refetchItems } = useQuery({
    queryKey: ['work-items', work.id],
    queryFn:  () => api.get(`/works/${work.id}/items`),
  })

  const budget = budgetData?.data?.data
  const items  = itemsData?.data?.data || work.items || []

  // Estado para edición inline por fila
  const [editingRow, setEditingRow]   = useState(null) // { id, real_qty, progress_pct }
  const [savingRow,  setSavingRow]    = useState(null)

  const deleteMut = useMutation({
    mutationFn: (itemId) => api.delete(`/works/${work.id}/items/${itemId}`),
    onSuccess: () => {
      toast({ title: 'Rubro eliminado', variant: 'success' })
      refetchBudget(); refetchItems()
      qc.invalidateQueries(['work', String(work.id)])
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const handleSuccess = () => {
    refetchBudget(); refetchItems()
    qc.invalidateQueries(['work', String(work.id)])
  }

  const confirmDelete = (item) => {
    if (window.confirm(`¿Eliminar el rubro "${item.description}"?`)) deleteMut.mutate(item.id)
  }

  const startEdit = (item) => setEditingRow({
    id:           item.id,
    real_qty:     parseFloat(item.real_qty || 0),
    progress_pct: parseFloat(item.progress_pct || 0),
    unit_cost:    parseFloat(item.unit_cost || 0),
  })

  const saveRow = async () => {
    if (!editingRow) return
    setSavingRow(editingRow.id)
    try {
      const real_total = editingRow.real_qty * editingRow.unit_cost
      await api.put(`/works/${work.id}/items/${editingRow.id}`, {
        real_qty:     editingRow.real_qty,
        real_total:   Math.round(real_total * 100) / 100,
        progress_pct: editingRow.progress_pct,
      })
      // Recalcular avance de obra
      await worksApi.updateProgress(work.id, {})
      setEditingRow(null)
      refetchBudget(); refetchItems()
      qc.invalidateQueries(['work', String(work.id)])
      toast({ title: 'Rubro actualizado', variant: 'success' })
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' })
    } finally { setSavingRow(null) }
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      {budget && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Presupuesto inicial', value: formatCurrency(budget.initial_budget?.total || 0), color: 'text-blue-400' },
            { label: 'Costo real actual',   value: formatCurrency(budget.real_cost || 0),             color: 'text-rose-400' },
            { label: 'Ahorro de bodega',    value: formatCurrency(budget.warehouse_savings || 0),     color: 'text-amber-400' },
            { label: 'Avance ponderado',    value: formatPct(budget.actual_progress || 0),            color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="glass-card p-4">
              <p className={cn('font-num text-xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Panel de rentabilidad (solo si hay proyecto vinculado) */}
      {budget?.contract && <ProfitabilityPanel budget={budget} />}

      {/* Burn rate alert */}
      {budget?.burn_rate?.is_over && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-400">Alerta de sobrecosto</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              El gasto real supera el esperado en {formatPct(budget.burn_rate.overrun_pct)}.
              Costo actual: {formatCurrency(budget.real_cost)} /
              Esperado: {formatCurrency(budget.burn_rate.expected_cost)}
            </p>
          </div>
        </div>
      )}

      {/* Items table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm text-foreground">Rubros de Obra</h3>
          <button
            className="btn-primary text-xs flex items-center gap-1.5"
            onClick={() => setRubroModal('new')}
          >
            <Plus className="w-3.5 h-3.5" /> Agregar rubro
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {[
                  { label: 'Descripción', cls: '' },
                  { label: 'Unidad',      cls: '' },
                  { label: 'Cant. Ini.',  cls: '' },
                  { label: 'Cant. Real',  cls: '' },
                  { label: 'Costo/u',     cls: 'text-rose-400/70' },
                  { label: 'Precio/u',    cls: 'text-blue-400/70' },
                  { label: 'Total Real',  cls: '' },
                  { label: 'Avance',      cls: '' },
                  { label: '',            cls: '' },
                ].map(h => (
                  <th key={h.label} className={cn('px-4 py-3 text-left font-medium', h.cls || 'text-muted-foreground')}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <DollarSign className="w-8 h-8 opacity-30" />
                      <p className="text-sm">Sin rubros registrados</p>
                      <p className="text-xs opacity-70">Agrega los rubros del presupuesto de esta obra</p>
                      <button
                        className="btn-primary text-xs mt-2"
                        onClick={() => setRubroModal('new')}
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar primer rubro
                      </button>
                    </div>
                  </td>
                </tr>
              ) : items.map(item => {
                const isEditing = editingRow?.id === item.id
                const isSaving  = savingRow === item.id
                const autoRealTotal = isEditing
                  ? (editingRow.real_qty * editingRow.unit_cost)
                  : parseFloat(item.real_total || 0)
                return (
                  <tr key={item.id} className={cn('table-row group', isEditing && 'bg-blue-500/5 ring-1 ring-inset ring-blue-500/20')}>
                    <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">{item.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                    <td className="px-4 py-3 font-num">{parseFloat(item.initial_qty).toFixed(2)}</td>

                    {/* Cant. Real — editable */}
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <input type="number" step="0.01" min="0"
                          className="field-input text-xs w-20 font-num"
                          value={editingRow.real_qty}
                          onChange={e => setEditingRow(r => ({ ...r, real_qty: parseFloat(e.target.value) || 0 }))}
                          autoFocus
                        />
                      ) : (
                        <span className="font-num">{parseFloat(item.real_qty || 0).toFixed(2)}</span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-num text-rose-300">{formatCurrency(item.unit_cost)}</td>
                    <td className="px-4 py-3 font-num text-blue-300">{formatCurrency(item.unit_price)}</td>

                    {/* Total Real — calculado auto */}
                    <td className="px-4 py-3 font-num font-semibold">
                      <span className={isEditing ? 'text-amber-400' : ''}>
                        {formatCurrency(autoRealTotal)}
                      </span>
                      {isEditing && <span className="text-[9px] text-muted-foreground ml-1">auto</span>}
                    </td>

                    {/* Avance % — editable */}
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input type="number" step="0.1" min="0" max="100"
                            className="field-input text-xs w-16 font-num"
                            value={editingRow.progress_pct}
                            onChange={e => setEditingRow(r => ({ ...r, progress_pct: parseFloat(e.target.value) || 0 }))}
                          />
                          <span className="text-[10px] text-muted-foreground">%</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="progress-bar w-16">
                            <div className={cn('progress-fill', progressColor(item.progress_pct))}
                              style={{ width: `${item.progress_pct}%` }} />
                          </div>
                          <span className="font-num text-foreground">{formatPct(item.progress_pct)}</span>
                        </div>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-2">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button onClick={saveRow} disabled={isSaving}
                            className="btn-primary text-xs py-1 px-2 h-7 gap-1">
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : '✓'}
                          </button>
                          <button onClick={() => setEditingRow(null)} className="btn-ghost text-xs py-1 px-1.5 h-7">✕</button>
                        </div>
                      ) : (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(item)}
                            className="btn-ghost p-1.5 hover:text-emerald-400" title="Actualizar avance real">
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setRubroModal(item)}
                            className="btn-ghost p-1.5 hover:text-blue-400" title="Editar rubro">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => confirmDelete(item)}
                            className="btn-ghost p-1.5 hover:text-rose-400 hover:bg-rose-500/10" title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {items.length > 0 && budget && (
              <tfoot>
                <tr className="border-t border-border bg-secondary/20">
                  <td colSpan={5} className="px-4 py-3 text-xs text-muted-foreground font-medium">
                    {items.length} rubro{items.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-medium">Total presupuesto:</td>
                  <td className="px-4 py-3 font-num font-bold text-blue-400" colSpan={3}>
                    {formatCurrency(budget.initial_budget?.total || 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal agregar/editar */}
      {rubroModal && (
        <RubroModal
          workId={work.id}
          item={rubroModal === 'new' ? null : rubroModal}
          work={work}
          onClose={() => setRubroModal(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function WorkDetail() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const [tab, setTab]       = useState('overview')
  const [showClose, setShowClose]       = useState(false)
  const [editingProgress, setEditingProgress] = useState(false)
  const [manualProgress, setManualProgress]   = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['work', id],
    queryFn:  () => worksApi.getOne(id),
  })

  const { data: subSummaryData } = useQuery({
    queryKey: ['subcontracts-summary', id],
    queryFn:  () => api.get(`/works/${id}/subcontracts/summary`),
    enabled:  !!id,
  })

  const qc = useQueryClient()
  const { toast } = useUIStore()

  const overrideMut = useMutation({
    mutationFn: (pct) => worksApi.updateProgress(id, { manual_override: parseFloat(pct) }),
    onSuccess: () => {
      qc.invalidateQueries(['work', id])
      qc.invalidateQueries(['work-budget', id])
      setEditingProgress(false)
      toast({ title: 'Avance actualizado', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const { data: finSummaryData } = useQuery({
    queryKey: ['work-finance-summary-overview', id],
    queryFn:  () => api.get(`/finance/summary?work_id=${id}`),
    enabled:  !!id,
  })

  const work          = data?.data?.data
  const subSummary    = subSummaryData?.data?.data
  const finSummary    = finSummaryData?.data?.data
  const status        = work ? (workStatusLabel[work.status] || workStatusLabel.ACTIVE) : null
  const pct           = parseFloat(work?.actual_progress || 0)
  const subTotal      = parseFloat(subSummary?.total_contracted || 0)
  const totalObra     = parseFloat(work?.initial_budget || 0) + subTotal
  // Costo real = egresos financieros totales (incluye pagos a subcontratos + materiales)
  const realCostTotal = parseFloat(finSummary?.total_expense || work?.real_cost || 0)

  if (isLoading) return (
    <div className="space-y-4 max-w-6xl">
      <div className="shimmer h-8 rounded w-64" />
      <div className="shimmer h-32 rounded-xl" />
    </div>
  )

  if (!work) return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-muted-foreground">Obra no encontrada</p>
      <button onClick={() => navigate('/works')} className="btn-primary mt-4">Volver</button>
    </div>
  )

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Header */}
      <div className="animate-fade-up">
        <button onClick={() => navigate('/works')} className="btn-ghost text-xs mb-4 -ml-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Obras
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-display font-bold text-foreground">{work.name}</h1>
              <span className={cn('badge border', status.color)}>{status.label}</span>
            </div>
            <p className="text-muted-foreground text-sm">
              {work.client?.name || '—'} · {work.location || 'Sin ubicación'}
            </p>
          </div>
          <div className="text-right shrink-0 space-y-0.5">
            {/* Desglose presupuesto */}
            <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
              <span>Recursos propios</span>
              <span className="font-num text-foreground">{formatCurrency(work.initial_budget)}</span>
            </div>
            {subTotal > 0 && (
              <div className="flex items-center justify-end gap-3 text-xs text-muted-foreground">
                <span>Subcontratos</span>
                <span className="font-num text-foreground">{formatCurrency(subTotal)}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 border-t border-border pt-1 mt-1">
              <span className="text-xs text-muted-foreground">Total obra</span>
              <p className="font-num text-2xl font-bold text-foreground">{formatCurrency(totalObra)}</p>
            </div>
            {work.status === 'ACTIVE' && (
              <button onClick={() => setShowClose(true)}
                className="mt-1 btn-ghost text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                Cerrar obra
              </button>
            )}
          </div>
        </div>

        {/* Master progress bar */}
        <div className="mt-5 glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Avance general de obra</span>
              <span className="text-[10px] text-muted-foreground/60">(rubros + subcontratos)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-num text-lg font-bold text-foreground">{formatPct(pct)}</span>
              {!editingProgress ? (
                <button
                  onClick={() => { setManualProgress(pct.toFixed(1)); setEditingProgress(true) }}
                  className="btn-ghost p-1 text-xs text-muted-foreground hover:text-foreground"
                  title="Ajustar manualmente"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="number" min="0" max="100" step="0.1"
                    className="field-input w-16 text-xs text-center py-0.5 h-6"
                    value={manualProgress}
                    onChange={e => setManualProgress(e.target.value)}
                    autoFocus
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                  <button
                    onClick={() => overrideMut.mutate(manualProgress)}
                    disabled={overrideMut.isPending}
                    className="btn-primary text-xs py-0.5 px-2 h-6"
                  >✓</button>
                  <button
                    onClick={() => setEditingProgress(false)}
                    className="btn-ghost text-xs py-0.5 px-1.5 h-6"
                  >✕</button>
                </div>
              )}
            </div>
          </div>
          <div className="progress-bar h-2.5">
            <div className={cn('progress-fill', progressColor(pct))} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
            <span>Inicio: {formatDate(work.start_date)}</span>
            <span>Fin estimado: {formatDate(work.estimated_end)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 glass-card p-1 rounded-xl w-fit animate-fade-up-200 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              tab === key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-up-200">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Curve S */}
            <div className="glass-card p-5">
              <h3 className="font-display font-semibold text-sm text-foreground mb-4">
                Curva S — Avance vs. Tiempo
              </h3>
              <CurveSChart workId={id} work={work} />
            </div>

            {/* Info */}
            <div className="glass-card p-5 space-y-4">
              <h3 className="font-display font-semibold text-sm text-foreground">Información General</h3>
              {[
                { label: 'Ingeniero',         value: work.assignedUser ? `${work.assignedUser.first_name} ${work.assignedUser.last_name}` : '—' },
                { label: 'Fecha inicio',      value: formatDate(work.start_date) },
                { label: 'Fin estimado',      value: formatDate(work.estimated_end) },
                { label: 'Presupuesto total', value: formatCurrency(totalObra) },
                { label: 'Costo real',        value: formatCurrency(realCostTotal), highlight: realCostTotal > totalObra },
                { label: 'Utilidad %',        value: `${work.utility_pct}%` },
                { label: 'Imprevistos %',     value: `${work.contingency_pct}%` },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span className={cn('text-xs font-medium font-num', row.highlight ? 'text-rose-400' : 'text-foreground')}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'budget'        && <BudgetTab work={work} />}
        {tab === 'reports'       && <ReportsTab workId={id} />}
        {tab === 'subcontracts'  && <SubcontractsTab workId={id} />}
        {tab === 'certificates'  && <CertificatesTab work={work} totalObra={totalObra} subTotal={subTotal} />}
        {tab === 'stock'         && <WorkStockTab workId={id} />}
        {tab === 'schedule'      && <GanttTab work={work} />}
        {tab === 'finance'       && <WorkFinanceTab workId={id} work={work} totalObra={totalObra} subTotal={subTotal} />}
      </div>

      {/* Close work modal */}
      {showClose && (
        <CloseWorkModal
          work={work}
          onClose={() => setShowClose(false)}
          onSuccess={() => navigate('/works')}
        />
      )}
    </div>
  )
}
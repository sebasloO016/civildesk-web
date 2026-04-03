import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useUIStore } from '../../store/uiStore'
import { useForm } from 'react-hook-form'
import {
  Building2, Users, Settings, Shield, Plus, X,
  Pencil, CheckCircle2, XCircle, Eye, EyeOff,
  BarChart2, Clock,
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '../../utils/helpers'

const configApi = {
  getCompany:   ()       => api.get('/config/company'),
  updateCompany:(data)   => api.put('/config/company', data),
  getUsers:     ()       => api.get('/config/users?limit=50'),
  createUser:   (data)   => api.post('/config/users', data),
  updateUser:   (id, d)  => api.put(`/config/users/${id}`, d),
  toggleUser:   (id)     => api.patch(`/config/users/${id}/toggle`),
  getRoles:     ()       => api.get('/config/roles'),
  getStats:     ()       => api.get('/config/stats'),
  getAudit:     (params) => api.get('/config/audit', { params }),
}

const TABS = [
  { key: 'company', label: 'Empresa',   icon: Building2 },
  { key: 'users',   label: 'Usuarios',  icon: Users },
  { key: 'stats',   label: 'Sistema',   icon: BarChart2 },
  { key: 'audit',   label: 'Auditoría', icon: Shield },
]

// ── Company Tab ───────────────────────────────────────────────
function CompanyTab() {
  const qc = useQueryClient()
  const { toast } = useUIStore()

  const { data, isLoading } = useQuery({
    queryKey: ['config-company'],
    queryFn:  () => configApi.getCompany(),
  })

  const company = data?.data?.data
  const { register, handleSubmit, formState: { isDirty } } = useForm({
    values: company || {},
  })

  const updateMut = useMutation({
    mutationFn: (d) => configApi.updateCompany(d),
    onSuccess: () => {
      qc.invalidateQueries(['config-company'])
      toast({ title: 'Configuración guardada', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  if (isLoading) return <div className="glass-card p-8 shimmer h-64 rounded-xl" />

  return (
    <form onSubmit={handleSubmit(d => updateMut.mutate(d))} className="space-y-6">
      {/* Datos generales */}
      <div className="glass-card p-6">
        <h3 className="font-display font-semibold text-foreground mb-5">Datos de la Empresa</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Nombre de la empresa *</label>
            <input className="field-input mt-1" {...register('name', { required: true })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">RUC</label>
            <input className="field-input mt-1" {...register('ruc')} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Teléfono</label>
            <input className="field-input mt-1" {...register('phone')} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Email</label>
            <input type="email" className="field-input mt-1" {...register('email')} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Ciudad</label>
            <input className="field-input mt-1" {...register('city')} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Dirección</label>
            <input className="field-input mt-1" {...register('address')} />
          </div>
        </div>
      </div>

      {/* Parámetros financieros */}
      <div className="glass-card p-6">
        <h3 className="font-display font-semibold text-foreground mb-2">Parámetros por Defecto</h3>
        <p className="text-xs text-muted-foreground mb-5">
          Estos valores se usarán como predeterminados al crear nuevas obras y proformas.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Utilidad %</label>
            <input type="number" step="0.5" min="0" max="100" className="field-input mt-1"
              {...register('default_utility_pct', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Imprevistos %</label>
            <input type="number" step="0.5" min="0" max="100" className="field-input mt-1"
              {...register('default_contingency_pct', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Alerta precios %</label>
            <input type="number" step="0.5" min="0" max="100" className="field-input mt-1"
              {...register('price_alert_threshold_pct', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider">Stock mínimo defecto</label>
            <input type="number" step="1" min="0" className="field-input mt-1"
              {...register('stock_alert_default_min', { valueAsNumber: true })} />
          </div>
        </div>
        <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400">
            💡 <strong>Alerta precios:</strong> Si un proveedor cotiza más del X% sobre el precio de referencia, se activa una alerta automática.
            <br/>
            💡 <strong>Stock mínimo:</strong> Cuando el stock de un item en bodega baje de este número, se activa alerta.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={updateMut.isPending || !isDirty}
          className="btn-primary disabled:opacity-50">
          {updateMut.isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}

// ── Users Tab ─────────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient()
  const { toast, openModal, closeModal, activeModal } = useUIStore()
  const [editUser, setEditUser] = useState(null)
  const [showPass, setShowPass] = useState(false)

  const { data }      = useQuery({ queryKey: ['config-users'],  queryFn: () => configApi.getUsers() })
  const { data: rolesD } = useQuery({ queryKey: ['config-roles'], queryFn: () => configApi.getRoles() })

  const users = data?.data?.data || []
  const roles = rolesD?.data?.data || []

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const createMut = useMutation({
    mutationFn: (d) => configApi.createUser(d),
    onSuccess: () => {
      qc.invalidateQueries(['config-users'])
      closeModal(); reset()
      toast({ title: 'Usuario creado', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => configApi.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['config-users'])
      setEditUser(null); closeModal()
      toast({ title: 'Usuario actualizado', variant: 'success' })
    },
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const toggleMut = useMutation({
    mutationFn: (id) => configApi.toggleUser(id),
    onSuccess: () => qc.invalidateQueries(['config-users']),
    onError: (e) => toast({ title: 'Error', description: e.response?.data?.message, variant: 'destructive' }),
  })

  const openEdit = (user) => {
    setEditUser(user)
    reset({ first_name: user.first_name, last_name: user.last_name,
            email: user.email, phone: user.phone, role_id: user.role_id })
    openModal('userForm')
  }

  const onSubmit = (data) => {
    if (editUser) updateMut.mutate({ id: editUser.id, data })
    else          createMut.mutate(data)
  }

  const ROLE_COLORS = { ADMIN: 'text-amber-400 bg-amber-500/15', ENGINEER: 'text-blue-400 bg-blue-500/15', ASSISTANT: 'text-violet-400 bg-violet-500/15' }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{users.length} usuarios</p>
        <button onClick={() => { setEditUser(null); reset(); openModal('userForm') }} className="btn-primary text-xs">
          <Plus className="w-3.5 h-3.5" /> Nuevo Usuario
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Usuario','Email','Rol','Estado','Último acceso',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="table-row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30
                                    flex items-center justify-center text-amber-400 font-bold text-[10px] shrink-0">
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.first_name} {user.last_name}</p>
                      {user.phone && <p className="text-muted-foreground">{user.phone}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={cn('badge text-[10px]', ROLE_COLORS[user.role?.name] || 'text-muted-foreground bg-muted')}>
                    {user.role?.name || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.is_active
                    ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Activo</span>
                    : <span className="flex items-center gap-1 text-rose-400"><XCircle className="w-3 h-3" /> Inactivo</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(user.last_login)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(user)} className="btn-ghost p-1.5">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => toggleMut.mutate(user.id)}
                      className={cn('btn-ghost p-1.5 text-xs', user.is_active
                        ? 'hover:text-rose-400 hover:bg-rose-500/10'
                        : 'hover:text-emerald-400 hover:bg-emerald-500/10')}>
                      {user.is_active ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeModal?.name === 'userForm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md mx-4 glass-card p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold text-lg text-foreground">
                {editUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button onClick={closeModal} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Nombre *</label>
                  <input className="field-input mt-1" {...register('first_name', { required: true })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Apellido *</label>
                  <input className="field-input mt-1" {...register('last_name', { required: true })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Email *</label>
                <input type="email" className="field-input mt-1"
                  {...register('email', { required: true })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Teléfono</label>
                  <input className="field-input mt-1" {...register('phone')} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Rol *</label>
                  <select className="field-input mt-1"
                    {...register('role_id', { required: true, valueAsNumber: true })}>
                    <option value="">Seleccionar...</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  {editUser ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
                </label>
                <div className="relative mt-1">
                  <input type={showPass ? 'text' : 'password'} className="field-input pr-10"
                    placeholder={editUser ? '••••••••' : 'Mínimo 8 caracteres'}
                    {...register('password', { required: !editUser, minLength: { value: 8, message: 'Mínimo 8 caracteres' } })} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-rose-400 text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancelar</button>
                <button type="submit" disabled={createMut.isPending || updateMut.isPending}
                  className="btn-primary flex-1 justify-center">
                  {createMut.isPending || updateMut.isPending ? 'Guardando...' : editUser ? 'Guardar' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── System Stats Tab ──────────────────────────────────────────
function StatsTab() {
  const { data } = useQuery({ queryKey: ['config-stats'], queryFn: () => configApi.getStats() })
  const stats = data?.data?.data

  const items = stats ? [
    { label: 'Obras totales',    value: stats.total_works,     sub: `${stats.active_works} activas` },
    { label: 'Proyectos',        value: stats.total_projects },
    { label: 'Clientes',         value: stats.total_clients },
    { label: 'Proveedores',      value: stats.total_suppliers },
    { label: 'Usuarios activos', value: stats.total_users },
    { label: 'Productos',        value: stats.total_products },
    { label: 'Rubros catálogo',  value: stats.total_rubros },
    { label: 'Ingresos totales', value: formatCurrency(stats.total_income),  isAmount: true },
    { label: 'Egresos totales',  value: formatCurrency(stats.total_expense), isAmount: true },
    { label: 'Balance',
      value: formatCurrency(parseFloat(stats.total_income) - parseFloat(stats.total_expense)),
      isAmount: true,
      highlight: true },
  ] : []

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map(item => (
        <div key={item.label} className={cn('glass-card p-4',
          item.highlight && 'ring-1 ring-amber-500/30')}>
          <p className={cn('font-num text-xl font-bold',
            item.highlight ? 'text-amber-400' : 'text-foreground')}>
            {item.value}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
          {item.sub && <p className="text-[10px] text-muted-foreground/70">{item.sub}</p>}
        </div>
      ))}
    </div>
  )
}

// ── Audit Tab ─────────────────────────────────────────────────
function AuditTab() {
  const [page, setPage] = useState(1)
  const { data } = useQuery({
    queryKey: ['config-audit', page],
    queryFn:  () => configApi.getAudit({ page, limit: 20 }),
  })

  const logs       = data?.data?.data || []
  const pagination = data?.data?.pagination

  const ACTION_COLORS = {
    CREATE: 'text-emerald-400', UPDATE: 'text-amber-400',
    DELETE: 'text-rose-400',   LOGIN:  'text-blue-400',
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{pagination?.total || 0} registros de auditoría</p>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Fecha','Usuario','Acción','Entidad','Detalle'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-muted-foreground font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                Sin registros de auditoría aún
              </td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="table-row">
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {formatDate(log.created_at)}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {log.user ? `${log.user.first_name} ${log.user.last_name}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('font-semibold', ACTION_COLORS[log.action] || 'text-muted-foreground')}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{log.entity_type}</td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                  {log.description || log.entity_id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={!pagination.hasPrev} onClick={() => setPage(p=>p-1)} className="btn-ghost disabled:opacity-40">Anterior</button>
          <span className="text-xs text-muted-foreground font-num">{pagination.page}/{pagination.totalPages}</span>
          <button disabled={!pagination.hasNext} onClick={() => setPage(p=>p+1)} className="btn-ghost disabled:opacity-40">Siguiente</button>
        </div>
      )}
    </div>
  )
}

// ── Main Config Page ──────────────────────────────────────────
export default function ConfigPage() {
  const [tab, setTab] = useState('company')

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-display font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Empresa, usuarios, parámetros del sistema</p>
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
        {tab === 'company' && <CompanyTab />}
        {tab === 'users'   && <UsersTab />}
        {tab === 'stats'   && <StatsTab />}
        {tab === 'audit'   && <AuditTab />}
      </div>
    </div>
  )
}

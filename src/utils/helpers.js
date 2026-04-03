import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ── Tailwind class merger ─────────────────────────────────────
export const cn = (...inputs) => twMerge(clsx(inputs))

// ── Currency formatter ────────────────────────────────────────
export const formatCurrency = (value, decimals = 2) => {
  const num = parseFloat(value)
  if (value == null || isNaN(num)) return '$0.00'
  return new Intl.NumberFormat('es-EC', {
    style:                'currency',
    currency:             'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

// ── Number formatter ──────────────────────────────────────────
export const formatNumber = (value, decimals = 0) => {
  const num = parseFloat(value)
  if (value == null || isNaN(num)) return '0'
  return new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

// ── Percentage formatter ──────────────────────────────────────
export const formatPct = (value, decimals = 1) => {
  const num = parseFloat(value)
  if (value == null || isNaN(num)) return '0%'
  return `${num.toFixed(decimals)}%`
}

// ── Date formatter ────────────────────────────────────────────
export const formatDate = (date, opts = {}) => {
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric', ...opts
  }).format(new Date(date))
}

export const formatDateShort = (date) => {
  if (!date) return '—'
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short' }).format(new Date(date))
}

// ── Status helpers ────────────────────────────────────────────
export const workStatusLabel = {
  ACTIVE:      { label: 'Activa',      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  PAUSED:      { label: 'Pausada',     color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  FINISHED:    { label: 'Terminada',   color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  LIQUIDATION: { label: 'Liquidación', color: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
  CLOSED:      { label: 'Cerrada',     color: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
}

export const projectStatusLabel = {
  PROFORMA:    { label: 'Proforma',   color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  CONTRACT:    { label: 'Contrato',   color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  EXECUTION:   { label: 'Ejecución',  color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  LIQUIDATION: { label: 'Liquidación',color: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
  CLOSED:      { label: 'Cerrado',    color: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
}

export const alertSeverityColor = {
  INFO:     'text-blue-400 bg-blue-500/10',
  WARNING:  'text-amber-400 bg-amber-500/10',
  CRITICAL: 'text-rose-400 bg-rose-500/10',
}

// ── Progress color ────────────────────────────────────────────
export const progressColor = (pct) => {
  if (pct >= 80) return 'bg-emerald-500'
  if (pct >= 40) return 'bg-amber-500'
  return 'bg-rose-500'
}

// ── Schedule status ───────────────────────────────────────────
export const scheduleStatusColor = {
  ON_TIME:       'text-emerald-400',
  SLIGHT_DELAY:  'text-amber-400',
  CRITICAL_DELAY:'text-rose-400',
}

// ── Open PDF with JWT token ───────────────────────────────────
// ── Open PDF with JWT token ───────────────────────────────────
export const openPdf = (path) => {
  let token = null
  try {
    const raw = localStorage.getItem('civildesk-auth')
    if (raw) {
      const parsed = JSON.parse(raw)
      token = parsed?.state?.accessToken || null
    }
  } catch {}

  const url = token
    ? `/api${path}?token=${encodeURIComponent(token)}`
    : `/api${path}`
  window.open(url, '_blank')
}
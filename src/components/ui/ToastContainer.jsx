import { useUIStore } from '../../store/uiStore'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { cn } from '../../utils/helpers'

const icons = {
  default:     <Info className="w-4 h-4 text-blue-400" />,
  success:     <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  destructive: <XCircle className="w-4 h-4 text-rose-400" />,
}

export default function ToastContainer() {
  const toasts = useUIStore(s => s.toasts)

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={cn(
            'glass-card flex items-start gap-3 p-4 w-80 shadow-lg pointer-events-auto',
            'border animate-slide-in',
            t.variant === 'destructive' ? 'border-rose-500/30' :
            t.variant === 'success'     ? 'border-emerald-500/30' : 'border-border'
          )}
        >
          <div className="shrink-0 mt-0.5">{icons[t.variant] || icons.default}</div>
          <div className="flex-1 min-w-0">
            {t.title       && <p className="text-sm font-medium text-foreground">{t.title}</p>}
            {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

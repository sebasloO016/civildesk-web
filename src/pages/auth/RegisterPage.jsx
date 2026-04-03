import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Building2, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../utils/helpers'

const STEPS = ['Empresa', 'Administrador', 'Listo']

export default function RegisterPage() {
  const [step, setStep]     = useState(0)
  const [showPass, setShowPass] = useState(false)
  const { setAuth }  = useAuthStore()
  const navigate     = useNavigate()

  const { register, handleSubmit, watch, trigger, getValues,
          formState: { errors } } = useForm({ mode: 'onChange' })

  const { mutate, isPending, error, isSuccess } = useMutation({
    mutationFn: (data) => api.post('/auth/register', data),
    onSuccess: ({ data }) => {
      const { user, accessToken, refreshToken } = data.data
      setAuth(user, accessToken, refreshToken)
      setStep(2)
      setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
    },
  })

  const nextStep = async () => {
    const fields = step === 0
      ? ['company_name', 'ruc']
      : ['first_name', 'last_name', 'email', 'password']
    const ok = await trigger(fields)
    if (ok) setStep(s => s + 1)
  }

  const onSubmit = (data) => mutate(data)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-grid-navy bg-grid opacity-40" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full bg-blue-600/8 blur-3xl" />
      <div className="absolute bottom-1/3 left-1/4 w-80 h-80 rounded-full bg-amber-500/6 blur-3xl" />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-glow-amber">
              <Building2 className="w-5 h-5 text-navy-950" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">
              Civil<span className="text-amber-500">Desk</span>
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">
            Crear cuenta
          </h1>
          <p className="text-muted-foreground text-sm">Configura tu empresa en menos de 2 minutos</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6 animate-fade-up-200">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                i < step  ? 'bg-amber-500 text-navy-950' :
                i === step ? 'bg-primary text-white' :
                             'bg-secondary text-muted-foreground'
              )}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn('text-xs', i === step ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={cn('w-8 h-px', i < step ? 'bg-amber-500' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="glass-card p-8 animate-fade-up-400">
          {/* Step 2 — Success */}
          {step === 2 && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30
                              flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="font-display font-bold text-lg text-foreground mb-2">¡Cuenta creada!</h2>
              <p className="text-sm text-muted-foreground">
                Redirigiendo al dashboard...
              </p>
              <div className="mt-4 w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 0 — Company */}
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="font-display font-semibold text-foreground mb-4">Datos de la Empresa</h2>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    {error.response?.data?.message || 'Error al crear la cuenta'}
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Nombre de la empresa *
                  </label>
                  <input
                    className={cn('field-input mt-1', errors.company_name && 'border-rose-500')}
                    placeholder="Ej: Constructora XYZ S.A."
                    {...register('company_name', { required: 'Nombre de empresa requerido' })}
                  />
                  {errors.company_name && <p className="text-rose-400 text-xs mt-1">{errors.company_name.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">RUC</label>
                  <input
                    className="field-input mt-1"
                    placeholder="Ej: 1792345678001"
                    {...register('ruc')}
                  />
                </div>

                <button type="button" onClick={nextStep} className="btn-primary w-full justify-center py-2.5">
                  Siguiente <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step 1 — Admin user */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <button type="button" onClick={() => setStep(0)} className="btn-ghost p-1.5">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h2 className="font-display font-semibold text-foreground">Datos del Administrador</h2>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                    {error.response?.data?.message || 'Error al crear la cuenta'}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nombre *</label>
                    <input className={cn('field-input mt-1', errors.first_name && 'border-rose-500')}
                      placeholder="Carlos"
                      {...register('first_name', { required: 'Nombre requerido' })} />
                    {errors.first_name && <p className="text-rose-400 text-xs mt-1">{errors.first_name.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Apellido *</label>
                    <input className={cn('field-input mt-1', errors.last_name && 'border-rose-500')}
                      placeholder="Villafuerte"
                      {...register('last_name', { required: 'Apellido requerido' })} />
                    {errors.last_name && <p className="text-rose-400 text-xs mt-1">{errors.last_name.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email *</label>
                  <input type="email" className={cn('field-input mt-1', errors.email && 'border-rose-500')}
                    placeholder="admin@empresa.com"
                    {...register('email', {
                      required: 'Email requerido',
                      pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email inválido' }
                    })} />
                  {errors.email && <p className="text-rose-400 text-xs mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contraseña *</label>
                  <div className="relative mt-1">
                    <input type={showPass ? 'text' : 'password'}
                      className={cn('field-input pr-10', errors.password && 'border-rose-500')}
                      placeholder="Mínimo 8 caracteres"
                      {...register('password', {
                        required: 'Contraseña requerida',
                        minLength: { value: 8, message: 'Mínimo 8 caracteres' }
                      })} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-rose-400 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Teléfono</label>
                  <input className="field-input mt-1" placeholder="0999999999" {...register('phone')} />
                </div>

                <button type="submit" disabled={isPending} className="btn-primary w-full justify-center py-2.5">
                  {isPending ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creando cuenta...</>
                  ) : (
                    <>Crear cuenta <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {step < 2 && (
          <p className="text-center text-xs text-muted-foreground mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-amber-400 hover:text-amber-300 transition-colors">
              Ingresar
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Building2, Eye, EyeOff, ArrowRight, Lock, Mail } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import { cn } from '../../utils/helpers'

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate    = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm()

  const { mutate, isPending, error } = useMutation({
    mutationFn: (data) => api.post('/auth/login', data),
    onSuccess: ({ data }) => {
      const { user, accessToken, refreshToken } = data.data
      setAuth(user, accessToken, refreshToken)
      navigate('/dashboard', { replace: true })
    },
  })

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">

      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-navy bg-grid opacity-40" />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full
                      bg-blue-600/8 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full
                      bg-amber-500/6 blur-3xl pointer-events-none" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-up">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center
                            shadow-glow-amber">
              <Building2 className="w-5 h-5 text-navy-950" />
            </div>
            <span className="font-display font-bold text-2xl tracking-tight">
              Civil<span className="text-amber-500">Desk</span>
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-1">
            Bienvenido de vuelta
          </h1>
          <p className="text-muted-foreground text-sm">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit(data => mutate(data))} className="space-y-5">

            {/* Error global */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10
                              border border-rose-500/20 text-rose-400 text-sm animate-fade-up">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                {error.response?.data?.message || 'Credenciales incorrectas'}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="ingeniero@empresa.com"
                  className={cn('field-input pl-10', errors.email && 'border-rose-500 focus:ring-rose-500/30')}
                  {...register('email', { required: 'Email requerido' })}
                />
              </div>
              {errors.email && (
                <p className="text-rose-400 text-xs">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={cn('field-input pl-10 pr-10', errors.password && 'border-rose-500')}
                  {...register('password', { required: 'Contraseña requerida' })}
                />
                <button type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-400 text-xs">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary w-full justify-center py-2.5 mt-2 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  Ingresar al sistema
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          CivilDesk v1.0 — Plataforma de Gestión para Ingeniería Civil
        </p>
        <p className="text-center text-xs text-muted-foreground mt-2">
          ¿Sin cuenta?{' '}
          <Link to="/register" className="text-amber-400 hover:text-amber-300 transition-colors">
            Crear empresa
          </Link>
        </p>
      </div>
    </div>
  )
}

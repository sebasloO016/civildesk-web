import { useState, useRef } from 'react'
import { Upload, FileText, ExternalLink, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '../utils/helpers'

const MAX_SIZE_MB = 5

export default function UploadDocBtn({
  label = 'Adjuntar documento',
  labelReplace = 'Reemplazar documento',
  currentUrl,
  onUploaded,
  accept = 'application/pdf,.pdf,image/jpeg,image/png',
  className,
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState(null)
  const [success, setSuccess]     = useState(false)
  const inputRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setSuccess(false)

    // Validar tamaño
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_SIZE_MB) {
      setError(`Archivo demasiado grande (${sizeMB.toFixed(1)} MB). Máximo: ${MAX_SIZE_MB} MB`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setUploading(true)

    try {
      let url = null

      const cloudName    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

      if (cloudName && uploadPreset) {
        // Opción 1: Cloudinary (requiere VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET en .env)
        const fd = new FormData()
        fd.append('file', file)
        fd.append('upload_preset', uploadPreset)
        const resource = file.type.startsWith('image/') ? 'image' : 'raw'
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/${resource}/upload`,
          { method: 'POST', body: fd }
        )
        if (!res.ok) throw new Error(`Cloudinary ${res.status}`)
        const data = await res.json()
        if (!data.secure_url) throw new Error('Sin URL de Cloudinary')
        url = data.secure_url
      } else {
        // Fallback: base64 — funciona sin configuración extra, hasta ~3MB práctico
        url = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload  = (ev) => resolve(ev.target.result)
          reader.onerror = ()  => reject(new Error('Error al leer el archivo'))
          reader.readAsDataURL(file)
        })
      }

      await onUploaded?.(url)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

    } catch (err) {
      console.error('[UploadDocBtn]', err)
      setError('No se pudo adjuntar el documento. Verifica el archivo e intenta de nuevo.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const openBase64 = (dataUrl) => {
    try {
      const parts    = dataUrl.split(',')
      const mimeType = parts[0].split(':')[1].split(';')[0]
      const binary   = atob(parts[1])
      const ab       = new ArrayBuffer(binary.length)
      const ia       = new Uint8Array(ab)
      for (let i = 0; i < binary.length; i++) ia[i] = binary.charCodeAt(i)
      const blob = new Blob([ab], { type: mimeType })
      window.open(URL.createObjectURL(blob), '_blank')
    } catch {
      window.open(dataUrl, '_blank')
    }
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-2 flex-wrap">

        <label className={cn(
          'btn-ghost text-xs cursor-pointer flex items-center gap-1.5 select-none',
          uploading && 'opacity-60 pointer-events-none'
        )}>
          {uploading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Procesando...</>
            : success
              ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Guardado ✓</>
              : <><Upload className="w-3.5 h-3.5" /> {currentUrl ? labelReplace : label}</>}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFile}
            disabled={uploading}
          />
        </label>

        {currentUrl && !uploading && (
          currentUrl.startsWith('data:') ? (
            <button
              type="button"
              onClick={() => openBase64(currentUrl)}
              className="btn-ghost text-xs text-emerald-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Ver documento
              <ExternalLink className="w-3 h-3" />
            </button>
          ) : (
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs text-emerald-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Ver documento
              <ExternalLink className="w-3 h-3" />
            </a>
          )
        )}
      </div>

      {error && (
        <div className="flex items-start gap-1.5 text-xs text-rose-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!currentUrl && !uploading && !error && (
        <p className="text-[10px] text-muted-foreground/50">
          PDF o imagen · Máx. {MAX_SIZE_MB} MB
        </p>
      )}
    </div>
  )
}
import { useState } from 'react'
import { Upload, FileText, ExternalLink, Loader2, X } from 'lucide-react'
import { cn } from '../utils/helpers'

/**
 * Botón reutilizable para subir documentos (PDF, imágenes).
 * Sube a Cloudinary si están configuradas las variables, o usa base64 como fallback.
 * 
 * Props:
 *   label        - texto del botón cuando no hay doc
 *   labelReplace - texto cuando ya hay doc subido
 *   currentUrl   - URL actual del documento (si existe)
 *   onUploaded   - callback(url) cuando termina la subida
 *   accept       - mime types aceptados (default: "application/pdf,.pdf")
 *   className    - clases adicionales
 */
export default function UploadDocBtn({
  label = 'Adjuntar documento',
  labelReplace = 'Reemplazar documento',
  currentUrl,
  onUploaded,
  accept = 'application/pdf,.pdf',
  className,
}) {
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const cloudName    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
      const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
      let url = null

      if (cloudName && uploadPreset) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('upload_preset', uploadPreset)
        const resource = file.type.startsWith('image/') ? 'image' : 'raw'
        const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resource}/upload`, { method: 'POST', body: fd })
        const data = await res.json()
        if (!data.secure_url) throw new Error('Upload fallido')
        url = data.secure_url
      } else {
        url = await new Promise((r, rej) => {
          const reader = new FileReader()
          reader.onload = (ev) => r(ev.target.result)
          reader.onerror = () => rej(new Error('Error leyendo archivo'))
          reader.readAsDataURL(file)
        })
      }
      onUploaded?.(url)
    } catch (err) {
      console.error('Error subiendo documento:', err)
    } finally {
      setUploading(false)
      // Limpiar el input para permitir subir el mismo archivo de nuevo
      e.target.value = ''
    }
  }

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <label className={cn(
        'btn-ghost text-xs cursor-pointer flex items-center gap-1.5',
        uploading && 'opacity-50 pointer-events-none'
      )}>
        {uploading
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo...</>
          : <><Upload className="w-3.5 h-3.5" /> {currentUrl ? labelReplace : label}</>}
        <input type="file" accept={accept} className="hidden" onChange={handleFile} disabled={uploading} />
      </label>

      {currentUrl && (
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost text-xs text-emerald-400 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Ver documento
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  )
}

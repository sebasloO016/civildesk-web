import { create } from 'zustand'

export const useUIStore = create((set, get) => ({
  sidebarOpen:   true,
  toasts:        [],
  activeModal:   null,

  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),

  toast: ({ title, description, variant = 'default' }) => {
    const id = Date.now()
    set(s => ({ toasts: [...s.toasts, { id, title, description, variant }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000)
  },

  openModal:  (name, data = null) => set({ activeModal: { name, data } }),
  closeModal: ()                  => set({ activeModal: null }),
}))

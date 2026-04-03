import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor: adjuntar token ───────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor: renovar token automáticamente ───────
let isRefreshing = false
let queue = []

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      original._retry = true
      isRefreshing    = true

      try {
        const refresh = useAuthStore.getState().refreshToken
        const { data } = await axios.post('/api/auth/refresh', { refreshToken: refresh })
        const newToken = data.data.accessToken

        useAuthStore.getState().setTokens(newToken, data.data.refreshToken)
        queue.forEach(p => p.resolve(newToken))
        queue = []

        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        queue.forEach(p => p.reject())
        queue = []
        useAuthStore.getState().logout()
        window.location.href = '/login'
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ── Helpers ───────────────────────────────────────────────────
export const worksApi = {
  getAll:            (params)       => api.get('/works', { params }),
  getOne:            (id)           => api.get(`/works/${id}`),
  create:            (data)         => api.post('/works', data),
  createFromProject: (projectId, d) => api.post(`/works/from-project/${projectId}`, d),
  update:            (id, data)     => api.put(`/works/${id}`, data),
  remove:            (id)           => api.delete(`/works/${id}`),
  getBudget:         (id)           => api.get(`/works/${id}/budget-summary`),
  updateProgress:    (id, data)     => api.post(`/works/${id}/progress`, data),
  getCurveS:         (id)           => api.get(`/works/${id}/curve-s`),
  close:             (id, data)     => api.post(`/works/${id}/close`, data),
  getReports:        (id, params)   => api.get(`/works/${id}/reports`, { params }),
  createReport:      (id, data)     => api.post(`/works/${id}/reports`, data),
}

export const projectsApi = {
  getAll:           (params)          => api.get('/projects', { params }),
  getOne:           (id)              => api.get(`/projects/${id}`),
  create:           (data)            => api.post('/projects', data),
  update:           (id, data)        => api.put(`/projects/${id}`, data),
  getProformas:     (id)              => api.get(`/projects/${id}/proformas`),
  createProforma:   (id, data)        => api.post(`/projects/${id}/proformas`, data),
  updateProforma:   (id, pid, data)   => api.patch(`/projects/${id}/proformas/${pid}/status`, data),
  createContract:   (id, data)        => api.post(`/projects/${id}/contract`, data),
  signContract:     (id, data)        => api.patch(`/projects/${id}/contract/sign`, data),
  addAddendum:      (id, data)        => api.post(`/projects/${id}/contract/addendum`, data),
  createLiquidation:(id, data)        => api.post(`/projects/${id}/liquidation`, data),
  signLiquidation:  (id, data)        => api.patch(`/projects/${id}/liquidation/sign`, data),
}

export const suppliersApi = {
  getAll:       (params)           => api.get('/suppliers', { params }),
  getOne:       (id)               => api.get(`/suppliers/${id}`),
  create:       (data)             => api.post('/suppliers', data),
  update:       (id, data)         => api.put(`/suppliers/${id}`, data),
  remove:       (id)               => api.delete(`/suppliers/${id}`),
  updatePrice:  (id, pid, data)    => api.put(`/suppliers/${id}/products/${pid}/price`, data),
  compare:      (productId)        => api.get(`/suppliers/compare/${productId}`),
  history:      (id)               => api.get(`/suppliers/${id}/price-history`),
}

export const productsApi = {
  getAll:      (params)   => api.get('/products', { params }),
  getOne:      (id)       => api.get(`/products/${id}`),
  create:      (data)     => api.post('/products', data),
  update:      (id, data) => api.put(`/products/${id}`, data),
  remove:      (id)       => api.delete(`/products/${id}`),
  categories:  ()         => api.get('/products/categories'),
  import:      (rows)     => api.post('/products/import', { rows }),
}

export const purchasesApi = {
  getRequests:      (params)  => api.get('/purchases/requests', { params }),
  createRequest:    (data)    => api.post('/purchases/requests', data),
  generateOrders:   (id)      => api.post(`/purchases/requests/${id}/generate-orders`),
  getOrders:        (params)  => api.get('/purchases/orders', { params }),
  updateOrder:      (id, data)=> api.patch(`/purchases/orders/${id}/status`, data),
  getInvoices:      (params)  => api.get('/purchases/invoices', { params }),
  createInvoice:    (data)    => api.post('/purchases/invoices', data),
  getUnreconciled:  (params)  => api.get('/purchases/unreconciled', { params }),
}

export const warehouseApi = {
  getStock:         (params)  => api.get('/warehouses/stock', { params }),
  getMovements:     (params)  => api.get('/warehouses/movements', { params }),
  getSuggestions:   (ids)     => api.get('/warehouses/stock/suggestions', { params: { product_ids: ids.join(',') } }),
  getEfficiency:    (params)  => api.get('/warehouses/efficiency', { params }),
  assign:           (data)    => api.post('/warehouses/assign', data),
  reserve:          (data)    => api.post('/warehouses/reserve', data),
}

export const financeApi = {
  getTransactions:  (params)  => api.get('/finance/transactions', { params }),
  createTransaction:(data)    => api.post('/finance/transactions', data),
  getSummary:       (params)  => api.get('/finance/summary', { params }),
  getWorksSummary:  ()        => api.get('/finance/works-summary'),
  getCashflow:      (params)  => api.get('/finance/cashflow', { params }),
}

export const alertsApi = {
  getAll:       (params)  => api.get('/alerts', { params }),
  markRead:     (id)      => api.patch(`/alerts/${id}/read`),
  markAllRead:  ()        => api.patch('/alerts/read-all'),
  runNow:       ()        => api.post('/alerts/run'),
}

export const clientsApi = {
  getAll:  (params)   => api.get('/clients', { params }),
  getOne:  (id)       => api.get(`/clients/${id}`),
  create:  (data)     => api.post('/clients', data),
  update:  (id, data) => api.put(`/clients/${id}`, data),
}

export const catalogApi = {
  getCategories: ()         => api.get('/catalog/categories'),
  getRubros:     (params)   => api.get('/catalog', { params }),
  createCategory:(data)     => api.post('/catalog/categories', data),
  createRubro:   (data)     => api.post('/catalog', data),
  updateRubro:   (id, data) => api.put(`/catalog/${id}`, data),
  deleteRubro:   (id)       => api.delete(`/catalog/${id}`),
}

export default api

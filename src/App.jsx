import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppLayout      from './components/layout/AppLayout'
import LoginPage      from './pages/auth/LoginPage'
import RegisterPage   from './pages/auth/RegisterPage'
import Dashboard      from './pages/dashboard/Dashboard'
import WorksList      from './pages/works/WorksList'
import WorkDetail     from './pages/works/WorkDetail'
import ProjectsList   from './pages/projects/ProjectsList'
import ProjectDetail  from './pages/projects/ProjectDetail'
import SuppliersList  from './pages/suppliers/SuppliersList'
import WarehousePage  from './pages/warehouse/WarehousePage'
import FinancePage    from './pages/finance/FinancePage'
import PurchasesPage  from './pages/purchases/PurchasesPage'
import CatalogPage    from './pages/catalog/CatalogPage'
import ConfigPage     from './pages/config/ConfigPage'
import ReportsPage    from './pages/reports/ReportsPage'
import ClientsPage    from './pages/clients/ClientsPage'
import ProductsPage   from './pages/products/ProductsPage'
import ToastContainer from './components/ui/ToastContainer'

const ProtectedRoute = ({ children }) => {
  const isAuth = useAuthStore(s => s.isAuth)
  return isAuth ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index               element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"    element={<Dashboard />} />
          <Route path="works"        element={<WorksList />} />
          <Route path="works/:id"    element={<WorkDetail />} />
          <Route path="projects"     element={<ProjectsList />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="suppliers"    element={<SuppliersList />} />
          <Route path="warehouse"    element={<WarehousePage />} />
          <Route path="finance"      element={<FinancePage />} />
          <Route path="purchases"    element={<PurchasesPage />} />
          <Route path="catalog"  element={<CatalogPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="config"       element={<ConfigPage />} />
          <Route path="reports"      element={<ReportsPage />} />
          <Route path="clients"      element={<ClientsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <ToastContainer />
    </>
  )
}

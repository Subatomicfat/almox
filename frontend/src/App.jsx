import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/layout/Layout';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import VehiclesPage from './pages/VehiclesPage';
import AssetsPage from './pages/AssetsPage';
import MovementsPage from './pages/MovementsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import AuditLogPage from './pages/AuditLogPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/produtos" element={<ProductsPage />} />
              <Route path="/veiculos" element={<VehiclesPage />} />
              <Route path="/ativos" element={<AssetsPage />} />
              <Route path="/movimentacoes" element={<MovementsPage />} />
              <Route path="/relatorios" element={<ReportsPage />} />
              <Route path="/usuarios" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
              <Route path="/auditoria" element={<ProtectedRoute roles={['admin']}><AuditLogPage /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

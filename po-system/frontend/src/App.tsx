import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './lib/api';
import { Sidebar } from './components/Sidebar';
import { Spinner } from './components/UI';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Quotations from './pages/Quotations';
import QuotationDetail from './pages/QuotationDetail';
import PurchaseOrders from './pages/PurchaseOrders';
import PODetail from './pages/PODetail';
import NewPO from './pages/NewPO';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size={32} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function AppRoutes() {
  const base = import.meta.env.VITE_BASE_PATH || '/';
  return (
    <BrowserRouter basename={base}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/quotations" element={<Quotations />} />
          <Route path="/quotations/:id" element={<QuotationDetail />} />
          <Route path="/pos" element={<PurchaseOrders />} />
          <Route path="/pos/new" element={<NewPO />} />
          <Route path="/pos/:id" element={<PODetail />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster position="top-right" toastOptions={{
        style: { borderRadius: '10px', fontSize: '14px', fontFamily: 'IBM Plex Sans, sans-serif' },
      }} />
    </AuthProvider>
  );
}

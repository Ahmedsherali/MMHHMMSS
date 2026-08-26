import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HallBookingPage from './pages/HallBookingPage';
import CateringPage from './pages/CateringPage';
import MenuPricingPage from './pages/MenuPricingPage';
import ExpensesPage from './pages/ExpensesPage';
import TeamManagementPage from './pages/TeamManagementPage';

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard Overview';
      case '/bookings': return 'Hall Bookings & Calendar';
      case '/catering': return 'Catering Orders';
      case '/menu': return 'Menu & Global Pricing';
      case '/expenses': return 'Expenses & P&L Tracking';
      case '/team': return 'Team & Workers';
      default: return 'MHMS Portal';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Navbar onMenuClick={() => setSidebarOpen(true)} title={getPageTitle()} />
        <main className="flex-1 pb-12">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/bookings" element={<HallBookingPage />} />
            <Route path="/catering" element={<CateringPage />} />
            <Route path="/menu" element={<MenuPricingPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/team" element={<TeamManagementPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<AppLayout />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

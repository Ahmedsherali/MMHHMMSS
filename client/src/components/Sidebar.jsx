import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarDays, 
  UtensilsCrossed, 
  Receipt, 
  Users, 
  BookOpenText, 
  LogOut,
  Building2,
  X,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Hall Bookings & Calendar', href: '/bookings', icon: CalendarDays },
  { name: 'Catering Orders', href: '/catering', icon: UtensilsCrossed },
  { name: 'Menu & Pricing', href: '/menu', icon: BookOpenText },
  { name: 'Expenses Tracking', href: '/expenses', icon: Receipt },
  { name: 'Team & Workers', href: '/team', icon: Users },
];

export default function Sidebar({ isOpen, onClose }) {
  const { logout, admin } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    logout();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* ── Logout confirmation modal ───────────────────────────────────── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-5">
            {/* Icon + heading */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-rose-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Close the application?</h2>
                <p className="text-sm text-slate-500 mt-1">
                  You will be signed out of the MHMS Portal. Any unsaved changes will be lost.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-md shadow-rose-600/25 transition-colors"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-tight">MHMS Portal</h1>
              <span className="text-xs text-emerald-400 font-medium">Marriage Hall System</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Management</p>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 shadow-sm border border-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User profile + logout trigger */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-700/50 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-sm">
                {admin?.name ? admin.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-slate-200">{admin?.name || 'Administrator'}</p>
                <p className="text-xs text-slate-400 truncate">{admin?.email || 'admin@mhms.com'}</p>
              </div>
            </div>
            <button
              onClick={() => setShowLogoutModal(true)}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

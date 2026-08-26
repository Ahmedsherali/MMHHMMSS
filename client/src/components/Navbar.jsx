import React from 'react';
import { Menu, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onMenuClick, title }) {
  const { admin } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs">
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-hidden"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200/60 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Admin Authenticated</span>
        </div>
        <div className="flex items-center space-x-2 text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
          <User className="w-4 h-4 text-slate-500" />
          <span>{admin?.name || 'Admin'}</span>
        </div>
      </div>
    </header>
  );
}

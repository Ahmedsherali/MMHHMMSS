import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function TeamManagementPage() {
  const [workers, setWorkers] = useState([]);
  const [stats, setStats] = useState({
    activeTotal: 0,
    activePermanent: 0,
    activePPD: 0,
    monthlyPayrollEstimate: 0,
    dailyWagePoolEstimate: 0,
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Permanent',
    wageRate: '',
    phone: '',
    notes: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchWorkers();
    fetchStats();
  }, []);

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/workers');
      if (res.data.success) {
        setWorkers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load workers:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/workers/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load worker stats:', err);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.phone && !/^\d{4}-\d{7}$/.test(formData.phone.trim())) {
      setError('Phone number must match format XXXX-XXXXXXX (e.g. 0300-1234567).');
      return;
    }

    try {
      const res = await api.post('/workers', {
        name: formData.name,
        type: formData.type,
        wageRate: Number(formData.wageRate),
        phone: formData.phone,
        notes: formData.notes,
      });

      if (res.data.success) {
        setSuccess(`Registered ${formData.name} as ${formData.type} staff.`);
        setShowAddModal(false);
        setFormData({ name: '', type: 'Permanent', wageRate: '', phone: '', notes: '' });
        fetchWorkers();
        fetchStats();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register worker.');
    }
  };

  const handleTerminate = async (id, name) => {
    if (!window.confirm(`Terminate worker "${name}"? Status will become "Terminated" and payroll history will be preserved.`)) {
      return;
    }
    try {
      const res = await api.delete(`/workers/${id}`);
      if (res.data.success) {
        fetchWorkers();
        fetchStats();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to terminate worker.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Team & Employee Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage Permanent (Monthly Salaried) staff and Pay-Per-Day (PPD) Daily Wagers.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-2 w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Register Staff Member</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Permanent Staff</p>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.activePermanent}</p>
          <span className="text-xs text-indigo-600 font-semibold">Monthly Fixed</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active PPD Daily Wagers</p>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.activePPD}</p>
          <span className="text-xs text-amber-600 font-semibold">Pay-Per-Day</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Payroll Estimate</p>
          <p className="text-2xl font-extrabold text-slate-800 mt-1 font-mono">
            Rs. {stats.monthlyPayrollEstimate?.toLocaleString()}
          </p>
          <span className="text-xs text-slate-400">Permanent Salaries</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Shift Pool</p>
          <p className="text-2xl font-extrabold text-slate-800 mt-1 font-mono">
            Rs. {stats.dailyWagePoolEstimate?.toLocaleString()}
          </p>
          <span className="text-xs text-slate-400">Per event day</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-900">Workers Roster</h3>
          <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">{workers.length} members</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Name & Phone</th>
                <th className="px-6 py-3.5">Contract Type</th>
                <th className="px-6 py-3.5">Wage Rate</th>
                <th className="px-6 py-3.5">Joining Date</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {workers.map((w) => (
                <tr key={w._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">
                    <div>{w.name}</div>
                    <div className="text-slate-400 font-mono text-[11px]">{w.phone || 'No phone'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      w.type === 'Permanent' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {w.type === 'Permanent' ? 'Permanent (Monthly)' : 'PPD (Daily)'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">
                    Rs. {w.wageRate.toLocaleString()} {w.type === 'Permanent' ? '/ month' : '/ day'}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{new Date(w.joiningDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      w.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {w.status !== 'Terminated' && (
                      <button
                        onClick={() => handleTerminate(w._id, w.name)}
                        className="text-rose-600 hover:text-rose-700 font-semibold p-1.5 rounded-lg hover:bg-rose-50"
                      >
                        Terminate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Register Worker / Staff
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rashid Ali"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Worker Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="Permanent">Permanent (Monthly Salary)</option>
                  <option value="PPD">PPD (Pay-Per-Day Daily Wager)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  {formData.type === 'Permanent' ? 'Monthly Salary Rate (Rs.) *' : 'Daily Wage Rate (Rs.) *'}
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.wageRate}
                  onChange={(e) => setFormData({ ...formData, wageRate: e.target.value })}
                  placeholder="e.g. 35000"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Phone (Format: \d{4}-\d{7})
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                    const formatted = digits.length > 4
                      ? digits.slice(0, 4) + '-' + digits.slice(4)
                      : digits;
                    setFormData({ ...formData, phone: formatted });
                  }}
                  placeholder="0300-1234567"
                  maxLength={12}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden font-mono"
                />
                <span className="text-[11px] text-slate-400">Format: 0300-1234567 (4 digits, hyphen, 7 digits)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Notes
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Role, shift assignments..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30"
                >
                  Register Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

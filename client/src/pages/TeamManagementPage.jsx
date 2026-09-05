import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

// Phone auto-formatter — strips non-digits, caps at 11, inserts hyphen after 4
const formatPhone = (raw) => {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  return digits.length > 4 ? digits.slice(0, 4) + '-' + digits.slice(4) : digits;
};
const PHONE_REGEX = /^\d{4}-\d{7}$/;

const EMPTY_FORM = { name: '', type: 'Permanent', wageRate: '', phone: '', notes: '' };
const EMPTY_EDIT = { type: 'Permanent', wageRate: '', phone: '' };

export default function TeamManagementPage() {
  const [workers, setWorkers]           = useState([]);
  const [stats, setStats]               = useState({ activePermanent: 0, activePPD: 0 });

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [addError, setAddError]         = useState('');
  const [addSuccess, setAddSuccess]     = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);

  // Edit modal
  const [editTarget, setEditTarget]     = useState(null);
  const [editData, setEditData]         = useState(EMPTY_EDIT);
  const [editError, setEditError]       = useState('');

  useEffect(() => { fetchWorkers(); fetchStats(); }, []);

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/workers');
      if (res.data.success) setWorkers(res.data.data);
    } catch (err) { console.error('Failed to load workers:', err); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/workers/stats');
      if (res.data.success) setStats(res.data.data);
    } catch (err) { console.error('Failed to load stats:', err); }
  };

  // Register new worker
  const handleRegister = async (e) => {
    e.preventDefault();
    setAddError(''); setAddSuccess('');
    if (!PHONE_REGEX.test(formData.phone.trim())) {
      setAddError('Phone must match XXXX-XXXXXXX (e.g. 0300-1234567).');
      return;
    }
    try {
      const res = await api.post('/workers', {
        name: formData.name, type: formData.type,
        wageRate: Number(formData.wageRate), phone: formData.phone, notes: formData.notes,
      });
      if (res.data.success) {
        setAddSuccess('Registered ' + formData.name + ' as ' + formData.type + ' staff.');
        setShowAddModal(false); setFormData(EMPTY_FORM);
        fetchWorkers(); fetchStats();
      }
    } catch (err) { setAddError(err.response?.data?.message || 'Failed to register worker.'); }
  };

  // Soft-terminate (preserves payroll history)
  const requestTerminate = (id, name) => {
    setConfirmTarget({ action: 'terminate', id, name });
  };

  const executeTerminate = async () => {
    const { id } = confirmTarget;
    setConfirmTarget(null);
    try {
      const res = await api.delete('/workers/' + id);
      if (res.data.success) { fetchWorkers(); fetchStats(); }
    } catch (err) { setAddError(err.response?.data?.message || 'Failed to terminate.'); }
  };

  // Hard-delete (terminated workers only)
  const requestRemove = (id, name) => {
    setConfirmTarget({ action: 'remove', id, name });
  };

  const executeRemove = async () => {
    const { id } = confirmTarget;
    setConfirmTarget(null);
    try {
      const res = await api.delete('/workers/' + id + '/remove');
      if (res.data.success) { fetchWorkers(); fetchStats(); }
    } catch (err) { setAddError(err.response?.data?.message || 'Failed to remove worker.'); }
  };

  // Open Edit modal pre-filled with current worker values
  const openEdit = (w) => {
    setEditTarget(w);
    setEditData({ type: w.type, wageRate: String(w.wageRate), phone: w.phone || '' });
    setEditError('');
  };

  // Save edit (type, wageRate, phone)
  const handleEdit = async (e) => {
    e.preventDefault(); setEditError('');
    if (!PHONE_REGEX.test(editData.phone.trim())) {
      setEditError('Phone must match XXXX-XXXXXXX (e.g. 0300-1234567).');
      return;
    }
    try {
      const res = await api.put('/workers/' + editTarget._id, {
        type: editData.type, wageRate: Number(editData.wageRate), phone: editData.phone,
      });
      if (res.data.success) { setEditTarget(null); fetchWorkers(); fetchStats(); }
    } catch (err) { setEditError(err.response?.data?.message || 'Failed to update worker.'); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* Page Header — subtitle removed */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Team &amp; Employee Management
        </h1>
        <button
          onClick={() => { setShowAddModal(true); setAddError(''); setAddSuccess(''); }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-2 w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Register Staff Member</span>
        </button>
      </div>

      {/* Stat Cards — only Permanent + PPD counts (payroll cards removed) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
      </div>

      {/* Success Banner */}
      {addSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs border border-emerald-200 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{addSuccess}</span>
        </div>
      )}

      {/* Workers Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-900">Workers Roster</h3>
          <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
            {workers.length} members
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Name &amp; Phone</th>
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
                    <div className="text-slate-400 font-mono text-[11px]">{w.phone || '\u2014'}</div>
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
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(w.joiningDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      w.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {w.status !== 'Terminated' ? (
                      /* Active workers: Edit + Terminate */
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEdit(w)}
                          className="inline-flex items-center space-x-1 text-slate-600 hover:text-emerald-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => requestTerminate(w._id, w.name)}
                          className="inline-flex items-center space-x-1 text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-rose-50 border border-rose-200 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Terminate</span>
                        </button>
                      </div>
                    ) : (
                      /* Terminated workers: Remove (hard-delete) */
                      <button
                        onClick={() => requestRemove(w._id, w.name)}
                        className="inline-flex items-center space-x-1 text-slate-500 hover:text-rose-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {workers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">
                    No workers registered yet. Click "Register Staff Member" to add the first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── REGISTER MODAL ─────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Register Worker / Staff
            </h3>

            {addError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Full Name *
                </label>
                <input
                  type="text" required value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rashid Ali"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Worker Type */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Worker Type *
                </label>
                <select value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="Permanent">Permanent (Monthly Salary)</option>
                  <option value="PPD">PPD (Pay-Per-Day Daily Wager)</option>
                </select>
              </div>

              {/* Wage Rate */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  {formData.type === 'Permanent' ? 'Monthly Salary Rate (Rs.) *' : 'Daily Wage Rate (Rs.) *'}
                </label>
                <input
                  type="number" min="0" required value={formData.wageRate}
                  onChange={(e) => setFormData({ ...formData, wageRate: e.target.value })}
                  placeholder="e.g. 35000"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden font-mono"
                />
              </div>

              {/* Phone — required, auto-formatted, helper text removed */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Phone *
                </label>
                <input
                  type="text" required value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                  placeholder="0300-1234567" maxLength={12}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden font-mono"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Notes
                </label>
                <textarea rows="2" value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Role, shift assignments..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button type="button"
                  onClick={() => { setShowAddModal(false); setFormData(EMPTY_FORM); setAddError(''); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30">
                  Register Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL (type, wageRate, phone) ─────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                Edit Worker — {editTarget.name}
              </h3>
              <button onClick={() => setEditTarget(null)}
                className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEdit} className="space-y-4">
              {/* Worker Type */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Worker Type *
                </label>
                <select value={editData.type}
                  onChange={(e) => setEditData({ ...editData, type: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="Permanent">Permanent (Monthly Salary)</option>
                  <option value="PPD">PPD (Pay-Per-Day Daily Wager)</option>
                </select>
              </div>

              {/* Wage Rate */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  {editData.type === 'Permanent' ? 'Monthly Salary Rate (Rs.) *' : 'Daily Wage Rate (Rs.) *'}
                </label>
                <input
                  type="number" min="0" required value={editData.wageRate}
                  onChange={(e) => setEditData({ ...editData, wageRate: e.target.value })}
                  placeholder="e.g. 35000"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden font-mono"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Phone *
                </label>
                <input
                  type="text" required value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: formatPhone(e.target.value) })}
                  placeholder="0300-1234567" maxLength={12}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden font-mono"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation modal for Terminate and Remove */}
      <ConfirmModal
        open={!!confirmTarget}
        title={
          confirmTarget?.action === 'terminate'
            ? `Terminate "${confirmTarget?.name}"?`
            : `Remove "${confirmTarget?.name}"?`
        }
        message={
          confirmTarget?.action === 'terminate'
            ? 'Status will change to Terminated. Payroll history is preserved and the record can still be viewed.'
            : 'This will permanently delete the worker from the roster. This action cannot be undone.'
        }
        confirmLabel={confirmTarget?.action === 'terminate' ? 'Yes, Terminate' : 'Yes, Remove'}
        onConfirm={confirmTarget?.action === 'terminate' ? executeTerminate : executeRemove}
        onCancel={() => setConfirmTarget(null)}
      />

    </div>
  );
}

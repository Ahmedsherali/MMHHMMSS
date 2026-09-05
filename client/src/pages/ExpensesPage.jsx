import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Trash2, CheckCircle2, AlertCircle, Filter } from 'lucide-react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const CATEGORIES = [
  'Electricity',
  'Gas',
  'Water',
  'Wear & Tear',
  'Manager Wages',
  'Worker Wages',
  'Other',
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ grandTotal: 0, categories: [] });
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterCategory, setFilterCategory] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('2026');

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Electricity',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    description: '',
    worker: '',
  });

  const [error, setError] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchExpenses();
    fetchSummary();
    fetchWorkers();
  }, [filterCategory, filterMonth, filterYear]);

  const fetchExpenses = async () => {
    try {
      let query = `?year=${filterYear}`;
      if (filterMonth) query += `&month=${filterMonth}`;
      if (filterCategory) query += `&category=${filterCategory}`;

      const res = await api.get(`/expenses${query}`);
      if (res.data.success) {
        setExpenses(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      let query = `?year=${filterYear}`;
      if (filterMonth) query += `&month=${filterMonth}`;
      const res = await api.get(`/expenses/summary${query}`);
      if (res.data.success) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await api.get('/workers?status=Active');
      if (res.data.success) {
        setWorkers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load workers:', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload = {
        category: formData.category,
        amount: Number(formData.amount),
        expenseDate: formData.expenseDate,
        description: formData.description,
        worker: formData.category === 'Worker Wages' ? formData.worker || null : null,
      };

      const res = await api.post('/expenses', payload);
      if (res.data.success) {
        setSuccess(`Logged Rs. ${formData.amount} under ${formData.category}.`);
        setShowAddModal(false);
        setFormData({
          category: 'Electricity',
          amount: '',
          expenseDate: new Date().toISOString().split('T')[0],
          description: '',
          worker: '',
        });
        fetchExpenses();
        fetchSummary();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to log expense.');
    }
  };

  const requestDelete = (id) => {
    setConfirmTarget({ id });
  };

  const executeDelete = async () => {
    const { id } = confirmTarget;
    setConfirmTarget(null);
    try {
      const res = await api.delete(`/expenses/${id}`);
      if (res.data.success) {
        fetchExpenses();
        fetchSummary();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete expense.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Expenses Tracking</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-rose-600/30 transition-all flex items-center space-x-2 w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Log Expense</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-gradient-to-r from-rose-950 to-slate-900 text-white p-6 rounded-2xl border border-rose-900/50 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold text-rose-300 tracking-wider">Cumulative Spend ({filterYear})</span>
            <p className="text-3xl sm:text-4xl font-extrabold font-mono mt-1 text-rose-100">
              Rs. {summary.grandTotal?.toLocaleString()}
            </p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Receipt className="w-8 h-8" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {summary.categories?.map((cat) => (
            <div key={cat.category} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-500 truncate">{cat.category}</p>
              <p className="text-sm font-extrabold font-mono text-slate-900 mt-1">Rs. {cat.total.toLocaleString()}</p>
              <span className="text-[10px] text-slate-400">{cat.count} logs</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-1.5 font-semibold text-slate-700">
            <Filter className="w-4 h-4 text-slate-500" />
            <span>Filters:</span>
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-slate-50"
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2026, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-20 border border-slate-300 rounded-lg px-2 py-1.5 text-xs bg-slate-50 font-mono"
            placeholder="Year"
          />
        </div>

        <span className="text-xs text-slate-500 font-semibold">{expenses.length} records matching</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Linked Worker / Details</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {expenses.map((e) => (
                <tr key={e._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-bold text-slate-900">{e.category}</td>
                  <td className="px-6 py-4">{new Date(e.expenseDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold font-mono text-rose-600 text-sm">
                    Rs. {e.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {e.worker ? (
                      <span className="inline-flex items-center space-x-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold">
                        <span>Staff: {e.worker.name} ({e.worker.type})</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">{e.description || 'General expense'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => requestDelete(e._id)}
                      className="text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
              Log Expenditure
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-rose-500 focus:outline-hidden"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {formData.category === 'Worker Wages' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Link To Worker
                  </label>
                  <select
                    value={formData.worker}
                    onChange={(e) => setFormData({ ...formData, worker: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-rose-500 focus:outline-hidden"
                  >
                    <option value="">-- General Worker Payroll --</option>
                    {workers.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name} ({w.type} - Rs. {w.wageRate})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Amount (Rs.) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g. 45000"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-rose-500 focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Expense Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-rose-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Description / Invoice Note
                </label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. LESCO electricity bill August 2026..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-rose-500 focus:outline-hidden"
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!confirmTarget}
        title="Delete Expense?"
        message="This expense transaction will be permanently removed from the records."
        confirmLabel="Yes, Delete"
        onConfirm={executeDelete}
        onCancel={() => setConfirmTarget(null)}
      />

    </div>
  );
}

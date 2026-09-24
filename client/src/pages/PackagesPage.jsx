import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [formData, setFormData] = useState({ title: '', items: '', pricePerHead: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);

  useEffect(() => { fetchPackages(); }, []);

  const fetchPackages = async () => {
    try {
      const res = await api.get('/packages');
      if (res.data.success) setPackages(res.data.data);
    } catch (err) { console.error('Failed to load packages:', err); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editingPkg) {
        const res = await api.put(`/packages/${editingPkg._id}`, formData);
        if (res.data.success) {
          setSuccess(`Updated "${formData.title}" package.`);
          setEditingPkg(null);
        }
      } else {
        const res = await api.post('/packages', formData);
        if (res.data.success) {
          setSuccess(`Created package "${formData.title}" at Rs. ${formData.pricePerHead}/head.`);
          setShowModal(false);
        }
      }
      setFormData({ title: '', items: '', pricePerHead: '' });
      fetchPackages();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save package.');
    }
  };

  const requestDelete = (id, title) => { setConfirmTarget({ id, title }); };
  const executeDelete = async () => {
    const { id } = confirmTarget;
    setConfirmTarget(null);
    try {
      const res = await api.delete(`/packages/${id}`);
      if (res.data.success) fetchPackages();
    } catch (err) { setError(err.response?.data?.message || 'Failed to delete package.'); }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Event Packages</h1>
        </div>
        <button
          onClick={() => {
            setEditingPkg(null);
            setFormData({ title: '', items: '', pricePerHead: '' });
            setShowModal(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-2 w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Package</span>
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div key={pkg._id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-800">{pkg.title}</h3>
                  <p className="text-xs font-mono font-bold text-emerald-700 mt-1">Rs. {pkg.pricePerHead.toLocaleString()}/head</p>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setEditingPkg(pkg);
                      setFormData({ title: pkg.title, items: pkg.items, pricePerHead: pkg.pricePerHead });
                      setShowModal(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-white"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => requestDelete(pkg._id, pkg.title)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 whitespace-pre-line">{pkg.items}</p>
            </div>
          </div>
        ))}
        {packages.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400 text-sm">
            No packages created yet. Click "Add New Package" to get started.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              {editingPkg ? `Edit Package: ${editingPkg.title}` : 'Add New Package'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Package Title *
                </label>
                <input
                  type="text" required value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Chicken Menu + Setup"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Included Items / Description *
                </label>
                <textarea
                  rows="3" required value={formData.items}
                  onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                  placeholder="Chicken Biryani, Chicken Qorma, Raita, Naan, Soft Drink..."
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Price Per Head (Rs.) *
                </label>
                <input
                  type="number" min="0" required value={formData.pricePerHead}
                  onChange={(e) => setFormData({ ...formData, pricePerHead: e.target.value })}
                  placeholder="e.g. 1900"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden font-mono"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30">
                  {editingPkg ? 'Update Package' : 'Save Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmTarget}
        title={`Delete "${confirmTarget?.title}"?`}
        message="This package will be permanently removed. Existing bookings are not affected."
        confirmLabel="Yes, Delete"
        onConfirm={executeDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}

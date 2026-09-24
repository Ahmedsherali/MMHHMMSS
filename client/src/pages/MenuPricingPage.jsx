import React, { useState, useEffect } from 'react';
import { BookOpenText, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, Wind, Check, Power } from 'lucide-react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const CATEGORIES = ['Rice', 'Curry', 'Dessert', 'Beverage', 'Other'];

export default function MenuPricingPage() {
  const [items, setItems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    dishName: '',
    category: 'Rice',
    pricePerHead: '',
    description: '',
  });

  const [error, setError] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [success, setSuccess] = useState('');

  // AC Surcharge Settings State
  const [acRate, setAcRate] = useState(100);
  const [isACAvailable, setIsACAvailable] = useState(true);
  const [acLoading, setAcLoading] = useState(false);
  const [acSaving, setAcSaving] = useState(false);
  const [acSuccess, setAcSuccess] = useState('');
  const [acError, setAcError] = useState('');

  useEffect(() => {
    fetchMenuItems();
    fetchACSurcharge();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const res = await api.get('/menu');
      if (res.data.success) {
        setItems(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load menu items:', err);
    }
  };

  const fetchACSurcharge = async () => {
    setAcLoading(true);
    try {
      const res = await api.get('/menu/ac-surcharge');
      if (res.data.success && res.data.data) {
        setAcRate(res.data.data.rate ?? 100);
        setIsACAvailable(res.data.data.isAvailable ?? true);
      }
    } catch (err) {
      console.error('Failed to load AC surcharge settings:', err);
    } finally {
      setAcLoading(false);
    }
  };

  const handleSaveACSurcharge = async (e) => {
    e.preventDefault();
    setAcError('');
    setAcSuccess('');
    setAcSaving(true);
    try {
      const rateNum = Number(acRate);
      if (isNaN(rateNum) || rateNum < 0) {
        setAcError('Please enter a valid, non-negative surcharge rate.');
        setAcSaving(false);
        return;
      }
      const res = await api.put('/menu/ac-surcharge', {
        rate: rateNum,
        isAvailable: isACAvailable,
      });
      if (res.data.success) {
        setAcSuccess(`AC Surcharge settings updated successfully: Rs. ${rateNum}/head (${isACAvailable ? 'Available' : 'Not Available'}).`);
        setTimeout(() => setAcSuccess(''), 4000);
      }
    } catch (err) {
      setAcError(err.response?.data?.message || 'Failed to update AC surcharge settings.');
    } finally {
      setAcSaving(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (editingItem) {
        const res = await api.put(`/menu/${editingItem._id}`, formData);
        if (res.data.success) {
          setSuccess(`Updated "${formData.dishName}". Prices propagated globally to all future bookings.`);
          setEditingItem(null);
        }
      } else {
        const res = await api.post('/menu', formData);
        if (res.data.success) {
          setSuccess(`Created menu item "${formData.dishName}" at Rs. ${formData.pricePerHead}/head.`);
          setShowAddModal(false);
        }
      }
      setFormData({ dishName: '', category: 'Rice', pricePerHead: '', description: '' });
      fetchMenuItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save menu item.');
    }
  };

  const requestDelete = (id, dishName) => {
    setConfirmTarget({ id, dishName });
  };

  const executeDelete = async () => {
    const { id } = confirmTarget;
    setConfirmTarget(null);
    try {
      const res = await api.delete(`/menu/${id}`);
      if (res.data.success) {
        fetchMenuItems();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete item.');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Menu Pricing</h1>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setFormData({ dishName: '', category: 'Rice', pricePerHead: '', description: '' });
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-2 w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Dish</span>
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ── AC Surcharge Control Card ─────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Wind className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="font-bold text-base text-slate-900">Air Conditioning (AC) Surcharge</h3>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1.5 ${
                  isACAvailable
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isACAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  <span>{isACAvailable ? 'Available' : 'Not Available'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Global per-head rate and availability applied across Hall Bookings & Catering Orders.
              </p>
            </div>
          </div>
        </div>

        {acSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{acSuccess}</span>
          </div>
        )}

        {acError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{acError}</span>
          </div>
        )}

        <form onSubmit={handleSaveACSurcharge} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          {/* Rate Input */}
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Price Per Head (Rs.) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                required
                value={acRate}
                onChange={(e) => setAcRate(e.target.value)}
                placeholder="100"
                className="w-full border border-slate-300 rounded-xl pl-3.5 pr-16 py-2.5 text-sm font-mono font-bold text-slate-800 focus:border-emerald-500 focus:outline-hidden"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                / head
              </span>
            </div>
          </div>

          {/* Availability Toggle */}
          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              AC Service Status
            </label>
            <button
              type="button"
              onClick={() => setIsACAvailable(!isACAvailable)}
              className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                isACAvailable
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-800 hover:bg-emerald-100/70'
                  : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="flex items-center space-x-2">
                <Power className={`w-4 h-4 ${isACAvailable ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{isACAvailable ? 'Available (Enabled in Forms)' : 'Not Available (Disabled in Forms)'}</span>
              </span>
              <span className={`w-9 h-5 rounded-full p-0.5 transition-colors inline-flex items-center ${
                isACAvailable ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
              }`}>
                <span className="w-4 h-4 rounded-full bg-white shadow-xs"></span>
              </span>
            </button>
          </div>

          {/* Save Button */}
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={acSaving || acLoading}
              className="w-full py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 flex items-center justify-center space-x-2 shadow-sm"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{acSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATEGORIES.map((cat) => {
          const categoryItems = items.filter((i) => i.category === cat);
          return (
            <div key={cat} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <h3 className="font-bold text-base text-slate-800">{cat} Selection</h3>
                  <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                    {categoryItems.length} items
                  </span>
                </div>

                {categoryItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No dishes added under {cat}.</p>
                ) : (
                  <div className="space-y-3">
                    {categoryItems.map((dish) => (
                      <div key={dish._id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-slate-800">{dish.dishName}</p>
                          <p className="text-xs font-mono font-bold text-emerald-700 mt-0.5">Rs. {dish.pricePerHead}/head</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setEditingItem(dish);
                              setFormData({
                                dishName: dish.dishName,
                                category: dish.category,
                                pricePerHead: dish.pricePerHead,
                                description: dish.description || '',
                              });
                              setShowAddModal(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-white"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => requestDelete(dish._id, dish.dishName)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              {editingItem ? `Edit Price: ${editingItem.dishName}` : 'Add New Menu Item'}
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Dish Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.dishName}
                  onChange={(e) => setFormData({ ...formData, dishName: e.target.value })}
                  placeholder="e.g. Chicken Biryani"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Price Per Head (Rs.) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.pricePerHead}
                  onChange={(e) => setFormData({ ...formData, pricePerHead: e.target.value })}
                  placeholder="e.g. 350"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:border-emerald-500 focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Description
                </label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tender chicken with basmati rice..."
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
                  {editingItem ? 'Update Globally' : 'Save Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!confirmTarget}
        title={`Delete "${confirmTarget?.dishName}"?`}
        message="This dish will be permanently removed from the menu catalog. Future bookings will not include it."
        confirmLabel="Yes, Delete"
        onConfirm={executeDelete}
        onCancel={() => setConfirmTarget(null)}
      />

    </div>
  );
}

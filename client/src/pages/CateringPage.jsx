import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Plus, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import api from '../services/api';

export default function CateringPage() {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [formData, setFormData] = useState({
    clientName: '',
    phone: '',
    eventDate: new Date().toISOString().split('T')[0],
    eventLocation: '',
    guestCount: 150,
    selectedMenuItemIds: [],
    discountPercentage: 0,
    notes: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchMenuItems();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/catering');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load catering orders:', err);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await api.get('/menu');
      if (res.data.success) {
        setMenuItems(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dishes:', err);
    }
  };

  const handleDishToggle = (dishId) => {
    setFormData((prev) => {
      const exists = prev.selectedMenuItemIds.includes(dishId);
      const updated = exists
        ? prev.selectedMenuItemIds.filter((id) => id !== dishId)
        : [...prev.selectedMenuItemIds, dishId];
      return { ...prev, selectedMenuItemIds: updated };
    });
  };

  const calculateEstimate = () => {
    const selectedDishes = menuItems.filter((m) => formData.selectedMenuItemIds.includes(m._id));
    const pricePerHead = selectedDishes.reduce((sum, d) => sum + (d.pricePerHead || 0), 0);
    const estTotal = pricePerHead * Number(formData.guestCount || 0);
    const discAmount = (estTotal * Number(formData.discountPercentage || 0)) / 100;
    const finalTotal = estTotal - discAmount;
    return { pricePerHead, estTotal, discAmount, finalTotal };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const phoneRegex = /^\d{4}-\d{7}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      setError('Phone number must strictly match format XXXX-XXXXXXX (e.g., 0300-1234567).');
      return;
    }

    if (formData.selectedMenuItemIds.length === 0) {
      setError('Please select at least one menu item for the catering order.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedDishes = menuItems.filter((m) => formData.selectedMenuItemIds.includes(m._id));
      const formattedItems = selectedDishes.map((d) => ({
        menuItem: d._id,
        dishName: d.dishName,
        pricePerHead: d.pricePerHead,
      }));

      const payload = {
        clientName: formData.clientName,
        phone: formData.phone,
        eventDate: formData.eventDate,
        eventLocation: formData.eventLocation,
        guestCount: Number(formData.guestCount),
        selectedMenuItems: formattedItems,
        discountPercentage: Number(formData.discountPercentage) || 0,
        notes: formData.notes,
      };

      const res = await api.post('/catering', payload);
      if (res.data.success) {
        setSuccess(`Catering order created for ${formData.clientName}! Total: Rs. ${res.data.data.discountedTotal.toLocaleString()}`);
        setFormData({
          clientName: '',
          phone: '',
          eventDate: new Date().toISOString().split('T')[0],
          eventLocation: '',
          guestCount: 150,
          selectedMenuItemIds: [],
          discountPercentage: 0,
          notes: '',
        });
        fetchOrders();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create catering order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this catering order record?')) return;
    try {
      const res = await api.delete(`/catering/${id}`);
      if (res.data.success) {
        fetchOrders();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete order.');
    }
  };

  const estimate = calculateEstimate();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Catering Orders</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center space-x-2 border-b border-slate-100 pb-4">
            <Plus className="w-5 h-5 text-emerald-600" />
            <span>Create Catering Order</span>
          </h2>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="e.g. Aslam Khan"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Phone *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => {
                    // Strip non-digits, cap at 11 digits, auto-insert hyphen after digit 4
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                    const formatted = digits.length > 4
                      ? digits.slice(0, 4) + '-' + digits.slice(4)
                      : digits;
                    setFormData({ ...formData, phone: formatted });
                  }}
                  placeholder="0300-1234567"
                  maxLength={12}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Event Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Event Location
                </label>
                <input
                  type="text"
                  value={formData.eventLocation}
                  onChange={(e) => setFormData({ ...formData, eventLocation: e.target.value })}
                  placeholder="e.g. Defense Phase 5"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Guest Count *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.guestCount}
                  onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Select Menu Dishes</span>
                <span className="text-xs font-bold text-emerald-700">{formData.selectedMenuItemIds.length} dishes chosen</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {menuItems.map((dish) => {
                  const isSelected = formData.selectedMenuItemIds.includes(dish._id);
                  return (
                    <div
                      key={dish._id}
                      onClick={() => handleDishToggle(dish._id)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-semibold border-emerald-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span>{dish.dishName}</span>
                      <span className="font-mono font-bold">Rs. {dish.pricePerHead}/head</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Discount Percentage (0 – 100%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.discountPercentage}
                onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Recording Order...' : 'Submit Catering Order'}
            </button>
          </form>
        </div>

        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl h-fit sticky top-20 space-y-4">
          <h3 className="text-base font-bold border-b border-slate-800 pb-3">Catering Billing Summary</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Total Price / Head:</span>
              <span className="font-mono font-bold text-emerald-400">Rs. {estimate.pricePerHead}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Guest Count:</span>
              <span className="font-mono font-bold text-slate-200">× {formData.guestCount || 0}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Estimated Total:</span>
              <span className="font-mono font-bold text-slate-100">Rs. {estimate.estTotal.toLocaleString()}</span>
            </div>
            {estimate.discAmount > 0 && (
              <div className="flex justify-between text-amber-400 py-1">
                <span>Discount ({formData.discountPercentage}%):</span>
                <span className="font-mono">- Rs. {estimate.discAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="pt-2">
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/30">
                <span className="text-[10px] uppercase font-bold text-emerald-400">Net Discounted Total</span>
                <p className="text-xl font-extrabold text-emerald-300 font-mono mt-0.5">
                  Rs. {estimate.finalTotal.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-900">Recorded Catering Orders</h3>
          <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">{orders.length} orders</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Client & Phone</th>
                <th className="px-6 py-3.5">Event Date</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5">Guests</th>
                <th className="px-6 py-3.5">Dishes Count</th>
                <th className="px-6 py-3.5">Total Amount</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {orders.map((o) => (
                <tr key={o._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    <div>{o.clientName}</div>
                    <div className="text-slate-400 font-mono text-[11px]">{o.phone}</div>
                  </td>
                  <td className="px-6 py-4">{new Date(o.eventDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-slate-500">{o.eventLocation || 'N/A'}</td>
                  <td className="px-6 py-4 font-bold">{o.guestCount}</td>
                  <td className="px-6 py-4">{o.selectedMenuItems?.length || 0} items</td>
                  <td className="px-6 py-4 font-bold font-mono text-emerald-700">Rs. {o.discountedTotal?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(o._id)}
                      className="text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 font-semibold"
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
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Wind, 
  Utensils, 
  Percent, 
  ChevronLeft, 
  ChevronRight,
  Package
} from 'lucide-react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import InvoiceModal from '../components/InvoiceModal';

export default function HallBookingPage() {
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState({});
  const [bookings, setBookings] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [packages, setPackages] = useState([]);
  const [acSettings, setAcSettings] = useState({ rate: 100, isAvailable: true });

  const [formData, setFormData] = useState({
    clientName: '',
    phone: '',
    bookingDate: new Date().toISOString().split('T')[0],
    shift: 'Evening',
    hallType: 'Hall Only',
    guestCount: 200,
    isAC: false,
    menuItemIds: [],
    selectedPackageId: '',
    discountPercentage: 0,
    notes: '',
  });

  const [pricingPreview, setPricingPreview] = useState(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);

  useEffect(() => {
    fetchCalendarData();
    fetchBookings();
    fetchMenuItems();
    fetchPackages();
    fetchACSettings();
  }, [calendarMonth, calendarYear]);

  useEffect(() => {
    if (formData.guestCount > 0) {
      calculateLivePricing();
    }
  }, [
    formData.hallType,
    formData.guestCount,
    formData.isAC,
    formData.menuItemIds,
    formData.selectedPackageId,
    formData.discountPercentage,
    acSettings.rate,
    acSettings.isAvailable,
  ]);

  const fetchCalendarData = async () => {
    try {
      const res = await api.get(`/bookings/calendar?month=${calendarMonth}&year=${calendarYear}`);
      if (res.data.success) {
        setCalendarData(res.data.data || {});
      }
    } catch (err) {
      console.error('Failed to load calendar:', err);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings');
      if (res.data.success) {
        setBookings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await api.get('/menu');
      if (res.data.success) {
        setMenuItems(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load menu items:', err);
    }
  };

  const fetchPackages = async () => {
    try {
      const res = await api.get('/packages');
      if (res.data.success) setPackages(res.data.data);
    } catch (err) {
      console.error('Failed to load packages:', err);
    }
  };

  const fetchACSettings = async () => {
    try {
      const res = await api.get('/menu/ac-surcharge');
      if (res.data.success && res.data.data) {
        setAcSettings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load AC surcharge settings:', err);
    }
  };

  const calculateLivePricing = async () => {
    try {
      const selectedPkg = packages.find((p) => p._id === formData.selectedPackageId);
      const customCateringPerHead = selectedPkg ? selectedPkg.pricePerHead : null;
      const effectiveMenuIds = selectedPkg ? [] : formData.menuItemIds;

      const res = await api.post('/bookings/pricing-preview', {
        hallType: formData.hallType,
        guestCount: Number(formData.guestCount),
        isAC: Boolean(formData.isAC && acSettings.isAvailable),
        menuItemIds: effectiveMenuIds,
        discountPercentage: Number(formData.discountPercentage) || 0,
        customCateringPerHead,
        customACChargePerHead: acSettings.rate,
        isACAvailable: acSettings.isAvailable,
      });
      if (res.data.success) {
        setPricingPreview(res.data.pricing);
      }
    } catch (err) {}
  };

  const handleMenuToggle = (dishId) => {
    setFormData((prev) => {
      const exists = prev.menuItemIds.includes(dishId);
      const updated = exists
        ? prev.menuItemIds.filter((id) => id !== dishId)
        : [...prev.menuItemIds, dishId];
      return { ...prev, menuItemIds: updated, selectedPackageId: '' };
    });
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsSubmitting(true);

    // Past-date guard — compare at midnight to ignore time-of-day
    const selected = new Date(formData.bookingDate + 'T00:00:00');
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    if (selected < today) {
      const display = selected.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      setFormError(`${display} has already passed and is no longer available for booking.`);
      setIsSubmitting(false);
      return;
    }

    const phoneRegex = /^\d{4}-\d{7}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      setFormError('Phone number must strictly match format XXXX-XXXXXXX (e.g., 0300-1234567).');
      setIsSubmitting(false);
      return;
    }

    if (formData.hallType === 'Hall with Catering' && formData.menuItemIds.length === 0 && !formData.selectedPackageId) {
      setFormError('Please select at least one menu item or a package for Hall with Catering package.');
      setIsSubmitting(false);
      return;
    }

    try {
      const selectedPkg = packages.find((p) => p._id === formData.selectedPackageId);
      const customCateringPerHead = selectedPkg ? selectedPkg.pricePerHead : null;
      const effectiveMenuIds = selectedPkg ? [] : formData.menuItemIds;

      const effectiveIsAC = Boolean(formData.isAC && acSettings.isAvailable);
      const payload = {
        ...formData,
        isAC: effectiveIsAC,
        menuItemIds: effectiveMenuIds,
        customCateringPerHead,
        customACChargePerHead: acSettings.rate,
        isACAvailable: acSettings.isAvailable,
        packageName: selectedPkg ? selectedPkg.title : undefined,
      };

      const res = await api.post('/bookings', payload);
      if (res.data.success) {
        const b = res.data.data; // saved booking document
        const invoiceDateStr = new Date(formData.bookingDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const invNum = String(Math.floor(1000 + Math.random() * 9000));
        const effectiveIsAC = Boolean(formData.isAC && acSettings.isAvailable);

        // Resolve selected dishes for line items
        const dishes = effectiveMenuIds.length > 0
          ? menuItems.filter((m) => effectiveMenuIds.includes(m._id)).map((m) => ({ dishName: m.dishName, pricePerHead: m.pricePerHead }))
          : [];

        setInvoiceData({
          type: 'booking',
          invoiceId: `INV-${new Date().getFullYear()}-${invNum}`,
          clientName: formData.clientName,
          phone: formData.phone,
          date: invoiceDateStr,
          shift: formData.shift,
          hallType: formData.hallType,
          guestCount: Number(formData.guestCount),
          packageName: selectedPkg ? selectedPkg.title : null,
          selectedDishes: dishes,
          basePricePerHead: b.basePricePerHead || 0,
          cateringPricePerHead: b.cateringPricePerHead || 0,
          acChargePerHead: effectiveIsAC ? (b.acChargePerHead || acSettings.rate) : 0,
          isAC: effectiveIsAC,
          estimatedTotal: b.estimatedTotal || 0,
          discountPercentage: b.discountPercentage || 0,
          discountAmount: b.discountAmount || 0,
          discountedTotal: b.discountedTotal || 0,
        });

        setFormSuccess(`Booking confirmed for ${formData.clientName}! Total: Rs. ${b.discountedTotal.toLocaleString()}`);
        setFormData({
          clientName: '',
          phone: '',
          bookingDate: new Date().toISOString().split('T')[0],
          shift: 'Evening',
          hallType: 'Hall Only',
          guestCount: 200,
          isAC: false,
          menuItemIds: [],
          selectedPackageId: '',
          discountPercentage: 0,
          notes: '',
        });
        fetchCalendarData();
        fetchBookings();
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setFormError(err.response.data.message || 'Collision: This date and shift is already booked.');
      } else {
        setFormError(err.response?.data?.message || 'Failed to create booking.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestCancelBooking = (id) => {
    setConfirmTarget({ id });
  };

  const executeCancelBooking = async () => {
    const { id } = confirmTarget;
    setConfirmTarget(null);
    try {
      const res = await api.delete(`/bookings/${id}`);
      if (res.data.success) {
        fetchCalendarData();
        fetchBookings();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to cancel booking.');
    }
  };

  const renderCalendarDays = () => {
    const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const firstDayIndex = new Date(calendarYear, calendarMonth - 1, 1).getDay();
    const days = [];

    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 bg-slate-50 rounded-xl border border-dashed border-slate-200"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = calendarData[dateStr];
      const count = dayData?.bookings?.length || 0;

      let colorClass = 'bg-white border-slate-200 hover:border-slate-300 text-slate-700';
      if (count === 1) {
        colorClass = 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-xs';
      } else if (count >= 2) {
        colorClass = 'bg-emerald-700 border-emerald-800 text-white font-bold shadow-md';
      }

      days.push(
        <div
          key={d}
          onClick={() => setFormData((prev) => ({ ...prev, bookingDate: dateStr }))}
          className={`h-20 p-2 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${colorClass}`}
        >
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold">{d}</span>
            {count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                count >= 2 ? 'bg-emerald-900 text-emerald-200' : 'bg-emerald-200 text-emerald-800'
              }`}>
                {count >= 2 ? 'Full' : '1 Shift'}
              </span>
            )}
          </div>

          <div className="text-[11px] truncate">
            {dayData?.bookings?.map((b, idx) => (
              <p key={idx} className="truncate">{b.shift.charAt(0)}: {b.clientName}</p>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Hall Booking & Calendar</h1>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
              <span>Shift Occupancy Calendar</span>
            </h2>
            <div className="flex items-center space-x-4 text-xs font-semibold mt-1">
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-400 inline-block"></span>
                <span className="text-slate-600">1 Booking</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-700 border border-emerald-800 inline-block"></span>
                <span className="text-slate-600">2 Bookings (Full Day)</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => {
                if (calendarMonth === 1) { setCalendarMonth(12); setCalendarYear((y) => y - 1); }
                else { setCalendarMonth((m) => m - 1); }
              }}
              className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-700 px-2 min-w-[110px] text-center">
              {new Date(calendarYear, calendarMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => {
                if (calendarMonth === 12) { setCalendarMonth(1); setCalendarYear((y) => y + 1); }
                else { setCalendarMonth((m) => m + 1); }
              }}
              className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400 py-1">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {renderCalendarDays()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center space-x-2 border-b border-slate-100 pb-4">
            <Plus className="w-5 h-5 text-emerald-600" />
            <span>Create New Hall Booking</span>
          </h3>

          {formError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-bold">Booking Error</p>
                <p className="text-xs mt-0.5">{formError}</p>
              </div>
            </div>
          )}

          {formSuccess && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-bold">Success</p>
                <p className="text-xs mt-0.5">{formSuccess}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleBookingSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Client Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Phone Number *
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
                  Booking Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.bookingDate}
                  onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Shift Selection *
                </label>
                <select
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="Evening">Evening (2:00 PM – 4:00 PM)</option>
                  <option value="Night">Night (6:00 PM – 10:00 PM)</option>
                </select>
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

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Food & Catering Package Option
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setFormData({ ...formData, hallType: 'Hall Only', menuItemIds: [] })}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.hallType === 'Hall Only'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-bold text-sm text-slate-800">Hall Only</p>
                  <p className="text-xs text-slate-500 mt-1">Default venue rental at base rate of Rs. 500/head.</p>
                </div>

                <div
                  onClick={() => setFormData({ ...formData, hallType: 'Hall with Catering' })}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.hallType === 'Hall with Catering'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-bold text-sm text-slate-800">Hall with Catering</p>
                  <p className="text-xs text-slate-500 mt-1">Dynamically pulls pricing from selected menu dishes.</p>
                </div>
              </div>
            </div>

            {formData.hallType === 'Hall with Catering' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                    <Utensils className="w-4 h-4 text-emerald-600" />
                    <span>Select Dishes from Menu Pricing</span>
                  </span>
                  <span className="text-xs text-emerald-700 font-semibold">
                    {formData.menuItemIds.length} dishes chosen
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {menuItems.map((dish) => {
                    const isSelected = formData.menuItemIds.includes(dish._id);
                    return (
                      <div
                        key={dish._id}
                        onClick={() => handleMenuToggle(dish._id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white font-semibold border-emerald-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <p>{dish.dishName}</p>
                          <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {dish.category}
                          </span>
                        </div>
                        <span className="font-mono font-bold">Rs. {dish.pricePerHead}/head</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {formData.hallType === 'Hall with Catering' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>Select Package</span>
                  </span>
                  {formData.selectedPackageId ? (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, selectedPackageId: '' }))}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors"
                    >
                      Deselect Package
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Choose a pre-set event package</span>
                  )}
                </div>

                {packages.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                    {packages.map((pkg) => {
                      const isSelected = formData.selectedPackageId === pkg._id;
                      return (
                        <div
                          key={pkg._id}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              selectedPackageId: isSelected ? '' : pkg._id,
                              menuItemIds: isSelected ? prev.menuItemIds : [],
                            }));
                          }}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-600 shadow-sm ring-2 ring-emerald-500/50'
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-xs font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                              {pkg.title}
                            </h4>
                            <span className={`font-mono text-xs font-extrabold whitespace-nowrap ${isSelected ? 'text-emerald-700' : 'text-slate-700'}`}>
                              Rs. {pkg.pricePerHead.toLocaleString()}/head
                            </span>
                          </div>
                          {pkg.items && (
                            <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">
                              {pkg.items}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No packages created yet. You can create custom packages from the Packages page.</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <div className={`flex items-center space-x-3 p-3.5 rounded-xl border transition-all ${
                acSettings.isAvailable
                  ? 'border-slate-200 bg-slate-50'
                  : 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
              }`}>
                <input
                  type="checkbox"
                  id="acToggle"
                  disabled={!acSettings.isAvailable}
                  checked={Boolean(formData.isAC && acSettings.isAvailable)}
                  onChange={(e) => setFormData({ ...formData, isAC: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                />
                <label htmlFor="acToggle" className={`text-xs font-semibold ${acSettings.isAvailable ? 'text-slate-700 cursor-pointer' : 'text-slate-400 cursor-not-allowed'}`}>
                  <span className="block text-slate-900 font-bold flex items-center space-x-1.5">
                    <Wind className="w-4 h-4 text-sky-600" />
                    <span>Air Conditioning (AC)</span>
                    {!acSettings.isAvailable && (
                      <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-md ml-1">
                        Not Available
                      </span>
                    )}
                  </span>
                  <span>
                    {acSettings.isAvailable
                      ? `Adds extra Rs. ${acSettings.rate} per head surcharge`
                      : 'AC Surcharge is currently disabled globally'}
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Discount Percentage (0 – 100%)
                </label>
                <div className="relative">
                  <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl pl-9 pr-3.5 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Confirm Hall Booking</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between h-fit sticky top-20">
          <div>
            <div className="border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-bold text-white mt-0.5">Billing Breakdown</h3>
            </div>

            {pricingPreview ? (
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Package Type:</span>
                  <span className="font-semibold text-slate-200">{formData.hallType}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Base Venue Charge:</span>
                  <span className="font-mono text-slate-200">Rs. {pricingPreview.basePricePerHead}/head</span>
                </div>

                {formData.hallType === 'Hall with Catering' && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">
                      {formData.selectedPackageId
                        ? `Catering (${packages.find((p) => p._id === formData.selectedPackageId)?.title || 'Package'}):`
                        : 'Catering Sum:'}
                    </span>
                    <span className="font-mono text-emerald-400">Rs. {pricingPreview.cateringPricePerHead}/head</span>
                  </div>
                )}

                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">AC Surcharge:</span>
                  <span className="font-mono text-sky-400">
                    {!acSettings.isAvailable
                      ? 'Unavailable'
                      : (formData.isAC ? `+Rs. ${acSettings.rate}/head` : 'None (0)')}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Guests Multiplier:</span>
                  <span className="font-mono font-bold text-slate-200">× {formData.guestCount}</span>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-sm py-1">
                    <span className="text-slate-300 font-semibold">Estimated Total:</span>
                    <span className="font-mono font-bold text-slate-100">Rs. {pricingPreview.estimatedTotal?.toLocaleString()}</span>
                  </div>

                  {pricingPreview.discountAmount > 0 && (
                    <div className="flex justify-between text-xs text-amber-400 py-0.5">
                      <span>Discount Given ({pricingPreview.discountPercentage}%):</span>
                      <span className="font-mono">- Rs. {pricingPreview.discountAmount?.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="mt-4 p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Final Payable</span>
                      <p className="text-xl font-extrabold text-emerald-300 font-mono">
                        Rs. {pricingPreview.discountedTotal?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                Enter booking details to see real-time calculation.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-900">Current Hall Bookings</h3>
          <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
            {bookings.length} reservations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Client & Phone</th>
                <th className="px-6 py-3.5">Date & Shift</th>
                <th className="px-6 py-3.5">Package</th>
                <th className="px-6 py-3.5">Guests</th>
                <th className="px-6 py-3.5">AC</th>
                <th className="px-6 py-3.5">Final Amount</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {bookings.map((b) => (
                <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    <div>{b.clientName}</div>
                    <div className="text-slate-400 font-mono text-[11px]">{b.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{new Date(b.bookingDate).toDateString()}</div>
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 mt-0.5">
                      {b.shift}
                    </span>
                  </td>
                  <td className="px-6 py-4">{b.hallType}</td>
                  <td className="px-6 py-4 font-bold">{b.guestCount}</td>
                  <td className="px-6 py-4">{b.isAC ? `Yes (+${b.acChargePerHead || 100})` : 'No'}</td>
                  <td className="px-6 py-4 font-bold font-mono text-emerald-700">
                    Rs. {b.discountedTotal?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      b.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {b.status !== 'Cancelled' && (
                      <button
                        onClick={() => requestCancelBooking(b._id)}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center space-x-1 p-1 rounded-md hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Cancel Slot</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmModal
        open={!!confirmTarget}
        title="Cancel Booking?"
        message="This will free up the date and shift slot. The booking record will be removed."
        confirmLabel="Yes, Cancel Slot"
        onConfirm={executeCancelBooking}
        onCancel={() => setConfirmTarget(null)}
      />
      <InvoiceModal
        open={!!invoiceData}
        data={invoiceData}
        onClose={() => setInvoiceData(null)}
      />

    </div>
  );
}

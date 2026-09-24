import React, { useRef } from 'react';
import { FileText, Download, Copy, X, CheckCircle2 } from 'lucide-react';

/**
 * Professional invoice modal shown after successful booking / catering order.
 *
 * Props:
 *   open       – boolean, controls visibility
 *   onClose    – callback to dismiss the modal
 *   data       – object with invoice details (see shape below)
 *
 * data shape:
 *   type                – "booking" | "catering"
 *   invoiceId           – e.g. "INV-2026-0001"
 *   clientName          – string
 *   phone               – string
 *   date                – display date string
 *   shift               – string (booking only)
 *   eventLocation       – string (catering only)
 *   hallType            – string (booking only)
 *   guestCount          – number
 *   packageName         – string | null
 *   selectedDishes      – [{ dishName, pricePerHead }]
 *   basePricePerHead    – number (booking only, venue charge)
 *   cateringPricePerHead – number
 *   acChargePerHead     – number
 *   isAC                – boolean
 *   estimatedTotal      – number (before discount)
 *   discountPercentage  – number
 *   discountAmount      – number
 *   discountedTotal     – number (final payable)
 */
export default function InvoiceModal({ open, onClose, data }) {
  const [copied, setCopied] = React.useState(false);

  if (!open || !data) return null;

  const isBooking = data.type === 'booking';

  // ── Build plain text invoice for copy / download ──────────────────────
  const buildTextInvoice = () => {
    const divider = '─'.repeat(44);
    const lines = [
      '',
      '              ✦  56 EVENTS  ✦',
      '          Professional Event Management',
      divider,
      `  Invoice ID  :  ${data.invoiceId}`,
      `  Date Issued :  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      divider,
      '',
      '  CLIENT DETAILS',
      `  Name   :  ${data.clientName}`,
      `  Phone  :  ${data.phone}`,
      '',
      '  EVENT DETAILS',
      `  ${isBooking ? 'Booking' : 'Event'} Date  :  ${data.date}`,
    ];

    if (isBooking) {
      lines.push(`  Shift        :  ${data.shift}`);
      lines.push(`  Hall Type    :  ${data.hallType}`);
    } else if (data.eventLocation) {
      lines.push(`  Location     :  ${data.eventLocation}`);
    }
    lines.push(`  Guest Count  :  ${data.guestCount}`);

    lines.push('');
    lines.push(divider);
    lines.push('  BILLING BREAKDOWN');
    lines.push(divider);

    if (data.packageName) {
      lines.push(`  Package      :  ${data.packageName}`);
    }

    if (isBooking && data.basePricePerHead) {
      lines.push(`  Venue Charge :  Rs. ${data.basePricePerHead.toLocaleString()} / head`);
    }

    if (data.cateringPricePerHead > 0) {
      lines.push(`  Catering     :  Rs. ${data.cateringPricePerHead.toLocaleString()} / head`);
    }

    if (data.selectedDishes && data.selectedDishes.length > 0 && !data.packageName) {
      lines.push('  Selected Dishes:');
      data.selectedDishes.forEach((d) => {
        lines.push(`    • ${d.dishName}  —  Rs. ${d.pricePerHead.toLocaleString()}/head`);
      });
    }

    if (data.isAC && data.acChargePerHead > 0) {
      lines.push(`  AC Surcharge :  Rs. ${data.acChargePerHead.toLocaleString()} / head`);
    }

    lines.push(`  Guests       :  × ${data.guestCount}`);
    lines.push('');
    lines.push(`  Subtotal     :  Rs. ${data.estimatedTotal.toLocaleString()}`);

    if (data.discountPercentage > 0) {
      lines.push(`  Discount     :  ${data.discountPercentage}%  (– Rs. ${data.discountAmount.toLocaleString()})`);
    }

    lines.push(divider);
    lines.push(`  TOTAL PAYABLE:  Rs. ${data.discountedTotal.toLocaleString()}`);
    lines.push(divider);
    lines.push('');
    lines.push('  Thank you for choosing 56 EVENTS!');
    lines.push('');

    return lines.join('\n');
  };

  // ── Copy to clipboard ─────────────────────────────────────────────────
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildTextInvoice());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = buildTextInvoice();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Download as .txt file ─────────────────────────────────────────────
  const handleDownload = () => {
    const text = buildTextInvoice();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.invoiceId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Row helper ────────────────────────────────────────────────────────
  const Row = ({ label, value, bold, accent }) => (
    <div className={`flex justify-between py-1.5 ${bold ? 'font-bold' : ''}`}>
      <span className="text-slate-500 text-sm">{label}</span>
      <span className={`text-sm ${accent ? 'text-emerald-600 font-extrabold text-base' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-t-2xl px-6 py-5 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-wide">56 EVENTS</h2>
          <p className="text-emerald-100 text-xs mt-1">Professional Event Management</p>
          <div className="mt-3 inline-block bg-white/20 rounded-lg px-3 py-1">
            <span className="text-white text-xs font-bold tracking-wider">{data.invoiceId}</span>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="px-6 py-5 space-y-5">

          {/* Success badge */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span className="text-emerald-700 text-sm font-semibold">
              {isBooking ? 'Booking Confirmed Successfully!' : 'Catering Order Created Successfully!'}
            </span>
          </div>

          {/* Client details */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Client Details</h3>
            <Row label="Full Name" value={data.clientName} />
            <Row label="Phone" value={data.phone} />
          </div>

          {/* Event specifics */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Event Details</h3>
            <Row label={isBooking ? 'Booking Date' : 'Event Date'} value={data.date} />
            {isBooking && <Row label="Shift" value={data.shift} />}
            {isBooking && <Row label="Hall Type" value={data.hallType} />}
            {!isBooking && data.eventLocation && <Row label="Location" value={data.eventLocation} />}
            <Row label="Guest Count" value={data.guestCount} />
          </div>

          {/* Billing breakdown */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billing Breakdown</h3>

            {data.packageName && (
              <Row label="Package" value={data.packageName} bold />
            )}

            {isBooking && data.basePricePerHead > 0 && (
              <Row label="Venue Charge" value={`Rs. ${data.basePricePerHead.toLocaleString()}/head`} />
            )}

            {data.cateringPricePerHead > 0 && (
              <Row label={data.packageName ? 'Package Rate' : 'Catering'} value={`Rs. ${data.cateringPricePerHead.toLocaleString()}/head`} />
            )}

            {data.selectedDishes && data.selectedDishes.length > 0 && !data.packageName && (
              <div className="py-1">
                <span className="text-slate-500 text-xs">Selected Dishes:</span>
                {data.selectedDishes.map((d, i) => (
                  <div key={i} className="flex justify-between pl-3 py-0.5">
                    <span className="text-slate-600 text-xs">• {d.dishName}</span>
                    <span className="text-slate-700 text-xs">Rs. {d.pricePerHead.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {data.isAC && data.acChargePerHead > 0 && (
              <Row label="AC Surcharge" value={`Rs. ${data.acChargePerHead.toLocaleString()}/head`} />
            )}

            <Row label="Guests" value={`× ${data.guestCount}`} />

            <div className="border-t border-slate-200 mt-2 pt-2">
              <Row label="Subtotal" value={`Rs. ${data.estimatedTotal.toLocaleString()}`} />
              {data.discountPercentage > 0 && (
                <Row
                  label={`Discount (${data.discountPercentage}%)`}
                  value={`– Rs. ${data.discountAmount.toLocaleString()}`}
                />
              )}
            </div>

            <div className="border-t-2 border-emerald-200 mt-2 pt-3">
              <Row label="Total Payable" value={`Rs. ${data.discountedTotal.toLocaleString()}`} accent bold />
            </div>
          </div>
        </div>

        {/* ── Action buttons ──────────────────────────────────────── */}
        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-600/25 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Invoice
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-emerald-200 text-emerald-700 text-sm font-bold hover:bg-emerald-50 transition-colors"
          >
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Invoice'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

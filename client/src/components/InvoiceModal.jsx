import React from 'react';
import { FileText, Download, Copy, X, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';

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

  // ── Build plain text invoice for clipboard copy ───────────────────────
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

  // ── Generate & Download formal PDF ────────────────────────────────────
  const handleDownload = () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;
    const contentW = pageW - margin * 2;
    let y = 0;

    // ─ Colors ─
    const emerald  = [5, 150, 105];     // emerald-600
    const darkText = [30, 41, 59];      // slate-800
    const grayText = [100, 116, 139];   // slate-500
    const lightBg  = [248, 250, 252];   // slate-50
    const white    = [255, 255, 255];
    const borderC  = [226, 232, 240];   // slate-200

    // ─ Helper: draw text row ─
    const drawRow = (label, value, yPos, options = {}) => {
      const { bold = false, accent = false } = options;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...grayText);
      doc.text(label, margin + 4, yPos);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(accent ? 11 : 9);
      doc.setTextColor(...(accent ? emerald : darkText));
      doc.text(value, pageW - margin - 4, yPos, { align: 'right' });
      return yPos + 5.5;
    };

    // ─ Helper: section header ─
    const drawSectionHeader = (title, yPos) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...grayText);
      doc.text(title.toUpperCase(), margin + 4, yPos);
      return yPos + 5;
    };

    // ─ Helper: card background ─
    const drawCardBg = (yStart, height) => {
      doc.setFillColor(...lightBg);
      doc.setDrawColor(...borderC);
      doc.roundedRect(margin, yStart, contentW, height, 3, 3, 'FD');
    };

    // ─ Helper: divider line ─
    const drawDivider = (yPos) => {
      doc.setDrawColor(...borderC);
      doc.setLineWidth(0.3);
      doc.line(margin + 4, yPos, pageW - margin - 4, yPos);
      return yPos + 3;
    };

    // ══════════════════════════════════════════════════════════════════════
    // GREEN HEADER BANNER
    // ══════════════════════════════════════════════════════════════════════
    const bannerH = 38;
    doc.setFillColor(...emerald);
    doc.rect(0, 0, pageW, bannerH, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...white);
    doc.text('56 EVENTS', pageW / 2, 15, { align: 'center' });

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255, 180);
    doc.text('Professional Event Management', pageW / 2, 22, { align: 'center' });

    // Invoice ID pill
    doc.setFillColor(255, 255, 255, 50);
    const idText = data.invoiceId;
    const idWidth = doc.getTextWidth(idText) + 12;
    doc.roundedRect((pageW - idWidth) / 2, 26, idWidth, 7, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...white);
    doc.text(idText, pageW / 2, 31, { align: 'center' });

    y = bannerH + 6;

    // ── Date issued line ────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...grayText);
    const issuedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Issued: ${issuedDate}`, pageW - margin, y, { align: 'right' });
    y += 7;

    // ══════════════════════════════════════════════════════════════════════
    // CLIENT DETAILS CARD
    // ══════════════════════════════════════════════════════════════════════
    const clientCardH = 23;
    drawCardBg(y, clientCardH);
    let cy = y + 5;
    cy = drawSectionHeader('Client Details', cy);
    cy = drawRow('Full Name', data.clientName, cy);
    cy = drawRow('Phone', data.phone, cy);
    y += clientCardH + 4;

    // ══════════════════════════════════════════════════════════════════════
    // EVENT DETAILS CARD
    // ══════════════════════════════════════════════════════════════════════
    let eventRows = 2; // date + guests
    if (isBooking) eventRows += 2; // shift + hallType
    if (!isBooking && data.eventLocation) eventRows += 1;
    const eventCardH = 10 + eventRows * 5.5;
    drawCardBg(y, eventCardH);
    let ey = y + 5;
    ey = drawSectionHeader('Event Details', ey);
    ey = drawRow(isBooking ? 'Booking Date' : 'Event Date', data.date, ey);
    if (isBooking) {
      ey = drawRow('Shift', data.shift, ey);
      ey = drawRow('Hall Type', data.hallType, ey);
    }
    if (!isBooking && data.eventLocation) {
      ey = drawRow('Location', data.eventLocation, ey);
    }
    ey = drawRow('Guest Count', String(data.guestCount), ey);
    y += eventCardH + 4;

    // ══════════════════════════════════════════════════════════════════════
    // BILLING BREAKDOWN CARD
    // ══════════════════════════════════════════════════════════════════════
    // Pre-calculate height
    let billingRows = 0;
    if (data.packageName) billingRows++;
    if (isBooking && data.basePricePerHead > 0) billingRows++;
    if (data.cateringPricePerHead > 0) billingRows++;
    let dishRows = 0;
    if (data.selectedDishes && data.selectedDishes.length > 0 && !data.packageName) {
      dishRows = data.selectedDishes.length + 1; // label + items
    }
    if (data.isAC && data.acChargePerHead > 0) billingRows++;
    billingRows++; // guests row
    billingRows++; // subtotal
    if (data.discountPercentage > 0) billingRows++;
    billingRows++; // total payable

    const billingCardH = 10 + (billingRows * 5.5) + (dishRows * 4.5) + 10; // +10 for dividers
    drawCardBg(y, billingCardH);
    let by = y + 5;
    by = drawSectionHeader('Billing Breakdown', by);

    if (data.packageName) {
      by = drawRow('Package', data.packageName, by, { bold: true });
    }
    if (isBooking && data.basePricePerHead > 0) {
      by = drawRow('Venue Charge', `Rs. ${data.basePricePerHead.toLocaleString()}/head`, by);
    }
    if (data.cateringPricePerHead > 0) {
      by = drawRow(data.packageName ? 'Package Rate' : 'Catering', `Rs. ${data.cateringPricePerHead.toLocaleString()}/head`, by);
    }

    // Selected dishes
    if (data.selectedDishes && data.selectedDishes.length > 0 && !data.packageName) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...grayText);
      doc.text('Selected Dishes:', margin + 4, by);
      by += 4.5;
      data.selectedDishes.forEach((d) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...grayText);
        doc.text(`  •  ${d.dishName}`, margin + 6, by);
        doc.setTextColor(...darkText);
        doc.text(`Rs. ${d.pricePerHead.toLocaleString()}`, pageW - margin - 4, by, { align: 'right' });
        by += 4.5;
      });
    }

    if (data.isAC && data.acChargePerHead > 0) {
      by = drawRow('AC Surcharge', `Rs. ${data.acChargePerHead.toLocaleString()}/head`, by);
    }
    by = drawRow('Guests', `× ${data.guestCount}`, by);

    by = drawDivider(by);
    by = drawRow('Subtotal', `Rs. ${data.estimatedTotal.toLocaleString()}`, by);

    if (data.discountPercentage > 0) {
      by = drawRow(`Discount (${data.discountPercentage}%)`, `– Rs. ${data.discountAmount.toLocaleString()}`, by);
    }

    // Total line with green accent bar
    by = drawDivider(by);
    doc.setFillColor(...emerald);
    doc.roundedRect(margin + 2, by - 1.5, contentW - 4, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...white);
    doc.text('TOTAL PAYABLE', margin + 6, by + 3.5);
    doc.text(`Rs. ${data.discountedTotal.toLocaleString()}`, pageW - margin - 6, by + 3.5, { align: 'right' });

    y += billingCardH + 6;

    // ── Footer ──────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...grayText);
    doc.text('Thank you for choosing 56 EVENTS!', pageW / 2, y, { align: 'center' });

    // ── Bottom accent bar ───────────────────────────────────────────────
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(...emerald);
    doc.rect(0, pageH - 4, pageW, 4, 'F');

    // ── Save ────────────────────────────────────────────────────────────
    doc.save(`${data.invoiceId}.pdf`);
  };

  // ── Row helper for on-screen modal ────────────────────────────────────
  const Row = ({ label, value, bold, accent }) => (
    <div className={`flex justify-between py-0.5 ${bold ? 'font-bold' : ''}`}>
      <span className="text-slate-500 text-xs">{label}</span>
      <span className={`text-xs ${accent ? 'text-emerald-600 font-extrabold text-sm' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md">

        {/* ── Header (compact) ────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-t-2xl px-5 py-3 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
          <div className="flex items-center justify-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-white" />
            <h2 className="text-lg font-extrabold text-white tracking-wide">56 EVENTS</h2>
          </div>
          <p className="text-emerald-100 text-[10px]">Professional Event Management</p>
          <div className="mt-1.5 inline-block bg-white/20 rounded px-2.5 py-0.5">
            <span className="text-white text-[10px] font-bold tracking-wider">{data.invoiceId}</span>
          </div>
        </div>

        {/* ── Body (compact spacing) ──────────────────────────────── */}
        <div className="px-4 py-3 space-y-2">

          {/* Success badge */}
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="text-emerald-700 text-xs font-semibold">
              {isBooking ? 'Booking Confirmed Successfully!' : 'Catering Order Created Successfully!'}
            </span>
          </div>

          {/* Client + Event side by side */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-lg p-2.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Client</h3>
              <Row label="Name" value={data.clientName} />
              <Row label="Phone" value={data.phone} />
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Event</h3>
              <Row label="Date" value={data.date} />
              {isBooking && <Row label="Shift" value={data.shift} />}
              {isBooking && <Row label="Hall" value={data.hallType} />}
              {!isBooking && data.eventLocation && <Row label="Location" value={data.eventLocation} />}
              <Row label="Guests" value={data.guestCount} />
            </div>
          </div>

          {/* Billing breakdown */}
          <div className="bg-slate-50 rounded-lg p-2.5">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Billing Breakdown</h3>

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
              <div className="py-0.5">
                <span className="text-slate-500 text-[10px]">Dishes:</span>
                {data.selectedDishes.map((d, i) => (
                  <div key={i} className="flex justify-between pl-2">
                    <span className="text-slate-600 text-[10px]">• {d.dishName}</span>
                    <span className="text-slate-700 text-[10px]">Rs. {d.pricePerHead.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {data.isAC && data.acChargePerHead > 0 && (
              <Row label="AC Surcharge" value={`Rs. ${data.acChargePerHead.toLocaleString()}/head`} />
            )}

            <Row label="Guests" value={`× ${data.guestCount}`} />

            <div className="border-t border-slate-200 mt-1 pt-1">
              <Row label="Subtotal" value={`Rs. ${data.estimatedTotal.toLocaleString()}`} />
              {data.discountPercentage > 0 && (
                <Row
                  label={`Discount (${data.discountPercentage}%)`}
                  value={`– Rs. ${data.discountAmount.toLocaleString()}`}
                />
              )}
            </div>

            <div className="border-t-2 border-emerald-200 mt-1 pt-1.5">
              <Row label="Total Payable" value={`Rs. ${data.discountedTotal.toLocaleString()}`} accent bold />
            </div>
          </div>
        </div>

        {/* ── Action buttons ──────────────────────────────────────── */}
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-50 transition-colors"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Invoice'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

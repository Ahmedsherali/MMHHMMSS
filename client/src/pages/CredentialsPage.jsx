import React, { useState } from 'react';
import { Mail, Lock, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Password policy: >=8 chars, at least one letter, at least one digit
const validateNewPassword = (pwd) => {
  if (pwd.length < 8)          return 'Password must be at least 8 characters long.';
  if (!/[a-zA-Z]/.test(pwd))  return 'Password must contain at least one letter (a-z).';
  if (!/[0-9]/.test(pwd))     return 'Password must contain at least one number (0-9).';
  return null;
};

// ---------- tiny hook for password visibility toggle ----------
function useReveal(initial = false) {
  const [show, setShow] = useState(initial);
  return [show, () => setShow((v) => !v)];
}

// ---------- reusable field wrapper ----------
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// ---------- password input with eye toggle ----------
function PasswordInput({ value, onChange, placeholder, maxLength = 72 }) {
  const [show, toggle] = useReveal();
  return (
    <div className="relative">
      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

// ---------- alert banner ----------
function Banner({ type, message }) {
  if (!message) return null;
  const isError = type === 'error';
  return (
    <div className={`flex items-start space-x-2.5 p-3.5 rounded-xl border text-sm ${
      isError
        ? 'bg-rose-50 border-rose-200 text-rose-700'
        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
    }`}>
      {isError
        ? <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        : <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />}
      <span>{message}</span>
    </div>
  );
}

export default function CredentialsPage() {
  const { admin, token, login } = useAuth();

  // ── Email form state ──────────────────────────────────────────────
  const [emailForm, setEmailForm] = useState({ currentPassword: '', newEmail: '' });
  const [emailStatus, setEmailStatus] = useState({ type: '', message: '' });
  const [emailLoading, setEmailLoading] = useState(false);

  // ── Password form state ───────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwStatus, setPwStatus] = useState({ type: '', message: '' });
  const [pwLoading, setPwLoading] = useState(false);

  // ─── Change Email ─────────────────────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailStatus({ type: '', message: '' });

    if (!emailForm.currentPassword.trim())
      return setEmailStatus({ type: 'error', message: 'Please enter your current password to verify your identity.' });
    if (!emailForm.newEmail.trim())
      return setEmailStatus({ type: 'error', message: 'Please enter a new email address.' });

    setEmailLoading(true);
    try {
      const res = await api.put('/auth/update-email', {
        currentPassword: emailForm.currentPassword,
        newEmail: emailForm.newEmail.trim(),
      });
      if (res.data.success) {
        // Persist refreshed token + admin object so context stays in sync
        localStorage.setItem('mhms_token', res.data.token);
        localStorage.setItem('mhms_admin', JSON.stringify(res.data.admin));
        setEmailStatus({ type: 'success', message: res.data.message });
        setEmailForm({ currentPassword: '', newEmail: '' });
      }
    } catch (err) {
      setEmailStatus({ type: 'error', message: err.response?.data?.message || 'Failed to update email.' });
    } finally {
      setEmailLoading(false);
    }
  };

  // ─── Change Password ──────────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwStatus({ type: '', message: '' });

    if (!pwForm.currentPassword.trim())
      return setPwStatus({ type: 'error', message: 'Please enter your current password to verify your identity.' });

    const policyErr = validateNewPassword(pwForm.newPassword);
    if (policyErr)
      return setPwStatus({ type: 'error', message: policyErr });

    if (pwForm.newPassword !== pwForm.confirmPassword)
      return setPwStatus({ type: 'error', message: 'New password and confirm password do not match.' });

    setPwLoading(true);
    try {
      const res = await api.put('/auth/update-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      if (res.data.success) {
        setPwStatus({ type: 'success', message: res.data.message });
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setPwStatus({ type: 'error', message: err.response?.data?.message || 'Failed to update password.' });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-8">

      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Credentials</h1>
      </div>

      {/* Current identity card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex items-center space-x-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-700/20 border border-emerald-500/30 flex items-center justify-center text-emerald-700 font-extrabold text-lg flex-shrink-0">
          {admin?.name ? admin.name.charAt(0).toUpperCase() : 'A'}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-900 text-sm">{admin?.name || 'Administrator'}</p>
          <p className="text-xs text-slate-500 truncate">{admin?.email || '—'}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
            {admin?.role || 'admin'}
          </span>
        </div>
        <ShieldCheck className="w-6 h-6 text-emerald-500 ml-auto flex-shrink-0" />
      </div>

      {/* ── Change Email Card ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center space-x-2.5">
          <Mail className="w-5 h-5 text-slate-500" />
          <h2 className="text-base font-bold text-slate-900">Change Email</h2>
        </div>
        <div className="p-6 space-y-5">
          <Banner type={emailStatus.type} message={emailStatus.message} />

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {/* Current email — display only */}
            <Field label="Current Email">
              <div className="flex items-center space-x-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-500 truncate">{admin?.email || '—'}</span>
              </div>
            </Field>

            {/* New email */}
            <Field label="New Email Address *">
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={emailForm.newEmail}
                  onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                  placeholder="new@example.com"
                  className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </Field>

            {/* Current password verification */}
            <Field label="Current Password (required for verification) *">
              <PasswordInput
                value={emailForm.currentPassword}
                onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
                placeholder="Enter your current password"
              />
            </Field>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={emailLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 transition-colors disabled:opacity-50"
              >
                {emailLoading ? 'Saving…' : 'Update Email'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Change Password Card ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center space-x-2.5">
          <Lock className="w-5 h-5 text-slate-500" />
          <h2 className="text-base font-bold text-slate-900">Change Password</h2>
        </div>
        <div className="p-6 space-y-5">
          <Banner type={pwStatus.type} message={pwStatus.message} />

          {/* Policy hint */}
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-1">
            <p className="font-semibold text-slate-600">New password must:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Be at least 8 characters long</li>
              <li>Contain at least one letter (a–z)</li>
              <li>Contain at least one number (0–9)</li>
            </ul>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {/* Current password */}
            <Field label="Current Password (required for verification) *">
              <PasswordInput
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                placeholder="Enter your current password"
              />
            </Field>

            {/* New password */}
            <Field label="New Password *">
              <PasswordInput
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                placeholder="Min 8 chars, letters + numbers"
              />
            </Field>

            {/* Confirm new password */}
            <Field label="Confirm New Password *">
              <PasswordInput
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                placeholder="Repeat new password"
              />
            </Field>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={pwLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 transition-colors disabled:opacity-50"
              >
                {pwLoading ? 'Saving…' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}

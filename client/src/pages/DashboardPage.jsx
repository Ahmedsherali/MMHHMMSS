import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CalendarDays, 
  UtensilsCrossed, 
  Receipt, 
  Users, 
  ArrowUpRight
} from 'lucide-react';
import api from '../services/api';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    bookingsCount: 0,
    cateringCount: 0,
    expenseTotal: 0,
    workersCount: 0,
    recentBookings: [],
    recentExpenses: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [bookingsRes, cateringRes, expenseSummaryRes, workersRes, expensesRes] = await Promise.allSettled([
          api.get('/bookings'),
          api.get('/catering'),
          api.get('/expenses/summary'),
          api.get('/workers/stats'),
          api.get('/expenses'),
        ]);

        const bookings = bookingsRes.status === 'fulfilled' ? bookingsRes.value.data.data : [];
        const catering = cateringRes.status === 'fulfilled' ? cateringRes.value.data.data : [];
        const expenseSummary = expenseSummaryRes.status === 'fulfilled' ? expenseSummaryRes.value.data : { grandTotal: 0 };
        const workerStats = workersRes.status === 'fulfilled' ? workersRes.value.data.data : { activeTotal: 0 };
        const expenses = expensesRes.status === 'fulfilled' ? expensesRes.value.data.data : [];

        setStats({
          bookingsCount: bookings.length,
          cateringCount: catering.length,
          expenseTotal: expenseSummary.grandTotal || 0,
          workersCount: workerStats.activeTotal || 0,
          recentBookings: bookings.slice(0, 5),
          recentExpenses: expenses.slice(0, 5),
        });
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">56 EVENTS</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/bookings"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-semibold rounded-xl text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-2"
          >
            <CalendarDays className="w-4 h-4" />
            <span>New Booking</span>
          </Link>
          <Link
            to="/expenses"
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 font-semibold rounded-xl text-sm transition-all"
          >
            <span>Log Expense</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hall Bookings</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.bookingsCount}</p>
            <Link to="/bookings" className="text-xs text-emerald-600 font-semibold mt-2 inline-flex items-center hover:underline">
              View Calendar <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CalendarDays className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Catering Orders</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.cateringCount}</p>
            <Link to="/catering" className="text-xs text-emerald-600 font-semibold mt-2 inline-flex items-center hover:underline">
              Manage Orders <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Expenses</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">Rs. {stats.expenseTotal.toLocaleString()}</p>
            <Link to="/expenses" className="text-xs text-emerald-600 font-semibold mt-2 inline-flex items-center hover:underline">
              View Breakdown <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Workers</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{stats.workersCount}</p>
            <Link to="/team" className="text-xs text-emerald-600 font-semibold mt-2 inline-flex items-center hover:underline">
              Staff & Daily Wagers <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
              <span>Recent Hall Bookings</span>
            </h3>
            <Link to="/bookings" className="text-xs text-emerald-600 font-semibold hover:underline">
              View all
            </Link>
          </div>

          {stats.recentBookings.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No hall bookings recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recentBookings.map((b) => (
                <div key={b._id} className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{b.clientName}</p>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                      <span>{new Date(b.bookingDate).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-600">{b.shift} Shift</span>
                      <span>•</span>
                      <span>{b.guestCount} Guests</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-800">Rs. {b.discountedTotal?.toLocaleString()}</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 ${
                      b.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-rose-600" />
              <span>Recent Expenses</span>
            </h3>
            <Link to="/expenses" className="text-xs text-emerald-600 font-semibold hover:underline">
              View summary
            </Link>
          </div>

          {stats.recentExpenses.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No expenses logged yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recentExpenses.map((exp) => (
                <div key={exp._id} className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{exp.category}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{exp.description || new Date(exp.expenseDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-rose-600">Rs. {exp.amount?.toLocaleString()}</p>
                    <span className="text-xs text-slate-400">{new Date(exp.expenseDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  Users,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  BookOpen,
  User,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  X,
  Eye,
  Search,
  Filter,
  Briefcase,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { partyService } from '../services/api';
import { formatCurrency } from '../utils/exportUtils';

const PartiesPage = ({ parties = [], onSelectPartyForLedger, onOpenPaymentModal, refreshParties }) => {
  // Add Party Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('CUSTOMER');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [creditLimit, setCreditLimit] = useState(500000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL', 'CUSTOMER', 'VENDOR', 'BOTH'

  // Selected Profile Modal State
  const [selectedPartyProfile, setSelectedPartyProfile] = useState(null);

  // Delete Confirmation Modal State
  const [partyToDelete, setPartyToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Local Display List for instant reactive updates
  const [displayParties, setDisplayParties] = useState(parties);

  React.useEffect(() => {
    setDisplayParties(parties);
  }, [parties]);

  const handleCreateParty = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Party name is required');
      return;
    }

    try {
      setLoading(true);
      const res = await partyService.create({
        name: name.trim(),
        type,
        phone,
        email,
        address,
        gstin: gstin.toUpperCase(),
        creditLimit: Number(creditLimit),
      });

      if (res.data?.success) {
        setName('');
        setPhone('');
        setEmail('');
        setAddress('');
        setGstin('');
        setShowModal(false);
        refreshParties && refreshParties();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create party');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteParty = async () => {
    if (!partyToDelete) return;
    const targetId = partyToDelete._id;

    // Instant UI update
    setDisplayParties((prev) => prev.filter((p) => p._id !== targetId));
    setPartyToDelete(null);
    setSelectedPartyProfile(null);

    try {
      setDeleteLoading(true);
      await partyService.delete(targetId);
    } catch (err) {
      console.warn('[Party Delete Warning]:', err.message);
    } finally {
      setDeleteLoading(false);
      refreshParties && refreshParties();
    }
  };

  // Filter parties by search & type
  const filteredParties = displayParties.filter((p) => {
    const matchesSearch =
      (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.gstin || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (typeFilter === 'ALL') return matchesSearch;
    return matchesSearch && p.type === typeFilter;
  });

  // KPI Calculations
  const customerCount = displayParties.filter((p) => p.type === 'CUSTOMER' || p.type === 'BOTH').length;
  const vendorCount = displayParties.filter((p) => p.type === 'VENDOR' || p.type === 'BOTH').length;
  const totalReceivable = displayParties.reduce((acc, p) => acc + (p.currentBalance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-500/20 text-indigo-300 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-indigo-500/30 uppercase tracking-wider">
              B2B Accounts Directory
            </span>
            <span className="text-xs text-slate-400 font-mono">Real-time Financial Ledger Sync</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Customer & Vendor Accounts Directory</span>
          </h2>
          <p className="text-xs text-slate-300">
            Manage B2B client ledgers, view full account profiles, credit limits, and outstanding balances
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="z-10 inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-5 py-2.5 rounded-2xl text-xs font-extrabold shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 active:scale-95 shrink-0 border border-indigo-400/30"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Customer / Party</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">Total B2B Accounts</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{displayParties.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">Active Customers</p>
            <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">{customerCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase">Total Receivables (₹)</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">{formatCurrency(totalReceivable)}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        {/* Type Filter Buttons */}
        <div className="flex items-center space-x-2">
          {['ALL', 'CUSTOMER', 'VENDOR', 'BOTH'].map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setTypeFilter(filterKey)}
              className={`px-3.5 py-1.5 text-xs font-extrabold rounded-xl transition ${
                typeFilter === filterKey
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {filterKey === 'ALL' ? 'All Accounts' : filterKey}
            </button>
          ))}
        </div>

        {/* Live Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search Company, GSTIN, Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-2xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition shadow-sm"
          />
        </div>
      </div>

      {/* Party Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredParties.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            No matching B2B accounts found.
          </div>
        ) : (
          filteredParties.map((p) => (
            <div
              key={p._id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 hover:border-indigo-400 dark:hover:border-indigo-600/60 transition flex flex-col justify-between shadow-sm hover:shadow-xl space-y-4 relative group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-indigo-500/20">
                      {p.name ? p.name.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">{p.name}</h3>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                        p.type === 'CUSTOMER'
                          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-300 dark:border-sky-700/60'
                          : p.type === 'VENDOR'
                          ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-300 dark:border-purple-700/60'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60'
                      }`}>
                        {p.type}
                      </span>
                    </div>
                  </div>

                  {/* Remove Customer Action */}
                  <button
                    onClick={() => setPartyToDelete(p)}
                    title="Remove Customer Account"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">GSTIN: {p.gstin || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-300">{p.phone || 'No phone provided'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate text-slate-600 dark:text-slate-300">{p.email || 'No email provided'}</span>
                  </div>
                </div>
              </div>

              {/* Balance & Quick Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Running Balance</span>
                    <span className={`font-black text-sm font-mono ${p.currentBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {formatCurrency(p.currentBalance)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Credit Limit</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-xs font-mono">{formatCurrency(p.creditLimit)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSelectedPartyProfile(p)}
                    className="inline-flex items-center justify-center space-x-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-2 px-2 rounded-xl border border-slate-200 dark:border-slate-700 transition"
                    title="View Full Customer Account Profile"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Profile</span>
                  </button>

                  <button
                    onClick={() => onSelectPartyForLedger(p._id)}
                    className="inline-flex items-center justify-center space-x-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold py-2 px-2 rounded-xl border border-indigo-200 dark:border-indigo-800/50 transition"
                    title="View Ledger Passbook"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Ledger</span>
                  </button>

                  <button
                    onClick={() => onOpenPaymentModal(p._id)}
                    className="inline-flex items-center justify-center space-x-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black py-2 px-2 rounded-xl transition shadow-md shadow-emerald-500/25"
                    title="Receive Payment"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Full Customer Profile View Modal */}
      {selectedPartyProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-lg shadow-md shadow-indigo-500/25">
                  {selectedPartyProfile.name ? selectedPartyProfile.name.charAt(0).toUpperCase() : 'C'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{selectedPartyProfile.name}</h3>
                  <span className="text-xs font-extrabold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                    {selectedPartyProfile.type} ACCOUNT
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPartyProfile(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Account Information Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Phone Number</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPartyProfile.phone || 'N/A'}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Email Address</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPartyProfile.email || 'N/A'}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">GSTIN Number</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedPartyProfile.gstin || 'N/A'}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Credit Limit Allowed</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{formatCurrency(selectedPartyProfile.creditLimit)}</span>
              </div>
              <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Factory / Billing Address</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedPartyProfile.address || 'No address provided'}</span>
              </div>
            </div>

            {/* Financial Summary Highlight */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-50 dark:via-slate-950 to-amber-500/5 border border-amber-500/30 flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase">Current Outstanding Balance</p>
                <p className="text-xl font-black text-slate-900 dark:text-white font-mono">{formatCurrency(selectedPartyProfile.currentBalance)}</p>
              </div>
              <button
                onClick={() => {
                  onSelectPartyForLedger(selectedPartyProfile._id);
                  setSelectedPartyProfile(null);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition shadow-md shadow-indigo-600/25"
              >
                Open Full Passbook
              </button>
            </div>

            {/* Action Bar inside Modal */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setPartyToDelete(selectedPartyProfile)}
                className="inline-flex items-center space-x-1.5 text-rose-500 hover:text-rose-600 text-xs font-bold px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition border border-rose-200 dark:border-rose-800/40"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Account</span>
              </button>

              <button
                onClick={() => setSelectedPartyProfile(null)}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold px-4 py-2 rounded-xl transition border border-slate-200 dark:border-slate-700"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {partyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Remove Customer Account?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to remove <strong className="text-slate-900 dark:text-white">{partyToDelete.name}</strong> from your active directory?
              </p>
            </div>

            <div className="flex justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setPartyToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteParty}
                disabled={deleteLoading}
                className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
              >
                {deleteLoading ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Party Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Add New B2B Customer / Party</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-800/50">{error}</p>}

            <form onSubmit={handleCreateParty} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Customer / Company Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Steel Pvt Ltd"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2"
                  >
                    <option value="CUSTOMER">CUSTOMER</option>
                    <option value="VENDOR">VENDOR</option>
                    <option value="BOTH">BOTH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="27AAACA1234A1Z5"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3 py-2 uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98201 12345"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="accounts@company.com"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Billing / Factory Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Plot 42, Industrial Area Phase II, City"
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs rounded-xl px-3.5 py-2"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Party Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartiesPage;

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import PartyLedger from './pages/PartyLedger';
import PartiesPage from './pages/PartiesPage';
import OrdersPage from './pages/OrdersPage';
import InventoryPage from './pages/InventoryPage';
import LoginPage from './pages/LoginPage';
import MobileBottomNav from './components/MobileBottomNav';

import ReceivePaymentModal from './components/ReceivePaymentModal';
import CreateOrderModal from './components/CreateOrderModal';
import InwardMaterialModal from './components/InwardMaterialModal';
import EditEnterpriseModal from './components/EditEnterpriseModal';
import IndustrySelectorModal from './components/IndustrySelectorModal';
import ResetPasswordModal from './components/ResetPasswordModal';
import DataMigrationModal from './components/DataMigrationModal';

import { partyService } from './services/api';
import { useAuth } from './context/AuthContext';

const App = () => {
  const { isAuthenticated, loading } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [parties, setParties] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Theme Mode state (Dark / Light)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved !== null ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode((prev) => !prev);

  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [isEditEnterpriseModalOpen, setIsEditEnterpriseModalOpen] = useState(false);
  const [isIndustryModalOpen, setIsIndustryModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [migrationModule, setMigrationModule] = useState('parties');

  const [preselectedPartyId, setPreselectedPartyId] = useState('');

  const handleOpenMigrationModal = (mod = 'parties') => {
    setMigrationModule(mod);
    setIsMigrationModalOpen(true);
  };

  // If user navigated to 'migration' tab via sidebar
  useEffect(() => {
    if (activeTab === 'migration') {
      handleOpenMigrationModal('parties');
      setActiveTab('dashboard');
    }
  }, [activeTab]);

  // Tally-style Global Keyboard Shortcuts for Lightning Speed ERP Actions
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcut if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        if (e.key === 'Escape') {
          setIsPaymentModalOpen(false);
          setIsOrderModalOpen(false);
          setIsInwardModalOpen(false);
          setIsEditEnterpriseModalOpen(false);
          setIsIndustryModalOpen(false);
          setIsResetPasswordModalOpen(false);
          setIsMigrationModalOpen(false);
        }
        return;
      }

      if (e.altKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'i') {
          e.preventDefault();
          setIsInwardModalOpen((prev) => !prev);
        } else if (key === 'd') {
          e.preventDefault();
          setIsOrderModalOpen((prev) => !prev);
        } else if (key === 'p') {
          e.preventDefault();
          handleOpenPaymentModal('');
        } else if (key === '1') {
          e.preventDefault();
          setActiveTab('dashboard');
        } else if (key === '2') {
          e.preventDefault();
          setActiveTab('ledger');
        } else if (key === '3') {
          e.preventDefault();
          setActiveTab('parties');
        } else if (key === '4') {
          e.preventDefault();
          setActiveTab('orders');
        } else if (key === '5') {
          e.preventDefault();
          setActiveTab('inventory');
        } else if (key === '6' || key === 'm') {
          e.preventDefault();
          handleOpenMigrationModal('parties');
        }
      } else if (e.key === 'Escape') {
        setIsPaymentModalOpen(false);
        setIsOrderModalOpen(false);
        setIsInwardModalOpen(false);
        setIsEditEnterpriseModalOpen(false);
        setIsIndustryModalOpen(false);
        setIsResetPasswordModalOpen(false);
        setIsMigrationModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchParties();
  }, [refreshTrigger, isAuthenticated]);

  const fetchParties = async () => {
    try {
      const res = await partyService.getAll();
      if (res.data?.success) {
        setParties(res.data.parties || []);
      }
    } catch (err) {
      console.error('Error loading parties:', err);
    }
  };

  const handleTriggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleOpenPaymentModal = (partyId = '') => {
    setPreselectedPartyId(partyId);
    setIsPaymentModalOpen(true);
  };

  const handleSelectPartyForLedger = (partyId) => {
    setPreselectedPartyId(partyId);
    setActiveTab('ledger');
  };

  // If Auth loading check in progress
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-400">Authenticating StackPulse ERP...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, force render Login Page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header with Theme Switcher & Admin Logout */}
      <Navbar
        darkMode={darkMode}
        toggleTheme={toggleTheme}
        onOpenPaymentModal={() => handleOpenPaymentModal('')}
        onOpenOrderModal={() => setIsOrderModalOpen(true)}
        onOpenInwardModal={() => setIsInwardModalOpen(true)}
        onOpenEditEnterpriseModal={() => setIsEditEnterpriseModalOpen(true)}
        onOpenIndustryModal={() => setIsIndustryModalOpen(true)}
        onOpenResetPasswordModal={() => setIsResetPasswordModalOpen(true)}
        onOpenMigrationModal={handleOpenMigrationModal}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar (Desktop) */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Area with mobile bottom padding */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-24 md:pb-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardPage
                onNavigate={setActiveTab}
                onOpenPaymentModal={handleOpenPaymentModal}
                onOpenOrderModal={() => setIsOrderModalOpen(true)}
                onOpenInwardModal={() => setIsInwardModalOpen(true)}
                onOpenMigrationModal={handleOpenMigrationModal}
                refreshTrigger={refreshTrigger}
              />
            )}

            {activeTab === 'ledger' && (
              <PartyLedger
                parties={parties}
                selectedPartyId={preselectedPartyId}
                onOpenPaymentModal={handleOpenPaymentModal}
                refreshTrigger={refreshTrigger}
              />
            )}

            {activeTab === 'parties' && (
              <PartiesPage
                parties={parties}
                onSelectPartyForLedger={handleSelectPartyForLedger}
                onOpenPaymentModal={handleOpenPaymentModal}
                refreshParties={fetchParties}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersPage
                onOpenOrderModal={() => setIsOrderModalOpen(true)}
                refreshTrigger={refreshTrigger}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryPage
                onOpenInwardModal={() => setIsInwardModalOpen(true)}
                refreshTrigger={refreshTrigger}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar (Phone & Tablet) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenPaymentModal={handleOpenPaymentModal}
        onOpenOrderModal={() => setIsOrderModalOpen(true)}
      />

      {/* Global Modals */}
      <ReceivePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        parties={parties}
        selectedPartyId={preselectedPartyId}
        onSuccess={handleTriggerRefresh}
      />

      <CreateOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        parties={parties}
        onSuccess={handleTriggerRefresh}
      />

      <InwardMaterialModal
        isOpen={isInwardModalOpen}
        onClose={() => setIsInwardModalOpen(false)}
        parties={parties}
        onSuccess={handleTriggerRefresh}
      />

      <EditEnterpriseModal
        isOpen={isEditEnterpriseModalOpen}
        onClose={() => setIsEditEnterpriseModalOpen(false)}
      />

      <IndustrySelectorModal
        isOpen={isIndustryModalOpen}
        onClose={() => setIsIndustryModalOpen(false)}
      />

      <ResetPasswordModal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
      />

      <DataMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
        initialModule={migrationModule}
        existingParties={parties}
        onSuccess={handleTriggerRefresh}
      />
    </div>
  );
};

export default App;

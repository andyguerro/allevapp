import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import Equipment from './components/Equipment';
import Quotes from './components/Quotes';
import FarmsManagement from './components/FarmsManagement';
import Projects from './components/Projects';
import MaintenanceCalendar from './components/MaintenanceCalendar';
import FacilitiesManagement from './components/FacilitiesManagement';
import Settings from './components/Settings';
import StorageDiagnostics from './components/StorageDiagnostics';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageFilters, setPageFilters] = useState<any>({});

  const handleNavigate = (page: string, filters?: any) => {
    setCurrentPage(page);
    setPageFilters(filters || {});
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'reports':
        return <Reports initialFilters={pageFilters} />;
      case 'equipment':
        return <Equipment initialFilters={pageFilters} />;
      case 'projects':
        return <Projects initialFilters={pageFilters} />;
      case 'quotes':
        return <Quotes />;
      case 'farms':
        return <FarmsManagement onNavigate={handleNavigate} />;
      case 'maintenance':
        return <MaintenanceCalendar />;
      case 'facilities':
        return <FacilitiesManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Layout currentPage={currentPage} onNavigate={handleNavigate}>
        {renderPage()}
      </Layout>
    </div>
  );
};

export default App;
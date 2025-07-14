import React, { useState } from 'react';
import UserSelection from './components/UserSelection';
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

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageFilters, setPageFilters] = useState<any>({});

  const handleUserSelect = (user: any) => {
    setCurrentUser(user);
    // Salva l'utente nel localStorage per sessioni future
    localStorage.setItem('allevapp_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('allevapp_current_user');
    setCurrentPage('dashboard');
  };

  // Controlla se c'è un utente salvato nel localStorage al caricamento
  React.useEffect(() => {
    const savedUser = localStorage.getItem('allevapp_current_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Errore nel parsing utente salvato:', error);
        localStorage.removeItem('allevapp_current_user');
      }
    }
  }, []);

  const handleNavigate = (page: string, filters?: any) => {
    setCurrentPage(page);
    setPageFilters(filters || {});
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'reports':
        return <Reports initialFilters={pageFilters} currentUser={currentUser} />;
      case 'equipment':
        return <Equipment />;
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

  // Se non c'è un utente selezionato, mostra la schermata di selezione
  if (!currentUser) {
    return <UserSelection onUserSelect={handleUserSelect} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Layout 
        currentPage={currentPage} 
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogout={handleLogout}
      >
        {renderPage()}
      </Layout>
    </div>
  );
};

export default App;
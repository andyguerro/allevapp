import React, { useState } from 'react';
import { supabase } from './lib/supabase';
import UserSelection from './components/UserSelection';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import Equipment from './components/Equipment';
import Quotes from './components/Quotes';
import Orders from './components/Orders';
import FarmsManagement from './components/FarmsManagement';
import Projects from './components/Projects';
import MaintenanceCalendar from './components/MaintenanceCalendar';
import FacilitiesManagement from './components/FacilitiesManagement';
import Settings from './components/Settings';
import DocumentsManagement from './components/DocumentsManagement';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageFilters, setPageFilters] = useState<any>({});
  const [userFarms, setUserFarms] = useState<string[]>([]);

  const handleUserSelect = (user: any) => {
    setCurrentUser(user);
    // Salva l'utente nel localStorage per sessioni future
    localStorage.setItem('allevapp_current_user', JSON.stringify(user));
    
    // Fetch farms assigned to this user if they're a technician
    if (user.role === 'technician') {
      fetchUserFarms(user.id);
    }
  };

  const fetchUserFarms = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('farm_technicians')
        .select('farm_id')
        .eq('user_id', userId);

      if (error) throw error;
      setUserFarms(data.map((item: any) => item.farm_id));
    } catch (error) {
      console.error('Error fetching user farms:', error);
      setUserFarms([]);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('allevapp_current_user');
    setCurrentPage('dashboard');
    setUserFarms([]);
  };

  // Controlla se c'è un utente salvato nel localStorage al caricamento
  React.useEffect(() => {
    const savedUser = localStorage.getItem('allevapp_current_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        
        // Fetch farms for technicians
        if (user.role === 'technician') {
          fetchUserFarms(user.id);
        }
      } catch (error) {
        console.error('Errore nel parsing utente salvato:', error);
        localStorage.removeItem('allevapp_current_user');
      }
    }
  }, []);

  const handleNavigate = (page: string, filters?: any) => {
    setCurrentPage(page);
    setPageFilters(filters || {});
    
    // Verifica se l'utente ha accesso alla pagina richiesta
    if (currentUser) {
      const userRole = currentUser.role;
      
      // Definisci le restrizioni di accesso alle pagine
      const restrictedPages: Record<string, string[]> = {
        'projects': ['admin', 'manager'],
        'quotes': ['admin', 'manager'],
        'orders': ['admin', 'manager'],
        'maintenance': ['admin', 'manager'],
        'settings': ['admin']
      };
      
      // Se la pagina è ristretta e l'utente non ha il ruolo necessario, reindirizza alla dashboard
      if (restrictedPages[page] && !restrictedPages[page].includes(userRole)) {
        setCurrentPage('dashboard');
        alert('Non hai i permessi necessari per accedere a questa pagina.');
      }
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} userFarms={userFarms} />;
      case 'reports':
        return <Reports initialFilters={pageFilters} currentUser={currentUser} userFarms={userFarms} />;
      case 'equipment':
        return <Equipment currentUser={currentUser} userFarms={userFarms} initialFilters={pageFilters} />;
      case 'projects':
        return <Projects initialFilters={pageFilters} />;
      case 'quotes':
        return <Quotes currentUser={currentUser} initialFilters={pageFilters} />;
      case 'orders':
        return <Orders />;
      case 'farms':
        return <FarmsManagement onNavigate={handleNavigate} userFarms={userFarms} />;
      case 'maintenance':
        return <MaintenanceCalendar />;
      case 'facilities':
        return <FacilitiesManagement currentUser={currentUser} userFarms={userFarms} initialFilters={pageFilters} />;
      case 'documents':
        return <DocumentsManagement currentUser={currentUser} userFarms={userFarms} initialFilters={pageFilters} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={handleNavigate} userFarms={userFarms} />;
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
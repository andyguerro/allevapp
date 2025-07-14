import React from 'react';
import { Home, ClipboardList, Package, FileText, Building, Calendar, Wrench, Settings, FolderOpen, Database, Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'farms', label: 'Allevamenti', icon: Building },
    { id: 'reports', label: 'Segnalazioni', icon: ClipboardList },
    { id: 'equipment', label: 'Attrezzature', icon: Package },
    { id: 'facilities', label: 'Impianti', icon: Wrench },
    { id: 'projects', label: 'Progetti', icon: FolderOpen },
    { id: 'quotes', label: 'Preventivi', icon: FileText },
    { id: 'maintenance', label: 'Calendario', icon: Calendar },
    { id: 'settings', label: 'Impostazioni', icon: Settings },
  ];

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-brand-coral/20 relative z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-brand-blue hover:bg-brand-blue/10 transition-colors"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              
              <div className="flex items-center space-x-3">
                <img src="/ZooG.png" alt="AllevApp" className="h-8 w-8 sm:h-10 sm:w-10" />
                <h1 className="text-xl sm:text-2xl font-bold text-brand-red">AllevApp</h1>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <span className="text-xs sm:text-sm text-brand-gray">
                Sistema di Gestione Allevamenti
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Sidebar */}
        <nav className={`bg-gradient-to-b from-brand-blue to-brand-blue-dark shadow-lg min-h-screen transition-all duration-300 ease-in-out ${
          mobileMenuOpen 
            ? 'fixed inset-y-0 left-0 z-40 w-64 transform translate-x-0' 
            : 'hidden lg:block lg:w-64'
        }`}>
          <div className="p-6">
            <div className="lg:hidden mb-6 pt-2">
              <div className="flex items-center space-x-3">
                <img src="/ZooG.png" alt="AllevApp" className="h-8 w-8" />
                <h2 className="text-lg font-bold text-white">Menu</h2>
              </div>
            </div>
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      currentPage === item.id
                        ? 'bg-white text-brand-red shadow-lg transform scale-105'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-gray-50 to-brand-gray-light/30 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
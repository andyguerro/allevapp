import React from 'react';
import { Home, ClipboardList, Package, FileText, Building, Calendar, Wrench, Settings, FolderOpen } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-brand-coral/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <img src="/ZooG.png" alt="AllevApp" className="h-10 w-10" />
                <h1 className="text-2xl font-bold text-brand-red">AllevApp</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-brand-gray">
                Sistema di Gestione Allevamenti
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="bg-gradient-to-b from-brand-blue to-brand-blue-dark shadow-lg w-64 min-h-screen">
          <div className="p-6">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(item.id)}
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

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gradient-to-br from-gray-50 to-brand-gray-light/30">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
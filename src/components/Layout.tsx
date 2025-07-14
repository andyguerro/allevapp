import React from 'react';
import { Home, ClipboardList, Package, FileText, Building, Calendar, Wrench, Settings, FolderOpen, Menu, X, User, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  currentUser?: any;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate, currentUser, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);

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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-brand-red/20 text-brand-red border-brand-red/30';
      case 'manager': return 'bg-brand-blue/20 text-brand-blue border-brand-blue/30';
      case 'technician': return 'bg-brand-coral/20 text-brand-coral border-brand-coral/30';
      default: return 'bg-brand-gray/20 text-brand-gray border-brand-gray/30';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Amministratore';
      case 'manager': return 'Manager';
      case 'technician': return 'Tecnico';
      default: return role;
    }
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
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:block text-xs sm:text-sm text-brand-gray">
                Sistema di Gestione Allevamenti
              </div>
              
              {/* User Menu */}
              {currentUser && (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-2 rounded-lg bg-brand-blue/10 hover:bg-brand-blue/20 transition-colors"
                  >
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-brand-blue to-brand-blue-light rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                      {currentUser.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-medium text-brand-blue truncate max-w-24">
                        {currentUser.full_name.split(' ')[0]}
                      </p>
                      <p className="text-xs text-brand-gray">
                        {getRoleText(currentUser.role)}
                      </p>
                    </div>
                  </button>

                  {/* User Dropdown */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-brand-coral/20 z-50">
                      <div className="p-4 border-b border-brand-coral/20">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-brand-blue to-brand-blue-light rounded-full flex items-center justify-center text-white font-bold">
                            {currentUser.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-brand-blue truncate">
                              {currentUser.full_name}
                            </p>
                            <p className="text-sm text-brand-gray truncate">
                              {currentUser.email}
                            </p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border mt-1 ${getRoleColor(currentUser.role)}`}>
                              {getRoleText(currentUser.role)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            if (onLogout) onLogout();
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2 text-left text-brand-red hover:bg-brand-red/10 rounded-lg transition-colors"
                        >
                          <LogOut size={16} />
                          <span>Cambia Utente</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
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

        {/* User Menu Overlay */}
        {showUserMenu && (
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowUserMenu(false)}
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
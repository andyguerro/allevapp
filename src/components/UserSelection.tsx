import React, { useState, useEffect } from 'react';
import { User, LogIn, Users, Building, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserSelectionProps {
  onUserSelect: (user: any) => void;
}

interface AppUser {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'technician';
  active: boolean;
  created_at: string;
}

const UserSelection: React.FC<UserSelectionProps> = ({ onUserSelect }) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('active', true)
        .order('role', { ascending: true })
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Errore nel caricamento utenti:', error);
      setError('Errore nel caricamento degli utenti. Verifica la configurazione del database.');
    } finally {
      setLoading(false);
    }
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return '👑';
      case 'manager': return '👔';
      case 'technician': return '🔧';
      default: return '👤';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-coral flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-brand-blue mb-2">Caricamento...</h2>
            <p className="text-brand-gray">Recupero degli utenti in corso</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-coral flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center">
            <AlertCircle size={48} className="mx-auto text-brand-red mb-4" />
            <h2 className="text-xl font-semibold text-brand-red mb-2">Errore di Configurazione</h2>
            <p className="text-brand-gray mb-6">{error}</p>
            <button
              onClick={fetchUsers}
              className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200"
            >
              Riprova
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-coral flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center">
            <Users size={48} className="mx-auto text-brand-gray mb-4" />
            <h2 className="text-xl font-semibold text-brand-blue mb-2">Nessun Utente Configurato</h2>
            <p className="text-brand-gray mb-6">
              Non sono stati trovati utenti attivi nel sistema. Configura almeno un utente nelle impostazioni per accedere all'applicazione.
            </p>
            <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-lg p-4 text-left">
              <h3 className="font-medium text-brand-blue mb-2">Come configurare gli utenti:</h3>
              <ol className="text-sm text-brand-gray space-y-1">
                <li>1. Accedi al database Supabase</li>
                <li>2. Vai alla tabella "users"</li>
                <li>3. Aggiungi almeno un utente attivo</li>
                <li>4. Ricarica questa pagina</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-coral flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-red to-brand-red-light p-6 sm:p-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img src="/ZooG.png" alt="AllevApp" className="h-12 w-12 sm:h-16 sm:w-16" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white">AllevApp</h1>
          </div>
          <p className="text-white/90 text-sm sm:text-base">Sistema di Gestione Allevamenti</p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <LogIn size={32} className="mx-auto text-brand-blue mb-3 sm:mb-4" />
            <h2 className="text-xl sm:text-2xl font-semibold text-brand-blue mb-2">Seleziona Utente</h2>
            <p className="text-brand-gray text-sm sm:text-base">
              Scegli il tuo profilo per accedere all'applicazione
            </p>
          </div>

          {/* Users Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => onUserSelect(user)}
                className="group bg-gradient-to-br from-brand-blue/5 to-brand-coral/5 border border-brand-coral/20 rounded-xl p-4 sm:p-6 hover:shadow-lg hover:border-brand-coral/40 transition-all duration-200 text-left hover:scale-105 transform"
              >
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-brand-blue to-brand-blue-light rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-bold group-hover:from-brand-red group-hover:to-brand-red-light transition-all duration-200">
                      {getRoleIcon(user.role)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-brand-blue text-sm sm:text-base group-hover:text-brand-red transition-colors duration-200 truncate">
                      {user.full_name}
                    </h3>
                    <p className="text-xs sm:text-sm text-brand-gray mb-2 truncate">{user.email}</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                      {getRoleText(user.role)}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    <User size={16} className="text-brand-gray group-hover:text-brand-coral transition-colors duration-200 sm:w-5 sm:h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Footer Info */}
          <div className="mt-6 sm:mt-8 pt-6 border-t border-brand-coral/20">
            <div className="flex items-center justify-center space-x-2 text-xs sm:text-sm text-brand-gray">
              <Building size={14} className="sm:w-4 sm:h-4" />
              <span>Zoogamma Spa - Sistema di Gestione Allevamenti</span>
            </div>
            <p className="text-center text-xs text-brand-gray mt-2">
              Versione 1.0 - {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSelection;
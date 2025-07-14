import React, { useState, useEffect } from 'react';
import { User, LogIn, Users, Building, AlertCircle, Eye, EyeOff } from 'lucide-react';
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
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const CORRECT_PASSWORD = 'Z00Alleva';

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!selectedUserId) {
      setAuthError('Seleziona un utente');
      return;
    }

    if (!password) {
      setAuthError('Inserisci la password');
      return;
    }

    setAuthenticating(true);

    // Simula un piccolo delay per l'autenticazione
    setTimeout(() => {
      if (password === CORRECT_PASSWORD) {
        const selectedUser = users.find(user => user.id === selectedUserId);
        if (selectedUser) {
          onUserSelect(selectedUser);
        }
      } else {
        setAuthError('Password non corretta');
      }
      setAuthenticating(false);
    }, 500);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-brand-red';
      case 'manager': return 'text-brand-blue';
      case 'technician': return 'text-brand-coral';
      default: return 'text-brand-gray';
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

  const selectedUser = users.find(user => user.id === selectedUserId);

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
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
            <h2 className="text-xl sm:text-2xl font-semibold text-brand-blue mb-2">Accesso Utente</h2>
            <p className="text-brand-gray text-sm sm:text-base">
              Seleziona il tuo profilo e inserisci la password
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Seleziona Utente
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-4 py-3 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-colors bg-white"
                required
              >
                <option value="">-- Scegli un utente --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {getRoleIcon(user.role)} {user.full_name} ({getRoleText(user.role)})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected User Info */}
            {selectedUser && (
              <div className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 border border-brand-coral/20 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-blue to-brand-blue-light rounded-full flex items-center justify-center text-white text-lg font-bold">
                    {selectedUser.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-brand-blue">
                      {selectedUser.full_name}
                    </h3>
                    <p className="text-sm text-brand-gray">{selectedUser.email}</p>
                    <span className={`text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                      {getRoleText(selectedUser.role)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setAuthError(null);
                  }}
                  className="w-full px-4 py-3 pr-12 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-colors"
                  placeholder="Inserisci la password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle size={16} className="text-red-600" />
                  <span className="text-sm text-red-700">{authError}</span>
                </div>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={authenticating || !selectedUserId || !password}
              className="w-full bg-gradient-to-r from-brand-red to-brand-red-light text-white py-3 px-6 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
            >
              {authenticating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Accesso in corso...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Accedi</span>
                </>
              )}
            </button>
          </form>

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
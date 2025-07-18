import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Building2, Wrench, Settings as SettingsIcon, Folder, Plus, Trash2, Edit2, Save, X } from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  email: string;
  username: string;
  password: string;
  role: 'admin' | 'manager' | 'technician';
  active: boolean;
  created_at: string;
}

interface Farm {
  id: string;
  name: string;
  address: string;
  company: string;
  created_at: string;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
}

interface AttachmentCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

type TabType = 'users' | 'farms' | 'suppliers' | 'categories';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<AttachmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingFarm, setEditingFarm] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [showNewFarmForm, setShowNewFarmForm] = useState(false);
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showEditFarmModal, setShowEditFarmModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);

  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    role: 'technician' as const
  });

  const [editUserData, setEditUserData] = useState({
    full_name: '',
    email: '',
    role: 'technician' as const
  });
  const [newFarm, setNewFarm] = useState({
    name: '',
    address: '',
    company: 'Zoogamma Spa'
  });

  const [editFarmData, setEditFarmData] = useState({
    name: '',
    address: '',
    company: 'Zoogamma Spa'
  });
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const [editSupplierData, setEditSupplierData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [newCategory, setNewCategory] = useState({
    name: '',
    color: '#6b7280',
    icon: 'folder'
  });

  const [editCategoryData, setEditCategoryData] = useState({
    name: '',
    color: '#6b7280',
    icon: 'folder'
  });
  const generateUsername = (fullName: string): string => {
    return fullName.toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[ñ]/g, 'n')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '.')
      .trim();
  };

  const generatePassword = (): string => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const sendPasswordEmail = async (user: User) => {
    try {
      const { error } = await supabase.functions.invoke('send-password-email', {
        body: {
          email: user.email,
          fullName: user.full_name,
          username: user.username,
          password: user.password
        }
      });

      if (error) {
        console.error('Errore invio email:', error);
        alert('Errore nell\'invio dell\'email. Credenziali create ma email non inviata.');
      } else {
        alert('Email con le credenziali inviata con successo!');
      }
    } catch (error) {
      console.error('Errore invio email:', error);
      alert('Errore nell\'invio dell\'email. Credenziali create ma email non inviata.');
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'users':
          await fetchUsers();
          break;
        case 'farms':
          await fetchFarms();
          break;
        case 'suppliers':
          await fetchSuppliers();
          break;
        case 'categories':
          await fetchCategories();
          break;
      }
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, username, password, role, active, created_at')
      .order('role', { ascending: true })
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Errore nel caricamento utenti:', error);
      return;
    }

    setUsers(data || []);
  };

  const fetchFarms = async () => {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Errore nel caricamento allevamenti:', error);
      return;
    }

    setFarms(data || []);
  };

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Errore nel caricamento fornitori:', error);
      return;
    }

    setSuppliers(data || []);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('attachment_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Errore nel caricamento categorie:', error);
      return;
    }

    setCategories(data || []);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let baseUsername = generateUsername(newUser.full_name);
      let username = baseUsername;
      let counter = 1;

      // Check for existing usernames and add number if needed
      while (true) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('username')
          .eq('username', username)
          .single();

        if (!existingUser) break;
        
        counter++;
        username = `${baseUsername}${counter}`;
      }

      const password = generatePassword();

      const { data, error } = await supabase
        .from('users')
        .insert([{
          full_name: newUser.full_name,
          email: newUser.email,
          username: username,
          password: password,
          role: newUser.role,
          active: true
        }])
        .select()
        .single();

      if (error) {
        console.error('Errore nella creazione utente:', error);
        alert('Errore nella creazione dell\'utente');
        return;
      }

      // Send password email
      await sendPasswordEmail({
        ...data,
        password: password
      });

      setNewUser({ full_name: '', email: '', role: 'technician' });
      setShowNewUserForm(false);
      fetchUsers();
    } catch (error) {
      console.error('Errore nella creazione utente:', error);
      alert('Errore nella creazione dell\'utente');
    }
  };

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('farms')
      .insert([newFarm]);

    if (error) {
      console.error('Errore nella creazione allevamento:', error);
      alert('Errore nella creazione dell\'allevamento');
      return;
    }

    setNewFarm({ name: '', address: '', company: 'Zoogamma Spa' });
    setShowNewFarmForm(false);
    fetchFarms();
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('suppliers')
      .insert([newSupplier]);

    if (error) {
      console.error('Errore nella creazione fornitore:', error);
      alert('Errore nella creazione del fornitore');
      return;
    }

    setNewSupplier({ name: '', email: '', phone: '', address: '' });
    setShowNewSupplierForm(false);
    fetchSuppliers();
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('attachment_categories')
      .insert([newCategory]);

    if (error) {
      console.error('Errore nella creazione categoria:', error);
      alert('Errore nella creazione della categoria');
      return;
    }

    setNewCategory({ name: '', color: '#6b7280', icon: 'folder' });
    setShowNewCategoryForm(false);
    fetchCategories();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Errore nell\'eliminazione utente:', error);
      alert('Errore nell\'eliminazione dell\'utente');
      return;
    }

    fetchUsers();
  };

  const handleDeleteFarm = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo allevamento?')) return;

    const { error } = await supabase
      .from('farms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Errore nell\'eliminazione allevamento:', error);
      alert('Errore nell\'eliminazione dell\'allevamento');
      return;
    }

    fetchFarms();
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo fornitore?')) return;

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Errore nell\'eliminazione fornitore:', error);
      alert('Errore nell\'eliminazione del fornitore');
      return;
    }

    fetchSuppliers();
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa categoria?')) return;

    const { error } = await supabase
      .from('attachment_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Errore nell\'eliminazione categoria:', error);
      alert('Errore nell\'eliminazione della categoria');
      return;
    }

    fetchCategories();
  };

  const tabs = [
    { id: 'users' as TabType, label: 'Utenti', icon: Users },
    { id: 'farms' as TabType, label: 'Allevamenti', icon: Building2 },
    { id: 'suppliers' as TabType, label: 'Fornitori', icon: Wrench },
    { id: 'categories' as TabType, label: 'Categorie', icon: Folder }
  ];

  const roleLabels = {
    admin: 'Amministratore',
    manager: 'Manager',
    technician: 'Tecnico'
  };

  const companyOptions = [
    'Zoogamma Spa',
    'So. Agr. Zooagri Srl',
    'Soc. Agr. Zooallevamenti Srl'
  ];

  const colorOptions = [
    '#6b7280', '#ef4444', '#f97316', '#eab308', 
    '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <SettingsIcon className="w-8 h-8 text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Gestione Utenti</h2>
            <button
              onClick={() => setShowNewUserForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Utente</span>
            </button>
          </div>

          {showNewUserForm && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ruolo
                    </label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="technician">Tecnico</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Amministratore</option>
                    </select>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Crea Utente</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewUserForm(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Annulla</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ruolo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">{user.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.active ? 'Attivo' : 'Inattivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifica utente"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => sendPasswordEmail(user)}
                          className="text-green-600 hover:text-green-900 text-xs"
                          title="Invia credenziali via email"
                        >
                          📧
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Elimina utente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Farms Tab */}
      {activeTab === 'farms' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Gestione Allevamenti</h2>
            <button
              onClick={() => setShowNewFarmForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Allevamento</span>
            </button>
          </div>

          {showNewFarmForm && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <form onSubmit={handleCreateFarm} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Allevamento
                    </label>
                    <input
                      type="text"
                      value={newFarm.name}
                      onChange={(e) => setNewFarm({ ...newFarm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Indirizzo
                    </label>
                    <input
                      type="text"
                      value={newFarm.address}
                      onChange={(e) => setNewFarm({ ...newFarm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Azienda
                    </label>
                    <select
                      value={newFarm.company}
                      onChange={(e) => setNewFarm({ ...newFarm, company: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {companyOptions.map(company => (
                        <option key={company} value={company}>{company}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Crea Allevamento</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewFarmForm(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Annulla</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Indirizzo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azienda
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {farms.map((farm) => (
                  <tr key={farm.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {farm.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {farm.address || 'Non specificato'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {farm.company}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditFarm(farm)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifica allevamento"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFarm(farm.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Elimina allevamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Gestione Fornitori</h2>
            <button
              onClick={() => setShowNewSupplierForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nuovo Fornitore</span>
            </button>
          </div>

          {showNewSupplierForm && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <form onSubmit={handleCreateSupplier} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Fornitore
                    </label>
                    <input
                      type="text"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newSupplier.email}
                      onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefono
                    </label>
                    <input
                      type="tel"
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Indirizzo
                    </label>
                    <input
                      type="text"
                      value={newSupplier.address}
                      onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Crea Fornitore</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewSupplierForm(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Annulla</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contatti
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Indirizzo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {supplier.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{supplier.email}</div>
                      <div className="text-sm text-gray-500">{supplier.phone || 'Non specificato'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.address || 'Non specificato'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditSupplier(supplier)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifica fornitore"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Elimina fornitore"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Gestione Categorie Allegati</h2>
            <button
              onClick={() => setShowNewCategoryForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nuova Categoria</span>
            </button>
          </div>

          {showNewCategoryForm && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Categoria
                    </label>
                    <input
                      type="text"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Colore
                    </label>
                    <div className="flex space-x-2">
                      {colorOptions.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewCategory({ ...newCategory, color })}
                          className={`w-8 h-8 rounded-full border-2 ${
                            newCategory.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icona
                    </label>
                    <select
                      value={newCategory.icon}
                      onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="folder">Cartella</option>
                      <option value="file-text">Documento</option>
                      <option value="image">Immagine</option>
                      <option value="book">Manuale</option>
                      <option value="award">Certificato</option>
                      <option value="receipt">Fattura</option>
                    </select>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Crea Categoria</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryForm(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Annulla</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Colore
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creata il
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm font-medium text-gray-900">{category.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.color}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(category.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifica categoria"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Elimina categoria"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
      {/* Edit User Modal */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Modifica Utente</h2>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={editUserData.full_name}
                  onChange={(e) => setEditUserData({ ...editUserData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editUserData.email}
                  onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ruolo
                </label>
                <select
                  value={editUserData.role}
                  onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="technician">Tecnico</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Amministratore</option>
                </select>
              </div>
              <div className="flex space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditUserModal(false);
                    setEditingUser(null);
                  }}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Salva</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
          </div>
      {/* Edit Farm Modal */}
      {showEditFarmModal && editingFarm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Modifica Allevamento</h2>
            
            <form onSubmit={handleUpdateFarm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Allevamento
                </label>
                <input
                  type="text"
                  value={editFarmData.name}
                  onChange={(e) => setEditFarmData({ ...editFarmData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Indirizzo
                </label>
                <input
                  type="text"
                  value={editFarmData.address}
                  onChange={(e) => setEditFarmData({ ...editFarmData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Azienda
                </label>
                <select
                  value={editFarmData.company}
                  onChange={(e) => setEditFarmData({ ...editFarmData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {companyOptions.map(company => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditFarmModal(false);
                    setEditingFarm(null);
                  }}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Salva</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </>
    );
  };
  
  return (
    <>
      {/* Edit Supplier Modal */}
      {showEditSupplierModal && editingSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Modifica Fornitore</h2>
            
            <form onSubmit={handleUpdateSupplier} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Fornitore
                </label>
                <input
                  type="text"
                  value={editSupplierData.name}
                  onChange={(e) => setEditSupplierData({ ...editSupplierData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editSupplierData.email}
                  onChange={(e) => setEditSupplierData({ ...editSupplierData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefono
                </label>
                <input
                  type="tel"
                  value={editSupplierData.phone}
                  onChange={(e) => setEditSupplierData({ ...editSupplierData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Indirizzo
                </label>
                <input
                  type="text"
                  value={editSupplierData.address}
                  onChange={(e) => setEditSupplierData({ ...editSupplierData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSupplierModal(false);
                    setEditingSupplier(null);
                  }}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Salva</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      )}
      {/* Edit Category Modal */}
      {showEditCategoryModal && editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Modifica Categoria</h2>
            
            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Categoria
                </label>
                <input
                  type="text"
                  value={editCategoryData.name}
                  onChange={(e) => setEditCategoryData({ ...editCategoryData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Colore
                </label>
                <div className="flex space-x-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditCategoryData({ ...editCategoryData, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        editCategoryData.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icona
                </label>
                <select
                  value={editCategoryData.icon}
                  onChange={(e) => setEditCategoryData({ ...editCategoryData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="folder">Cartella</option>
                  <option value="file-text">Documento</option>
                  <option value="image">Immagine</option>
                  <option value="book">Manuale</option>
                  <option value="award">Certificato</option>
                  <option value="receipt">Fattura</option>
                </select>
              </div>
              <div className="flex space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditCategoryModal(false);
                    setEditingCategory(null);
                  }}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Salva</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
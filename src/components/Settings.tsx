import React, { useState, useEffect } from 'react';
import { Users, Building, Truck, Settings as SettingsIcon, Plus, Edit2, Trash2, Mail, Save, X, Tag, Palette, Eye, EyeOff, AlertCircle, CheckCircle, Send, Database, FileText, Calendar, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Microsoft365SetupGuide from './Microsoft365SetupGuide';
import StorageDiagnostics from './StorageDiagnostics';

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
  address?: string;
  company: string;
  created_at: string;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  created_at: string;
}

interface AttachmentCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<AttachmentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMicrosoft365Guide, setShowMicrosoft365Guide] = useState(false);
  const [showStorageDiagnostics, setShowStorageDiagnostics] = useState(false);
  const [sendingDailyReport, setSendingDailyReport] = useState(false);
  const [dailyReportResult, setDailyReportResult] = useState<string | null>(null);

  // User management states
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [userFormData, setUserFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    role: 'technician' as 'admin' | 'manager' | 'technician'
  });

  // Farm management states
  const [showCreateFarmModal, setShowCreateFarmModal] = useState(false);
  const [showEditFarmModal, setShowEditFarmModal] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [farmFormData, setFarmFormData] = useState({
    name: '',
    address: '',
    company: 'Zoogamma Spa'
  });

  // Supplier management states
  const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  // Category management states
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AttachmentCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    color: '#6b7280',
    icon: 'folder'
  });

  // Technician management states
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);
  const [selectedFarmForTechnicians, setSelectedFarmForTechnicians] = useState<Farm | null>(null);
  const [farmTechnicians, setFarmTechnicians] = useState<{[farmId: string]: User[]}>({});
  const [availableTechnicians, setAvailableTechnicians] = useState<User[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchUsers(),
        fetchFarms(),
        fetchSuppliers(),
        fetchCategories()
      ]);
    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setUsers(data || []);
  };

  const fetchFarms = async () => {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setFarms(data || []);
  };

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setSuppliers(data || []);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('attachment_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    setCategories(data || []);
  };

  // User management functions
  const generateUsername = (fullName: string) => {
    return fullName.toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[ñ]/g, 'n')
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]/g, '');
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('users')
        .insert([userFormData]);

      if (error) throw error;

      // Send password email
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: userFormData.email,
            userName: userFormData.full_name,
            username: userFormData.username,
            password: userFormData.password,
            role: userFormData.role
          })
        });

        const result = await response.json();
        
        if (result.success) {
          alert(`Utente creato con successo!\n\nLe credenziali sono state inviate via email a ${userFormData.email}`);
        } else {
          alert(`Utente creato con successo!\n\nATTENZIONE: Non è stato possibile inviare l'email con le credenziali.\n\nCredenziali:\nUsername: ${userFormData.username}\nPassword: ${userFormData.password}\n\nComunica manualmente queste credenziali all'utente.`);
        }
      } catch (emailError) {
        console.error('Errore invio email:', emailError);
        alert(`Utente creato con successo!\n\nATTENZIONE: Non è stato possibile inviare l'email con le credenziali.\n\nCredenziali:\nUsername: ${userFormData.username}\nPassword: ${userFormData.password}\n\nComunica manualmente queste credenziali all'utente.`);
      }

      await fetchUsers();
      resetUserForm();
    } catch (error) {
      console.error('Errore nella creazione utente:', error);
      alert('Errore nella creazione dell\'utente');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      full_name: user.full_name,
      email: user.email,
      username: user.username,
      password: user.password,
      role: user.role
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: userFormData.full_name,
          email: userFormData.email,
          username: userFormData.username,
          password: userFormData.password,
          role: userFormData.role
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      await fetchUsers();
      resetUserEditForm();
      alert('Utente aggiornato con successo!');
    } catch (error) {
      console.error('Errore nell\'aggiornamento utente:', error);
      alert('Errore nell\'aggiornamento dell\'utente');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      await fetchUsers();
    } catch (error) {
      console.error('Errore nell\'eliminazione utente:', error);
      alert('Errore nell\'eliminazione dell\'utente');
    }
  };

  const resetUserForm = () => {
    setUserFormData({
      full_name: '',
      email: '',
      username: '',
      password: '',
      role: 'technician'
    });
    setShowCreateUserModal(false);
  };

  const resetUserEditForm = () => {
    setUserFormData({
      full_name: '',
      email: '',
      username: '',
      password: '',
      role: 'technician'
    });
    setEditingUser(null);
    setShowEditUserModal(false);
  };

  // Farm management functions
  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('farms')
        .insert([farmFormData]);

      if (error) throw error;

      await fetchFarms();
      resetFarmForm();
    } catch (error) {
      console.error('Errore nella creazione allevamento:', error);
      alert('Errore nella creazione dell\'allevamento');
    }
  };

  const handleEditFarm = (farm: Farm) => {
    setEditingFarm(farm);
    setFarmFormData({
      name: farm.name,
      address: farm.address || '',
      company: farm.company
    });
    setShowEditFarmModal(true);
  };

  const handleUpdateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFarm) return;

    try {
      const { error } = await supabase
        .from('farms')
        .update(farmFormData)
        .eq('id', editingFarm.id);

      if (error) throw error;

      await fetchFarms();
      resetFarmEditForm();
      alert('Allevamento aggiornato con successo!');
    } catch (error) {
      console.error('Errore nell\'aggiornamento allevamento:', error);
      alert('Errore nell\'aggiornamento dell\'allevamento');
    }
  };

  const handleDeleteFarm = async (farmId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo allevamento?')) return;

    try {
      const { error } = await supabase
        .from('farms')
        .delete()
        .eq('id', farmId);

      if (error) throw error;
      await fetchFarms();
    } catch (error) {
      console.error('Errore nell\'eliminazione allevamento:', error);
      alert('Errore nell\'eliminazione dell\'allevamento');
    }
  };

  const resetFarmForm = () => {
    setFarmFormData({
      name: '',
      address: '',
      company: 'Zoogamma Spa'
    });
    setShowCreateFarmModal(false);
  };

  const resetFarmEditForm = () => {
    setFarmFormData({
      name: '',
      address: '',
      company: 'Zoogamma Spa'
    });
    setEditingFarm(null);
    setShowEditFarmModal(false);
  };

  // Supplier management functions
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('suppliers')
        .insert([supplierFormData]);

      if (error) throw error;

      await fetchSuppliers();
      resetSupplierForm();
    } catch (error) {
      console.error('Errore nella creazione fornitore:', error);
      alert('Errore nella creazione del fornitore');
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone || '',
      address: supplier.address || ''
    });
    setShowEditSupplierModal(true);
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .update(supplierFormData)
        .eq('id', editingSupplier.id);

      if (error) throw error;

      await fetchSuppliers();
      resetSupplierEditForm();
      alert('Fornitore aggiornato con successo!');
    } catch (error) {
      console.error('Errore nell\'aggiornamento fornitore:', error);
      alert('Errore nell\'aggiornamento del fornitore');
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo fornitore?')) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) throw error;
      await fetchSuppliers();
    } catch (error) {
      console.error('Errore nell\'eliminazione fornitore:', error);
      alert('Errore nell\'eliminazione del fornitore');
    }
  };

  const resetSupplierForm = () => {
    setSupplierFormData({
      name: '',
      email: '',
      phone: '',
      address: ''
    });
    setShowCreateSupplierModal(false);
  };

  const resetSupplierEditForm = () => {
    setSupplierFormData({
      name: '',
      email: '',
      phone: '',
      address: ''
    });
    setEditingSupplier(null);
    setShowEditSupplierModal(false);
  };

  // Category management functions
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('attachment_categories')
        .insert([categoryFormData]);

      if (error) throw error;

      await fetchCategories();
      resetCategoryForm();
    } catch (error) {
      console.error('Errore nella creazione categoria:', error);
      alert('Errore nella creazione della categoria');
    }
  };

  const handleEditCategory = (category: AttachmentCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      color: category.color,
      icon: category.icon
    });
    setShowEditCategoryModal(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    try {
      const { error } = await supabase
        .from('attachment_categories')
        .update(categoryFormData)
        .eq('id', editingCategory.id);

      if (error) throw error;

      await fetchCategories();
      resetCategoryEditForm();
      alert('Categoria aggiornata con successo!');
    } catch (error) {
      console.error('Errore nell\'aggiornamento categoria:', error);
      alert('Errore nell\'aggiornamento della categoria');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa categoria?')) return;

    try {
      const { error } = await supabase
        .from('attachment_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      await fetchCategories();
    } catch (error) {
      console.error('Errore nell\'eliminazione categoria:', error);
      alert('Errore nell\'eliminazione della categoria');
    }
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      color: '#6b7280',
      icon: 'folder'
    });
    setShowCreateCategoryModal(false);
  };

  const resetCategoryEditForm = () => {
    setCategoryFormData({
      name: '',
      color: '#6b7280',
      icon: 'folder'
    });
    setEditingCategory(null);
    setShowEditCategoryModal(false);
  };

  // Technician management functions
  const handleManageTechnicians = async (farm: Farm) => {
    setSelectedFarmForTechnicians(farm);
    
    try {
      // Fetch farm technicians
      const { data: farmTechData, error: farmTechError } = await supabase
        .from('farm_technicians')
        .select(`
          user_id,
          users (
            id,
            full_name,
            email,
            role
          )
        `)
        .eq('farm_id', farm.id);

      if (farmTechError) throw farmTechError;

      const assignedTechnicians = farmTechData?.map(ft => ft.users).filter(Boolean) || [];
      
      // Get all technicians
      const technicians = users.filter(user => user.role === 'technician');
      
      // Filter available technicians (not assigned to this farm)
      const assignedIds = assignedTechnicians.map(t => t.id);
      const available = technicians.filter(t => !assignedIds.includes(t.id));

      setFarmTechnicians(prev => ({
        ...prev,
        [farm.id]: assignedTechnicians
      }));
      setAvailableTechnicians(available);
      setShowTechnicianModal(true);
    } catch (error) {
      console.error('Errore nel caricamento tecnici:', error);
      alert('Errore nel caricamento dei tecnici');
    }
  };

  const handleAssignTechnician = async (farmId: string, technicianId: string) => {
    try {
      const { error } = await supabase
        .from('farm_technicians')
        .insert([{
          farm_id: farmId,
          user_id: technicianId
        }]);

      if (error) throw error;

      // Refresh technician lists
      if (selectedFarmForTechnicians) {
        await handleManageTechnicians(selectedFarmForTechnicians);
      }
    } catch (error) {
      console.error('Errore nell\'assegnazione tecnico:', error);
      alert('Errore nell\'assegnazione del tecnico');
    }
  };

  const handleRemoveTechnician = async (farmId: string, technicianId: string) => {
    if (!confirm('Sei sicuro di voler rimuovere questo tecnico dall\'allevamento?')) return;

    try {
      const { error } = await supabase
        .from('farm_technicians')
        .delete()
        .eq('farm_id', farmId)
        .eq('user_id', technicianId);

      if (error) throw error;

      // Refresh technician lists
      if (selectedFarmForTechnicians) {
        await handleManageTechnicians(selectedFarmForTechnicians);
      }
    } catch (error) {
      console.error('Errore nella rimozione tecnico:', error);
      alert('Errore nella rimozione del tecnico');
    }
  };

  const handleSendDailyReport = async () => {
    setSendingDailyReport(true);
    setDailyReportResult(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-daily-summary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      const result = await response.json();

      if (result.success) {
        if (result.sent) {
          setDailyReportResult(`✅ Report inviato con successo a ${result.recipients} destinatari!\n\nRiepilogo:\n• ${result.summary.urgent_reports} segnalazioni urgenti\n• ${result.summary.overdue_maintenance} manutenzioni scadute\n• ${result.summary.due_soon_maintenance} manutenzioni in scadenza`);
        } else {
          setDailyReportResult('ℹ️ Nessun elemento da segnalare oggi. Il report non è stato inviato.');
        }
      } else {
        setDailyReportResult(`❌ Errore nell'invio del report: ${result.message}`);
      }
    } catch (error) {
      console.error('Errore nell\'invio report giornaliero:', error);
      setDailyReportResult('❌ Errore nella connessione al servizio email. Verifica la configurazione Microsoft 365.');
    } finally {
      setSendingDailyReport(false);
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-brand-red/20 text-brand-red border-brand-red/30';
      case 'manager': return 'bg-brand-blue/20 text-brand-blue border-brand-blue/30';
      case 'technician': return 'bg-brand-coral/20 text-brand-coral border-brand-coral/30';
      default: return 'bg-brand-gray/20 text-brand-gray border-brand-gray/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brand-blue">Impostazioni</h1>
        <SettingsIcon size={32} className="text-brand-gray" />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20">
        <div className="border-b border-brand-coral/20">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-brand-red text-brand-red'
                  : 'border-transparent text-brand-gray hover:text-brand-blue'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users size={16} />
                <span>Utenti</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('farms')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'farms'
                  ? 'border-brand-red text-brand-red'
                  : 'border-transparent text-brand-gray hover:text-brand-blue'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Building size={16} />
                <span>Allevamenti</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'suppliers'
                  ? 'border-brand-red text-brand-red'
                  : 'border-transparent text-brand-gray hover:text-brand-blue'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Truck size={16} />
                <span>Fornitori</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-brand-red text-brand-red'
                  : 'border-transparent text-brand-gray hover:text-brand-blue'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Tag size={16} />
                <span>Categorie</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'general'
                  ? 'border-brand-red text-brand-red'
                  : 'border-transparent text-brand-gray hover:text-brand-blue'
              }`}
            >
              <div className="flex items-center space-x-2">
                <SettingsIcon size={16} />
                <span>Generali</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-brand-blue">Gestione Utenti</h2>
                <button
                  onClick={() => setShowCreateUserModal(true)}
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-4 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2"
                >
                  <Plus size={16} />
                  <span>Nuovo Utente</span>
                </button>
              </div>

              <div className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-brand-blue/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Ruolo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Stato</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-brand-coral/20">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-brand-blue/5">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-blue">{user.full_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray font-mono">{user.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                            {getRoleText(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.active ? 'Attivo' : 'Inattivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-brand-blue hover:text-brand-coral transition-colors"
                              title="Modifica utente"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-brand-gray hover:text-brand-red transition-colors"
                              title="Elimina utente"
                            >
                              <Trash2 size={16} />
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-brand-blue">Gestione Allevamenti</h2>
                <button
                  onClick={() => setShowCreateFarmModal(true)}
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-4 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2"
                >
                  <Plus size={16} />
                  <span>Nuovo Allevamento</span>
                </button>
              </div>

              <div className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-brand-blue/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Indirizzo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Azienda</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Data Creazione</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-brand-coral/20">
                    {farms.map((farm) => (
                      <tr key={farm.id} className="hover:bg-brand-blue/5">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-blue">{farm.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray">{farm.address || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray">{farm.company}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray">
                          {new Date(farm.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleManageTechnicians(farm)}
                              className="text-brand-coral hover:text-brand-blue transition-colors"
                              title="Gestisci tecnici"
                            >
                              <Users size={16} />
                            </button>
                            <button
                              onClick={() => handleEditFarm(farm)}
                              className="text-brand-blue hover:text-brand-coral transition-colors"
                              title="Modifica allevamento"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteFarm(farm.id)}
                              className="text-brand-gray hover:text-brand-red transition-colors"
                              title="Elimina allevamento"
                            >
                              <Trash2 size={16} />
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-brand-blue">Gestione Fornitori</h2>
                <button
                  onClick={() => setShowCreateSupplierModal(true)}
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-4 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2"
                >
                  <Plus size={16} />
                  <span>Nuovo Fornitore</span>
                </button>
              </div>

              <div className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-brand-blue/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Telefono</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Indirizzo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-brand-coral/20">
                    {suppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-brand-blue/5">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-blue">{supplier.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray">{supplier.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray">{supplier.phone || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray">{supplier.address || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditSupplier(supplier)}
                              className="text-brand-blue hover:text-brand-coral transition-colors"
                              title="Modifica fornitore"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(supplier.id)}
                              className="text-brand-gray hover:text-brand-red transition-colors"
                              title="Elimina fornitore"
                            >
                              <Trash2 size={16} />
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-brand-blue">Categorie Allegati</h2>
                <button
                  onClick={() => setShowCreateCategoryModal(true)}
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-4 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2"
                >
                  <Plus size={16} />
                  <span>Nuova Categoria</span>
                </button>
              </div>

              <div className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-brand-blue/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Colore</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Icona</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Data Creazione</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-brand-blue uppercase tracking-wider">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-brand-coral/20">
                    {categories.map((category) => (
                      <tr key={category.id} className="hover:bg-brand-blue/5">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-blue">{category.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded-full border border-gray-300"
                              style={{ backgroundColor: category.color }}
                            ></div>
                            <span className="text-sm text-brand-gray">{category.color}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray">{category.icon}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-gray">
                          {new Date(category.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="text-brand-blue hover:text-brand-coral transition-colors"
                              title="Modifica categoria"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-brand-gray hover:text-brand-red transition-colors"
                              title="Elimina categoria"
                            >
                              <Trash2 size={16} />
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

          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-brand-blue">Impostazioni Generali</h2>
              
              {/* Microsoft 365 Configuration */}
              <div className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Mail size={24} className="text-brand-blue" />
                    <div>
                      <h3 className="text-lg font-semibold text-brand-blue">Configurazione Microsoft 365</h3>
                      <p className="text-brand-gray">Configura l'integrazione con Microsoft 365 per email e calendario</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMicrosoft365Guide(true)}
                    className="bg-gradient-to-r from-brand-blue to-brand-blue-light text-white px-6 py-2 rounded-lg hover:from-brand-blue-dark hover:to-brand-blue transition-all duration-200 flex items-center space-x-2"
                  >
                    <SettingsIcon size={16} />
                    <span>Configura Microsoft 365</span>
                  </button>
                </div>
                <div className="text-sm text-brand-gray">
                  <p>Funzionalità disponibili dopo la configurazione:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Invio automatico email preventivi ai fornitori</li>
                    <li>Creazione eventi calendario per manutenzioni</li>
                    <li>Report giornalieri automatici via email</li>
                    <li>Inviti calendario per riunioni e appuntamenti</li>
                  </ul>
                </div>
              </div>

              {/* Daily Report Email */}
              <div className="bg-gradient-to-r from-brand-coral/5 to-brand-blue/5 rounded-lg border border-brand-coral/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Calendar size={24} className="text-brand-coral" />
                    <div>
                      <h3 className="text-lg font-semibold text-brand-blue">Report Giornaliero Email</h3>
                      <p className="text-brand-gray">Invia un report giornaliero con segnalazioni urgenti e manutenzioni</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSendDailyReport}
                    disabled={sendingDailyReport}
                    className="bg-gradient-to-r from-brand-coral to-brand-coral-light text-white px-6 py-2 rounded-lg hover:from-brand-coral-light hover:to-brand-coral transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {sendingDailyReport ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Invio...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Invia Report Test</span>
                      </>
                    )}
                  </button>
                </div>
                
                {dailyReportResult && (
                  <div className={`mt-4 p-4 rounded-lg border ${
                    dailyReportResult.includes('✅') 
                      ? 'bg-green-50 border-green-200' 
                      : dailyReportResult.includes('ℹ️')
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start space-x-2">
                      {dailyReportResult.includes('✅') ? (
                        <CheckCircle size={16} className="text-green-600 mt-0.5" />
                      ) : dailyReportResult.includes('ℹ️') ? (
                        <AlertCircle size={16} className="text-blue-600 mt-0.5" />
                      ) : (
                        <AlertCircle size={16} className="text-red-600 mt-0.5" />
                      )}
                      <div className={`text-sm ${
                        dailyReportResult.includes('✅') 
                          ? 'text-green-800' 
                          : dailyReportResult.includes('ℹ️')
                          ? 'text-blue-800'
                          : 'text-red-800'
                      }`}>
                        <pre className="whitespace-pre-wrap font-sans">{dailyReportResult}</pre>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="text-sm text-brand-gray mt-4">
                  <p>Il report include:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Segnalazioni urgenti (alta priorità e critiche)</li>
                    <li>Manutenzioni scadute</li>
                    <li>Manutenzioni in scadenza nei prossimi 7 giorni</li>
                    <li>Statistiche generali del sistema</li>
                  </ul>
                </div>
              </div>

              {/* Storage Diagnostics */}
              <div className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Database size={24} className="text-brand-blue" />
                    <div>
                      <h3 className="text-lg font-semibold text-brand-blue">Diagnostica Storage</h3>
                      <p className="text-brand-gray">Verifica la configurazione del bucket allegati Supabase</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowStorageDiagnostics(true)}
                    className="bg-gradient-to-r from-brand-blue to-brand-blue-light text-white px-6 py-2 rounded-lg hover:from-brand-blue-dark hover:to-brand-blue transition-all duration-200 flex items-center space-x-2"
                  >
                    <Database size={16} />
                    <span>Avvia Diagnostica</span>
                  </button>
                </div>
                <div className="text-sm text-brand-gray">
                  <p>Verifica:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Esistenza bucket "attachments"</li>
                    <li>Configurazione policy di sicurezza</li>
                    <li>Permessi di upload e download</li>
                    <li>Variabili d'ambiente Supabase</li>
                  </ul>
                </div>
              </div>

              {/* System Information */}
              <div className="bg-gradient-to-r from-brand-gray/5 to-brand-blue/5 rounded-lg border border-brand-coral/20 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <FileText size={24} className="text-brand-gray" />
                  <div>
                    <h3 className="text-lg font-semibold text-brand-blue">Informazioni Sistema</h3>
                    <p className="text-brand-gray">Dettagli sulla versione e configurazione</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-brand-blue">Versione:</span>
                    <p className="text-brand-gray">AllevApp v1.0</p>
                  </div>
                  <div>
                    <span className="font-medium text-brand-blue">Database:</span>
                    <p className="text-brand-gray">Supabase PostgreSQL</p>
                  </div>
                  <div>
                    <span className="font-medium text-brand-blue">Ultimo aggiornamento:</span>
                    <p className="text-brand-gray">{new Date().toLocaleDateString('it-IT')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-brand-blue">Ambiente:</span>
                    <p className="text-brand-gray">Produzione</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Nuovo Utente</h2>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.full_name}
                  onChange={(e) => {
                    const fullName = e.target.value;
                    setUserFormData({ 
                      ...userFormData, 
                      full_name: fullName,
                      username: generateUsername(fullName),
                      password: generatePassword()
                    });
                  }}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Username (generato automaticamente)
                </label>
                <input
                  type="text"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Password (generata automaticamente)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brand-gray hover:text-brand-blue"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Ruolo
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as 'admin' | 'manager' | 'technician' })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                >
                  <option value="technician">Tecnico</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Amministratore</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetUserForm}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200"
                >
                  Crea Utente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Modifica Utente</h2>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brand-gray hover:text-brand-blue"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Ruolo
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as 'admin' | 'manager' | 'technician' })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                >
                  <option value="admin">Amministratore</option>
                  <option value="manager">Manager</option>
                  <option value="technician">Tecnico</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetUserEditForm}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200"
                >
                  Aggiorna Utente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Farm Modal */}
      {showCreateFarmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Nuovo Allevamento</h2>
            
            <form onSubmit={handleCreateFarm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Nome Allevamento
                </label>
                <input
                  type="text"
                  required
                  value={farmFormData.name}
                  onChange={(e) => setFarmFormData({ ...farmFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Indirizzo
                </label>
                <input
                  type="text"
                  value={farmFormData.address}
                  onChange={(e) => setFarmFormData({ ...farmFormData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Azienda
                </label>
                <select
                  value={farmFormData.company}
                  onChange={(e) => setFarmFormData({ ...farmFormData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                >
                  <option value="Zoogamma Spa">Zoogamma Spa</option>
                  <option value="So. Agr. Zooagri Srl">So. Agr. Zooagri Srl</option>
                  <option value="Soc. Agr. Zooallevamenti Srl">Soc. Agr. Zooallevamenti Srl</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetFarmForm}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200"
                >
                  Crea Allevamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Farm Modal */}
      {showEditFarmModal && editingFarm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Modifica Allevamento</h2>
            
            <form onSubmit={handleUpdateFarm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Nome Allevamento
                </label>
                <input
                  type="text"
                  required
                  value={farmFormData.name}
                  onChange={(e) => setFarmFormData({ ...farmFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Indirizzo
                </label>
                <input
                  type="text"
                  value={farmFormData.address}
                  onChange={(e) => setFarmFormData({ ...farmFormData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Azienda
                </label>
                <select
                  value={farmFormData.company}
                  onChange={(e) => setFarmFormData({ ...farmFormData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                >
                  <option value="Zoogamma Spa">Zoogamma Spa</option>
                  <option value="So. Agr. Zooagri Srl">So. Agr. Zooagri Srl</option>
                  <option value="Soc. Agr. Zooallevamenti Srl">Soc. Agr. Zooallevamenti Srl</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetFarmEditForm}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200"
                >
                  Aggiorna Allevamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Supplier Modal */}
      {showCreateSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Nuovo Fornitore</h2>
            
            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Nome Fornitore
                </label>
                <input
                  type="text"
                  required
                  value={supplierFormData.name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={supplierFormData.email}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Telefono
                </label>
                <input
                  type="tel"
                  value={supplierFormData.phone}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Indirizzo
                </label>
                <textarea
                  rows={2}
                  value={supplierFormData.address}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetSupplierForm}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200"
                >
                  Crea Fornitore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {showEditSupplierModal && editingSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Modifica Fornitore</h2>
            
            <form onSubmit={handleUpdateSupplier} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Nome Fornitore
                </label>
                <input
                  type="text"
                  required
                  value={supplierFormData.name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={supplierFormData.email}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Telefono
                </label>
                <input
                  type="tel"
                  value={supplierFormData.phone}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Indirizzo
                </label>
                <textarea
                  rows={2}
                  value={supplierFormData.address}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetSupplierEditForm}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200"
                >
                  Aggiorna Fornitore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {showCreateCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Nuova Categoria</h2>
            
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Nome Categoria
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Colore
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={categoryFormData.color}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    className="w-12 h-10 border border-brand-gray/30 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={categoryFormData.color}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Icona
                </label>
                <select
                  value={categoryFormData.icon}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                >
                  <option value="folder">📁 Cartella</option>
                  <option value="image">🖼️ Immagine</option>
                  <option value="document">📄 Documento</option>
                  <option value="certificate">🏆 Certificato</option>
                  <option value="manual">📖 Manuale</option>
                  <option value="photo">📷 Foto</option>
                  <option value="video">🎥 Video</option>
                  <option value="audio">🎵 Audio</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200"
                >
                  Crea Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Modifica Categoria</h2>
            
            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Nome Categoria
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Colore
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={categoryFormData.color}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    className="w-12 h-10 border border-brand-gray/30 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={categoryFormData.color}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Icona
                </label>
                <select
                  value={categoryFormData.icon}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                >
                  <option value="folder">📁 Cartella</option>
                  <option value="image">🖼️ Immagine</option>
                  <option value="document">📄 Documento</option>
                  <option value="certificate">🏆 Certificato</option>
                  <option value="manual">📖 Manuale</option>
                  <option value="photo">📷 Foto</option>
                  <option value="video">🎥 Video</option>
                  <option value="audio">🎵 Audio</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetCategoryEditForm}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200"
                >
                  Aggiorna Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Technician Management Modal */}
      {showTechnicianModal && selectedFarmForTechnicians && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-brand-blue">
                Gestione Tecnici - {selectedFarmForTechnicians.name}
              </h2>
              <button
                onClick={() => {
                  setShowTechnicianModal(false);
                  setSelectedFarmForTechnicians(null);
                }}
                className="p-2 text-brand-gray hover:text-brand-red transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Tecnici Assegnati */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-brand-blue mb-3">
                Tecnici Assegnati ({farmTechnicians[selectedFarmForTechnicians.id]?.length || 0})
              </h3>
              {farmTechnicians[selectedFarmForTechnicians.id]?.length > 0 ? (
                <div className="space-y-2">
                  {farmTechnicians[selectedFarmForTechnicians.id].map(tech => (
                    <div key={tech.id} className="flex items-center justify-between p-3 bg-brand-blue/5 rounded-lg border border-brand-blue/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-brand-blue rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {tech.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-brand-blue">{tech.full_name}</div>
                          <div className="text-sm text-brand-gray">{tech.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveTechnician(selectedFarmForTechnicians.id, tech.id)}
                        className="p-2 text-brand-gray hover:text-brand-red transition-colors rounded-lg"
                        title="Rimuovi tecnico"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-brand-gray bg-brand-gray/5 rounded-lg">
                  <Users size={32} className="mx-auto mb-2 text-brand-gray/50" />
                  <p>Nessun tecnico assegnato a questo allevamento</p>
                </div>
              )}
            </div>

            {/* Tecnici Disponibili */}
            <div>
              <h3 className="text-lg font-semibold text-brand-blue mb-3">
                Tecnici Disponibili
              </h3>
              {availableTechnicians.length > 0 ? (
                <div className="space-y-2">
                  {availableTechnicians.map(tech => (
                    <div key={tech.id} className="flex items-center justify-between p-3 bg-brand-coral/5 rounded-lg border border-brand-coral/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-brand-coral rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {tech.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-brand-blue">{tech.full_name}</div>
                          <div className="text-sm text-brand-gray">{tech.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAssignTechnician(selectedFarmForTechnicians.id, tech.id)}
                        className="bg-gradient-to-r from-brand-coral to-brand-coral-light text-white px-4 py-2 rounded-lg hover:from-brand-coral-light hover:to-brand-coral transition-all duration-200 flex items-center space-x-2"
                      >
                        <UserPlus size={16} />
                        <span>Assegna</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-brand-gray bg-brand-gray/5 rounded-lg">
                  <CheckCircle size={32} className="mx-auto mb-2 text-green-500" />
                  <p>Tutti i tecnici disponibili sono già assegnati</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end mt-6 pt-4 border-t border-brand-coral/20">
              <button
                onClick={() => {
                  setShowTechnicianModal(false);
                  setSelectedFarmForTechnicians(null);
                }}
                className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Microsoft 365 Setup Guide Modal */}
      {showMicrosoft365Guide && (
        <Microsoft365SetupGuide onClose={() => setShowMicrosoft365Guide(false)} />
      )}

      {/* Storage Diagnostics Modal */}
      {showStorageDiagnostics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-brand-blue">Diagnostica Storage Supabase</h2>
              <button
                onClick={() => setShowStorageDiagnostics(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
              <StorageDiagnostics />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
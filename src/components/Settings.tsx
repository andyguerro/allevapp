import React, { useState, useEffect } from 'react';
import { Building, Truck, Settings as SettingsIcon, Plus, Edit, Trash2, Map, Users, Mail, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FarmsMap from './FarmsMap';
import MultiSelect, { Option } from './MultiSelect';
import Microsoft365SetupGuide from './Microsoft365SetupGuide';

interface Farm {
  id: string;
  name: string;
  address?: string;
  company: string;
  created_at: string;
  technicians?: { id: string; full_name: string }[];
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  created_at: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'technician';
  active: boolean;
  created_at: string;
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('farms');
  const [farms, setFarms] = useState<Farm[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showMicrosoft365Guide, setShowMicrosoft365Guide] = useState(false);

  // Form data
  const [farmFormData, setFarmFormData] = useState({
    name: '',
    address: '',
    company: 'Zoogamma Spa',
    technicians: [] as Option[]
  });

  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const [userFormData, setUserFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    role: 'technician' as 'admin' | 'manager' | 'technician',
    active: true
  });

  const tabs = [
    { id: 'farms', label: 'Allevamenti', icon: Building },
    { id: 'suppliers', label: 'Fornitori', icon: Truck },
    { id: 'users', label: 'Utenti', icon: Users },
    { id: 'general', label: 'Generali', icon: SettingsIcon },
  ];

  useEffect(() => {
    fetchData();
  }, []);
  
  // Prepare technicians options for MultiSelect
  const technicianOptions: Option[] = users
    .filter(user => user.role === 'technician' || user.role === 'manager')
    .map(user => ({
      value: user.id,
      label: user.full_name
    }));

  const fetchData = async () => {
    try {
      // Fetch farms
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select(`
          *,
          farm_technicians(
            user_id,
            users(id, full_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (farmsError) throw farmsError;
      
      // Transform data to include technicians
      const transformedFarms = farmsData.map(farm => {
        const technicians = farm.farm_technicians?.map(ft => ({
          id: ft.users?.id || ft.user_id,
          full_name: ft.users?.full_name || 'Unknown'
        })) || [];
        
        return {
          ...farm,
          technicians
        };
      });
      
      setFarms(transformedFarms);

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (suppliersError) throw suppliersError;
      setSuppliers(suppliersData);

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, username, password, role, active, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData);

    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  // Farm functions
  const handleFarmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Submitting farm data:', farmFormData);
      
      // Get selected technician IDs
      const technicianIds = farmFormData.technicians.map(t => t.value);
      
      // Get a default user ID from the users table
      const { data: defaultUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('active', true)
        .limit(1)
        .single();

      if (userError || !defaultUser) {
        console.error('No active user found:', userError);
        alert('Errore: Nessun utente attivo trovato nel sistema. Configura prima gli utenti nelle impostazioni.');
        return;
      }

      if (editingFarm) {
        // Update existing farm
        const { error } = await supabase
          .from('farms')
          .update({
            name: farmFormData.name,
            address: farmFormData.address || null,
            company: farmFormData.company
          })
          .eq('id', editingFarm.id);

        if (error) throw error;
        
        // Delete existing technician relationships
        const { error: deleteError } = await supabase
          .from('farm_technicians')
          .delete()
          .eq('farm_id', editingFarm.id);
          
        if (deleteError) throw deleteError;
        
        // Add new technician relationships
        if (technicianIds.length > 0) {
          const technicianRelations = technicianIds.map(userId => ({
            farm_id: editingFarm.id,
            user_id: userId
          }));
          
          const { error: insertError } = await supabase
            .from('farm_technicians')
            .insert(technicianRelations);
            
          if (insertError) throw insertError;
        }
        
        console.log('Farm updated successfully');
      } else {
        // Create new farm
        const { data, error } = await supabase
          .from('farms')
          .insert({
            name: farmFormData.name,
            address: farmFormData.address || null,
            company: farmFormData.company,
            created_by: defaultUser.id
          })
          .select();

        if (error) throw error;
        
        // Add technician relationships if any selected
        if (technicianIds.length > 0 && data && data[0]) {
          const newFarmId = data[0].id;
          const technicianRelations = technicianIds.map(userId => ({
            farm_id: newFarmId,
            user_id: userId
          }));
          
          const { error: insertError } = await supabase
            .from('farm_technicians')
            .insert(technicianRelations);
            
          if (insertError) throw insertError;
        }
        
        console.log('Farm created successfully with technicians');
      }

      await fetchData();
      resetFarmForm();
    } catch (error) {
      console.error('Errore nel salvare allevamento:', error);
      alert(`Errore nel salvare l'allevamento: ${error.message}`);
    }
  };

  const handleFarmDelete = async (farmId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo allevamento? Questa azione eliminerà anche tutte le stalle e attrezzature associate.')) return;

    try {
      const { error } = await supabase
        .from('farms')
        .delete()
        .eq('id', farmId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Errore nell\'eliminazione allevamento:', error);
      alert('Errore nell\'eliminazione dell\'allevamento');
    }
  };

  const startEditFarm = (farm: Farm) => {
    setFarmFormData({
      name: farm.name,
      address: farm.address || '',
      company: farm.company,
      technicians: farm.technicians?.map(tech => ({
        value: tech.id,
        label: tech.full_name
      })) || []
    });
    setEditingFarm(farm);
    setShowFarmModal(true);
  };

  const resetFarmForm = () => {
    setFarmFormData({
      name: '',
      address: '',
      company: 'Zoogamma Spa',
      technicians: []
    });
    setEditingFarm(null);
    setShowFarmModal(false);
  };

  // Supplier functions
  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Submitting supplier data:', supplierFormData);
      
      if (editingSupplier) {
        // Update existing supplier
        const { error } = await supabase
          .from('suppliers')
          .update({
            name: supplierFormData.name,
            email: supplierFormData.email,
            phone: supplierFormData.phone || null,
            address: supplierFormData.address || null
          })
          .eq('id', editingSupplier.id);

        if (error) throw error;
        console.log('Supplier updated successfully');
      } else {
        // Create new supplier
        const { data, error } = await supabase
          .from('suppliers')
          .insert({
            name: supplierFormData.name,
            email: supplierFormData.email,
            phone: supplierFormData.phone || null,
            address: supplierFormData.address || null
          });

        if (error) throw error;
        console.log('Supplier created successfully:', data);
      }

      await fetchData();
      resetSupplierForm();
    } catch (error) {
      console.error('Errore nel salvare fornitore:', error);
      alert('Errore nel salvare il fornitore');
    }
  };

  const handleSupplierDelete = async (supplierId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo fornitore?')) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Errore nell\'eliminazione fornitore:', error);
      alert('Errore nell\'eliminazione del fornitore');
    }
  };

  const startEditSupplier = (supplier: Supplier) => {
    setSupplierFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone || '',
      address: supplier.address || ''
    });
    setEditingSupplier(supplier);
    setShowSupplierModal(true);
  };

  const resetSupplierForm = () => {
    setSupplierFormData({
      name: '',
      email: '',
      phone: '',
      address: ''
    });
    setEditingSupplier(null);
    setShowSupplierModal(false);
  };

  // User functions
  const generateUsername = (fullName: string) => {
    return fullName
      .toLowerCase()
      .replace(/[^a-z\s]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '.'); // Replace spaces with dots
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const sendPasswordEmail = async (user: any) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-password-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: user.email,
          userName: user.full_name,
          username: user.username,
          password: user.password,
          role: user.role
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Credenziali inviate via email a ${user.email}`);
      } else {
        alert(`⚠️ Utente creato ma errore nell'invio email: ${result.message}\n\nCredenziali:\nUsername: ${user.username}\nPassword: ${user.password}`);
      }
    } catch (error) {
      console.error('Errore invio email:', error);
      alert(`⚠️ Utente creato ma errore nell'invio email.\n\nCredenziali:\nUsername: ${user.username}\nPassword: ${user.password}\n\nCopia queste credenziali e inviale manualmente.`);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Submitting user data:', userFormData);
      
      // Generate username and password for new users
      let username = userFormData.username;
      let password = userFormData.password;
      
      if (!editingUser) {
        username = generateUsername(userFormData.full_name);
        password = generatePassword();
        
        // Check if username already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', username)
          .single();
          
        if (existingUser) {
          // Add number suffix if username exists
          let counter = 1;
          let newUsername = `${username}${counter}`;
          
          while (true) {
            const { data: checkUser } = await supabase
              .from('users')
              .select('id')
              .eq('username', newUsername)
              .single();
              
            if (!checkUser) {
              username = newUsername;
              break;
            }
            counter++;
            newUsername = `${username}${counter}`;
          }
        }
      }
      
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({
            full_name: userFormData.full_name,
            email: userFormData.email,
            username: userFormData.username,
            password: userFormData.password,
            role: userFormData.role,
            active: userFormData.active
          })
          .eq('id', editingUser.id);

        if (error) throw error;
        console.log('User updated successfully');
      } else {
        // Create new user
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            full_name: userFormData.full_name,
            email: userFormData.email,
            username: username,
            password: password,
            role: userFormData.role,
            active: userFormData.active
          })
          .select()
          .single();

        if (error) throw error;
        console.log('User created successfully:', newUser);
        
        // Send password email
        await sendPasswordEmail({
          ...newUser,
          username,
          password
        });
      }

      await fetchData();
      resetUserForm();
    } catch (error) {
      console.error('Errore nel salvare utente:', error);
      alert('Errore nel salvare l\'utente');
    }
  };

  const handleUserDelete = async (userId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Errore nell\'eliminazione utente:', error);
      alert('Errore nell\'eliminazione dell\'utente');
    }
  };

  const startEditUser = (user: User) => {
    setUserFormData({
      full_name: user.full_name,
      email: user.email,
      username: user.username,
      password: user.password,
      role: user.role,
      active: user.active
    });
    setEditingUser(user);
    setShowUserModal(true);
  };

  const resetUserForm = () => {
    setUserFormData({
      full_name: '',
      email: '',
      username: '',
      password: '',
      role: 'technician',
      active: true
    });
    setEditingUser(null);
    setShowUserModal(false);
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

  const renderFarms = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-brand-blue">Allevamenti</h2>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowMap(true)}
            className="bg-gradient-to-r from-brand-blue to-brand-blue-light text-white px-4 py-2 rounded-lg hover:from-brand-blue-dark hover:to-brand-blue transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
          >
            <Map size={18} />
            <span>Visualizza Mappa</span>
          </button>
          <button 
            onClick={() => setShowFarmModal(true)}
            className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-4 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
          >
            <Plus size={18} />
            <span>Nuovo Allevamento</span>
          </button>
        </div>
      </div>

      {/* Mappa */}
      {showMap && (
        <FarmsMap 
          farms={farms} 
          onClose={() => setShowMap(false)}
          isFullscreen={true}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {farms.map((farm) => (
          <div key={farm.id} className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-brand-blue mb-2">{farm.name}</h3>
                {farm.address && (
                  <p className="text-brand-gray mb-2">{farm.address}</p>
                )}
                {farm.technicians && farm.technicians.length > 0 && (
                  <div className="mb-3">
                    <span className="text-sm font-medium text-brand-blue">Tecnici:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {farm.technicians.map(tech => (
                        <span key={tech.id} className="inline-block px-2 py-1 bg-brand-coral/10 text-brand-coral rounded-full text-xs">
                          {tech.full_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-sm font-medium">
                    {farm.company}
                  </span>
                </div>
                <div className="text-sm text-brand-gray">
                  Creato il {new Date(farm.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => startEditFarm(farm)}
                  className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => handleFarmDelete(farm.id)}
                  className="p-2 text-brand-gray hover:text-brand-red transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {farms.length === 0 && (
        <div className="text-center py-12">
          <Building size={48} className="mx-auto text-brand-gray mb-4" />
          <h3 className="text-lg font-medium text-brand-blue mb-2">Nessun allevamento</h3>
          <p className="text-brand-gray">Aggiungi il primo allevamento per iniziare.</p>
        </div>
      )}
    </div>
  );

  const renderSuppliers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-brand-blue">Fornitori</h2>
        <button 
          onClick={() => setShowSupplierModal(true)}
          className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-4 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
        >
          <Plus size={18} />
          <span>Nuovo Fornitore</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((supplier) => (
          <div key={supplier.id} className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-brand-blue mb-2">{supplier.name}</h3>
                <div className="space-y-1 text-sm text-brand-gray">
                  <p>{supplier.email}</p>
                  {supplier.phone && <p>{supplier.phone}</p>}
                  {supplier.address && <p>{supplier.address}</p>}
                </div>
                <div className="text-xs text-brand-gray mt-3">
                  Creato il {new Date(supplier.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => startEditSupplier(supplier)}
                  className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => handleSupplierDelete(supplier.id)}
                  className="p-2 text-brand-gray hover:text-brand-red transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {suppliers.length === 0 && (
        <div className="text-center py-12">
          <Truck size={48} className="mx-auto text-brand-gray mb-4" />
          <h3 className="text-lg font-medium text-brand-blue mb-2">Nessun fornitore</h3>
          <p className="text-brand-gray">Aggiungi il primo fornitore per iniziare.</p>
        </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-brand-blue">Utenti</h2>
        <button 
          onClick={() => setShowUserModal(true)}
          className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-4 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
        >
          <Plus size={18} />
          <span>Nuovo Utente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <div key={user.id} className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-brand-blue">{user.full_name}</h3>
                  <span className="px-2 py-1 bg-brand-gray/10 text-brand-gray rounded text-xs font-mono">
                    {user.username}
                  </span>
                  {!user.active && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-brand-gray/20 text-brand-gray border border-brand-gray/30">
                      Inattivo
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-sm text-brand-gray mb-3">
                  <p>{user.email}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                  {getRoleText(user.role)}
                </span>
                <div className="text-xs text-brand-gray mt-3">
                  Creato il {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => startEditUser(user)}
                  className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => sendPasswordEmail(user)}
                  className="p-2 text-brand-gray hover:text-brand-coral transition-colors"
                  title="Invia credenziali via email"
                >
                  <Mail size={16} />
                </button>
                <button 
                  onClick={() => handleUserDelete(user.id)}
                  className="p-2 text-brand-gray hover:text-brand-red transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-brand-gray mb-4" />
          <h3 className="text-lg font-medium text-brand-blue mb-2">Nessun utente</h3>
          <p className="text-brand-gray">Aggiungi il primo utente per iniziare.</p>
        </div>
      )}
    </div>
  );

  const renderGeneral = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-brand-blue">Impostazioni Generali</h2>
      
      {/* Daily Summary Email Section */}
      <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6">
        <h3 className="text-lg font-medium text-brand-blue mb-4">Report Giornaliero Email</h3>
        <div className="space-y-4">
          {/* Microsoft 365 Setup Button */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-800 mb-1">📧 Configurazione Microsoft 365</h4>
                <p className="text-sm text-blue-700">
                  Configura la tua casella postale Microsoft 365 per l'invio automatico di email
                </p>
              </div>
              <button
                onClick={() => setShowMicrosoft365Guide(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Mail size={16} />
                <span>Configura</span>
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-brand-blue">Email Riepilogativa Giornaliera</p>
              <p className="text-sm text-brand-gray">Invia automaticamente ogni giorno alle 8:00 un report con segnalazioni urgenti e manutenzioni</p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 text-brand-red focus:ring-brand-red border-brand-gray/30 rounded"
              defaultChecked
            />
          </div>
          
          <div className="bg-brand-blue/5 rounded-lg p-4 border border-brand-blue/10">
            <h4 className="font-medium text-brand-blue mb-2">📧 Contenuto del Report</h4>
            <ul className="text-sm text-brand-gray space-y-1">
              <li>• Segnalazioni urgenti (Alta/Critica) non chiuse</li>
              <li>• Manutenzioni scadute (attrezzature e impianti)</li>
              <li>• Manutenzioni in scadenza nei prossimi 7 giorni</li>
              <li>• Statistiche riassuntive e azioni consigliate</li>
            </ul>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Orario Invio
              </label>
              <select className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red">
                <option value="08:00">08:00</option>
                <option value="09:00">09:00</option>
                <option value="10:00">10:00</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Destinatari
              </label>
              <select className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red">
                <option value="admin_manager">Admin e Manager</option>
                <option value="admin_only">Solo Admin</option>
                <option value="all_users">Tutti gli utenti</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={async () => {
                if (!confirm('Vuoi inviare un report di test? Questo verificherà la configurazione email.')) {
                  return;
                }
                
                try {
                  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-daily-summary`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                      'Content-Type': 'application/json',
                    },
                  });
                  
                  const result = await response.json();
                  if (result.success) {
                    alert(`Report di test inviato con successo! ${result.sent ? `Inviato a ${result.successful_sends} destinatari.` : 'Nessun elemento da segnalare oggi.'}`);
                  } else {
                    alert(`Errore nell'invio del report: ${result.message}`);
                  }
                } catch (error) {
                  console.error('Errore nel test email:', error);
                  alert('Errore nella connessione al servizio email');
                }
              }}
              className="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-brand-blue-dark transition-colors"
            >
              Invia Report Test
            </button>
            <button
              onClick={() => window.open('/storage-diagnostics', '_blank')}
              className="bg-brand-coral text-white px-4 py-2 rounded-lg hover:bg-brand-coral-light transition-colors"
            >
              Test Storage
            </button>
            <span className="text-xs text-brand-gray">
              Invia un report di prova per verificare la configurazione
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6">
        <h3 className="text-lg font-medium text-brand-blue mb-4">Configurazione Sistema</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-blue mb-2">
              Nome Azienda
            </label>
            <input
              type="text"
              defaultValue="AllevApp"
              className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-blue mb-2">
              Email Aziendale
            </label>
            <input
              type="email"
              defaultValue="info@allevapp.com"
              className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-blue mb-2">
              Telefono
            </label>
            <input
              type="tel"
              defaultValue="+39 02 123456789"
              className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6">
        <h3 className="text-lg font-medium text-brand-blue mb-4">Preferenze</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-brand-blue">Notifiche Email</p>
              <p className="text-sm text-brand-gray">Ricevi notifiche via email per nuove segnalazioni</p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 text-brand-red focus:ring-brand-red border-brand-gray/30 rounded"
              defaultChecked
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-brand-blue">Backup Automatico</p>
              <p className="text-sm text-brand-gray">Esegui backup automatico dei dati ogni settimana</p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 text-brand-red focus:ring-brand-red border-brand-gray/30 rounded"
              defaultChecked
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-brand-blue">Modalità Manutenzione</p>
              <p className="text-sm text-brand-gray">Attiva la modalità manutenzione del sistema</p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 text-brand-red focus:ring-brand-red border-brand-gray/30 rounded"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6">
        <h3 className="text-lg font-medium text-brand-blue mb-4">Statistiche Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-brand-blue/5 rounded-lg">
            <div className="text-2xl font-bold text-brand-blue">{farms.length}</div>
            <div className="text-sm text-brand-gray">Allevamenti</div>
          </div>
          <div className="text-center p-4 bg-brand-coral/5 rounded-lg">
            <div className="text-2xl font-bold text-brand-coral">{suppliers.length}</div>
            <div className="text-sm text-brand-gray">Fornitori</div>
          </div>
          <div className="text-center p-4 bg-brand-red/5 rounded-lg">
            <div className="text-2xl font-bold text-brand-red">{users.length}</div>
            <div className="text-sm text-brand-gray">Utenti</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'farms': return renderFarms();
      case 'suppliers': return renderSuppliers();
      case 'users': return renderUsers();
      case 'general': return renderGeneral();
      default: return renderFarms();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-brand-blue">Impostazioni</h1>

      {/* Tabs */}
      <div className="border-b border-brand-coral/20">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-brand-red text-brand-red'
                  : 'border-transparent text-brand-gray hover:text-brand-blue hover:border-brand-coral/30'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Farm Modal */}
      {showFarmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-brand-blue mb-4">
              {editingFarm ? 'Modifica Allevamento' : 'Nuovo Allevamento'}
            </h2>
            
            <form onSubmit={handleFarmSubmit} className="space-y-4">
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
                  Azienda
                </label>
                <select
                  required
                  value={farmFormData.company}
                  onChange={(e) => setFarmFormData({ ...farmFormData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                >
                  <option value="Zoogamma Spa">Zoogamma Spa</option>
                  <option value="So. Agr. Zooagri Srl">So. Agr. Zooagri Srl</option>
                  <option value="Soc. Agr. Zooallevamenti Srl">Soc. Agr. Zooallevamenti Srl</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Indirizzo
                </label>
                <textarea
                  rows={3}
                  value={farmFormData.address}
                  onChange={(e) => setFarmFormData({ ...farmFormData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Tecnici Assegnati
                </label>
                <MultiSelect
                  options={technicianOptions}
                  value={farmFormData.technicians}
                  onChange={(selected) => setFarmFormData({ ...farmFormData, technicians: selected })}
                  placeholder="Seleziona uno o più tecnici..."
                  className="w-full"
                />
                <p className="text-xs text-brand-gray mt-1">
                  Seleziona i tecnici che seguiranno questo allevamento
                </p>
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
                  {editingFarm ? 'Aggiorna' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-brand-blue mb-4">
              {editingSupplier ? 'Modifica Fornitore' : 'Nuovo Fornitore'}
            </h2>
            
            <form onSubmit={handleSupplierSubmit} className="space-y-4">
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
                  rows={3}
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
                  {editingSupplier ? 'Aggiorna' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-brand-blue mb-4">
              {editingUser ? 'Modifica Utente' : 'Nuovo Utente'}
            </h2>
            
            <form onSubmit={handleUserSubmit} className="space-y-4">
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

              {editingUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-brand-blue mb-2">
                      Nome Utente
                    </label>
                    <input
                      type="text"
                      required
                      value={userFormData.username}
                      onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                      placeholder="nome.cognome"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-blue mb-2">
                      Password
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        required
                        value={userFormData.password}
                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                        className="flex-1 px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                      />
                      <button
                        type="button"
                        onClick={() => setUserFormData({ ...userFormData, password: generatePassword() })}
                        className="px-3 py-2 bg-brand-blue/10 text-brand-blue rounded-lg hover:bg-brand-blue/20 transition-colors text-sm"
                      >
                        Genera
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Ruolo
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                >
                  <option value="technician">Tecnico</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Amministratore</option>
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={userFormData.active}
                  onChange={(e) => setUserFormData({ ...userFormData, active: e.target.checked })}
                  className="h-4 w-4 text-brand-red focus:ring-brand-red border-brand-gray/30 rounded"
                />
                <label htmlFor="active" className="text-sm font-medium text-brand-blue">
                  Utente attivo
                </label>
              </div>

              {!editingUser && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Mail size={16} className="text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <strong>Credenziali Automatiche:</strong>
                      <p className="mt-1">
                        Username e password verranno generati automaticamente e inviati via email all'utente.
                      </p>
                      <p className="mt-1 text-xs">
                        Username: nome.cognome • Password: 8 caratteri casuali
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                  {editingUser ? 'Aggiorna' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Microsoft 365 Setup Guide */}
      {showMicrosoft365Guide && (
        <Microsoft365SetupGuide onClose={() => setShowMicrosoft365Guide(false)} />
      )}

      {/* Mappa integrata per la vista normale */}
      {!showMap && farms.length > 0 && farms.some(f => f.address) && (
        <div className="mt-6">
          <FarmsMap farms={farms} />
        </div>
      )}
    </div>
  );
};

export default Settings;
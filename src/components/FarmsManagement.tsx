import React, { useState, useEffect } from 'react';
import { Building, ClipboardList, Package, FileText, AlertTriangle, Clock, CheckCircle, Plus, Eye, Edit, MapPin, Users, TrendingUp, Send, DollarSign, FolderOpen, AlertCircle, Wrench, UserPlus, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Farm {
  id: string;
  name: string;
  address: string;
  company: string;
  created_at: string;
}

interface Report {
  id: string;
  title: string;
  status: string;
  urgency: string;
  created_at: string;
  equipment?: { name: string };
}

interface Equipment {
  id: string;
  name: string;
  status: string;
  model: string;
  next_maintenance_due: string;
}

interface Quote {
  id: string;
  title: string;
  status: string;
  amount: number;
  supplier: { name: string };
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  project_number: string;
  status: string;
  description: string;
  created_at: string;
  created_by: string;
  users?: { full_name: string };
}

interface FarmDocument {
  id: string;
  title: string;
  description?: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  document_date?: string;
  expiry_date?: string;
  tags?: string[];
  is_important: boolean;
  created_at: string;
  category_name?: string;
  category_color?: string;
  created_user_name?: string;
}

interface FarmsManagementProps {
  onNavigate: (path: string) => void;
  userFarms?: string[];
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  active: boolean;
}

export default function FarmsManagement({ onNavigate, userFarms = [] }: FarmsManagementProps) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [farmTechnicians, setFarmTechnicians] = useState<{[key: string]: User[]}>({});
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<FarmDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFarmModal, setShowNewFarmModal] = useState(false);
  const [showEditFarmModal, setShowEditFarmModal] = useState(false);
  const [showTechniciansModal, setShowTechniciansModal] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [farmsWithUrgentReports, setFarmsWithUrgentReports] = useState<Set<string>>(new Set());
  const [newFarmData, setNewFarmData] = useState({
    name: '',
    address: '',
    company: 'Zoogamma Spa'
  });
  const [editFarmData, setEditFarmData] = useState({
    name: '',
    address: '',
    company: 'Zoogamma Spa'
  });

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return '📄';
    
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    
    return '📄';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  useEffect(() => {
    fetchFarms();
    fetchUsers();
    fetchUrgentReports();
  }, []);

  const fetchFarms = async () => {
    try {
      let query = supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: false });
        
      // Filter by user farms if they're a technician with assigned farms
      if (userFarms.length > 0) {
        query = query.in('id', userFarms);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      setFarms(data || []);
    } catch (error) {
      console.error('Errore nel caricamento allevamenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, active')
        .eq('active', true)
        .eq('role', 'technician')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Errore nel caricamento utenti:', error);
    }
  };

  const fetchFarmTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('farm_technicians')
        .select(`
          farm_id,
          users(id, full_name, email, role, active)
        `);

      if (error) throw error;

      const techniciansByFarm: {[key: string]: User[]} = {};
      data?.forEach(item => {
        if (!techniciansByFarm[item.farm_id]) {
          techniciansByFarm[item.farm_id] = [];
        }
        if (item.users) {
          techniciansByFarm[item.farm_id].push(item.users as User);
        }
      });

      setFarmTechnicians(techniciansByFarm);
    } catch (error) {
      console.error('Errore nel caricamento tecnici allevamenti:', error);
    }
  };

  const fetchUrgentReports = async () => {
    try {
      const { data: urgentReports, error } = await supabase
        .from('reports')
        .select('farm_id')
        .in('urgency', ['high', 'critical'])
        .not('status', 'in', '(closed,resolved)');

      if (error) throw error;

      const farmIdsWithUrgentReports = new Set(
        urgentReports?.map(report => report.farm_id) || []
      );
      setFarmsWithUrgentReports(farmIdsWithUrgentReports);
    } catch (error) {
      console.error('Errore nel caricamento segnalazioni urgenti:', error);
    }
  };

  const fetchFarmData = async (farmId: string) => {
    try {
      // Fetch reports
      const { data: reportsData } = await supabase
        .from('reports')
        .select(`
          *,
          equipment (name)
        `)
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });

      // Fetch equipment
      const { data: equipmentData } = await supabase
        .from('equipment')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });

      // Fetch facilities
      const { data: facilitiesData, error: facilitiesError } = await supabase
        .from('facilities')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });

      if (facilitiesError) throw facilitiesError;
      setFacilities(facilitiesData || []);

      // Fetch quotes
      const { data: quotesData } = await supabase
        .from('quotes')
        .select(`
          *,
          suppliers (name)
        `)
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });

      // Fetch projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select(`
          *,
          users (full_name)
        `)
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });

      // Fetch documents
      const { data: documentsData } = await supabase
        .from('farm_documents')
        .select(`
          *,
          document_categories(name, color),
          users!farm_documents_created_by_fkey(full_name)
        `)
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });

      setReports(reportsData || []);
      setEquipment(equipmentData || []);
      setQuotes(quotesData || []);
      setProjects(projectsData || []);
      
      // Transform documents data
      const transformedDocuments = documentsData?.map(doc => ({
        ...doc,
        category_name: doc.document_categories?.name,
        category_color: doc.document_categories?.color,
        created_user_name: doc.users?.full_name
      })) || [];
      
      setDocuments(transformedDocuments);
    } catch (error) {
      console.error('Errore nel caricamento dati allevamento:', error);
    }
  };

  const handleFarmSelect = (farm: Farm) => {
    setSelectedFarm(farm);
    setActiveTab('reports');
    fetchFarmData(farm.id);
    fetchFarmTechnicians();
  };

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('farms')
        .insert([newFarmData]);

      if (error) throw error;

      setShowNewFarmModal(false);
      setNewFarmData({ name: '', address: '', company: 'Zoogamma Spa' });
      fetchFarms();
    } catch (error) {
      console.error('Errore nella creazione allevamento:', error);
      alert('Errore nella creazione dell\'allevamento');
    }
  };

  const handleEditFarm = (farm: Farm) => {
    setEditingFarm(farm);
    setEditFarmData({
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
        .update(editFarmData)
        .eq('id', editingFarm.id);

      if (error) throw error;

      setShowEditFarmModal(false);
      setEditingFarm(null);
      setEditFarmData({ name: '', address: '', company: 'Zoogamma Spa' });
      
      // Aggiorna la farm selezionata se è quella che stiamo modificando
      if (selectedFarm && selectedFarm.id === editingFarm.id) {
        setSelectedFarm({ ...editingFarm, ...editFarmData });
      }
      
      fetchFarms();
    } catch (error) {
      console.error('Errore nell\'aggiornamento allevamento:', error);
      alert('Errore nell\'aggiornamento dell\'allevamento');
    }
  };

  const handleManageTechnicians = (farm: Farm) => {
    setSelectedFarm(farm);
    setShowTechniciansModal(true);
    fetchFarmTechnicians();
  };

  const handleAssignTechnician = async (userId: string) => {
    if (!selectedFarm) return;

    try {
      const { error } = await supabase
        .from('farm_technicians')
        .insert({
          farm_id: selectedFarm.id,
          user_id: userId
        });

      if (error) throw error;
      fetchFarmTechnicians();
    } catch (error) {
      console.error('Errore nell\'assegnazione tecnico:', error);
      alert('Errore nell\'assegnazione del tecnico');
    }
  };

  const handleRemoveTechnician = async (userId: string) => {
    if (!selectedFarm) return;

    try {
      const { error } = await supabase
        .from('farm_technicians')
        .delete()
        .eq('farm_id', selectedFarm.id)
        .eq('user_id', userId);

      if (error) throw error;
      fetchFarmTechnicians();
    } catch (error) {
      console.error('Errore nella rimozione tecnico:', error);
      alert('Errore nella rimozione del tecnico');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-red-600 bg-red-100';
      case 'in_progress': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      case 'working': return 'text-green-600 bg-green-100';
      case 'not_working': return 'text-red-600 bg-red-100';
      case 'requested': return 'text-blue-600 bg-blue-100';
      case 'received': return 'text-yellow-600 bg-yellow-100';
      case 'accepted': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'defined': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'discarded': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProjectValue = (projectId: string) => {
    const projectQuotes = quotes.filter(q => 
      q.status === 'accepted' && 
      // Assumiamo che le note contengano il riferimento al progetto
      projects.find(p => p.id === projectId)
    );
    return projectQuotes.reduce((sum, quote) => sum + (quote.amount || 0), 0);
  };

  const activeProjects = projects.filter(p => ['open', 'defined', 'in_progress'].includes(p.status));
  const totalProjectValue = projects.reduce((sum, project) => sum + getProjectValue(project.id), 0);

  // Count facilities by type
  const getFacilitiesByType = () => {
    const typeCount: Record<string, number> = {};
    facilities.forEach(facility => {
      if (!typeCount[facility.type]) {
        typeCount[facility.type] = 0;
      }
      typeCount[facility.type]++;
    });
    return typeCount;
  };

  const getFacilityTypeText = (type: string) => {
    switch (type) {
      case 'electrical': return 'Elettrici';
      case 'plumbing': return 'Idraulici';
      case 'ventilation': return 'Ventilazione';
      case 'heating': return 'Riscaldamento';
      case 'cooling': return 'Raffreddamento';
      case 'lighting': return 'Illuminazione';
      case 'security': return 'Sicurezza';
      default: return 'Altri';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!selectedFarm) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Gestione Allevamenti</h1>
          <button
            onClick={() => setShowNewFarmModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuovo Allevamento
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {farms.map((farm) => (
            <div
              key={farm.id}
              className={`rounded-lg shadow-md p-6 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                farmsWithUrgentReports.has(farm.id)
                  ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300 shadow-yellow-200'
                  : 'bg-white hover:shadow-xl'
              }`}
              onClick={() => handleFarmSelect(farm)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Building className={`w-8 h-8 ${
                    farmsWithUrgentReports.has(farm.id) ? 'text-yellow-600' : 'text-blue-600'
                  }`} />
                  <div>
                    <h3 className="font-semibold text-gray-900">{farm.name}</h3>
                    <p className="text-sm text-gray-500">{farm.company}</p>
                    {farmsWithUrgentReports.has(farm.id) && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="text-xs font-medium text-yellow-700">Segnalazioni urgenti</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {farmsWithUrgentReports.has(farm.id) && (
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                  )}
                  <Eye className="w-5 h-5 text-gray-400" />
                </div>
              </div>
              
              {farm.address && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{farm.address}</span>
                </div>
              )}

              {/* Fetch and display facilities count */}
              <div className="mt-3">
                <button
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase
                        .from('facilities')
                        .select('id, type')
                        .eq('farm_id', farm.id);
                      
                      if (error) throw error;
                      
                      const typeCount: Record<string, number> = {};
                      data.forEach(facility => {
                        if (!typeCount[facility.type]) {
                          typeCount[facility.type] = 0;
                        }
                        typeCount[facility.type]++;
                      });
                      
                      if (Object.keys(typeCount).length === 0) {
                        alert('Nessun impianto registrato per questo allevamento');
                      } else {
                        const message = Object.entries(typeCount)
                          .map(([type, count]) => `${getFacilityTypeText(type)}: ${count}`)
                          .join('\n');
                        alert(`Impianti:\n${message}`);
                      }
                    } catch (error) {
                      console.error('Errore nel caricamento impianti:', error);
                    }
                  }}
                  className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  <Wrench size={12} />
                  <span>Visualizza impianti</span>
                </button>
              </div>
              
              <div className="text-xs text-gray-500">
                Creato il {new Date(farm.created_at).toLocaleDateString('it-IT')}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Nuovo Allevamento */}
        {showNewFarmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Nuovo Allevamento</h2>
              <form onSubmit={handleCreateFarm} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Allevamento *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFarmData.name}
                    onChange={(e) => setNewFarmData({ ...newFarmData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Indirizzo
                  </label>
                  <input
                    type="text"
                    value={newFarmData.address}
                    onChange={(e) => setNewFarmData({ ...newFarmData, address: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Azienda *
                  </label>
                  <select
                    required
                    value={newFarmData.company}
                    onChange={(e) => setNewFarmData({ ...newFarmData, company: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Zoogamma Spa">Zoogamma Spa</option>
                    <option value="So. Agr. Zooagri Srl">So. Agr. Zooagri Srl</option>
                    <option value="Soc. Agr. Zooallevamenti Srl">Soc. Agr. Zooallevamenti Srl</option>
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewFarmModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Crea Allevamento
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Modifica Allevamento */}
        {showEditFarmModal && editingFarm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Modifica Allevamento</h2>
              <form onSubmit={handleUpdateFarm} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Allevamento *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFarmData.name}
                    onChange={(e) => setEditFarmData({ ...editFarmData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Azienda *
                  </label>
                  <select
                    required
                    value={editFarmData.company}
                    onChange={(e) => setEditFarmData({ ...editFarmData, company: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Zoogamma Spa">Zoogamma Spa</option>
                    <option value="So. Agr. Zooagri Srl">So. Agr. Zooagri Srl</option>
                    <option value="Soc. Agr. Zooallevamenti Srl">Soc. Agr. Zooallevamenti Srl</option>
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditFarmModal(false);
                      setEditingFarm(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Save size={16} />
                    Salva Modifiche
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Gestione Tecnici */}
        {showTechniciansModal && selectedFarm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Gestione Tecnici - {selectedFarm.name}</h2>
                <button
                  onClick={() => setShowTechniciansModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Tecnici Assegnati */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Tecnici Assegnati</h3>
                {farmTechnicians[selectedFarm.id]?.length > 0 ? (
                  <div className="space-y-2">
                    {farmTechnicians[selectedFarm.id].map(tech => (
                      <div key={tech.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <div className="font-medium">{tech.full_name}</div>
                          <div className="text-sm text-gray-600">{tech.email}</div>
                        </div>
                        <button
                          onClick={() => handleRemoveTechnician(tech.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Rimuovi tecnico"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">Nessun tecnico assegnato</div>
                )}
              </div>

              {/* Tecnici Disponibili */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Tecnici Disponibili</h3>
                {users.filter(user => 
                  !farmTechnicians[selectedFarm.id]?.some(tech => tech.id === user.id)
                ).length > 0 ? (
                  <div className="space-y-2">
                    {users.filter(user => 
                      !farmTechnicians[selectedFarm.id]?.some(tech => tech.id === user.id)
                    ).map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </div>
                        <button
                          onClick={() => handleAssignTechnician(user.id)}
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1"
                        >
                          <UserPlus size={14} />
                          Assegna
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 italic">Tutti i tecnici sono già assegnati</div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowTechniciansModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedFarm(null)}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Torna agli allevamenti
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{selectedFarm.name}</h1>
            <p className="text-gray-600">{selectedFarm.company}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Segnalazioni Aperte</p>
              <p className="text-2xl font-bold text-red-600">
                {reports.filter(r => r.status === 'open').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Attrezzature</p>
              <p className="text-2xl font-bold text-blue-600">{equipment.length}</p>
              <p className="text-xs text-gray-500">
                {equipment.filter(e => e.status === 'not_working').length} non funzionanti
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Impianti</p>
              <p className="text-2xl font-bold text-purple-600">{facilities.length}</p>
              <p className="text-xs text-gray-500">
                {facilities.filter(f => f.status === 'not_working').length} non funzionanti
              </p>
            </div>
            <Wrench className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Preventivi Attivi</p>
              <p className="text-2xl font-bold text-green-600">
                {quotes.filter(q => ['requested', 'received'].includes(q.status)).length}
              </p>
              <p className="text-xs text-gray-500">
                €{quotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + (q.amount || 0), 0).toLocaleString()}
              </p>
            </div>
            <FileText className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Progetti Attivi</p>
              <p className="text-2xl font-bold text-purple-600">{activeProjects.length}</p>
              <p className="text-xs text-gray-500">
                €{totalProjectValue.toLocaleString()} valore
              </p>
            </div>
            <FolderOpen className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Documenti</p>
              <p className="text-2xl font-bold text-brand-coral">{documents.length}</p>
              <p className="text-xs text-gray-500">
                {documents.filter(d => d.is_important).length} importanti
              </p>
            </div>
            <FileText className="w-8 h-8 text-brand-coral" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Segnalazioni
                {reports.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {reports.length}
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('equipment')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'equipment'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Attrezzature
                {equipment.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {equipment.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('facilities')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'facilities'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Impianti
                {facilities.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {facilities.length}
                  </span>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('quotes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'quotes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Preventivi
                {quotes.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {quotes.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'projects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Progetti
                {projects.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {projects.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documenti
                {/* TODO: Add documents count */}
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nessuna segnalazione per questo allevamento</p>
                </div>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{report.title}</h3>
                        {report.equipment && (
                          <p className="text-sm text-gray-600 mt-1">
                            Attrezzatura: {report.equipment.name}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                            {report.status === 'open' ? 'Aperta' : 
                             report.status === 'in_progress' ? 'In corso' :
                             report.status === 'resolved' ? 'Risolta' : 'Chiusa'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(report.urgency)}`}>
                            {report.urgency === 'low' ? 'Bassa' :
                             report.urgency === 'medium' ? 'Media' :
                             report.urgency === 'high' ? 'Alta' : 'Critica'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Equipment Tab */}
          {activeTab === 'equipment' && (
            <div className="space-y-4">
              {equipment.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nessuna attrezzatura registrata per questo allevamento</p>
                </div>
              ) : (
                equipment.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        {item.model && (
                          <p className="text-sm text-gray-600 mt-1">Modello: {item.model}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status === 'working' ? 'Funzionante' : 'Non funzionante'}
                          </span>
                          {item.next_maintenance_due && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              Manutenzione: {new Date(item.next_maintenance_due).toLocaleDateString('it-IT')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Facilities Tab */}
          {activeTab === 'facilities' && (
            <div className="space-y-4">
              {facilities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nessun impianto registrato per questo allevamento</p>
                </div>
              ) : (
                facilities.map((facility) => (
                  <div key={facility.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{facility.name}</h3>
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            facility.status === 'working' ? 'bg-green-100 text-green-800' : 
                            facility.status === 'not_working' ? 'bg-red-100 text-red-800' :
                            facility.status === 'maintenance_required' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {facility.status === 'working' ? 'Funzionante' : 
                             facility.status === 'not_working' ? 'Non funzionante' :
                             facility.status === 'maintenance_required' ? 'Richiede manutenzione' : 'In manutenzione'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            facility.type === 'electrical' ? 'bg-yellow-100 text-yellow-800' :
                            facility.type === 'plumbing' ? 'bg-blue-100 text-blue-800' :
                            facility.type === 'ventilation' ? 'bg-green-100 text-green-800' :
                            facility.type === 'heating' ? 'bg-red-100 text-red-800' :
                            facility.type === 'cooling' ? 'bg-indigo-100 text-indigo-800' :
                            facility.type === 'lighting' ? 'bg-amber-100 text-amber-800' :
                            facility.type === 'security' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {getFacilityTypeText(facility.type)}
                          </span>
                        </div>
                        {facility.next_maintenance_due && (
                          <p className="text-sm text-gray-600 mt-2">
                            Prossima manutenzione: {new Date(facility.next_maintenance_due).toLocaleDateString('it-IT')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Quotes Tab */}
          {activeTab === 'quotes' && (
            <div className="space-y-4">
              {quotes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nessun preventivo per questo allevamento</p>
                </div>
              ) : (
                quotes.map((quote) => (
                  <div key={quote.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{quote.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Fornitore: {quote.supplier?.name || 'N/A'}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                            {quote.status === 'requested' ? 'Richiesto' :
                             quote.status === 'received' ? 'Ricevuto' :
                             quote.status === 'accepted' ? 'Accettato' : 'Rifiutato'}
                          </span>
                          {quote.amount && (
                            <span className="text-sm font-medium text-green-600">
                              €{quote.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {new Date(quote.created_at).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="space-y-4">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nessun progetto per questo allevamento</p>
                </div>
              ) : (
                projects.map((project) => {
                  const projectValue = getProjectValue(project.id);
                  const projectQuotesCount = quotes.filter(q => 
                    // Assumiamo che le note contengano il riferimento al progetto
                    q.status === 'accepted'
                  ).length;

                  return (
                    <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900">{project.title}</h3>
                            <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              {project.project_number}
                            </span>
                          </div>
                          
                          {project.description && (
                            <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                              {project.status === 'open' ? 'Aperto' :
                               project.status === 'defined' ? 'Definito' :
                               project.status === 'in_progress' ? 'In corso' :
                               project.status === 'completed' ? 'Completato' : 'Scartato'}
                            </span>
                            
                            {projectValue > 0 && (
                              <span className="text-sm font-medium text-green-600">
                                €{projectValue.toLocaleString()}
                              </span>
                            )}
                            
                            {projectQuotesCount > 0 && (
                              <span className="text-xs text-gray-500">
                                {projectQuotesCount} preventivi
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Creato da: {project.users?.full_name || 'N/A'}</span>
                            <span>•</span>
                            <span>{new Date(project.created_at).toLocaleDateString('it-IT')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Documenti ({documents.length})
                </h3>
                <button
                  onClick={() => onNavigate('documents', { farmId: selectedFarm.id })}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Gestisci Documenti
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Nessun documento caricato per questo allevamento</p>
                  <button
                    onClick={() => onNavigate('documents', { farmId: selectedFarm.id })}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Carica Primo Documento
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.slice(0, 5).map((document) => (
                    <div key={document.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="text-2xl">
                            {getFileIcon(document.mime_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900 truncate">{document.title}</h4>
                              {document.is_important && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                  <AlertCircle size={12} className="mr-1" />
                                  Importante
                                </span>
                              )}
                            </div>
                            
                            {document.category_name && (
                              <span 
                                className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white mr-2"
                                style={{ backgroundColor: document.category_color }}
                              >
                                {document.category_name}
                              </span>
                            )}
                            
                            <div className="text-sm text-gray-600 mt-1">
                              <div>File: {document.file_name}</div>
                              <div className="flex items-center gap-4 mt-1">
                                <span>Dimensione: {formatFileSize(document.file_size)}</span>
                                {document.document_date && (
                                  <span>Data: {new Date(document.document_date).toLocaleDateString()}</span>
                                )}
                                {document.expiry_date && (
                                  <span className={`${isExpired(document.expiry_date) ? 'text-red-600 font-medium' : isExpiringSoon(document.expiry_date) ? 'text-yellow-600 font-medium' : ''}`}>
                                    Scadenza: {new Date(document.expiry_date).toLocaleDateString()}
                                    {isExpired(document.expiry_date) && ' (Scaduto)'}
                                    {isExpiringSoon(document.expiry_date) && !isExpired(document.expiry_date) && ' (In scadenza)'}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {document.tags && document.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {document.tags.slice(0, 3).map((tag, index) => (
                                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    #{tag}
                                  </span>
                                ))}
                                {document.tags.length > 3 && (
                                  <span className="text-xs text-gray-500">+{document.tags.length - 3} altri</span>
                                )}
                              </div>
                            )}
                            
                            <div className="text-xs text-gray-500 mt-2">
                              Caricato da {document.created_user_name} il {new Date(document.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              // Naviga alla sezione documenti con il documento selezionato per la modifica
                              onNavigate('documents', { farmId: selectedFarm.id, editDocumentId: document.id });
                            }}
                            className="p-1 text-brand-gray hover:text-brand-coral transition-colors"
                            title="Modifica documento"
                          <button
                            onClick={() => onNavigate('documents', { farmId: selectedFarm.id, editDocumentId: doc.id })}
                            className="p-1 text-brand-gray hover:text-brand-coral transition-colors"
                            title="Modifica documento"
                          >
                            <Edit size={14} />
                          </button>
                          >
                            <Edit size={14} />
                          </button>
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => downloadDocument(document.file_path, document.file_name)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Scarica documento"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {documents.length > 5 && (
                    <div className="text-center pt-4">
                      <button
                        onClick={() => onNavigate('documents', { farmId: selectedFarm.id })}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Vedi tutti i {documents.length} documenti →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
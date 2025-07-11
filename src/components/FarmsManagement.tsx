import React, { useState, useEffect } from 'react';
import { Building, ClipboardList, Package, FileText, AlertTriangle, Clock, CheckCircle, Plus, Eye, Edit, MapPin, Users, TrendingUp, Send, DollarSign, FolderOpen, AlertCircle } from 'lucide-react';
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

interface FarmsManagementProps {
  onNavigate: (path: string) => void;
}

export default function FarmsManagement({ onNavigate }: FarmsManagementProps) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFarmModal, setShowNewFarmModal] = useState(false);
  const [newFarmData, setNewFarmData] = useState({
    name: '',
    address: '',
    company: 'Zoogamma Spa'
  });

  useEffect(() => {
    fetchFarms();
  }, []);

  const fetchFarms = async () => {
    try {
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFarms(data || []);
    } catch (error) {
      console.error('Errore nel caricamento allevamenti:', error);
    } finally {
      setLoading(false);
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

      setReports(reportsData || []);
      setEquipment(equipmentData || []);
      setQuotes(quotesData || []);
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Errore nel caricamento dati allevamento:', error);
    }
  };

  const handleFarmSelect = (farm: Farm) => {
    setSelectedFarm(farm);
    setActiveTab('reports');
    fetchFarmData(farm.id);
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
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleFarmSelect(farm)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Building className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{farm.name}</h3>
                    <p className="text-sm text-gray-500">{farm.company}</p>
                  </div>
                </div>
                <Eye className="w-5 h-5 text-gray-400" />
              </div>
              
              {farm.address && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{farm.address}</span>
                </div>
              )}
              
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
        </div>
      </div>
    </div>
  );
}
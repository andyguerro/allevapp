import React, { useState, useEffect } from 'react';
import { Building, ClipboardList, Package, FileText, AlertTriangle, Clock, CheckCircle, Plus, Eye, Edit, MapPin, Users, TrendingUp, Send, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Farm {
  id: string;
  name: string;
  address?: string;
  company: string;
  created_at: string;
}

interface Report {
  id: string;
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  equipment_name?: string;
}

interface Equipment {
  id: string;
  name: string;
  model?: string;
  status: 'working' | 'not_working' | 'regenerated' | 'repaired';
  last_maintenance?: string;
}

interface Quote {
  id: string;
  report_id?: string;
  title: string;
  amount?: number;
  status: 'requested' | 'received' | 'accepted' | 'rejected';
  supplier_name?: string;
  due_date?: string;
}

interface FarmData {
  farm: Farm;
  reports: Report[];
  equipment: Equipment[];
  quotes: Quote[];
  stats: {
    openReports: number;
    urgentReports: number;
    workingEquipment: number;
    totalEquipment: number;
    pendingQuotes: number;
    totalQuoteValue: number;
  };
}

const FarmsManagement: React.FC<FarmsManagementProps> = ({ onNavigate }) => {
  const [farmsData, setFarmsData] = useState<FarmData[]>([]);
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'equipment' | 'quotes'>('reports');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const handleCreateQuoteRequests = async (report: Report) => {
    // Redirect to main reports page with quote creation
    // For now, we'll show an alert - in a real app you might navigate or open a modal
    alert(`Funzionalità di creazione preventivi per la segnalazione: ${report.title}\n\nVai alla sezione Segnalazioni per utilizzare questa funzionalità.`);
  };
  const handleStatusChange = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;
      await fetchFarmsData();
    } catch (error) {
      console.error('Errore nell\'aggiornamento stato:', error);
      alert('Errore nell\'aggiornamento dello stato');
    }
  };

  useEffect(() => {
    fetchFarmsData();
  }, []);

  const fetchFarmsData = async () => {
    try {
      // Fetch farms
      const { data: farms, error: farmsError } = await supabase
        .from('farms')
        .select('*')
        .order('name');

      if (farmsError) throw farmsError;

      // Fetch all related data for each farm
      const farmsWithData: FarmData[] = [];

      for (const farm of farms) {
        // Fetch reports for this farm
        const { data: reports, error: reportsError } = await supabase
          .from('reports')
          .select(`
            id, title, description, urgency, status, created_at,
            equipment(name)
          `)
          .eq('farm_id', farm.id)
          .order('created_at', { ascending: false });

        if (reportsError) throw reportsError;

        // Fetch equipment for this farm
        const { data: equipment, error: equipmentError } = await supabase
          .from('equipment')
          .select('id, name, model, status, last_maintenance')
          .eq('farm_id', farm.id)
          .order('name');

        if (equipmentError) throw equipmentError;

        // Fetch quotes for this farm
        const { data: quotes, error: quotesError } = await supabase
          .from('quotes')
          .select(`
            id, report_id, title, amount, status, due_date,
            suppliers(name)
          `)
          .eq('farm_id', farm.id)
          .order('created_at', { ascending: false });

        if (quotesError) throw quotesError;

        // Transform data
        const transformedReports = reports.map(report => ({
          ...report,
          equipment_name: report.equipment?.name
        }));

        const transformedQuotes = quotes.map(quote => ({
          ...quote,
          supplier_name: quote.suppliers?.name
        }));

        // Calculate stats
        const stats = {
          openReports: transformedReports.filter(r => r.status === 'open').length,
          urgentReports: transformedReports.filter(r => r.urgency === 'high' || r.urgency === 'critical').length,
          workingEquipment: equipment.filter(e => e.status === 'working').length,
          totalEquipment: equipment.length,
          pendingQuotes: transformedQuotes.filter(q => q.status === 'requested' || q.status === 'received').length,
          totalQuoteValue: transformedQuotes.reduce((sum, q) => sum + (q.amount || 0), 0)
        };

        farmsWithData.push({
          farm,
          reports: transformedReports,
          equipment,
          quotes: transformedQuotes,
          stats
        });
      }

      setFarmsData(farmsWithData);
    } catch (error) {
      console.error('Errore nel caricamento dati allevamenti:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'critical': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string, type: 'report' | 'equipment' | 'quote') => {
    if (type === 'report') {
      switch (status) {
        case 'open': return 'bg-red-100 text-red-800 border-red-200';
        case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
        case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    } else if (type === 'equipment') {
      switch (status) {
        case 'working': return 'bg-green-100 text-green-800 border-green-200';
        case 'not_working': return 'bg-red-100 text-red-800 border-red-200';
        case 'repaired': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'regenerated': return 'bg-purple-100 text-purple-800 border-purple-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    } else {
      switch (status) {
        case 'requested': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'received': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
        case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }
  };

  const getStatusIcon = (status: string, type: 'report' | 'equipment' | 'quote') => {
    if (type === 'report') {
      switch (status) {
        case 'open': return <AlertTriangle size={16} className="text-red-500" />;
        case 'in_progress': return <Clock size={16} className="text-yellow-500" />;
        case 'resolved': return <CheckCircle size={16} className="text-green-500" />;
        case 'closed': return <CheckCircle size={16} className="text-gray-500" />;
        default: return null;
      }
    } else if (type === 'equipment') {
      switch (status) {
        case 'working': return <CheckCircle size={16} className="text-green-500" />;
        case 'not_working': return <AlertTriangle size={16} className="text-red-500" />;
        case 'repaired': return <CheckCircle size={16} className="text-blue-500" />;
        case 'regenerated': return <CheckCircle size={16} className="text-purple-500" />;
        default: return null;
      }
    } else {
      switch (status) {
        case 'requested': return <Clock size={16} className="text-yellow-500" />;
        case 'received': return <FileText size={16} className="text-blue-500" />;
        case 'accepted': return <CheckCircle size={16} className="text-green-500" />;
        case 'rejected': return <AlertTriangle size={16} className="text-red-500" />;
        default: return null;
      }
    }
  };

  const getStatusText = (status: string, type: 'report' | 'equipment' | 'quote') => {
    if (type === 'report') {
      switch (status) {
        case 'open': return 'Aperta';
        case 'in_progress': return 'In Corso';
        case 'resolved': return 'Risolta';
        case 'closed': return 'Chiusa';
        default: return status;
      }
    } else if (type === 'equipment') {
      switch (status) {
        case 'working': return 'Funzionante';
        case 'not_working': return 'Non Funzionante';
        case 'repaired': return 'Riparato';
        case 'regenerated': return 'Rigenerato';
        default: return status;
      }
    } else {
      switch (status) {
        case 'requested': return 'In Corso';
        case 'received': return 'Ricevuto';
        case 'accepted': return 'Confermato';
        case 'rejected': return 'KO';
        default: return status;
      }
    }
  };

  const getReportQuotes = (reportId: string, quotes: Quote[]) => {
    return quotes.filter(quote => quote.report_id === reportId);
  };
  const filteredFarms = farmsData.filter(farmData =>
    farmData.farm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    farmData.farm.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedFarmData = selectedFarm ? farmsData.find(f => f.farm.id === selectedFarm) : null;

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
        <h1 className="text-3xl font-bold text-brand-blue">Gestione Allevamenti</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca allevamenti..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
            />
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray" size={18} />
          </div>
        </div>
      </div>

      {!selectedFarm ? (
        // Farm Overview Grid
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredFarms.map((farmData) => (
            <div
              key={farmData.farm.id}
              className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6 hover:shadow-xl transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedFarm(farmData.farm.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-brand-blue/10 rounded-lg">
                    <Building size={24} className="text-brand-blue" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-brand-blue">{farmData.farm.name}</h3>
                    {farmData.farm.address && (
                      <p className="text-sm text-brand-gray flex items-center mt-1">
                        <MapPin size={14} className="mr-1" />
                        {farmData.farm.address}
                      </p>
                    )}
                    <div className="mt-2">
                      <span className="inline-block px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-sm font-medium">
                        {farmData.farm.company}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-xs font-medium">
                        {farmData.farm.company}
                      </span>
                    </div>
                  </div>
                </div>
                <Eye size={20} className="text-brand-gray hover:text-brand-blue transition-colors" />
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gradient-to-r from-brand-red/10 to-brand-red-light/10 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-brand-red">Segnalazioni Aperte</p>
                      <p className="text-lg font-bold text-brand-red">{farmData.stats.openReports}</p>
                    </div>
                    <ClipboardList size={20} className="text-brand-red" />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-brand-blue/10 to-brand-blue-light/10 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-brand-blue">Attrezzature OK</p>
                      <p className="text-lg font-bold text-brand-blue">
                        {farmData.stats.workingEquipment}/{farmData.stats.totalEquipment}
                      </p>
                    </div>
                    <Package size={20} className="text-brand-blue" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-brand-coral/10 to-brand-coral-light/10 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-brand-coral">Preventivi Attivi</p>
                      <p className="text-lg font-bold text-brand-coral">{farmData.stats.pendingQuotes}</p>
                    </div>
                    <FileText size={20} className="text-brand-coral" />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-green-100 to-green-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700">Valore Preventivi</p>
                      <p className="text-lg font-bold text-green-700">
                        €{farmData.stats.totalQuoteValue.toLocaleString()}
                      </p>
                    </div>
                    <TrendingUp size={20} className="text-green-600" />
                  </div>
                </div>
              </div>

              {/* Urgency Indicators */}
              {farmData.stats.urgentReports > 0 && (
                <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle size={16} className="text-red-600" />
                    <span className="text-sm font-medium text-red-800">
                      {farmData.stats.urgentReports} segnalazione{farmData.stats.urgentReports > 1 ? 'i' : ''} urgente{farmData.stats.urgentReports > 1 ? 'i' : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        // Farm Detail View
        selectedFarmData && (
          <div className="space-y-6">
            {/* Farm Header */}
            <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setSelectedFarm(null)}
                    className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
                  >
                    ←
                  </button>
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-brand-blue/10 rounded-lg">
                      <Building size={32} className="text-brand-blue" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-brand-blue">{selectedFarmData.farm.name}</h2>
                      {selectedFarmData.farm.address && (
                        <p className="text-brand-gray flex items-center mt-1">
                          <MapPin size={16} className="mr-2" />
                          {selectedFarmData.farm.address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-brand-gray hover:text-brand-blue transition-colors">
                    <Edit size={20} />
                  </button>
                </div>
              </div>

              {/* Farm Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="text-center p-4 bg-brand-red/5 rounded-lg">
                  <div className="text-2xl font-bold text-brand-red">{selectedFarmData.stats.openReports}</div>
                  <div className="text-sm text-brand-gray">Segnalazioni Aperte</div>
                </div>
                <div className="text-center p-4 bg-brand-blue/5 rounded-lg">
                  <div className="text-2xl font-bold text-brand-blue">
                    {selectedFarmData.stats.workingEquipment}/{selectedFarmData.stats.totalEquipment}
                  </div>
                  <div className="text-sm text-brand-gray">Attrezzature Funzionanti</div>
                </div>
                <div className="text-center p-4 bg-brand-coral/5 rounded-lg">
                  <div className="text-2xl font-bold text-brand-coral">{selectedFarmData.stats.pendingQuotes}</div>
                  <div className="text-sm text-brand-gray">Preventivi Attivi</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">
                    €{selectedFarmData.stats.totalQuoteValue.toLocaleString()}
                  </div>
                  <div className="text-sm text-brand-gray">Valore Preventivi</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20">
              <div className="border-b border-brand-coral/20">
                <nav className="flex space-x-8 px-6">
                  {[
                    { id: 'reports', label: 'Segnalazioni', icon: ClipboardList, count: selectedFarmData.reports.length },
                    { id: 'equipment', label: 'Attrezzature', icon: Package, count: selectedFarmData.equipment.length },
                    { id: 'quotes', label: 'Preventivi', icon: FileText, count: selectedFarmData.quotes.length }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-brand-red text-brand-red'
                          : 'border-transparent text-brand-gray hover:text-brand-blue hover:border-brand-coral/30'
                      }`}
                    >
                      <tab.icon size={18} />
                      <span>{tab.label}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        activeTab === tab.id
                          ? 'bg-brand-red/20 text-brand-red'
                          : 'bg-brand-gray/20 text-brand-gray'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Reports Tab */}
                {activeTab === 'reports' && (
                  <div className="space-y-4">
                    {selectedFarmData.reports.length > 0 ? (
                      selectedFarmData.reports.map((report) => (
                        <div key={report.id} className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                {getStatusIcon(report.status, 'report')}
                                <h4 className="font-semibold text-brand-blue">{report.title}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(report.urgency)}`}>
                                  {report.urgency === 'high' ? 'Alta' : 
                                   report.urgency === 'medium' ? 'Media' : 
                                   report.urgency === 'low' ? 'Bassa' : 'Critica'}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status, 'report')}`}>
                                  {getStatusText(report.status, 'report')}
                                </span>
                              </div>
                              <p className="text-brand-gray text-sm mb-2">{report.description}</p>
                              {report.equipment_name && (
                                <p className="text-xs text-brand-gray">
                                  Attrezzatura: {report.equipment_name}
                                </p>
                              )}
                              <p className="text-xs text-brand-gray">
                                Creata il {new Date(report.created_at).toLocaleDateString()}
                              </p>
                              
                              {/* Quote Requests Status */}
                              {getReportQuotes(report.id, selectedFarmData.quotes).length > 0 && (
                                <div className="mt-3 p-2 bg-gradient-to-r from-brand-coral/10 to-brand-blue/10 rounded border border-brand-coral/20">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <DollarSign size={14} className="text-brand-coral" />
                                    <span className="text-xs font-medium text-brand-blue">
                                      Preventivi ({getReportQuotes(report.id, selectedFarmData.quotes).length})
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {getReportQuotes(report.id, selectedFarmData.quotes).map((quote) => (
                                      <div key={quote.id} className="flex items-center space-x-1">
                                        <span className="text-xs text-brand-gray">{quote.supplier_name}:</span>
                                        <span className={`px-1 py-0.5 rounded text-xs font-medium border ${getStatusColor(quote.status, 'quote')}`}>
                                          {getStatusText(quote.status, 'quote')}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Status Change Buttons */}
                              <div className="mt-3 flex items-center space-x-2">
                                <span className="text-xs font-medium text-brand-blue">Azioni:</span>
                                <div className="flex space-x-1">
                                  {(report.status === 'closed' || report.status === 'resolved') && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(report.id, 'open');
                                      }}
                                      className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                                    >
                                      Riapri
                                    </button>
                                  )}
                                  {report.status !== 'in_progress' && report.status !== 'closed' && report.status !== 'resolved' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(report.id, 'in_progress');
                                      }}
                                      className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200 transition-colors"
                                    >
                                      In Corso
                                    </button>
                                  )}
                                  {report.status !== 'resolved' && report.status !== 'closed' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(report.id, 'resolved');
                                      }}
                                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                                    >
                                      Risolvi
                                    </button>
                                  )}
                                  {report.status !== 'closed' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStatusChange(report.id, 'closed');
                                      }}
                                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
                                    >
                                      Chiudi
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCreateQuoteRequests(report);
                                    }}
                                    className="px-2 py-1 bg-brand-red/10 text-brand-red rounded text-xs hover:bg-brand-red/20 transition-colors flex items-center space-x-1"
                                  >
                                    <Send size={12} />
                                    <span>Preventivi</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                            <button className="p-2 text-brand-gray hover:text-brand-blue transition-colors">
                              <Eye size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <ClipboardList size={48} className="mx-auto text-brand-gray mb-4" />
                        <h3 className="text-lg font-medium text-brand-blue mb-2">Nessuna segnalazione</h3>
                        <p className="text-brand-gray">Non ci sono segnalazioni per questo allevamento.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Equipment Tab */}
                {activeTab === 'equipment' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedFarmData.equipment.length > 0 ? (
                      selectedFarmData.equipment.map((item) => (
                        <div key={item.id} className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                {getStatusIcon(item.status, 'equipment')}
                                <h4 className="font-semibold text-brand-blue">{item.name}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status, 'equipment')}`}>
                                  {getStatusText(item.status, 'equipment')}
                                </span>
                              </div>
                              {item.model && (
                                <p className="text-brand-gray text-sm mb-1">Modello: {item.model}</p>
                              )}
                              {item.last_maintenance && (
                                <p className="text-xs text-brand-gray">
                                  Ultima manutenzione: {new Date(item.last_maintenance).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <button className="p-2 text-brand-gray hover:text-brand-blue transition-colors">
                              <Eye size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-8">
                        <Package size={48} className="mx-auto text-brand-gray mb-4" />
                        <h3 className="text-lg font-medium text-brand-blue mb-2">Nessuna attrezzatura</h3>
                        <p className="text-brand-gray">Non ci sono attrezzature registrate per questo allevamento.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Quotes Tab */}
                {activeTab === 'quotes' && (
                  <div className="space-y-4">
                    {selectedFarmData.quotes.length > 0 ? (
                      selectedFarmData.quotes.map((quote) => (
                        <div key={quote.id} className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                {getStatusIcon(quote.status, 'quote')}
                                <h4 className="font-semibold text-brand-blue">{quote.title}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(quote.status, 'quote')}`}>
                                  {getStatusText(quote.status, 'quote')}
                                </span>
                              </div>
                              {quote.report_id && (
                                <div className="mb-2">
                                  <span className="text-xs font-medium text-brand-blue">Collegato alla segnalazione:</span>
                                  <p className="text-xs text-brand-gray">
                                    {selectedFarmData.reports.find(r => r.id === quote.report_id)?.title || 'Segnalazione non trovata'}
                                  </p>
                                </div>
                              )}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="font-medium text-brand-blue">Fornitore:</span>
                                  <p className="text-brand-gray">{quote.supplier_name}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-brand-blue">Importo:</span>
                                  <p className="text-brand-gray font-semibold">
                                    {quote.amount ? `€${quote.amount.toLocaleString()}` : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <span className="font-medium text-brand-blue">Scadenza:</span>
                                  <p className="text-brand-gray">
                                    {quote.due_date ? new Date(quote.due_date).toLocaleDateString() : 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <button className="p-2 text-brand-gray hover:text-brand-blue transition-colors">
                              <Eye size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <FileText size={48} className="mx-auto text-brand-gray mb-4" />
                        <h3 className="text-lg font-medium text-brand-blue mb-2">Nessun preventivo</h3>
                        <p className="text-brand-gray">Non ci sono preventivi per questo allevamento.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {filteredFarms.length === 0 && (
        <div className="text-center py-12">
          <Building size={48} className="mx-auto text-brand-gray mb-4" />
          <h3 className="text-lg font-medium text-brand-blue mb-2">Nessun allevamento trovato</h3>
          <p className="text-brand-gray">Prova a modificare i termini di ricerca.</p>
        </div>
      )}
    </div>
  );
};

export default FarmsManagement;
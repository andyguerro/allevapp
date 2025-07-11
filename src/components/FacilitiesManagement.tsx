import React, { useState, useEffect } from 'react';
import { Plus, Wrench, Edit, Eye, AlertTriangle, CheckCircle, Clock, Calendar, Paperclip } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AttachmentsManager from './AttachmentsManager';
import SearchFilters, { Option } from './SearchFilters';

interface Facility {
  id: string;
  name: string;
  type: 'electrical' | 'plumbing' | 'ventilation' | 'heating' | 'cooling' | 'lighting' | 'security' | 'other';
  farm_id: string;
  description?: string;
  status: 'working' | 'not_working' | 'maintenance_required' | 'under_maintenance';
  last_maintenance?: string;
  next_maintenance_due?: string;
  maintenance_interval_days: number;
  created_at: string;
  // Joined data
  farm_name?: string;
}

interface Farm {
  id: string;
  name: string;
}

const FacilitiesManagement: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, Option[]>>({
    status: [],
    type: [],
    farm: []
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [selectedFacilityName, setSelectedFacilityName] = useState<string>('');

  // Prepare filter options
  const [filterOptions, setFilterOptions] = useState<Array<{ id: string; label: string; options: Option[] }>>([]);

  const [formData, setFormData] = useState({
    name: '',
    type: 'other' as 'electrical' | 'plumbing' | 'ventilation' | 'heating' | 'cooling' | 'lighting' | 'security' | 'other',
    farm_id: '',
    description: '',
    status: 'working' as 'working' | 'not_working' | 'maintenance_required' | 'under_maintenance',
    last_maintenance: '',
    next_maintenance_due: '',
    maintenance_interval_days: 365
  });

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilterChange = (filterId: string, selected: Option[]) => {
    setSelectedFilters(prev => ({ ...prev, [filterId]: selected }));
  };

  const fetchData = async () => {
    try {
      // Fetch facilities with joined data
      const { data: facilitiesData, error: facilitiesError } = await supabase
        .from('facilities')
        .select(`
          *,
          farms(name)
        `)
        .order('created_at', { ascending: false });

      if (facilitiesError) throw facilitiesError;

      // Transform data
      const transformedFacilities = facilitiesData.map(facility => ({
        ...facility,
        farm_name: facility.farms?.name
      }));

      setFacilities(transformedFacilities);

      // Fetch farms
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id, name');

      if (farmsError) throw farmsError;
      setFarms(farmsData);

      // Prepare filter options
      const statusOptions: Option[] = [
        { value: 'working', label: 'Funzionante' },
        { value: 'not_working', label: 'Non Funzionante' },
        { value: 'maintenance_required', label: 'Richiede Manutenzione' },
        { value: 'under_maintenance', label: 'In Manutenzione' }
      ];

      const typeOptions: Option[] = [
        { value: 'electrical', label: 'Elettrico' },
        { value: 'plumbing', label: 'Idraulico' },
        { value: 'ventilation', label: 'Ventilazione' },
        { value: 'heating', label: 'Riscaldamento' },
        { value: 'cooling', label: 'Raffreddamento' },
        { value: 'lighting', label: 'Illuminazione' },
        { value: 'security', label: 'Sicurezza' },
        { value: 'other', label: 'Altro' }
      ];

      const farmOptions: Option[] = farmsData.map(farm => ({
        value: farm.id,
        label: farm.name
      }));

      setFilterOptions([
        {
          id: 'status',
          label: 'Stato',
          options: statusOptions
        },
        {
          id: 'type',
          label: 'Tipo',
          options: typeOptions
        },
        {
          id: 'farm',
          label: 'Allevamento',
          options: farmOptions
        }
      ]);

    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      status: [],
      type: [],
      farm: []
    });
    setSearchTerm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('facilities')
        .insert({
          name: formData.name,
          type: formData.type,
          farm_id: formData.farm_id,
          description: formData.description || null,
          status: formData.status,
          last_maintenance: formData.last_maintenance || null,
          next_maintenance_due: formData.next_maintenance_due || null,
          maintenance_interval_days: formData.maintenance_interval_days
        });

      if (error) throw error;

      await fetchData();
      resetForm();
    } catch (error) {
      console.error('Errore nel creare impianto:', error);
      alert('Errore nel creare l\'impianto');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'other',
      farm_id: '',
      description: '',
      status: 'working',
      last_maintenance: '',
      next_maintenance_due: '',
      maintenance_interval_days: 365
    });
    setShowCreateModal(false);
  };

  const updateMaintenanceDate = async (facilityId: string, newDate: string) => {
    try {
      // Calculate next maintenance date based on interval
      const facility = facilities.find(f => f.id === facilityId);
      if (!facility) return;

      const nextDate = new Date(newDate);
      nextDate.setDate(nextDate.getDate() + facility.maintenance_interval_days);

      const { error } = await supabase
        .from('facilities')
        .update({ 
          last_maintenance: newDate,
          next_maintenance_due: nextDate.toISOString().split('T')[0],
          status: 'working' // Reset status to working after maintenance
        })
        .eq('id', facilityId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Errore nell\'aggiornamento manutenzione:', error);
      alert('Errore nell\'aggiornamento della manutenzione');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-green-100 text-green-800 border-green-200';
      case 'not_working': return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance_required': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'under_maintenance': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'working': return 'Funzionante';
      case 'not_working': return 'Non Funzionante';
      case 'maintenance_required': return 'Richiede Manutenzione';
      case 'under_maintenance': return 'In Manutenzione';
      default: return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'electrical': return 'Elettrico';
      case 'plumbing': return 'Idraulico';
      case 'ventilation': return 'Ventilazione';
      case 'heating': return 'Riscaldamento';
      case 'cooling': return 'Raffreddamento';
      case 'lighting': return 'Illuminazione';
      case 'security': return 'Sicurezza';
      default: return 'Altro';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'electrical': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'plumbing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ventilation': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'heating': return 'bg-red-100 text-red-800 border-red-200';
      case 'cooling': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'lighting': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'security': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isMaintenanceOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const isMaintenanceDueSoon = (dueDate?: string) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const today = new Date();
    const daysDiff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff >= 0 && daysDiff <= 7;
  };

  const filteredFacilities = facilities.filter(facility => {
    const matchesSearch = facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         facility.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedFilters.status.length === 0 || 
                          selectedFilters.status.some(option => option.value === facility.status);
    
    const matchesType = selectedFilters.type.length === 0 || 
                        selectedFilters.type.some(option => option.value === facility.type);
    
    const matchesFarm = selectedFilters.farm.length === 0 || 
                        selectedFilters.farm.some(option => option.value === facility.farm_id);
    
    return matchesSearch && matchesStatus && matchesType && matchesFarm;
  });

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
        <h1 className="text-3xl font-bold text-brand-blue">Gestione Impianti</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-3 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Plus size={20} />
          <span>Nuovo Impianto</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Funzionanti</p>
              <p className="text-2xl font-bold text-green-600">
                {facilities.filter(f => f.status === 'working').length}
              </p>
            </div>
            <CheckCircle size={24} className="text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Richiedono Manutenzione</p>
              <p className="text-2xl font-bold text-yellow-600">
                {facilities.filter(f => f.status === 'maintenance_required').length}
              </p>
            </div>
            <AlertTriangle size={24} className="text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Manutenzioni Scadute</p>
              <p className="text-2xl font-bold text-brand-red">
                {facilities.filter(f => isMaintenanceOverdue(f.next_maintenance_due)).length}
              </p>
            </div>
            <Clock size={24} className="text-brand-red" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Totali</p>
              <p className="text-2xl font-bold text-brand-blue">{facilities.length}</p>
            </div>
            <Wrench size={24} className="text-brand-blue" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <SearchFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filterOptions}
        selectedFilters={selectedFilters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearAllFilters}
        placeholder="Cerca impianti..."
      />

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredFacilities.map((facility) => (
          <div key={facility.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-brand-coral/10 rounded-lg">
                  <Wrench size={24} className="text-brand-coral" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{facility.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(facility.type)}`}>
                      {getTypeText(facility.type)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(facility.status)}`}>
                      {getStatusText(facility.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Allevamento:</span>
                <p className="text-sm text-gray-600">{facility.farm_name}</p>
              </div>
              {facility.description && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Descrizione:</span>
                  <p className="text-sm text-gray-600">{facility.description}</p>
                </div>
              )}
              {facility.last_maintenance && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Ultima Manutenzione:</span>
                  <p className="text-sm text-gray-600">
                    {new Date(facility.last_maintenance).toLocaleDateString()}
                  </p>
                </div>
              )}
              {facility.next_maintenance_due && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Prossima Manutenzione:</span>
                  <p className={`text-sm font-medium ${
                    isMaintenanceOverdue(facility.next_maintenance_due) 
                      ? 'text-red-600' 
                      : isMaintenanceDueSoon(facility.next_maintenance_due)
                      ? 'text-yellow-600'
                      : 'text-gray-600'
                  }`}>
                    {new Date(facility.next_maintenance_due).toLocaleDateString()}
                    {isMaintenanceOverdue(facility.next_maintenance_due) && ' (Scaduta)'}
                    {isMaintenanceDueSoon(facility.next_maintenance_due) && 
                     !isMaintenanceOverdue(facility.next_maintenance_due) && ' (In scadenza)'}
                  </p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-700">Intervallo Manutenzione:</span>
                <p className="text-sm text-gray-600">
                  {facility.maintenance_interval_days} giorni
                </p>
              </div>
            </div>

            {/* Maintenance Actions */}
            {(isMaintenanceOverdue(facility.next_maintenance_due) || isMaintenanceDueSoon(facility.next_maintenance_due)) && (
              <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-red-50 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle size={16} className="text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">
                      {isMaintenanceOverdue(facility.next_maintenance_due) ? 'Manutenzione Scaduta' : 'Manutenzione in Scadenza'}
                    </span>
                  </div>
                  <button
                    onClick={() => updateMaintenanceDate(facility.id, new Date().toISOString().split('T')[0])}
                    className="px-3 py-1 bg-brand-blue text-white rounded-lg text-xs hover:bg-brand-blue-dark transition-colors"
                  >
                    Completata
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                  <button
                    onClick={() => {
                      setSelectedFacilityId(facility.id);
                      setSelectedFacilityName(facility.name);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Gestisci allegati"
                  >
                    <Paperclip size={16} />
                  </button>
                </button>
                <button className="p-2 text-gray-400 hover:text-green-600 transition-colors">
                  <Edit size={16} />
                </button>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(facility.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Nuovo Impianto</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Nome Impianto
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Tipo Impianto
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    <option value="electrical">Elettrico</option>
                    <option value="plumbing">Idraulico</option>
                    <option value="ventilation">Ventilazione</option>
                    <option value="heating">Riscaldamento</option>
                    <option value="cooling">Raffreddamento</option>
                    <option value="lighting">Illuminazione</option>
                    <option value="security">Sicurezza</option>
                    <option value="other">Altro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Allevamento
                  </label>
                  <select
                    required
                    value={formData.farm_id}
                    onChange={(e) => setFormData({ ...formData, farm_id: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    <option value="">Seleziona allevamento</option>
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>{farm.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Stato
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    <option value="working">Funzionante</option>
                    <option value="not_working">Non Funzionante</option>
                    <option value="maintenance_required">Richiede Manutenzione</option>
                    <option value="under_maintenance">In Manutenzione</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Intervallo Manutenzione
                  </label>
                  <select
                    value={formData.maintenance_interval_days}
                    onChange={(e) => setFormData({ ...formData, maintenance_interval_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    <option value={30}>30 giorni (Mensile)</option>
                    <option value={90}>90 giorni (Trimestrale)</option>
                    <option value={180}>180 giorni (Semestrale)</option>
                    <option value={365}>365 giorni (Annuale)</option>
                    <option value={730}>730 giorni (Biennale)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Ultima Manutenzione
                  </label>
                  <input
                    type="date"
                    value={formData.last_maintenance}
                    onChange={(e) => setFormData({ ...formData, last_maintenance: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Prossima Manutenzione
                  </label>
                  <input
                    type="date"
                    value={formData.next_maintenance_due}
                    onChange={(e) => setFormData({ ...formData, next_maintenance_due: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Descrizione
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200"
                >
                  Crea Impianto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attachments Manager */}
      {selectedFacilityId && (
        <AttachmentsManager
          entityType="facility"
          entityId={selectedFacilityId}
          entityName={selectedFacilityName}
          onClose={() => {
            setSelectedFacilityId(null);
            setSelectedFacilityName('');
          }}
        />
      )}

      {filteredFacilities.length === 0 && (
        <div className="text-center py-12">
          <Wrench size={48} className="mx-auto text-brand-gray mb-4" />
          <h3 className="text-lg font-medium text-brand-blue mb-2">Nessun impianto trovato</h3>
          <p className="text-brand-gray">Prova a modificare i filtri di ricerca o aggiungi un nuovo impianto.</p>
        </div>
      )}
    </div>
  );
};

export default FacilitiesManagement;
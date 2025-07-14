import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Eye, AlertTriangle, Paperclip } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AttachmentsManager from './AttachmentsManager';
import SearchFilters, { Option } from './SearchFilters';

interface EquipmentProps {
  initialFilters?: {
    filterStatus?: string;
  };
}

interface Equipment {
  id: string;
  name: string;
  model?: string;
  serial_number?: string;
  farm_id: string;
  status: 'working' | 'not_working' | 'regenerated' | 'repaired';
  description?: string;
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

const Equipment: React.FC<EquipmentProps> = ({ initialFilters = {} }) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, Option[]>>({
    status: initialFilters?.filterStatus ? [{ value: initialFilters.filterStatus, label: getStatusText(initialFilters.filterStatus) }] : [],
    farm: []
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [selectedEquipmentName, setSelectedEquipmentName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Prepare filter options
  const [filterOptions, setFilterOptions] = useState<Array<{ id: string; label: string; options: Option[] }>>([]);

  const [formData, setFormData] = useState({
    name: '',
    model: '',
    serial_number: '',
    farm_id: '',
    status: 'working' as 'working' | 'not_working' | 'regenerated' | 'repaired',
    description: '',
    last_maintenance: '',
    next_maintenance_due: '',
    maintenance_interval_days: 365
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Apply initial filters when component mounts
  useEffect(() => {
    if (initialFilters?.filterStatus) {
      // Already handled in useState initialization
    }
  }, [initialFilters]);

  const fetchData = async () => {
    try {
      // Fetch equipment with joined data
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select(`
          *,
          farms(name)
        `)
        .order('created_at', { ascending: false });

      if (equipmentError) throw equipmentError;

      // Transform data
      const transformedEquipment = equipmentData.map(eq => ({
        ...eq,
        farm_name: eq.farms?.name
      }));

      setEquipment(transformedEquipment);

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
        { value: 'repaired', label: 'Riparato' },
        { value: 'regenerated', label: 'Rigenerato' }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('equipment')
        .insert({
          name: formData.name,
          model: formData.model || null,
          serial_number: formData.serial_number || null,
          farm_id: formData.farm_id,
          status: formData.status,
          description: formData.description || null,
          last_maintenance: formData.last_maintenance || null,
          next_maintenance_due: formData.next_maintenance_due || null,
          maintenance_interval_days: formData.maintenance_interval_days
        });

      if (error) throw error;

      await fetchData();
      resetForm();
    } catch (error) {
      console.error('Errore nel creare attrezzatura:', error);
      alert('Errore nel creare l\'attrezzatura');
    }
  };

  const handleEdit = (item: Equipment) => {
    setFormData({
      name: item.name,
      model: item.model || '',
      serial_number: item.serial_number || '',
      farm_id: item.farm_id,
      status: item.status,
      description: item.description || '',
      last_maintenance: item.last_maintenance || '',
      next_maintenance_due: item.next_maintenance_due || '',
      maintenance_interval_days: item.maintenance_interval_days || 365
    });
    setEditingEquipment(item);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingEquipment) return;
    
    try {
      const { error } = await supabase
        .from('equipment')
        .update({
          name: formData.name,
          model: formData.model || null,
          serial_number: formData.serial_number || null,
          farm_id: formData.farm_id,
          status: formData.status,
          description: formData.description || null,
          last_maintenance: formData.last_maintenance || null,
          next_maintenance_due: formData.next_maintenance_due || null,
          maintenance_interval_days: formData.maintenance_interval_days
        })
        .eq('id', editingEquipment.id);

      if (error) throw error;

      await fetchData();
      resetEditForm();
    } catch (error) {
      console.error('Errore nell\'aggiornamento attrezzatura:', error);
      alert('Errore nell\'aggiornamento dell\'attrezzatura');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      model: '',
      serial_number: '',
      farm_id: '',
      status: 'working',
      description: '',
      last_maintenance: '',
      next_maintenance_due: '',
      maintenance_interval_days: 365
    });
    setShowCreateModal(false);
  };

  const resetEditForm = () => {
    setFormData({
      name: '',
      model: '',
      serial_number: '',
      farm_id: '',
      status: 'working',
      description: '',
      last_maintenance: '',
      next_maintenance_due: '',
      maintenance_interval_days: 365
    });
    setEditingEquipment(null);
    setShowEditModal(false);
  };

  const updateMaintenanceDate = async (equipmentId: string, newDate: string) => {
    try {
      // Calculate next maintenance date based on interval
      const equipmentItem = equipment.find(e => e.id === equipmentId);
      if (!equipmentItem) return;

      const nextDate = new Date(newDate);
      nextDate.setDate(nextDate.getDate() + equipmentItem.maintenance_interval_days);

      const { error } = await supabase
        .from('equipment')
        .update({ 
          last_maintenance: newDate,
          next_maintenance_due: nextDate.toISOString().split('T')[0],
          status: 'working' // Reset status to working after maintenance
        })
        .eq('id', equipmentId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Errore nell\'aggiornamento manutenzione:', error);
      alert('Errore nell\'aggiornamento della manutenzione');
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

  const handleFilterChange = (filterId: string, selected: Option[]) => {
    setSelectedFilters(prev => ({ ...prev, [filterId]: selected }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      status: [],
      farm: []
    });
    setSearchTerm('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-brand-blue/20 text-brand-blue border-brand-blue/30';
      case 'not_working': return 'bg-brand-red/20 text-brand-red border-brand-red/30';
      case 'repaired': return 'bg-brand-coral/20 text-brand-coral border-brand-coral/30';
      case 'regenerated': return 'bg-brand-red-light/20 text-brand-red-light border-brand-red-light/30';
      default: return 'bg-brand-gray/20 text-brand-gray border-brand-gray/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'working': return 'Funzionante';
      case 'not_working': return 'Non Funzionante';
      case 'repaired': return 'Riparato';
      case 'regenerated': return 'Rigenerato';
      default: return status;
    }
  };

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedFilters.status.length === 0 || 
                          selectedFilters.status.some(option => option.value === item.status);
    
    const matchesFarm = selectedFilters.farm.length === 0 || 
                        selectedFilters.farm.some(option => option.value === item.farm_id);
    
    return matchesSearch && matchesStatus && matchesFarm;
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
        <h1 className="text-3xl font-bold text-brand-blue">Attrezzature</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-3 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Plus size={20} />
          <span>Nuova Attrezzatura</span>
        </button>
      </div>

      {/* Active Filters Indicator */}
      {selectedFilters.status.length > 0 && (
        <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-brand-blue">Filtro attivo:</span>
              <span className="px-2 py-1 bg-brand-blue/20 text-brand-blue rounded-full text-xs">
                Stato: {selectedFilters.status.map(s => s.label).join(', ')}
              </span>
            </div>
            <button
              onClick={() => setSelectedFilters(prev => ({ ...prev, status: [] }))}
              className="text-sm text-brand-gray hover:text-brand-blue transition-colors"
            >
              Rimuovi filtro
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Funzionanti</p>
              <p className="text-2xl font-bold text-brand-blue">
                {equipment.filter(e => e.status === 'working').length}
              </p>
            </div>
            <Package size={24} className="text-brand-blue" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Non Funzionanti</p>
              <p className="text-2xl font-bold text-brand-red">
                {equipment.filter(e => e.status === 'not_working').length}
              </p>
            </div>
            <Package size={24} className="text-brand-red" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Riparate</p>
              <p className="text-2xl font-bold text-brand-coral">
                {equipment.filter(e => e.status === 'repaired').length}
              </p>
            </div>
            <Package size={24} className="text-brand-coral" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Totali</p>
              <p className="text-2xl font-bold text-brand-blue">{equipment.length}</p>
            </div>
            <Package size={24} className="text-brand-blue" />
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
        placeholder="Cerca attrezzature..."
      />

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEquipment.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Package size={24} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">{item.model}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                {getStatusText(item.status)}
              </span>
            </div>

            <div className="space-y-3">
              {item.serial_number && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Numero di Serie:</span>
                  <p className="text-sm text-gray-600">{item.serial_number}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-700">Posizione:</span>
                <p className="text-sm text-gray-600">{item.farm_name}</p>
              </div>
              {item.description && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Descrizione:</span>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              )}
              {item.last_maintenance && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Ultima Manutenzione:</span>
                  <p className="text-sm text-gray-600">
                    {new Date(item.last_maintenance).toLocaleDateString()}
                  </p>
                </div>
              )}
              {item.next_maintenance_due && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Prossima Manutenzione:</span>
                  <p className={`text-sm ${
                    isMaintenanceOverdue(item.next_maintenance_due)
                      ? 'text-red-600 font-medium' 
                      : isMaintenanceDueSoon(item.next_maintenance_due)
                      ? 'text-yellow-600 font-medium'
                      : 'text-gray-600'
                  }`}>
                    {new Date(item.next_maintenance_due).toLocaleDateString()}
                    {isMaintenanceOverdue(item.next_maintenance_due) && ' (Scaduta)'}
                    {isMaintenanceDueSoon(item.next_maintenance_due) && 
                     !isMaintenanceOverdue(item.next_maintenance_due) && ' (In scadenza)'}
                  </p>
                </div>
              )}
            </div>

            {/* Maintenance Actions */}
            {(isMaintenanceOverdue(item.next_maintenance_due) || isMaintenanceDueSoon(item.next_maintenance_due)) && (
              <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-red-50 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle size={16} className="text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">
                      {isMaintenanceOverdue(item.next_maintenance_due) ? 'Manutenzione Scaduta' : 'Manutenzione in Scadenza'}
                    </span>
                  </div>
                  <Paperclip size={16} />
                </button>
                <button 
                  onClick={() => {
                    setSelectedEquipmentId(item.id);
                    setSelectedEquipmentName(item.name);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Gestisci allegati"
                >
                  <Paperclip size={16} />
                </button>
                <button 
                  onClick={() => handleEdit(item)}
                  className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                  title="Modifica attrezzatura"
                >
                  <Edit size={16} />
                </button>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(item.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Nuova Attrezzatura</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Nome Attrezzatura
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
                    Modello
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Numero di Serie
                  </label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>
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
                    <option value="repaired">Riparato</option>
                    <option value="regenerated">Rigenerato</option>
                  </select>
                </div>

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
                  Intervallo Manutenzione (giorni)
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
                  Crea Attrezzatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Modifica Attrezzatura</h2>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Nome Attrezzatura
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
                    Modello
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Numero di Serie
                  </label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <option value="repaired">Riparato</option>
                    <option value="regenerated">Rigenerato</option>
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
                  Intervallo Manutenzione (giorni)
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
                  onClick={resetEditForm}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200"
                >
                  Aggiorna Attrezzatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attachments Manager */}
      {selectedEquipmentId && (
        <AttachmentsManager
          entityType="equipment"
          entityId={selectedEquipmentId}
          entityName={selectedEquipmentName}
          onClose={() => {
            setSelectedEquipmentId(null);
            setSelectedEquipmentName('');
          }}
        />
      )}

      {filteredEquipment.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-brand-gray mb-4" />
          <h3 className="text-lg font-medium text-brand-blue mb-2">Nessuna attrezzatura trovata</h3>
          <p className="text-brand-gray">Prova a modificare i filtri di ricerca o aggiungi una nuova attrezzatura.</p>
        </div>
      )}
    </div>
  );
};

export default Equipment;
                    onClick={() => updateMaintenanceDate(item.id, new Date().toISOString().split('T')[0])}
                    className="px-3 py-1 bg-brand-blue text-white rounded-lg text-xs hover:bg-brand-blue-dark transition-colors"
                  >
                    Completata
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    setSelectedEquipmentId(item.id);
                    setSelectedEquipmentName(item.name);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Gestisci allegati"
                >
                  <Paperclip size={16} />
                </button>
                <button 
                  onClick={() => handleEdit(item)}
                  className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                  title="Modifica attrezzatura"
                >
                  <Edit size={16} />
                </button>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(item.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Nuova Attrezzatura</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Nome Attrezzatura
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
                    Modello
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Numero di Serie
                  </label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>
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
                    <option value="repaired">Riparato</option>
                    <option value="regenerated">Rigenerato</option>
                  </select>
                </div>

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
                  Intervallo Manutenzione (giorni)
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
                  Crea Attrezzatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Modifica Attrezzatura</h2>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Nome Attrezzatura
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
                    Modello
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Numero di Serie
                  </label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <option value="repaired">Riparato</option>
                    <option value="regenerated">Rigenerato</option>
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
                  Intervallo Manutenzione (giorni)
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
                  onClick={resetEditForm}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200"
                >
                  Aggiorna Attrezzatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attachments Manager */}
      {selectedEquipmentId && (
        <AttachmentsManager
          entityType="equipment"
          entityId={selectedEquipmentId}
          entityName={selectedEquipmentName}
          onClose={() => {
            setSelectedEquipmentId(null);
            setSelectedEquipmentName('');
          }}
        />
      )}

      {filteredEquipment.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-brand-gray mb-4" />
          <h3 className="text-lg font-medium text-brand-blue mb-2">Nessuna attrezzatura trovata</h3>
          <p className="text-brand-gray">Prova a modificare i filtri di ricerca o aggiungi una nuova attrezzatura.</p>
        </div>
      )}
    </div>
  );
};

export default Equipment;
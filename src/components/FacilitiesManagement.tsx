import React, { useState, useEffect } from 'react';
import { Plus, Wrench, Edit, Trash2, AlertTriangle, Calendar, Eye, Mail, Upload, File, Image, FileText, X, Tag, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SearchFilters, { Option } from './SearchFilters';
import FacilityDetailModal from './FacilityDetailModal';
import QuoteRequestModal from './QuoteRequestModal';

interface AttachmentFile {
  file: File;
  label: string;
  id: string;
}

interface FacilitiesManagementProps {
  currentUser?: any;
  userFarms?: string[];
}

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

const FacilitiesManagement: React.FC<FacilitiesManagementProps> = ({ currentUser, userFarms = [] }) => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, Option[]>>({
    type: [],
    status: [],
    farm: []
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [selectedFacilityForDetail, setSelectedFacilityForDetail] = useState<string | null>(null);
  const [selectedFacilityForQuote, setSelectedFacilityForQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [attachmentFiles, setAttachmentFiles] = useState<AttachmentFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Prepare filter options
  const [filterOptions, setFilterOptions] = useState<Array<{ id: string; label: string; options: Option[] }>>([]);

  const [formData, setFormData] = useState({
    name: '',
    type: 'other' as 'electrical' | 'plumbing' | 'ventilation' | 'heating' | 'cooling' | 'lighting' | 'security' | 'other',
    farm_id: '',
    description: '',
    status: 'working' as 'working' | 'not_working' | 'maintenance_required' | 'under_maintenance',
    last_maintenance: '',
    maintenance_interval_days: 365
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Apply initial farm filter when component mounts
  useEffect(() => {
    if (initialFilters?.farmId && farms.length > 0) {
      const farm = farms.find(f => f.id === initialFilters.farmId);
      if (farm) {
        setSelectedFilters(prev => ({
          ...prev,
          farm: [{ value: farm.id, label: farm.name }]
        }));
      }
    }
  }, [initialFilters?.farmId, farms]);

  const fetchData = async () => {
    try {
      // Fetch facilities with joined data
      let facilitiesQuery = supabase
        .from('facilities')
        .select(`
          *,
          farms(name)
        `)
        .order('created_at', { ascending: false });

      // Filter by user farms if they're a technician with assigned farms
      if (currentUser?.role === 'technician' && userFarms.length > 0) {
        facilitiesQuery = facilitiesQuery.in('farm_id', userFarms);
      }

      const { data: facilitiesData, error: facilitiesError } = await facilitiesQuery;

      if (facilitiesError) throw facilitiesError;

      // Transform data
      const transformedFacilities = facilitiesData.map(facility => ({
        ...facility,
        farm_name: facility.farms?.name
      }));

      setFacilities(transformedFacilities);

      // Fetch farms
      let farmsQuery = supabase
        .from('farms')
        .select('id, name');

      // Filter farms by user's assigned farms if they're a technician
      if (currentUser?.role === 'technician' && userFarms.length > 0) {
        farmsQuery = farmsQuery.in('id', userFarms);
      }

      const { data: farmsData, error: farmsError } = await farmsQuery;

      if (farmsError) throw farmsError;
      setFarms(farmsData);

      // Prepare filter options
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

      const statusOptions: Option[] = [
        { value: 'working', label: 'Funzionante' },
        { value: 'not_working', label: 'Non Funzionante' },
        { value: 'maintenance_required', label: 'Richiede Manutenzione' },
        { value: 'under_maintenance', label: 'In Manutenzione' }
      ];

      const farmOptions: Option[] = farmsData.map(farm => ({
        value: farm.id,
        label: farm.name
      }));

      setFilterOptions([
        {
          id: 'type',
          label: 'Tipo',
          options: typeOptions
        },
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

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const newFiles: AttachmentFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Verifica dimensione file (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`Il file "${file.name}" è troppo grande. Dimensione massima: 10MB`);
        continue;
      }
      
      newFiles.push({
        file,
        label: file.name.split('.')[0], // Nome file senza estensione come default
        id: Math.random().toString(36).substring(2)
      });
    }
    
    setAttachmentFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeAttachmentFile = (id: string) => {
    setAttachmentFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateAttachmentLabel = (id: string, label: string) => {
    setAttachmentFiles(prev => prev.map(f => f.id === id ? { ...f, label } : f));
  };

  const uploadAttachments = async (facilityId: string) => {
    if (attachmentFiles.length === 0) return;

    try {
      // Get current user from localStorage
      const currentUserStr = localStorage.getItem('allevapp_current_user');
      let currentUser = null;
      
      if (currentUserStr) {
        try {
          currentUser = JSON.parse(currentUserStr);
        } catch (error) {
          console.error('Error parsing current user:', error);
        }
      }

      for (const attachmentFile of attachmentFiles) {
        try {
          // Genera un nome file unico
          const fileExt = attachmentFile.file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `facility/${facilityId}/${fileName}`;

          // Try to upload file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, attachmentFile.file);

          if (uploadError) {
            console.warn(`Upload error for ${attachmentFile.file.name}:`, uploadError);
            continue; // Continua con gli altri file
          }

          // Use current user or get a default user
          let userId = currentUser?.id;
          
          if (!userId) {
            const { data: defaultUser, error: userError } = await supabase
              .from('users')
              .select('id')
              .eq('active', true)
              .limit(1)
              .single();

            if (userError || !defaultUser) {
              console.warn('No active user found for attachment metadata');
              continue;
            }
            
            userId = defaultUser.id;
          }

          // Salva i metadati nel database
          const { error: dbError } = await supabase
            .from('attachments')
            .insert({
              entity_type: 'facility',
              entity_id: facilityId,
              file_name: attachmentFile.file.name,
              file_path: filePath,
              custom_label: attachmentFile.label || attachmentFile.file.name,
              file_size: attachmentFile.file.size,
              mime_type: attachmentFile.file.type,
              created_by: userId
            });

          if (dbError) {
            console.warn(`Database error for ${attachmentFile.file.name}:`, dbError);
          }
        } catch (fileError) {
          console.warn(`Error uploading ${attachmentFile.file.name}:`, fileError);
        }
      }
    } catch (error) {
      console.warn('Error uploading attachments:', error);
      // Non bloccare la creazione dell'impianto per errori di upload
    }
  };

  const calculateNextMaintenanceDate = (lastMaintenance: string, intervalDays: number) => {
    if (!lastMaintenance) return null;
    const lastDate = new Date(lastMaintenance);
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + intervalDays);
    return nextDate.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const nextMaintenanceDue = formData.last_maintenance 
        ? calculateNextMaintenanceDate(formData.last_maintenance, formData.maintenance_interval_days)
        : null;

      const facilityData = {
        name: formData.name,
        type: formData.type,
        farm_id: formData.farm_id,
        description: formData.description || null,
        status: formData.status,
        last_maintenance: formData.last_maintenance || null,
        maintenance_interval_days: formData.maintenance_interval_days,
        next_maintenance_due: nextMaintenanceDue
      };

      if (editingFacility) {
        const { error } = await supabase
          .from('facilities')
          .update(facilityData)
          .eq('id', editingFacility.id);

        if (error) throw error;
      } else {
        const { data: newFacility, error } = await supabase
          .from('facilities')
          .insert([facilityData])
          .select()
          .single();

        if (error) throw error;

        // Upload attachments if any
        if (attachmentFiles.length > 0) {
          await uploadAttachments(newFacility.id);
        }
      }

      await fetchData();
      resetForm();
    } catch (error) {
      console.error('Errore nel salvare impianto:', error);
      alert('Errore nel salvare l\'impianto');
    }
  };

  const handleEdit = (facility: Facility) => {
    setFormData({
      name: facility.name,
      type: facility.type,
      farm_id: facility.farm_id,
      description: facility.description || '',
      status: facility.status,
      last_maintenance: facility.last_maintenance || '',
      maintenance_interval_days: facility.maintenance_interval_days || 365
    });
    setEditingFacility(facility);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingFacility) return;
    
    try {
      const nextMaintenanceDue = formData.last_maintenance 
        ? calculateNextMaintenanceDate(formData.last_maintenance, formData.maintenance_interval_days)
        : null;

      const { error } = await supabase
        .from('facilities')
        .update({
          name: formData.name,
          type: formData.type,
          farm_id: formData.farm_id,
          description: formData.description || null,
          status: formData.status,
          last_maintenance: formData.last_maintenance || null,
          maintenance_interval_days: formData.maintenance_interval_days,
          next_maintenance_due: nextMaintenanceDue
        })
        .eq('id', editingFacility.id);

      if (error) throw error;

      await fetchData();
      resetEditForm();
    } catch (error) {
      console.error('Errore nell\'aggiornamento impianto:', error);
      alert('Errore nell\'aggiornamento dell\'impianto');
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
      maintenance_interval_days: 365
    });
    setAttachmentFiles([]);
    setShowCreateModal(false);
  };

  const resetEditForm = () => {
    setFormData({
      name: '',
      type: 'other',
      farm_id: '',
      description: '',
      status: 'working',
      last_maintenance: '',
      maintenance_interval_days: 365
    });
    setEditingFacility(null);
    setShowEditModal(false);
  };

  const handleDelete = async (facilityId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo impianto? Questa azione non può essere annullata.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('facilities')
        .delete()
        .eq('id', facilityId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Errore nell\'eliminazione impianto:', error);
      alert('Errore nell\'eliminazione dell\'impianto');
    }
  };

  const updateMaintenanceDate = async (facilityId: string, maintenanceDate: string) => {
    try {
      const facility = facilities.find(f => f.id === facilityId);
      if (!facility) return;

      const nextMaintenanceDue = calculateNextMaintenanceDate(
        maintenanceDate, 
        facility.maintenance_interval_days
      );

      const { error } = await supabase
        .from('facilities')
        .update({
          last_maintenance: maintenanceDate,
          next_maintenance_due: nextMaintenanceDue,
          status: 'working'
        })
        .eq('id', facilityId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Errore nell\'aggiornare la manutenzione:', error);
      alert('Errore nell\'aggiornare la manutenzione');
    }
  };

  const handleFilterChange = (filterId: string, selected: Option[]) => {
    setSelectedFilters(prev => ({ ...prev, [filterId]: selected }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      type: [],
      status: [],
      farm: []
    });
    setSearchTerm('');
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

  const isMaintenanceOverdue = (nextMaintenanceDate?: string) => {
    if (!nextMaintenanceDate) return false;
    return new Date(nextMaintenanceDate) < new Date();
  };

  const isMaintenanceDueSoon = (nextMaintenanceDate?: string) => {
    if (!nextMaintenanceDate) return false;
    const nextDate = new Date(nextMaintenanceDate);
    const today = new Date();
    const daysUntilMaintenance = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilMaintenance <= 7 && daysUntilMaintenance >= 0;
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File size={16} className="text-gray-600" />;
    
    if (mimeType.startsWith('image/')) {
      return <Image size={16} className="text-blue-600" />;
    } else if (mimeType.includes('pdf') || mimeType.includes('document')) {
      return <FileText size={16} className="text-red-600" />;
    } else {
      return <File size={16} className="text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredFacilities = facilities.filter(facility => {
    const matchesSearch = facility.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         facility.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         facility.farm_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedFilters.type.length === 0 || 
                        selectedFilters.type.some(option => option.value === facility.type);
    
    const matchesStatus = selectedFilters.status.length === 0 || 
                          selectedFilters.status.some(option => option.value === facility.status);
    
    const matchesFarm = selectedFilters.farm.length === 0 || 
                        selectedFilters.farm.some(option => option.value === facility.farm_id);
    
    return matchesSearch && matchesType && matchesStatus && matchesFarm;
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Funzionanti</p>
              <p className="text-2xl font-bold text-green-600">
                {facilities.filter(f => f.status === 'working').length}
              </p>
            </div>
            <Wrench size={24} className="text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Non Funzionanti</p>
              <p className="text-2xl font-bold text-red-600">
                {facilities.filter(f => f.status === 'not_working').length}
              </p>
            </div>
            <AlertTriangle size={24} className="text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Richiedono Manutenzione</p>
              <p className="text-2xl font-bold text-yellow-600">
                {facilities.filter(f => f.status === 'maintenance_required').length}
              </p>
            </div>
            <Calendar size={24} className="text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFacilities.map((facility) => (
          <div key={facility.id} className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-brand-coral/10 rounded-lg">
                  <Wrench size={24} className="text-brand-coral" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-brand-blue">{facility.name}</h3>
                  <p className="text-sm text-brand-gray">{facility.farm_name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedFacilityForDetail(facility.id)}
                  className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
                  title="Visualizza dettagli"
                >
                  <Eye size={16} />
                </button>
                <button 
                  onClick={() => handleEdit(facility)}
                  className="p-2 text-brand-gray hover:text-brand-coral transition-colors"
                  title="Modifica impianto"
                >
                  <Edit size={16} />
                </button>
                {currentUser && (
                  <button
                    onClick={() => setSelectedFacilityForQuote(facility)}
                    className="p-2 text-brand-gray hover:text-brand-coral transition-colors"
                    title="Richiedi preventivo"
                  >
                    <Mail size={16} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(facility.id)}
                  className="p-2 text-brand-gray hover:text-brand-red transition-colors"
                  title="Elimina impianto"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(facility.type)}`}>
                  {getTypeText(facility.type)}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(facility.status)}`}>
                  {getStatusText(facility.status)}
                </span>
              </div>

              {facility.description && (
                <p className="text-sm text-brand-gray">{facility.description}</p>
              )}

              <div className="space-y-2 text-sm">
                {facility.last_maintenance && (
                  <div className="flex items-center space-x-2 text-brand-gray">
                    <Calendar size={14} />
                    <span>Ultima: {new Date(facility.last_maintenance).toLocaleDateString()}</span>
                  </div>
                )}
                {facility.next_maintenance_due && (
                  <div className="flex items-center space-x-2 text-brand-gray">
                    <Calendar size={14} />
                    <span>Prossima: {new Date(facility.next_maintenance_due).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Maintenance Alert */}
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
                    Intervallo Manutenzione (giorni)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maintenance_interval_days}
                    onChange={(e) => setFormData({ ...formData, maintenance_interval_days: parseInt(e.target.value) || 365 })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Ultima Manutenzione (opzionale)
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
                  Descrizione (opzionale)
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              {/* Attachments Section */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-brand-blue mb-4">Allegati (opzionale)</h3>
                
                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 mb-4 ${
                    dragOver
                      ? 'border-brand-red bg-brand-red/5'
                      : 'border-gray-300 hover:border-brand-coral'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-brand-red' : 'text-gray-400'}`} />
                  <h4 className="text-md font-medium text-brand-blue mb-2">
                    Aggiungi allegati all'impianto
                  </h4>
                  <p className="text-brand-gray mb-3 text-sm">
                    <span className="hidden sm:inline">Trascina i file qui o </span>Tocca per selezionare
                  </p>
                  <p className="text-xs text-brand-gray mb-3">
                    Formati supportati: immagini, PDF, documenti • Max 10MB per file
                  </p>
                  
                  <input
                    type="file"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    id="facility-attachment-upload"
                    accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls"
                    multiple
                  />
                  <label
                    htmlFor="facility-attachment-upload"
                    className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-3 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 cursor-pointer inline-flex items-center space-x-2 font-medium min-h-[48px] touch-manipulation"
                  >
                    <Plus size={16} />
                    <span>📱 Seleziona File</span>
                  </label>
                  
                  {/* Mobile Camera Button */}
                  <div className="mt-3 sm:hidden">
                    <input
                      type="file"
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                      id="facility-camera-upload"
                      accept="image/*"
                      capture="environment"
                    />
                    <label
                      htmlFor="facility-camera-upload"
                      className="bg-gradient-to-r from-brand-coral to-brand-coral-light text-white px-6 py-3 rounded-lg hover:from-brand-coral-light hover:to-brand-coral transition-all duration-200 cursor-pointer inline-flex items-center space-x-2 font-medium min-h-[48px] touch-manipulation"
                    >
                      <span>📷</span>
                      <span>Scatta Foto</span>
                    </label>
                  </div>
                </div>

                {/* Selected Files List */}
                {attachmentFiles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-brand-blue">
                      File selezionati ({attachmentFiles.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {attachmentFiles.map((attachmentFile) => (
                        <div
                          key={attachmentFile.id}
                          className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className="p-2 bg-white rounded-lg shadow-sm">
                                {getFileIcon(attachmentFile.file.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Tag size={12} className="text-brand-coral" />
                                  <input
                                    type="text"
                                    value={attachmentFile.label}
                                    onChange={(e) => updateAttachmentLabel(attachmentFile.id, e.target.value)}
                                    className="text-sm font-medium text-brand-blue bg-transparent border-none outline-none flex-1"
                                    placeholder="Etichetta file..."
                                  />
                                </div>
                                <p className="text-xs text-brand-gray truncate">
                                  {attachmentFile.file.name}
                                </p>
                                <p className="text-xs text-brand-gray">
                                  {formatFileSize(attachmentFile.file.size)}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeAttachmentFile(attachmentFile.id)}
                              className="p-1 text-brand-gray hover:text-brand-red transition-colors"
                              title="Rimuovi file"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2"
                >
                  <Wrench size={16} />
                  <span>Crea Impianto</span>
                  {attachmentFiles.length > 0 && (
                    <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                      +{attachmentFiles.length} file
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingFacility && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Modifica Impianto</h2>
            
            <form onSubmit={handleUpdate} className="space-y-4">
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
                    Intervallo Manutenzione (giorni)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maintenance_interval_days}
                    onChange={(e) => setFormData({ ...formData, maintenance_interval_days: parseInt(e.target.value) || 365 })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Ultima Manutenzione (opzionale)
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
                  Descrizione (opzionale)
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
                  Aggiorna Impianto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Facility Detail Modal */}
      {selectedFacilityForDetail && (
        <FacilityDetailModal
          facilityId={selectedFacilityForDetail}
          onClose={() => setSelectedFacilityForDetail(null)}
          onEdit={(facility) => {
            setSelectedFacilityForDetail(null);
            handleEdit(facility);
          }}
          currentUser={currentUser}
        />
      )}

      {/* Quote Request Modal */}
      {selectedFacilityForQuote && currentUser && (
        <QuoteRequestModal
          entityType="facility"
          entityId={selectedFacilityForQuote.id}
          entityName={selectedFacilityForQuote.name}
          entityDescription={selectedFacilityForQuote.description}
          farmName={selectedFacilityForQuote.farm_name}
          currentUser={currentUser}
          onClose={() => setSelectedFacilityForQuote(null)}
        />
      )}

      {filteredFacilities.length === 0 && (
        <div className="text-center py-12">
          <Wrench size={48} className="mx-auto text-brand-gray mb-4" />
          <h3 className="text-lg font-medium text-brand-blue mb-2">Nessun impianto trovato</h3>
          <p className="text-brand-gray">Prova a modificare i filtri di ricerca o crea un nuovo impianto.</p>
        </div>
      )}
    </div>
  );
};

export default FacilitiesManagement;
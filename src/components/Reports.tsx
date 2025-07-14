import React, { useState, useEffect } from 'react';
import { Plus, ClipboardList, Edit, Trash2, AlertTriangle, Clock, CheckCircle, User, Building, Package, Paperclip, Upload, File, Image, FileText, X, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AttachmentsManager from './AttachmentsManager';
import SearchFilters from './SearchFilters';

interface Option {
  value: string;
  label: string;
}

interface ReportsProps {
  initialFilters?: {
    filterStatus?: string;
    filterUrgency?: string;
  };
  currentUser?: any;
}

interface Report {
  id: string;
  title: string;
  description: string;
  farm_id: string;
  equipment_id?: string;
  supplier_id?: string;
  assigned_to: string;
  created_by: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  farm_name?: string;
  equipment_name?: string;
  supplier_name?: string;
  assigned_user_name?: string;
  created_user_name?: string;
}

interface Farm {
  id: string;
  name: string;
}

interface Equipment {
  id: string;
  name: string;
  farm_id: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
}

interface AttachmentFile {
  file: File;
  label: string;
  id: string;
}

const Reports: React.FC<ReportsProps> = ({ initialFilters = {}, currentUser }) => {
  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Aperta';
      case 'in_progress': return 'In Corso';
      case 'resolved': return 'Risolta';
      case 'closed': return 'Chiusa';
      default: return status;
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'Bassa';
      case 'medium': return 'Media';
      case 'high': return 'Alta';
      case 'critical': return 'Critica';
      default: return urgency;
    }
  };

  const [reports, setReports] = useState<Report[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, Option[]>>({
    status: initialFilters?.filterStatus ? [{ value: initialFilters.filterStatus, label: getStatusText(initialFilters.filterStatus) }] : [],
    urgency: initialFilters?.filterUrgency === 'urgent' ? [
      { value: 'high', label: 'Alta' },
      { value: 'critical', label: 'Critica' }
    ] : [],
    farm: [],
    assigned_to: []
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReportTitle, setSelectedReportTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<AttachmentFile[]>([]);

  // Prepare filter options
  const [filterOptions, setFilterOptions] = useState<Array<{ id: string; label: string; options: Option[] }>>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    farm_id: '',
    equipment_id: '',
    supplier_id: '',
    assigned_to: '',
    urgency: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Apply initial filters when component mounts
  useEffect(() => {
    if (initialFilters?.filterStatus || initialFilters?.filterUrgency) {
      // Already handled in useState initialization
    }
  }, [initialFilters]);

  const fetchData = async () => {
    try {
      // Fetch reports with joined data
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select(`
          *,
          farms(name),
          equipment(name),
          suppliers(name),
          assigned_user:users!reports_assigned_to_fkey(full_name),
          created_user:users!reports_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      // Transform data
      const transformedReports = reportsData.map(report => ({
        ...report,
        farm_name: report.farms?.name,
        equipment_name: report.equipment?.name,
        supplier_name: report.suppliers?.name,
        assigned_user_name: report.assigned_user?.full_name,
        created_user_name: report.created_user?.full_name
      }));

      setReports(transformedReports);

      // Fetch farms
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id, name');

      if (farmsError) throw farmsError;
      setFarms(farmsData);

      // Fetch equipment
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select('id, name, farm_id');

      if (equipmentError) throw equipmentError;
      setEquipment(equipmentData);

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, name');

      if (suppliersError) throw suppliersError;
      setSuppliers(suppliersData);

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('active', true);

      if (usersError) throw usersError;
      setUsers(usersData);

      // Prepare filter options
      const statusOptions: Option[] = [
        { value: 'open', label: 'Aperta' },
        { value: 'in_progress', label: 'In Corso' },
        { value: 'resolved', label: 'Risolta' },
        { value: 'closed', label: 'Chiusa' }
      ];

      const urgencyOptions: Option[] = [
        { value: 'low', label: 'Bassa' },
        { value: 'medium', label: 'Media' },
        { value: 'high', label: 'Alta' },
        { value: 'critical', label: 'Critica' }
      ];

      const farmOptions: Option[] = farmsData.map(farm => ({
        value: farm.id,
        label: farm.name
      }));

      const userOptions: Option[] = usersData.map(user => ({
        value: user.id,
        label: user.full_name
      }));

      setFilterOptions([
        {
          id: 'status',
          label: 'Stato',
          options: statusOptions
        },
        {
          id: 'urgency',
          label: 'Urgenza',
          options: urgencyOptions
        },
        {
          id: 'farm',
          label: 'Allevamento',
          options: farmOptions
        },
        {
          id: 'assigned_to',
          label: 'Assegnato a',
          options: userOptions
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

  const uploadAttachments = async (reportId: string) => {
    if (attachmentFiles.length === 0) return;

    try {
      if (!currentUser) {
        console.warn('No current user for attachments');
        return; // Non bloccare la creazione della segnalazione
      }

      for (const attachmentFile of attachmentFiles) {
        try {
          // Genera un nome file unico
          const fileExt = attachmentFile.file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `report/${reportId}/${fileName}`;

          // Try to upload file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, attachmentFile.file);

          if (uploadError) {
            console.warn(`Upload error for ${attachmentFile.file.name}:`, uploadError);
            continue; // Continua con gli altri file
          }

          // Salva i metadati nel database
          const { error: dbError } = await supabase
            .from('attachments')
            .insert({
              entity_type: 'report',
              entity_id: reportId,
              file_name: attachmentFile.file.name,
              file_path: filePath,
              custom_label: attachmentFile.label || attachmentFile.file.name,
              file_size: attachmentFile.file.size,
              mime_type: attachmentFile.file.type,
              created_by: currentUser.id
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
      // Non bloccare la creazione della segnalazione per errori di upload
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get a default user from the users table since auth is not configured
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

      const { data: newReport, error } = await supabase
        .from('reports')
        .insert({
          title: formData.title,
          description: formData.description,
          farm_id: formData.farm_id,
          equipment_id: formData.equipment_id || null,
          supplier_id: formData.supplier_id || null,
          assigned_to: formData.assigned_to,
          created_by: defaultUser.id,
          urgency: formData.urgency,
          notes: formData.notes || null
        })
        .select()
        .single();

      if (error) throw error;

      // Upload attachments if any
      if (attachmentFiles.length > 0) {
        await uploadAttachments(newReport.id);
      }

      await fetchData();
      resetForm();
    } catch (error) {
      console.error('Errore nel creare segnalazione:', error);
      alert('Errore nel creare la segnalazione');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      farm_id: '',
      equipment_id: '',
      supplier_id: '',
      assigned_to: '',
      urgency: 'medium',
      notes: ''
    });
    setAttachmentFiles([]);
    setShowCreateModal(false);
  };

  const handleEdit = (report: Report) => {
    setFormData({
      title: report.title,
      description: report.description,
      farm_id: report.farm_id,
      equipment_id: report.equipment_id || '',
      supplier_id: report.supplier_id || '',
      assigned_to: report.assigned_to,
      urgency: report.urgency,
      notes: report.notes || ''
    });
    setEditingReport(report);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingReport) return;
    
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          title: formData.title,
          description: formData.description,
          farm_id: formData.farm_id,
          equipment_id: formData.equipment_id || null,
          supplier_id: formData.supplier_id || null,
          assigned_to: formData.assigned_to,
          urgency: formData.urgency,
          notes: formData.notes || null
        })
        .eq('id', editingReport.id);

      if (error) throw error;

      await fetchData();
      resetEditForm();
    } catch (error) {
      console.error('Errore nell\'aggiornamento segnalazione:', error);
      alert('Errore nell\'aggiornamento della segnalazione');
    }
  };

  const resetEditForm = () => {
    setFormData({
      title: '',
      description: '',
      farm_id: '',
      equipment_id: '',
      supplier_id: '',
      assigned_to: '',
      urgency: 'medium',
      notes: ''
    });
    setEditingReport(null);
    setShowEditModal(false);
  };

  const handleFilterChange = (filterId: string, selected: Option[]) => {
    setSelectedFilters(prev => ({ ...prev, [filterId]: selected }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      status: [],
      urgency: [],
      farm: [],
      assigned_to: []
    });
    setSearchTerm('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-brand-red/20 text-brand-red border-brand-red/30';
      case 'in_progress': return 'bg-brand-coral/20 text-brand-coral border-brand-coral/30';
      case 'resolved': return 'bg-brand-blue/20 text-brand-blue border-brand-blue/30';
      case 'closed': return 'bg-brand-gray/20 text-brand-gray border-brand-gray/30';
      default: return 'bg-brand-gray/20 text-brand-gray border-brand-gray/30';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-brand-gray/20 text-brand-gray border-brand-gray/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle size={16} className="text-brand-red" />;
      case 'in_progress': return <Clock size={16} className="text-brand-coral" />;
      case 'resolved': return <CheckCircle size={16} className="text-brand-blue" />;
      case 'closed': return <CheckCircle size={16} className="text-brand-gray" />;
      default: return null;
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File size={16} className="text-brand-gray" />;
    
    if (mimeType.startsWith('image/')) {
      return <Image size={16} className="text-brand-blue" />;
    } else if (mimeType.includes('pdf') || mimeType.includes('document')) {
      return <FileText size={16} className="text-brand-red" />;
    } else {
      return <File size={16} className="text-brand-gray" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.farm_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedFilters.status.length === 0 || 
                          selectedFilters.status.some(option => option.value === report.status);
    
    const matchesUrgency = selectedFilters.urgency.length === 0 || 
                           selectedFilters.urgency.some(option => option.value === report.urgency);
    
    const matchesFarm = selectedFilters.farm.length === 0 || 
                        selectedFilters.farm.some(option => option.value === report.farm_id);
    
    const matchesAssignedTo = selectedFilters.assigned_to.length === 0 || 
                              selectedFilters.assigned_to.some(option => option.value === report.assigned_to);
    
    return matchesSearch && matchesStatus && matchesUrgency && matchesFarm && matchesAssignedTo;
  });

  // Filter equipment based on selected farm
  const getAvailableEquipment = () => {
    if (!formData.farm_id) return [];
    return equipment.filter(eq => eq.farm_id === formData.farm_id);
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
        <h1 className="text-2xl sm:text-3xl font-bold text-brand-blue">Segnalazioni</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-1 sm:space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Plus size={18} className="sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">Nuova</span>
          <span className="hidden sm:inline">Segnalazione</span>
        </button>
      </div>

      {/* Active Filters Indicator */}
      {(selectedFilters.status.length > 0 || selectedFilters.urgency.length > 0) && (
        <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-brand-blue">Filtri attivi:</span>
              {selectedFilters.status.length > 0 && (
                <span className="px-2 py-1 bg-brand-blue/20 text-brand-blue rounded-full text-xs">
                  Stato: {selectedFilters.status.map(s => s.label).join(', ')}
                </span>
              )}
              {selectedFilters.urgency.length > 0 && (
                <span className="px-2 py-1 bg-brand-red/20 text-brand-red rounded-full text-xs">
                  Urgenza: {selectedFilters.urgency.map(u => u.label).join(', ')}
                </span>
              )}
            </div>
            <button
              onClick={() => setSelectedFilters(prev => ({ ...prev, status: [], urgency: [] }))}
              className="text-sm text-brand-gray hover:text-brand-blue transition-colors"
            >
              Rimuovi filtri
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-brand-gray">Aperte</p>
              <p className="text-xl sm:text-2xl font-bold text-brand-red">
                {reports.filter(r => r.status === 'open').length}
              </p>
            </div>
            <AlertTriangle size={20} className="text-brand-red sm:w-6 sm:h-6" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-brand-gray">In Corso</p>
              <p className="text-xl sm:text-2xl font-bold text-brand-coral">
                {reports.filter(r => r.status === 'in_progress').length}
              </p>
            </div>
            <Clock size={20} className="text-brand-coral sm:w-6 sm:h-6" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-brand-gray">Urgenti</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">
                {reports.filter(r => r.urgency === 'high' || r.urgency === 'critical').length}
              </p>
            </div>
            <AlertTriangle size={20} className="text-orange-500 sm:w-6 sm:h-6" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-brand-gray">Totali</p>
              <p className="text-xl sm:text-2xl font-bold text-brand-blue">{reports.length}</p>
            </div>
            <ClipboardList size={20} className="text-brand-blue sm:w-6 sm:h-6" />
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
        placeholder="Cerca segnalazioni..."
      />

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.map((report) => (
          <div key={report.id} className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-4 sm:p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between space-y-4 lg:space-y-0">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                  {getStatusIcon(report.status)}
                  <h3 className="text-base sm:text-lg font-semibold text-brand-blue flex-1 min-w-0">{report.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                    {getStatusText(report.status)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(report.urgency)}`}>
                    {getUrgencyText(report.urgency)}
                  </span>
                </div>
                
                <p className="text-brand-gray mb-4 text-sm sm:text-base">{report.description}</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="font-medium text-brand-blue">Allevamento:</span>
                    <p className="text-brand-gray">{report.farm_name}</p>
                  </div>
                  {report.equipment_name && (
                    <div>
                      <span className="font-medium text-brand-blue">Attrezzatura:</span>
                      <p className="text-brand-gray">{report.equipment_name}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-brand-blue">Assegnato a:</span>
                    <p className="text-brand-gray">{report.assigned_user_name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-brand-blue">Creato da:</span>
                    <p className="text-brand-gray">{report.created_user_name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-brand-blue">Creato il:</span>
                    <p className="text-brand-gray">{new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-brand-blue">Aggiornato il:</span>
                    <p className="text-brand-gray">{new Date(report.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {report.notes && (
                  <div className="mt-3 sm:mt-4 p-3 bg-brand-blue/5 rounded-lg border border-brand-blue/10">
                    <span className="font-medium text-brand-blue">Note:</span>
                    <p className="text-brand-gray text-sm mt-1">{report.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end space-x-2 lg:ml-4">
                <button 
                  onClick={() => {
                    setSelectedReportId(report.id);
                    setSelectedReportTitle(report.title);
                  }}
                  className="p-2 text-brand-gray hover:text-brand-blue transition-colors rounded-lg hover:bg-brand-blue/10"
                  title="Gestisci allegati"
                >
                  <Paperclip size={18} />
                </button>
                <button 
                  onClick={() => handleEdit(report)}
                  className="p-2 text-brand-gray hover:text-brand-coral transition-colors rounded-lg hover:bg-brand-coral/10"
                  title="Modifica segnalazione"
                >
                  <Edit size={18} />
                </button>
                <button className="p-2 text-brand-gray hover:text-brand-blue transition-colors rounded-lg hover:bg-brand-blue/10">
                  <Eye size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Nuova Segnalazione</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Titolo Segnalazione
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                    placeholder="Es: Problema con sistema di ventilazione"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Descrizione
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                    placeholder="Descrivi dettagliatamente il problema..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Allevamento
                  </label>
                  <select
                    required
                    value={formData.farm_id}
                    onChange={(e) => setFormData({ ...formData, farm_id: e.target.value, equipment_id: '' })}
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
                    Attrezzatura (opzionale)
                  </label>
                  <select
                    value={formData.equipment_id}
                    onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                    disabled={!formData.farm_id}
                  >
                    <option value="">Seleziona attrezzatura</option>
                    {getAvailableEquipment().map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Fornitore (opzionale)
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    <option value="">Seleziona fornitore</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Assegna a
                  </label>
                  <select
                    required
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    <option value="">Seleziona utente</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Urgenza
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    <option value="low">Bassa</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="critical">Critica</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Note aggiuntive (opzionale)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                    placeholder="Note aggiuntive..."
                  />
                </div>
              </div>

              {/* Attachments Section */}
              <div className="border-t border-brand-coral/20 pt-6">
                <h3 className="text-lg font-semibold text-brand-blue mb-4">Allegati (opzionale)</h3>
                
                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 mb-4 ${
                    dragOver
                      ? 'border-brand-red bg-brand-red/5'
                      : 'border-brand-gray/30 hover:border-brand-coral'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-brand-red' : 'text-brand-gray'}`} />
                  <h4 className="text-md font-medium text-brand-blue mb-2">
                    Aggiungi allegati alla segnalazione
                  </h4>
                  <p className="text-brand-gray mb-3 text-sm">
                    Trascina i file qui o clicca per selezionare
                  </p>
                  <p className="text-xs text-brand-gray mb-3">
                    Formati supportati: immagini, PDF, documenti • Max 10MB per file
                  </p>
                  
                  <input
                    type="file"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    id="attachment-upload"
                    accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls"
                    multiple
                  />
                  <label
                    htmlFor="attachment-upload"
                    className="bg-gradient-to-r from-brand-coral to-brand-coral-light text-white px-4 py-2 rounded-lg hover:from-brand-coral-light hover:to-brand-coral transition-all duration-200 cursor-pointer inline-flex items-center space-x-2"
                  >
                    <Plus size={16} />
                    <span>Seleziona File</span>
                  </label>
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

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-brand-coral/20">
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
                  <ClipboardList size={16} />
                  <span>Crea Segnalazione</span>
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
      {showEditModal && editingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Modifica Segnalazione</h2>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Titolo Segnalazione
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Descrizione
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Allevamento
                  </label>
                  <select
                    required
                    value={formData.farm_id}
                    onChange={(e) => setFormData({ ...formData, farm_id: e.target.value, equipment_id: '' })}
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
                    Attrezzatura (opzionale)
                  </label>
                  <select
                    value={formData.equipment_id}
                    onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                    disabled={!formData.farm_id}
                  >
                    <option value="">Seleziona attrezzatura</option>
                    {getAvailableEquipment().map(eq => (
                      <option key={eq.id} value={eq.id}>{eq.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Fornitore (opzionale)
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    <option value="">Seleziona fornitore</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Assegna a
                  </label>
                  <select
                    required
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    <option value="">Seleziona utente</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Urgenza
                </label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                >
                  <option value="low">Bassa</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="critical">Critica</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Note aggiuntive (opzionale)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  Aggiorna Segnalazione
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attachments Manager */}
      {selectedReportId && (
        <AttachmentsManager
          entityType="report"
          entityId={selectedReportId}
          entityName={selectedReportTitle}
          onClose={() => {
            setSelectedReportId(null);
            setSelectedReportTitle('');
          }}
        />
      )}

      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList size={48} className="mx-auto text-brand-gray mb-4" />
          <h3 className="text-lg font-medium text-brand-blue mb-2">Nessuna segnalazione trovata</h3>
          <p className="text-brand-gray">Prova a modificare i filtri di ricerca o crea una nuova segnalazione.</p>
        </div>
      )}
    </div>
  );
};

export default Reports;
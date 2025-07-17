import React, { useState, useEffect } from 'react';
import { Plus, ClipboardList, AlertTriangle, Clock, CheckCircle, Edit, Eye, Mail, Trash2, Paperclip, Calendar, Upload, FileText, Image, Tag, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Building } from 'lucide-react';
import ReportDetailModal from './ReportDetailModal';
import QuoteRequestModal from './QuoteRequestModal';
import SearchFilters, { Option } from './SearchFilters';
import CalendarIntegration from './CalendarIntegration';

interface AttachmentFile {
  file: File;
  label: string;
  id: string;
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
  active_quotes_count?: number;
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

interface ReportsProps {
  initialFilters?: {
    filterStatus?: string;
    filterUrgency?: string;
  };
  currentUser: any;
  userFarms?: string[];
}

const Reports: React.FC<ReportsProps> = ({ initialFilters, currentUser, userFarms = [] }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, Option[]>>({
    status: [],
    urgency: [],
    farm: [],
    assigned: [],
    supplier: []
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [selectedReportForDetail, setSelectedReportForDetail] = useState<string | null>(null);
  const [selectedReportForQuote, setSelectedReportForQuote] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedReportForCalendar, setSelectedReportForCalendar] = useState<Report | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<AttachmentFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

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

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FileText size={16} className="text-gray-600" />;
    
    if (mimeType.startsWith('image/')) {
      return <Image size={16} className="text-blue-600" />;
    } else if (mimeType.includes('pdf') || mimeType.includes('document')) {
      return <FileText size={16} className="text-red-600" />;
    } else {
      return <FileText size={16} className="text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Apply initial filters when component mounts
  useEffect(() => {
    if (initialFilters) {
      const newFilters: Record<string, Option[]> = { ...selectedFilters };
      
      if (initialFilters.filterStatus) {
        newFilters.status = [{ value: initialFilters.filterStatus, label: getStatusText(initialFilters.filterStatus) }];
      }
      
      if (initialFilters.filterUrgency === 'urgent') {
        newFilters.urgency = [
          { value: 'high', label: 'Alta' },
          { value: 'critical', label: 'Critica' }
        ];
      }
      
      setSelectedFilters(newFilters);
    }
  }, [initialFilters]);

  const fetchData = async () => {
    try {
      // Fetch reports with joined data and active quotes count
      let query = supabase
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
        
      // Filter by user farms if user is a technician
      if (currentUser.role === 'technician' && userFarms.length > 0) {
        query = query.in('farm_id', userFarms);
      }

      const { data: reportsData, error: reportsError } = await query;

      if (reportsError) throw reportsError;

      // Get active quotes count for each report
      const reportsWithQuotes = await Promise.all(
        reportsData.map(async (report) => {
          const { data: quotes, error: quotesError } = await supabase
            .from('quotes')
            .select('id')
            .eq('report_id', report.id)
            .in('status', ['requested', 'received']);

          if (quotesError) {
            console.error('Error fetching quotes for report:', quotesError);
          }

          return {
            ...report,
            farm_name: report.farms?.name,
            equipment_name: report.equipment?.name,
            supplier_name: report.suppliers?.name,
            assigned_user_name: report.assigned_user?.full_name,
            created_user_name: report.created_user?.full_name,
            active_quotes_count: quotes?.length || 0
          };
        })
      );

      setReports(reportsWithQuotes);

      // Fetch farms
      let farmsQuery = supabase
        .from('farms')
        .select('id, name');
        
      // Filter farms by user's assigned farms if they're a technician
      if (currentUser.role === 'technician' && userFarms.length > 0) {
        farmsQuery = farmsQuery.in('id', userFarms);
      }
      
      const { data: farmsData, error: farmsError } = await farmsQuery;

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

      const supplierOptions: Option[] = suppliersData.map(supplier => ({
        value: supplier.id,
        label: supplier.name
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
          id: 'assigned',
          label: 'Assegnato a',
          options: userOptions
        },
        {
          id: 'supplier',
          label: 'Fornitore',
          options: supplierOptions
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
      const { data: newReport, error } = await supabase
        .from('reports')
        .insert({
          title: formData.title,
          description: formData.description,
          farm_id: formData.farm_id,
          equipment_id: formData.equipment_id || null,
          supplier_id: formData.supplier_id || null,
          assigned_to: formData.assigned_to,
          urgency: formData.urgency,
          notes: formData.notes || null,
          created_by: currentUser.id
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

  const handleDelete = async (reportId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa segnalazione? Questa azione non può essere annullata.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Errore nell\'eliminazione segnalazione:', error);
      alert('Errore nell\'eliminazione della segnalazione');
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Errore nell\'aggiornamento stato segnalazione:', error);
      alert('Errore nell\'aggiornamento dello stato');
    }
  };

  const handleFilterChange = (filterId: string, selected: Option[]) => {
    setSelectedFilters(prev => ({ ...prev, [filterId]: selected }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      status: [],
      urgency: [],
      farm: [],
      assigned: [],
      supplier: []
    });
    setSearchTerm('');
  };

  const createReportEvent = (report: Report) => {
    const eventTitle = `Segnalazione: ${report.title}`;
    const eventDescription = `
      Segnalazione da gestire: ${report.title}
      
      Descrizione: ${report.description}
      Allevamento: ${report.farm_name}
      ${report.equipment_name ? `Attrezzatura: ${report.equipment_name}` : ''}
      Urgenza: ${getUrgencyText(report.urgency)}
      Assegnato a: ${report.assigned_user_name}
      
      Generato automaticamente da AllevApp
    `;
    const eventLocation = report.farm_name;
    
    setSelectedReportForCalendar({
      ...report,
      eventTitle,
      eventDescription,
      eventLocation
    } as any);
    setShowCalendarModal(true);
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
    
    const matchesAssigned = selectedFilters.assigned.length === 0 || 
                            selectedFilters.assigned.some(option => option.value === report.assigned_to);
    
    const matchesSupplier = selectedFilters.supplier.length === 0 || 
                           (report.supplier_id && selectedFilters.supplier.some(option => option.value === report.supplier_id));
    
    return matchesSearch && matchesStatus && matchesUrgency && matchesFarm && matchesAssigned && matchesSupplier;
  });

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
        <h1 className="text-3xl font-bold text-brand-blue">Segnalazioni</h1>
        <button
           onClick={() => setShowCreateModal(true)}
           className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-3 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
         >
           <Plus size={20} />
           <span>Nuova Segnalazione</span>
         </button>
      </div>

      {/* Status Filter Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => {
            setSelectedFilters({
              ...selectedFilters,
              status: [{ value: 'open', label: 'Aperta' }]
            });
          }}
          className="flex items-center space-x-2 px-4 py-3 bg-white rounded-lg shadow-md border border-brand-coral/20 hover:shadow-lg transition-all duration-200"
        >
          <AlertTriangle size={20} className="text-brand-red" />
          <div>
            <p className="font-medium text-brand-blue">Aperte</p>
            <p className="text-xl font-bold text-brand-red">
              {reports.filter(r => r.status === 'open').length}
            </p>
          </div>
        </button>
        
        <button
          onClick={() => {
            setSelectedFilters({
              ...selectedFilters,
              status: [{ value: 'in_progress', label: 'In Corso' }]
            });
          }}
          className="flex items-center space-x-2 px-4 py-3 bg-white rounded-lg shadow-md border border-brand-coral/20 hover:shadow-lg transition-all duration-200"
        >
          <Clock size={20} className="text-brand-coral" />
          <div>
            <p className="font-medium text-brand-blue">In Corso</p>
            <p className="text-xl font-bold text-brand-coral">
              {reports.filter(r => r.status === 'in_progress').length}
            </p>
          </div>
        </button>
        
        <button
          onClick={() => {
            setSelectedFilters({
              ...selectedFilters,
              urgency: [
                { value: 'high', label: 'Alta' },
                { value: 'critical', label: 'Critica' }
              ]
            });
          }}
          className="flex items-center space-x-2 px-4 py-3 bg-white rounded-lg shadow-md border border-brand-coral/20 hover:shadow-lg transition-all duration-200"
        >
          <AlertTriangle size={20} className="text-orange-500" />
          <div>
            <p className="font-medium text-brand-blue">Urgenti</p>
            <p className="text-xl font-bold text-orange-600">
              {reports.filter(r => r.urgency === 'high' || r.urgency === 'critical').length}
            </p>
          </div>
        </button>
        
        <button
          onClick={() => {
            setSelectedFilters({
              ...selectedFilters,
              status: [{ value: 'resolved', label: 'Risolta' }]
            });
          }}
          className="flex items-center space-x-2 px-4 py-3 bg-white rounded-lg shadow-md border border-brand-coral/20 hover:shadow-lg transition-all duration-200"
        >
          <CheckCircle size={20} className="text-brand-blue" />
          <div>
            <p className="font-medium text-brand-blue">Risolte</p>
            <p className="text-xl font-bold text-brand-blue">
              {reports.filter(r => r.status === 'resolved').length}
            </p>
          </div>
        </button>
        
        <button
          onClick={() => {
            setSelectedFilters({
              ...selectedFilters,
              status: [{ value: 'closed', label: 'Chiusa' }]
            });
          }}
          className="flex items-center space-x-2 px-4 py-3 bg-white rounded-lg shadow-md border border-brand-coral/20 hover:shadow-lg transition-all duration-200"
        >
          <CheckCircle size={20} className="text-brand-gray" />
          <div>
            <p className="font-medium text-brand-blue">Chiuse</p>
            <p className="text-xl font-bold text-brand-gray">
              {reports.filter(r => r.status === 'closed').length}
            </p>
          </div>
        </button>
        
        <button
          onClick={clearAllFilters}
          className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-brand-blue/10 to-brand-coral/10 rounded-lg shadow-md border border-brand-coral/20 hover:shadow-lg transition-all duration-200 ml-auto"
        >
          <div>
            <p className="font-medium text-brand-blue">Tutte</p>
            <p className="text-xl font-bold text-brand-blue">
              {reports.length}
            </p>
          </div>
        </button>
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
          <div key={report.id} className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  {getStatusIcon(report.status)}
                  <h3 className="text-lg font-semibold text-brand-blue">{report.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                    {getStatusText(report.status)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(report.urgency)}`}>
                    {getUrgencyText(report.urgency)}
                  </span>
                </div>
                
                <p className="text-brand-gray mb-4">{report.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-brand-blue">Allevamento:</span>
                    <p className="text-brand-gray">{report.farm_name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-brand-blue">Attrezzatura:</span>
                    <p className="text-brand-gray">{report.equipment_name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-brand-blue">Assegnato a:</span>
                    <p className="text-brand-gray">{report.assigned_user_name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-brand-blue">Creato da:</span>
                    <p className="text-brand-gray">{report.created_user_name}</p>
                  </div>
                </div>

                {report.notes && (
                  <div className="mt-4 p-3 bg-brand-blue/5 rounded-lg border border-brand-blue/10">
                    <span className="font-medium text-brand-blue">Note:</span>
                    <p className="text-brand-gray text-sm mt-1">{report.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => setSelectedReportForDetail(report.id)}
                  className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
                  title="Visualizza dettagli"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => setSelectedReportForDetail(report.id)}
                  className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
                  title="Gestisci allegati"
                >
                  <Paperclip size={18} />
                </button>
                <button
                  onClick={() => setSelectedReportForQuote(report)}
                  className="p-2 text-brand-gray hover:text-brand-coral transition-colors relative"
                  title="Richiedi preventivo"
                >
                  <Mail size={18} />
                  {report.active_quotes_count! > 0 && (
                    <span className="absolute -top-1 -right-1 bg-brand-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {report.active_quotes_count}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => createReportEvent(report)}
                  className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
                  title="Aggiungi a calendario"
                >
                  <Calendar size={18} />
                </button>
                <button 
                  onClick={() => handleEdit(report)}
                  className="p-2 text-brand-gray hover:text-brand-coral transition-colors"
                  title="Modifica segnalazione"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDelete(report.id)}
                  className="p-2 text-brand-gray hover:text-brand-red transition-colors"
                  title="Elimina segnalazione"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Status Change Buttons */}
            <div className="mt-4 flex items-center space-x-2">
              <span className="text-xs font-medium text-brand-blue">Cambia stato:</span>
              <div className="flex space-x-1">
                {report.status !== 'in_progress' && (
                  <button
                    onClick={() => updateReportStatus(report.id, 'in_progress')}
                    className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200 transition-colors"
                  >
                    In Corso
                  </button>
                )}
                {report.status !== 'resolved' && (
                  <button
                    onClick={() => updateReportStatus(report.id, 'resolved')}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                  >
                    Risolvi
                  </button>
                )}
                {report.status !== 'closed' && (
                  <button
                    onClick={() => updateReportStatus(report.id, 'closed')}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
                  >
                    Chiudi
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Nuova Segnalazione</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Titolo
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
                  Note (opzionale)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              {/* Attachments Section */}
              <div className="border-t border-brand-coral/20 pt-6">
                <h3 className="text-lg font-semibold text-brand-blue mb-4">Allegati (opzionale)</h3>
                
                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 mb-4 ${
                    dragOver
                      ? 'border-brand-blue bg-brand-blue/5'
                      : 'border-gray-300 hover:border-brand-blue'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-brand-blue' : 'text-gray-400'}`} />
                  <h4 className="text-md font-medium text-gray-900 mb-2">
                    Aggiungi allegati alla segnalazione
                  </h4>
                  <p className="text-gray-600 mb-3 text-sm">
                    Trascina i file qui o clicca per selezionare
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Formati supportati: immagini, PDF, documenti • Max 10MB per file
                  </p>
                  
                  <input
                    type="file"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    id="report-attachment-upload"
                    accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls"
                    multiple
                  />
                  <label
                    htmlFor="report-attachment-upload"
                    className="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-brand-blue-dark transition-all duration-200 cursor-pointer inline-flex items-center space-x-2"
                  >
                    <Plus size={16} />
                    <span>Seleziona File</span>
                  </label>
                </div>

                {/* Selected Files List */}
                {attachmentFiles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">
                      File selezionati ({attachmentFiles.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {attachmentFiles.map((attachmentFile) => (
                        <div
                          key={attachmentFile.id}
                          className="bg-gray-50 rounded-lg border border-gray-200 p-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className="p-2 bg-white rounded-lg shadow-sm">
                                {getFileIcon(attachmentFile.file.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-2">
                                  <Tag size={12} className="text-brand-blue" />
                                  <input
                                    type="text"
                                    value={attachmentFile.label}
                                    onChange={(e) => updateAttachmentLabel(attachmentFile.id, e.target.value)}
                                    className="text-sm font-medium text-gray-900 bg-transparent border-none outline-none flex-1"
                                    placeholder="Etichetta file..."
                                  />
                                </div>
                                <p className="text-xs text-gray-600 truncate">
                                  {attachmentFile.file.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(attachmentFile.file.size)}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeAttachmentFile(attachmentFile.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
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
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200"
                >
                  <span>Crea Segnalazione</span>
                  {attachmentFiles.length > 0 && (
                    <span className="bg-white/20 px-2 py-1 rounded-full text-xs ml-2">
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
                  Titolo
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
                  Note (opzionale)
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

      {/* Report Detail Modal */}
      {selectedReportForDetail && (
        <ReportDetailModal
          reportId={selectedReportForDetail}
          currentUser={currentUser}
          onClose={() => setSelectedReportForDetail(null)}
          onEdit={(report) => {
            setSelectedReportForDetail(null);
            handleEdit(report);
          }}
        />
      )}

      {/* Quote Request Modal */}
      {selectedReportForQuote && (
        <QuoteRequestModal
          entityType="report"
          entityId={selectedReportForQuote.id}
          entityName={selectedReportForQuote.title}
          entityDescription={selectedReportForQuote.description}
          farmName={selectedReportForQuote.farm_name}
          currentUser={currentUser}
          onClose={() => {
            setSelectedReportForQuote(null);
            fetchData(); // Refresh to update active quotes count
          }}
        />
      )}

      {/* Calendar Integration Modal */}
      {showCalendarModal && (
        <CalendarIntegration
          onClose={() => {
            setShowCalendarModal(false);
            setSelectedReportForCalendar(null);
          }}
          defaultTitle={selectedReportForCalendar?.eventTitle || ''}
          defaultDescription={selectedReportForCalendar?.eventDescription || ''}
          defaultLocation={selectedReportForCalendar?.eventLocation || ''}
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
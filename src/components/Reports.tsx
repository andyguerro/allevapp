import React, { useState, useEffect } from 'react';
import { Plus, ClipboardList, Edit, Eye, AlertTriangle, Clock, CheckCircle, Send, Paperclip, Mail, Upload, File, Image, FileText, X, Tag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReportDetails from './ReportDetails';
import SearchFilters, { Option } from './SearchFilters';

interface ReportsProps {
  initialFilters?: {
    filterStatus?: string;
    filterUrgency?: string;
  };
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
}

interface User {
  id: string;
  full_name: string;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
}

const Reports: React.FC<ReportsProps> = ({ initialFilters = {} }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, Option[]>>({
    status: initialFilters?.filterStatus ? [{ value: initialFilters.filterStatus, label: getStatusText(initialFilters.filterStatus) }] : [],
    urgency: initialFilters?.filterUrgency ? [{ value: initialFilters.filterUrgency, label: getUrgencyText(initialFilters.filterUrgency) }] : [],
    farm: [],
    equipment: [],
    supplier: [],
    assigned_to: []
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReportTitle, setSelectedReportTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedReportForQuote, setSelectedReportForQuote] = useState<Report | null>(null);

  // Attachment states for new report
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileLabels, setFileLabels] = useState<Record<string, string>>({});
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

  const [quoteFormData, setQuoteFormData] = useState({
    suppliers: [] as string[],
    title: '',
    description: '',
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

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
        .select('id, name');

      if (equipmentError) throw equipmentError;
      setEquipment(equipmentData);

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('active', true);

      if (usersError) throw usersError;
      setUsers(usersData);

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, name, email');

      if (suppliersError) throw suppliersError;
      setSuppliers(suppliersData);

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

      const equipmentOptions: Option[] = equipmentData.map(eq => ({
        value: eq.id,
        label: eq.name
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
          id: 'equipment',
          label: 'Attrezzatura',
          options: equipmentOptions
        },
        {
          id: 'supplier',
          label: 'Fornitore',
          options: supplierOptions
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      let createdBy = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Default fallback
      if (user) {
        createdBy = user.id;
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
          created_by: createdBy,
          urgency: formData.urgency,
          notes: formData.notes || null
        });

      if (error) throw error;

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
        .eq('id', editingReport.id)
        .select()
        .single();

      if (error) throw error;

      // Upload attachments if any
      if (newReport && selectedFiles.length > 0) {
        await uploadAttachments(newReport.id);
      }

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
    setSelectedFiles([]);
    setFileLabels({});
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

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('id', reportId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Errore nell\'aggiornamento stato:', error);
      alert('Errore nell\'aggiornamento dello stato');
    }
  };

  const handleCreateQuoteRequests = (report: Report) => {
    setSelectedReportForQuote(report);
    setQuoteFormData({
      suppliers: [],
      title: `Preventivo per: ${report.title}`,
      description: report.description,
      due_date: '',
      notes: ''
    });
    setShowQuoteModal(true);
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReportForQuote || quoteFormData.suppliers.length === 0) {
      alert('Seleziona almeno un fornitore');
      return;
    }

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      let createdBy = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Default fallback
      if (user) {
        createdBy = user.id;
      }

      // Create quotes for each selected supplier
      const quotePromises = quoteFormData.suppliers.map(supplierId => 
        supabase
          .from('quotes')
          .insert({
            report_id: selectedReportForQuote.id,
            supplier_id: supplierId,
            farm_id: selectedReportForQuote.farm_id,
            title: quoteFormData.title,
            description: quoteFormData.description,
            due_date: quoteFormData.due_date || null,
            notes: quoteFormData.notes || null,
            created_by: createdBy
          })
      );

      const results = await Promise.all(quotePromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`Errore nella creazione di ${errors.length} preventivi`);
      }

      // Send emails to suppliers
      const emailPromises = quoteFormData.suppliers.map(async (supplierId) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (!supplier) return;

        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: supplier.email,
              supplierName: supplier.name,
              quoteTitle: quoteFormData.title,
              quoteDescription: quoteFormData.description,
              farmName: selectedReportForQuote.farm_name,
              dueDate: quoteFormData.due_date,
              contactInfo: {
                companyName: 'AllevApp',
                email: 'info@allevapp.com',
                phone: '+39 02 123456789'
              }
            }),
          });

          if (!response.ok) {
            console.error(`Errore nell'invio email a ${supplier.name}`);
          }
        } catch (error) {
          console.error(`Errore nell'invio email a ${supplier.name}:`, error);
        }
      });

      await Promise.all(emailPromises);

      alert(`${quoteFormData.suppliers.length} preventivi creati e inviati con successo!`);
      resetQuoteForm();
      await fetchData();
    } catch (error) {
      console.error('Errore nella creazione preventivi:', error);
      alert('Errore nella creazione dei preventivi');
    }
  };

  const resetQuoteForm = () => {
    setQuoteFormData({
      suppliers: [],
      title: '',
      description: '',
      due_date: '',
      notes: ''
    });
    setSelectedReportForQuote(null);
    setShowQuoteModal(false);
  };

  const handleFilterChange = (filterId: string, selected: Option[]) => {
    setSelectedFilters(prev => ({ ...prev, [filterId]: selected }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      status: [],
      urgency: [],
      farm: [],
      equipment: [],
      supplier: [],
      assigned_to: []
    });
    setSearchTerm('');
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-brand-red/20 text-brand-red border-brand-red/30';
      case 'medium': return 'bg-brand-coral/20 text-brand-coral border-brand-coral/30';
      case 'low': return 'bg-brand-blue/20 text-brand-blue border-brand-blue/30';
      case 'critical': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-brand-gray/20 text-brand-gray border-brand-gray/30';
    }
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
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Bassa';
      case 'critical': return 'Critica';
      default: return urgency;
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.farm_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedFilters.status.length === 0 || 
                          selectedFilters.status.some(option => option.value === report.status);
    
    const matchesUrgency = selectedFilters.urgency.length === 0 || 
                           selectedFilters.urgency.some(option => option.value === report.urgency);
    
    const matchesFarm = selectedFilters.farm.length === 0 || 
                        selectedFilters.farm.some(option => option.value === report.farm_id);
    
    const matchesEquipment = selectedFilters.equipment.length === 0 || 
                             (report.equipment_id && selectedFilters.equipment.some(option => option.value === report.equipment_id));
    
    const matchesSupplier = selectedFilters.supplier.length === 0 || 
                            (report.supplier_id && selectedFilters.supplier.some(option => option.value === report.supplier_id));
    
    const matchesAssignedTo = selectedFilters.assigned_to.length === 0 || 
                              selectedFilters.assigned_to.some(option => option.value === report.assigned_to);
    
    return matchesSearch && matchesStatus && matchesUrgency && matchesFarm && matchesEquipment && matchesSupplier && matchesAssignedTo;
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
        <h1 className="text-3xl font-bold text-brand-blue">Segnalazioni</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-3 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Plus size={20} />
          <span>Nuova Segnalazione</span>
        </button>
      </div>

      {/* Active Filters Indicator */}
      {(selectedFilters.status.length > 0 || selectedFilters.urgency.length > 0) && (
        <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-wrap">
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
              onClick={clearAllFilters}
              className="text-sm text-brand-gray hover:text-brand-blue transition-colors"
            >
              Rimuovi tutti i filtri
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Aperte</p>
              <p className="text-2xl font-bold text-brand-red">
                {reports.filter(r => r.status === 'open').length}
              </p>
            </div>
            <AlertTriangle size={24} className="text-brand-red" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">In Corso</p>
              <p className="text-2xl font-bold text-brand-coral">
                {reports.filter(r => r.status === 'in_progress').length}
              </p>
            </div>
            <Clock size={24} className="text-brand-coral" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Urgenti</p>
              <p className="text-2xl font-bold text-purple-600">
                {reports.filter(r => r.urgency === 'high' || r.urgency === 'critical').length}
              </p>
            </div>
            <AlertTriangle size={24} className="text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Totali</p>
              <p className="text-2xl font-bold text-brand-blue">{reports.length}</p>
            </div>
            <ClipboardList size={24} className="text-brand-blue" />
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
          <div key={report.id} className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  {getStatusIcon(report.status)}
                  <h3 className="text-lg font-semibold text-brand-blue">{report.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(report.urgency)}`}>
                    {getUrgencyText(report.urgency)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
                    {getStatusText(report.status)}
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
                    <span className="font-medium text-brand-blue">Fornitore:</span>
                    <p className="text-brand-gray">{report.supplier_name || 'N/A'}</p>
                  </div>
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
                  <div className="mt-4 p-3 bg-brand-blue/5 rounded-lg border border-brand-blue/10">
                    <span className="font-medium text-brand-blue">Note:</span>
                    <p className="text-brand-gray text-sm mt-1">{report.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <button 
                  onClick={() => {
                    setSelectedReportId(report.id);
                    setSelectedReportTitle(report.title);
                  }}
                  className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
                  title="Gestisci allegati"
                >
                  <Paperclip size={18} />
                </button>
                <button 
                  onClick={() => handleEdit(report)}
                  className="p-2 text-brand-gray hover:text-brand-coral transition-colors"
                  title="Modifica segnalazione"
                >
                  <Edit size={18} />
                </button>
                <button className="p-2 text-brand-gray hover:text-brand-blue transition-colors">
                  <Eye size={18} />
                </button>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-4 flex items-center justify-between pt-4 border-t border-brand-coral/20">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-brand-blue">Azioni:</span>
                <div className="flex space-x-1">
                  {report.status !== 'in_progress' && report.status !== 'closed' && report.status !== 'resolved' && (
                    <button
                      onClick={() => handleStatusChange(report.id, 'in_progress')}
                      className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200 transition-colors"
                    >
                      In Corso
                    </button>
                  )}
                  {report.status !== 'resolved' && report.status !== 'closed' && (
                    <button
                      onClick={() => handleStatusChange(report.id, 'resolved')}
                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                    >
                      Risolvi
                    </button>
                  )}
                  {report.status !== 'closed' && (
                    <button
                      onClick={() => handleStatusChange(report.id, 'closed')}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
                    >
                      Chiudi
                    </button>
                  )}
                  {(report.status === 'closed' || report.status === 'resolved') && (
                    <button
                      onClick={() => handleStatusChange(report.id, 'open')}
                      className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                    >
                      Riapri
                    </button>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => handleCreateQuoteRequests(report)}
                className="px-3 py-1 bg-brand-red/10 text-brand-red rounded-lg text-xs hover:bg-brand-red/20 transition-colors flex items-center space-x-1"
              >
                <Send size={12} />
                <span>Richiedi Preventivi</span>
              </button>
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
                    Attrezzatura (opzionale)
                  </label>
                  <select
                    value={formData.equipment_id}
                    onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    <option value="">Seleziona attrezzatura</option>
                    {equipment.map(eq => (
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  onClick={resetForm}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200"
                >
                  Crea Segnalazione
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
                    Attrezzatura (opzionale)
                  </label>
                  <select
                    value={formData.equipment_id}
                    onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    <option value="">Seleziona attrezzatura</option>
                    {equipment.map(eq => (
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Quote Request Modal */}
      {showQuoteModal && selectedReportForQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Richiedi Preventivi</h2>
            
            <div className="mb-4 p-4 bg-brand-blue/5 rounded-lg border border-brand-blue/10">
              <h3 className="font-medium text-brand-blue">Segnalazione: {selectedReportForQuote.title}</h3>
              <p className="text-sm text-brand-gray mt-1">{selectedReportForQuote.description}</p>
            </div>
            
            <form onSubmit={handleQuoteSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Fornitori (seleziona uno o più)
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-brand-gray/30 rounded-lg p-3">
                  {suppliers.map(supplier => (
                    <label key={supplier.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={quoteFormData.suppliers.includes(supplier.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setQuoteFormData({
                              ...quoteFormData,
                              suppliers: [...quoteFormData.suppliers, supplier.id]
                            });
                          } else {
                            setQuoteFormData({
                              ...quoteFormData,
                              suppliers: quoteFormData.suppliers.filter(id => id !== supplier.id)
                            });
                          }
                        }}
                        className="h-4 w-4 text-brand-red focus:ring-brand-red border-brand-gray/30 rounded"
                      />
                      <span className="text-sm">{supplier.name} ({supplier.email})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Titolo Preventivo
                </label>
                <input
                  type="text"
                  required
                  value={quoteFormData.title}
                  onChange={(e) => setQuoteFormData({ ...quoteFormData, title: e.target.value })}
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
                  value={quoteFormData.description}
                  onChange={(e) => setQuoteFormData({ ...quoteFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Scadenza (opzionale)
                  </label>
                  <input
                    type="date"
                    value={quoteFormData.due_date}
                    onChange={(e) => setQuoteFormData({ ...quoteFormData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Note aggiuntive (opzionale)
                </label>
                <textarea
                  rows={2}
                  value={quoteFormData.notes}
                  onChange={(e) => setQuoteFormData({ ...quoteFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetQuoteForm}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2"
                >
                  <Mail size={16} />
                  <span>Invia Richieste ({quoteFormData.suppliers.length})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {selectedReportId && (
        <ReportDetails
          reportId={selectedReportId}
          reportTitle={selectedReportTitle}
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
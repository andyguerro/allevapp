import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, AlertTriangle, Clock, CheckCircle, FileText, User, Paperclip, Eye, Edit, X, Send, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReportDetails from './ReportDetails';

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
}

interface Farm {
  id: string;
  name: string;
}

interface Equipment {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
  active: boolean;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
}

interface QuoteRequest {
  id: string;
  report_id: string;
  supplier_id: string;
  title: string;
  description: string;
  status: 'requested' | 'received' | 'accepted' | 'rejected';
  supplier_name?: string;
  amount?: number;
  created_at: string;
}

const Reports: React.FC<ReportsProps> = ({ initialFilters = {} }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState(initialFilters.filterStatus || 'all');
  const [filterUrgency, setFilterUrgency] = useState(
    initialFilters.filterUrgency === 'urgent' ? 'urgent' : 'all'
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedReportForQuote, setSelectedReportForQuote] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    farm_id: '',
    equipment_id: '',
    assigned_to: '',
    urgency: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    notes: ''
  });

  const [quoteFormData, setQuoteFormData] = useState({
    selectedSuppliers: [] as string[],
    customTitle: '',
    customDescription: '',
    dueDate: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Apply initial filters when component mounts
  useEffect(() => {
    if (initialFilters.filterStatus) {
      setFilterStatus(initialFilters.filterStatus);
    }
    if (initialFilters.filterUrgency === 'urgent') {
      setFilterUrgency('urgent');
    }
  }, [initialFilters]);

  const fetchData = async () => {
    try {
      // Fetch reports with joined data
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select(`
          *,
          farms!reports_farm_id_fkey(name),
          equipment(name)
        `)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      // Transform data
      const transformedReports = reportsData.map(report => ({
        ...report,
        farm_name: report.farms?.name,
        equipment_name: report.equipment?.name
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

      // Fetch users for assignment
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, role, active')
        .eq('active', true);

      if (usersError) throw usersError;
      setUsers(usersData);

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, name, email');

      if (suppliersError) throw suppliersError;
      setSuppliers(suppliersData);

      // Fetch quote requests
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          id, report_id, supplier_id, title, description, status, amount, created_at,
          suppliers(name)
        `)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;

      const transformedQuotes = quotesData.map(quote => ({
        ...quote,
        supplier_name: quote.suppliers?.name
      }));

      setQuoteRequests(transformedQuotes);

    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.assigned_to) {
      alert('Seleziona un utente a cui assegnare la segnalazione');
      return;
    }

    // Usa il primo utente admin come created_by di default
    const defaultUser = users.find(u => u.role === 'admin') || users[0];
    if (!defaultUser) {
      alert('Nessun utente disponibile nel sistema');
      return;
    }

    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          title: formData.title,
          description: formData.description,
          farm_id: formData.farm_id,
          equipment_id: formData.equipment_id || null,
          assigned_to: formData.assigned_to,
          created_by: defaultUser.id,
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

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      farm_id: '',
      equipment_id: '',
      assigned_to: '',
      urgency: 'medium',
      notes: ''
    });
    setShowCreateModal(false);
  };

  const handleCreateQuoteRequests = (report: Report) => {
    setSelectedReportForQuote(report);
    setQuoteFormData({
      selectedSuppliers: [],
      customTitle: `Preventivo per: ${report.title}`,
      customDescription: `Richiesta preventivo per la segnalazione: ${report.description}`,
      dueDate: ''
    });
    setShowQuoteModal(true);
  };

  const handleSubmitQuoteRequests = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReportForQuote || quoteFormData.selectedSuppliers.length === 0) {
      alert('Seleziona almeno un fornitore');
      return;
    }

    try {
      // Create quote requests in database
      const quotePromises = quoteFormData.selectedSuppliers.map(supplierId => 
        supabase.from('quotes').insert({
          report_id: selectedReportForQuote.id,
          supplier_id: supplierId,
          farm_id: selectedReportForQuote.farm_id,
          title: quoteFormData.customTitle,
          description: quoteFormData.customDescription,
          due_date: quoteFormData.dueDate || null,
          status: 'requested',
          created_by: users.find(u => u.role === 'admin')?.id || users[0]?.id
        })
      );

      const results = await Promise.all(quotePromises);
      
      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error('Errore nella creazione di alcuni preventivi');
      }

      // Send emails to suppliers
      const emailPromises = quoteFormData.selectedSuppliers.map(async (supplierId) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (!supplier) return;

        const farmName = farms.find(f => f.id === selectedReportForQuote.farm_id)?.name || 'N/A';
        
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
              quoteTitle: quoteFormData.customTitle,
              quoteDescription: quoteFormData.customDescription,
              farmName: farmName,
              dueDate: quoteFormData.dueDate,
              contactInfo: {
                companyName: 'AllevApp', // Puoi configurare questo valore
                email: 'info@allevapp.com', // Email di risposta
                phone: '+39 02 123456789' // Telefono opzionale
              }
            }),
          });

          const result = await response.json();
          if (!result.success) {
            console.error(`Errore invio email a ${supplier.name}:`, result.error);
          }
        } catch (emailError) {
          console.error(`Errore invio email a ${supplier.name}:`, emailError);
        }
      });

      // Wait for all emails to be sent (non-blocking)
      Promise.all(emailPromises).then(() => {
        console.log('Invio email completato');
      }).catch((error) => {
        console.error('Errore nell\'invio di alcune email:', error);
      });

      await fetchData();
      setShowQuoteModal(false);
      setSelectedReportForQuote(null);
      alert(`${quoteFormData.selectedSuppliers.length} richieste di preventivo create e inviate via email con successo!`);
    } catch (error) {
      console.error('Errore nella creazione preventivi:', error);
      alert('Errore nella creazione delle richieste di preventivo');
    }
  };

  const handleEditReport = (report: Report) => {
    setFormData({
      title: report.title,
      description: report.description,
      farm_id: report.farm_id,
      equipment_id: report.equipment_id || '',
      assigned_to: report.assigned_to,
      urgency: report.urgency,
      notes: report.notes || ''
    });
    setSelectedReport(report);
    setShowEditModal(true);
  };

  const handleUpdateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReport) return;
    
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          title: formData.title,
          description: formData.description,
          farm_id: formData.farm_id,
          equipment_id: formData.equipment_id || null,
          assigned_to: formData.assigned_to,
          urgency: formData.urgency,
          notes: formData.notes || null
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      await fetchData();
      setShowEditModal(false);
      setSelectedReport(null);
      resetForm();
    } catch (error) {
      console.error('Errore nell\'aggiornamento segnalazione:', error);
      alert('Errore nell\'aggiornamento della segnalazione');
    }
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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'critical': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle size={16} className="text-red-500" />;
      case 'in_progress': return <Clock size={16} className="text-yellow-500" />;
      case 'resolved': return <CheckCircle size={16} className="text-green-500" />;
      case 'closed': return <CheckCircle size={16} className="text-gray-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const getQuoteStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'received': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getQuoteStatusText = (status: string) => {
    switch (status) {
      case 'requested': return 'In Corso';
      case 'received': return 'Ricevuto';
      case 'accepted': return 'Confermato';
      case 'rejected': return 'KO';
      default: return status;
    }
  };

  const getReportQuotes = (reportId: string) => {
    return quoteRequests.filter(quote => quote.report_id === reportId);
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    const matchesUrgency = filterUrgency === 'all' || 
                          (filterUrgency === 'urgent' && (report.urgency === 'high' || report.urgency === 'critical'));
    return matchesSearch && matchesStatus && matchesUrgency;
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
      {(filterStatus !== 'all' || filterUrgency !== 'all') && (
        <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-brand-blue">Filtri attivi:</span>
              {filterStatus !== 'all' && (
                <span className="px-2 py-1 bg-brand-blue/20 text-brand-blue rounded-full text-xs">
                  Stato: {filterStatus === 'open' ? 'Aperte' : filterStatus}
                </span>
              )}
              {filterUrgency === 'urgent' && (
                <span className="px-2 py-1 bg-brand-red/20 text-brand-red rounded-full text-xs">
                  Solo urgenti
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setFilterStatus('all');
                setFilterUrgency('all');
              }}
              className="text-sm text-brand-gray hover:text-brand-blue transition-colors"
            >
              Rimuovi filtri
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
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
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
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
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Risolte</p>
              <p className="text-2xl font-bold text-brand-blue">
                {reports.filter(r => r.status === 'resolved').length}
              </p>
            </div>
            <CheckCircle size={24} className="text-brand-blue" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Totali</p>
              <p className="text-2xl font-bold text-brand-blue">{reports.length}</p>
            </div>
            <FileText size={24} className="text-brand-blue" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-brand-gray" size={18} />
              <input
                type="text"
                placeholder="Cerca segnalazioni..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Filter size={18} className="text-brand-gray" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-colors"
            >
              <option value="all">Tutte</option>
              <option value="open">Aperte</option>
              <option value="in_progress">In Corso</option>
              <option value="resolved">Risolte</option>
              <option value="closed">Chiuse</option>
            </select>
            <select
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-colors"
            >
              <option value="all">Tutte le urgenze</option>
              <option value="urgent">Solo urgenti</option>
            </select>
          </div>
        </div>
      </div>

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
                    {report.urgency === 'high' ? 'Alta' : 
                     report.urgency === 'medium' ? 'Media' : 
                     report.urgency === 'low' ? 'Bassa' : 'Critica'}
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
                    <span className="font-medium text-brand-blue">Creata il:</span>
                    <p className="text-brand-gray">{new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-brand-blue">Aggiornata il:</span>
                    <p className="text-brand-gray">{new Date(report.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Quote Requests Status */}
                {getReportQuotes(report.id).length > 0 && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-brand-coral/5 to-brand-blue/5 rounded-lg border border-brand-coral/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <DollarSign size={16} className="text-brand-coral" />
                      <span className="font-medium text-brand-blue">Preventivi Richiesti ({getReportQuotes(report.id).length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getReportQuotes(report.id).map((quote) => (
                        <div key={quote.id} className="flex items-center space-x-2">
                          <span className="text-sm text-brand-gray">{quote.supplier_name}:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getQuoteStatusColor(quote.status)}`}>
                            {getQuoteStatusText(quote.status)}
                          </span>
                          {quote.amount && (
                            <span className="text-sm font-medium text-brand-blue">
                              €{quote.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {report.notes && (
                  <div className="mt-4 p-3 bg-brand-blue/5 rounded-lg border border-brand-blue/10">
                    <span className="font-medium text-brand-blue">Note:</span>
                    <p className="text-brand-gray text-sm mt-1">{report.notes}</p>
                  </div>
                )}

                {/* Status Change Buttons */}
                <div className="mt-4 flex items-center space-x-2">
                  <span className="text-sm font-medium text-brand-blue">Cambia stato:</span>
                  <div className="flex space-x-2">
                    {(report.status === 'closed' || report.status === 'resolved') && (
                      <button
                        onClick={() => handleStatusChange(report.id, 'open')}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-xs hover:bg-red-200 transition-colors"
                      >
                        Riapri
                      </button>
                    )}
                    {report.status !== 'in_progress' && (
                      <button
                        onClick={() => handleStatusChange(report.id, 'in_progress')}
                        className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-xs hover:bg-yellow-200 transition-colors"
                      >
                        In Corso
                      </button>
                    )}
                    {report.status !== 'resolved' && (
                      <button
                        onClick={() => handleStatusChange(report.id, 'resolved')}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-xs hover:bg-green-200 transition-colors"
                      >
                        Risolvi
                      </button>
                    )}
                    {report.status !== 'closed' && (
                      <button
                        onClick={() => handleStatusChange(report.id, 'closed')}
                        className="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg text-xs hover:bg-gray-200 transition-colors"
                      >
                        Chiudi
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end space-y-2 ml-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditReport(report)}
                    className="flex items-center space-x-1 px-3 py-1 bg-brand-coral/10 text-brand-coral rounded-lg hover:bg-brand-coral/20 transition-colors"
                    title="Modifica segnalazione"
                  >
                    <Edit size={16} />
                    <span>Modifica</span>
                  </button>
                  <button
                    onClick={() => setSelectedReportId(report.id)}
                    className="flex items-center space-x-1 px-3 py-1 bg-brand-blue/10 text-brand-blue rounded-lg hover:bg-brand-blue/20 transition-colors"
                    title="Visualizza allegati"
                  >
                    <Paperclip size={16} />
                    <span>Allegati</span>
                  </button>
                </div>
                <button
                  onClick={() => handleCreateQuoteRequests(report)}
                  className="flex items-center space-x-1 px-3 py-1 bg-gradient-to-r from-brand-red/10 to-brand-red-light/10 text-brand-red rounded-lg hover:from-brand-red/20 hover:to-brand-red-light/20 transition-all duration-200 border border-brand-red/20"
                  title="Richiedi preventivi"
                >
                  <Send size={16} />
                  <span>Preventivi</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-brand-blue">Modifica Segnalazione</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedReport(null);
                  resetForm();
                }}
                className="p-2 text-brand-gray hover:text-brand-red transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateReport} className="space-y-4">
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
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.role})
                    </option>
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
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedReport(null);
                    resetForm();
                  }}
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
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.role})
                    </option>
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

      {/* Quote Request Modal */}
      {showQuoteModal && selectedReportForQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-brand-blue">Richiedi Preventivi</h2>
              <button
                onClick={() => {
                  setShowQuoteModal(false);
                  setSelectedReportForQuote(null);
                }}
                className="p-2 text-brand-gray hover:text-brand-red transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-brand-blue/5 rounded-lg border border-brand-blue/20">
              <h3 className="font-semibold text-brand-blue mb-2">Segnalazione:</h3>
              <p className="text-brand-gray">{selectedReportForQuote.title}</p>
              <p className="text-sm text-brand-gray mt-1">{selectedReportForQuote.description}</p>
            </div>
            
            <form onSubmit={handleSubmitQuoteRequests} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Seleziona Fornitori
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-brand-gray/30 rounded-lg p-3">
                  {suppliers.map(supplier => (
                    <label key={supplier.id} className="flex items-center space-x-2 cursor-pointer hover:bg-brand-blue/5 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={quoteFormData.selectedSuppliers.includes(supplier.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setQuoteFormData({
                              ...quoteFormData,
                              selectedSuppliers: [...quoteFormData.selectedSuppliers, supplier.id]
                            });
                          } else {
                            setQuoteFormData({
                              ...quoteFormData,
                              selectedSuppliers: quoteFormData.selectedSuppliers.filter(id => id !== supplier.id)
                            });
                          }
                        }}
                        className="h-4 w-4 text-brand-red focus:ring-brand-red border-brand-gray/30 rounded"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-brand-blue">{supplier.name}</span>
                        <p className="text-xs text-brand-gray">{supplier.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-brand-gray mt-1">
                  Selezionati: {quoteFormData.selectedSuppliers.length} fornitori
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Titolo Richiesta
                </label>
                <input
                  type="text"
                  required
                  value={quoteFormData.customTitle}
                  onChange={(e) => setQuoteFormData({ ...quoteFormData, customTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Descrizione Richiesta
                </label>
                <textarea
                  required
                  rows={4}
                  value={quoteFormData.customDescription}
                  onChange={(e) => setQuoteFormData({ ...quoteFormData, customDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Scadenza Richiesta (opzionale)
                </label>
                <input
                  type="date"
                  value={quoteFormData.dueDate}
                  onChange={(e) => setQuoteFormData({ ...quoteFormData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div className="bg-brand-coral/5 rounded-lg p-4 border border-brand-coral/20">
                <h4 className="font-medium text-brand-blue mb-2">Anteprima Richiesta</h4>
                <p className="text-sm text-brand-gray mb-2">
                  Verrà inviata una richiesta di preventivo a <strong>{quoteFormData.selectedSuppliers.length}</strong> fornitori selezionati.
                </p>
                <p className="text-sm text-brand-gray">
                  Potrai tracciare lo stato di ogni richiesta con le etichette: 
                  <span className="inline-flex items-center space-x-1 ml-2">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">In Corso</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Ricevuto</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Confermato</span>
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">KO</span>
                  </span>
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuoteModal(false);
                    setSelectedReportForQuote(null);
                  }}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={quoteFormData.selectedSuppliers.length === 0}
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Send size={18} />
                  <span>Invia Richieste ({quoteFormData.selectedSuppliers.length})</span>
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
          onClose={() => setSelectedReportId(null)}
        />
      )}

      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-brand-gray mb-4" />
          <h3 className="text-lg font-medium text-brand-blue mb-2">Nessuna segnalazione trovata</h3>
          <p className="text-brand-gray">Prova a modificare i filtri di ricerca o crea una nuova segnalazione.</p>
        </div>
      )}
    </div>
  );
};

export default Reports;
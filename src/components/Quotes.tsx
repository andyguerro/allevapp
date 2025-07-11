import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, FileText, Mail, Calendar, Clock, CheckCircle, AlertCircle, Edit, ShoppingCart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import OrderConfirmationModal from './OrderConfirmationModal';

interface Quote {
  id: string;
  report_id?: string;
  supplier_id: string;
  farm_id?: string;
  title: string;
  description: string;
  amount?: number;
  status: 'requested' | 'received' | 'accepted' | 'rejected';
  requested_at: string;
  due_date?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  // Joined data
  supplier_name?: string;
  supplier_email?: string;
  farm_name?: string;
  report_title?: string;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
}

interface Report {
  id: string;
  title: string;
}

interface Farm {
  id: string;
  name: string;
}

const Quotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedQuoteForOrder, setSelectedQuoteForOrder] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    supplier_id: '',
    farm_id: '',
    report_id: '',
    amount: '',
    due_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch quotes with joined data
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select(`
          *,
          suppliers(name, email),
          farms(name),
          reports(title)
        `)
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;

      // Transform data
      const transformedQuotes = quotesData.map(quote => ({
        ...quote,
        supplier_name: quote.suppliers?.name,
        supplier_email: quote.suppliers?.email,
        farm_name: quote.farms?.name,
        report_title: quote.reports?.title
      }));

      setQuotes(transformedQuotes);

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, name, email');

      if (suppliersError) throw suppliersError;
      setSuppliers(suppliersData);

      // Fetch reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('id, title')
        .eq('status', 'open');

      if (reportsError) throw reportsError;
      setReports(reportsData);

      // Fetch farms
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id, name');

      if (farmsError) throw farmsError;
      setFarms(farmsData);

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
        .from('quotes')
        .insert({
          title: formData.title,
          description: formData.description,
          supplier_id: formData.supplier_id,
          farm_id: formData.farm_id || null,
          report_id: formData.report_id || null,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          due_date: formData.due_date || null,
          notes: formData.notes || null,
          created_by: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
        });

      if (error) throw error;

      await fetchData();
      resetForm();
    } catch (error) {
      console.error('Errore nel creare preventivo:', error);
      alert('Errore nel creare il preventivo');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      supplier_id: '',
      farm_id: '',
      report_id: '',
      amount: '',
      due_date: '',
      notes: ''
    });
    setShowCreateModal(false);
  };

  const handleEdit = (quote: Quote) => {
    setFormData({
      title: quote.title,
      description: quote.description,
      supplier_id: quote.supplier_id,
      farm_id: quote.farm_id || '',
      report_id: quote.report_id || '',
      amount: quote.amount ? quote.amount.toString() : '',
      due_date: quote.due_date || '',
      notes: quote.notes || ''
    });
    setEditingQuote(quote);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingQuote) return;
    
    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          title: formData.title,
          description: formData.description,
          supplier_id: formData.supplier_id,
          farm_id: formData.farm_id || null,
          report_id: formData.report_id || null,
          amount: formData.amount ? parseFloat(formData.amount) : null,
          due_date: formData.due_date || null,
          notes: formData.notes || null
        })
        .eq('id', editingQuote.id);

      if (error) throw error;

      await fetchData();
      resetEditForm();
    } catch (error) {
      console.error('Errore nell\'aggiornamento preventivo:', error);
      alert('Errore nell\'aggiornamento del preventivo');
    }
  };

  const resetEditForm = () => {
    setFormData({
      title: '',
      description: '',
      supplier_id: '',
      farm_id: '',
      report_id: '',
      amount: '',
      due_date: '',
      notes: ''
    });
    setEditingQuote(null);
    setShowEditModal(false);
  };

  const updateQuoteStatus = async (quoteId: string, newStatus: string) => {
    try {
      // If accepting a quote, show order confirmation modal instead
      if (newStatus === 'accepted') {
        const quote = quotes.find(q => q.id === quoteId);
        if (quote) {
          setSelectedQuoteForOrder(quote);
          setShowOrderModal(true);
          return;
        }
      }

      const { error } = await supabase
        .from('quotes')
        .update({ status: newStatus })
        .eq('id', quoteId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Errore nell\'aggiornamento stato preventivo:', error);
      alert('Errore nell\'aggiornamento dello stato');
    }
  };

  const handleOrderConfirmation = async (orderData: any) => {
    try {
      // Refresh quotes data to see the updated statuses
      await fetchData();
      setShowOrderModal(false);
      setSelectedQuoteForOrder(null);
      
      alert(`Ordine ${orderData.order_number} creato con successo!\n\nGli altri preventivi con lo stesso oggetto sono stati automaticamente rifiutati.`);
    } catch (error) {
      console.error('Errore nella gestione conferma ordine:', error);
      alert('Errore nella gestione della conferma ordine');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'bg-brand-coral/20 text-brand-coral border-brand-coral/30';
      case 'received': return 'bg-brand-blue/20 text-brand-blue border-brand-blue/30';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-brand-red/20 text-brand-red border-brand-red/30';
      default: return 'bg-brand-gray/20 text-brand-gray border-brand-gray/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested': return <Clock size={16} className="text-brand-coral" />;
      case 'received': return <FileText size={16} className="text-brand-blue" />;
      case 'accepted': return <CheckCircle size={16} className="text-green-600" />;
      case 'rejected': return <AlertCircle size={16} className="text-brand-red" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'requested': return 'Richiesto';
      case 'received': return 'Ricevuto';
      case 'accepted': return 'Accettato';
      case 'rejected': return 'Rifiutato';
      default: return status;
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || quote.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
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
        <h1 className="text-3xl font-bold text-brand-blue">Preventivi</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-3 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Plus size={20} />
          <span>Nuovo Preventivo</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Richiesti</p>
              <p className="text-2xl font-bold text-brand-coral">
                {quotes.filter(q => q.status === 'requested').length}
              </p>
            </div>
            <Clock size={24} className="text-brand-coral" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Ricevuti</p>
              <p className="text-2xl font-bold text-brand-blue">
                {quotes.filter(q => q.status === 'received').length}
              </p>
            </div>
            <FileText size={24} className="text-brand-blue" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Accettati</p>
              <p className="text-2xl font-bold text-green-600">
                {quotes.filter(q => q.status === 'accepted').length}
              </p>
            </div>
            <CheckCircle size={24} className="text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Valore Totale</p>
              <p className="text-2xl font-bold text-brand-blue">
                €{quotes.reduce((sum, q) => sum + (q.amount || 0), 0).toLocaleString()}
              </p>
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
                placeholder="Cerca preventivi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter size={18} className="text-brand-gray" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-colors"
            >
              <option value="all">Tutti</option>
              <option value="requested">Richiesti</option>
              <option value="received">Ricevuti</option>
              <option value="accepted">Accettati</option>
              <option value="rejected">Rifiutati</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quotes List */}
      <div className="space-y-4">
        {filteredQuotes.map((quote) => (
          <div key={quote.id} className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  {getStatusIcon(quote.status)}
                  <h3 className="text-lg font-semibold text-brand-blue">{quote.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(quote.status)}`}>
                    {getStatusText(quote.status)}
                  </span>
                  {quote.due_date && isOverdue(quote.due_date) && quote.status === 'requested' && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                      Scaduto
                    </span>
                  )}
                </div>
                
                <p className="text-brand-gray mb-4">{quote.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-brand-blue">Fornitore:</span>
                    <p className="text-brand-gray">{quote.supplier_name}</p>
                  </div>
                  <div>
                    <span className="font-medium text-brand-blue">Allevamento:</span>
                    <p className="text-brand-gray">{quote.farm_name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-brand-blue">Importo:</span>
                    <p className="text-brand-gray font-semibold">
                      {quote.amount ? `€${quote.amount.toLocaleString()}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-brand-blue">Richiesto:</span>
                    <p className="text-brand-gray">{new Date(quote.requested_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-brand-blue">Scadenza:</span>
                    <p className={`${quote.due_date && isOverdue(quote.due_date) ? 'text-red-600 font-medium' : 'text-brand-gray'}`}>
                      {quote.due_date ? new Date(quote.due_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {quote.report_title && (
                  <div className="mt-3">
                    <span className="font-medium text-brand-blue">Segnalazione:</span>
                    <p className="text-brand-gray text-sm">{quote.report_title}</p>
                  </div>
                )}
                
                {quote.notes && (
                  <div className="mt-4 p-3 bg-brand-blue/5 rounded-lg border border-brand-blue/10">
                    <span className="font-medium text-brand-blue">Note:</span>
                    <p className="text-brand-gray text-sm mt-1">{quote.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <button className="p-2 text-brand-gray hover:text-brand-blue transition-colors">
                  <Mail size={18} />
                </button>
                <button 
                  onClick={() => handleEdit(quote)}
                  className="p-2 text-brand-gray hover:text-brand-coral transition-colors"
                  title="Modifica preventivo"
                >
                  <Edit size={18} />
                </button>
                <button className="p-2 text-brand-gray hover:text-brand-blue transition-colors">
                  <Calendar size={18} />
                </button>
              </div>
              
              {/* Status Change Buttons */}
              <div className="mt-4 flex items-center space-x-2">
                <span className="text-xs font-medium text-brand-blue">Azioni:</span>
                <div className="flex space-x-1">
                  {quote.status !== 'received' && (
                    <button
                      onClick={() => updateQuoteStatus(quote.id, 'received')}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                    >
                      Ricevuto
                    </button>
                  )}
                  {quote.status !== 'accepted' && (
                    <button
                      onClick={() => updateQuoteStatus(quote.id, 'accepted')}
                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors flex items-center space-x-1"
                    >
                      <ShoppingCart size={12} />
                      <span>Conferma Ordine</span>
                    </button>
                  )}
                  {quote.status !== 'rejected' && (
                    <button
                      onClick={() => updateQuoteStatus(quote.id, 'rejected')}
                      className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                    >
                      Rifiuta
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Nuovo Preventivo</h2>
            
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
                    Fornitore
                  </label>
                  <select
                    required
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
                    Allevamento
                  </label>
                  <select
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
                    Segnalazione (opzionale)
                  </label>
                  <select
                    value={formData.report_id}
                    onChange={(e) => setFormData({ ...formData, report_id: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    <option value="">Seleziona segnalazione</option>
                    {reports.map(report => (
                      <option key={report.id} value={report.id}>{report.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Importo (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Scadenza
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
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
                  Crea Preventivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Modifica Preventivo</h2>
            
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
                    Fornitore
                  </label>
                  <select
                    required
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
                    Allevamento
                  </label>
                  <select
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
                    Segnalazione (opzionale)
                  </label>
                  <select
                    value={formData.report_id}
                    onChange={(e) => setFormData({ ...formData, report_id: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    <option value="">Seleziona segnalazione</option>
                    {reports.map(report => (
                      <option key={report.id} value={report.id}>{report.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Importo (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Scadenza
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
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
                  Aggiorna Preventivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Confirmation Modal */}
      {showOrderModal && selectedQuoteForOrder && (
        <OrderConfirmationModal
          quote={selectedQuoteForOrder}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedQuoteForOrder(null);
          }}
          onConfirm={handleOrderConfirmation}
        />
      )}

      {filteredQuotes.length === 0 && (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-brand-gray mb-4" />
          <h3 className="text-lg font-medium text-brand-blue mb-2">Nessun preventivo trovato</h3>
          <p className="text-brand-gray">Prova a modificare i filtri di ricerca o crea un nuovo preventivo.</p>
        </div>
      )}
    </div>
  );
};

export default Quotes;
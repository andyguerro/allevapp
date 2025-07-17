import React, { useState, useEffect } from 'react';
import { X, Mail, Send, Users, FileText, Building, Package, Wrench, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MultiSelect, { Option } from './MultiSelect';

interface QuoteRequestModalProps {
  entityType: 'report' | 'equipment' | 'facility';
  entityId: string;
  entityName: string;
  entityDescription?: string;
  farmName?: string;
  onClose: () => void;
  currentUser: any;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

const QuoteRequestModal: React.FC<QuoteRequestModalProps> = ({
  entityType,
  entityId,
  entityName,
  entityDescription,
  farmName,
  onClose,
  currentUser
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSuppliers, setSelectedSuppliers] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    dueDate: '',
    notes: ''
  });

  useEffect(() => {
    fetchSuppliers();
    generateDefaultContent();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Errore nel caricamento fornitori:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDefaultContent = () => {
    const entityTypeText = {
      report: 'segnalazione',
      equipment: 'attrezzatura',
      facility: 'impianto'
    }[entityType];

    const defaultSubject = `Richiesta Preventivo - ${entityName}`;
    const defaultDescription = entityDescription || 
      `Richiesta preventivo per ${entityTypeText} "${entityName}"${farmName ? ` presso ${farmName}` : ''}.`;

    setFormData({
      subject: defaultSubject,
      description: defaultDescription,
      dueDate: '',
      notes: ''
    });
  };

  const getEntityIcon = () => {
    switch (entityType) {
      case 'report': return <FileText size={20} className="text-brand-red" />;
      case 'equipment': return <Package size={20} className="text-brand-blue" />;
      case 'facility': return <Wrench size={20} className="text-brand-coral" />;
    }
  };

  const getEntityTypeText = () => {
    switch (entityType) {
      case 'report': return 'Segnalazione';
      case 'equipment': return 'Attrezzatura';
      case 'facility': return 'Impianto';
    }
  };

  const handleSendQuoteRequests = async () => {
    if (selectedSuppliers.length === 0) {
      alert('Seleziona almeno un fornitore');
      return;
    }

    if (!formData.subject.trim() || !formData.description.trim()) {
      alert('Inserisci oggetto e descrizione');
      return;
    }

    setSending(true);
    try {
      const results = [];

      // Create quotes for each selected supplier
      for (const supplier of selectedSuppliers) {
        try {
          // Get farm_id based on entity type
          let farmId = null;
          if (entityType === 'report') {
            const { data: report } = await supabase
              .from('reports')
              .select('farm_id')
              .eq('id', entityId)
              .single();
            farmId = report?.farm_id;
          } else if (entityType === 'equipment') {
            const { data: equipment } = await supabase
              .from('equipment')
              .select('farm_id')
              .eq('id', entityId)
              .single();
            farmId = equipment?.farm_id;
          } else if (entityType === 'facility') {
            const { data: facility } = await supabase
              .from('facilities')
              .select('farm_id')
              .eq('id', entityId)
              .single();
            farmId = facility?.farm_id;
          }

          // Create quote record
          const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .insert({
              title: formData.subject,
              description: formData.description,
              supplier_id: supplier.value,
              farm_id: farmId,
              report_id: entityType === 'report' ? entityId : null,
              due_date: formData.dueDate || null,
              notes: formData.notes || null,
              created_by: currentUser.id
            })
            .select()
            .single();

          if (quoteError) throw quoteError;

          // Send email via edge function
          const supplierData = suppliers.find(s => s.id === supplier.value);
          if (supplierData) {
            const emailResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-quote-email`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: supplierData.email,
                supplierName: supplierData.name,
                quoteTitle: formData.subject,
                quoteDescription: formData.description,
                farmName: farmName || 'N/A',
                dueDate: formData.dueDate,
                contactInfo: {
                  companyName: 'AllevApp',
                  email: currentUser.email || 'info@allevapp.com',
                  phone: '+39 030 9938433'
                }
              })
            });

            const emailResult = await emailResponse.json();
            
            results.push({
              supplier: supplierData.name,
              email: supplierData.email,
              success: emailResult.success,
              error: emailResult.error
            });
          }
        } catch (error) {
          console.error(`Errore per fornitore ${supplier.label}:`, error);
          results.push({
            supplier: supplier.label,
            success: false,
            error: error.message
          });
        }
      }

      // Show results
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        alert(`Richieste inviate con successo a ${successCount} fornitori${failureCount > 0 ? `. ${failureCount} invii falliti.` : '.'}`);
        onClose();
      } else {
        alert('Errore nell\'invio delle richieste. Verifica la configurazione email.');
      }

    } catch (error) {
      console.error('Errore nell\'invio richieste:', error);
      alert('Errore nell\'invio delle richieste di preventivo');
    } finally {
      setSending(false);
    }
  };

  const supplierOptions: Option[] = suppliers.map(supplier => ({
    value: supplier.id,
    label: `${supplier.name} (${supplier.email})`
  }));

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brand-coral/20 bg-gradient-to-r from-brand-blue/5 to-brand-coral/5">
          <div className="flex items-center space-x-3">
            <Mail size={24} className="text-brand-red" />
            <h2 className="text-xl font-bold text-brand-blue">Richiesta Preventivo</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-brand-gray hover:text-brand-red transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Entity Info */}
          <div className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-4 mb-6">
            <div className="flex items-center space-x-3 mb-2">
              {getEntityIcon()}
              <h3 className="text-lg font-semibold text-brand-blue">{getEntityTypeText()}: {entityName}</h3>
            </div>
            {farmName && (
              <div className="flex items-center space-x-2 text-sm text-brand-gray">
                <Building size={16} />
                <span>Allevamento: {farmName}</span>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Supplier Selection */}
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                <Users size={16} className="inline mr-2" />
                Fornitori Destinatari *
              </label>
              <MultiSelect
                options={supplierOptions}
                value={selectedSuppliers}
                onChange={setSelectedSuppliers}
                placeholder="Seleziona i fornitori a cui inviare la richiesta..."
                className="w-full"
              />
              <p className="text-xs text-brand-gray mt-1">
                Seleziona uno o più fornitori. La richiesta verrà inviata via email a tutti i fornitori selezionati.
              </p>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Oggetto Email *
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                placeholder="Es: Richiesta Preventivo - Riparazione Attrezzatura"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Descrizione Richiesta *
              </label>
              <textarea
                required
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                placeholder="Descrivi dettagliatamente cosa richiedi nel preventivo..."
              />
            </div>

            {/* Due Date and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Scadenza Richiesta (opzionale)
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Note Aggiuntive (opzionale)
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  placeholder="Note speciali per i fornitori..."
                />
              </div>
            </div>

            {/* Email Configuration Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle size={16} className="text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Configurazione Email Microsoft 365:</strong>
                  <p className="mt-1">
                    Per l'invio delle email è necessario configurare le credenziali Microsoft 365 nelle variabili d'ambiente di Supabase:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><code>MICROSOFT_TENANT_ID</code></li>
                    <li><code>MICROSOFT_CLIENT_ID</code></li>
                    <li><code>MICROSOFT_CLIENT_SECRET</code></li>
                    <li><code>MICROSOFT_SENDER_EMAIL</code></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Selected Suppliers Preview */}
            {selectedSuppliers.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="font-medium text-green-800">
                    Fornitori Selezionati ({selectedSuppliers.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {selectedSuppliers.map((supplier, index) => (
                    <div key={index} className="text-sm text-green-700">
                      • {supplier.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-brand-coral/20">
            <button
              onClick={onClose}
              className="px-6 py-2 text-brand-gray hover:text-brand-blue transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleSendQuoteRequests}
              disabled={sending || selectedSuppliers.length === 0}
              className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-8 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Invio in corso...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Invia Richieste ({selectedSuppliers.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteRequestModal;
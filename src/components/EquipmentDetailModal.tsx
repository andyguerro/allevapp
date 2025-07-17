import React, { useState, useEffect } from 'react';
import { X, Package, Building, Calendar, AlertTriangle, CheckCircle, Clock, Paperclip, Edit, Wrench, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AttachmentsManager from './AttachmentsManager';
import QuoteRequestModal from './QuoteRequestModal';

interface EquipmentDetailModalProps {
  equipmentId: string;
  onClose: () => void;
  onEdit?: (equipment: any) => void;
  currentUser?: any;
}

interface EquipmentDetail {
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

const EquipmentDetailModal: React.FC<EquipmentDetailModalProps> = ({ equipmentId, onClose, onEdit, currentUser }) => {
  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showQuoteRequest, setShowQuoteRequest] = useState(false);
  const [activeQuotes, setActiveQuotes] = useState<number>(0);

  useEffect(() => {
    fetchEquipmentDetail();
  }, [equipmentId]);

  useEffect(() => {
    if (equipment?.farm_id && equipment?.name) {
      fetchActiveQuotes();
    }
  }, [equipment]);

  const fetchEquipmentDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select(`
          *,
          farms(name)
        `)
        .eq('id', equipmentId)
        .single();

      if (error) throw error;

      setEquipment({
        ...data,
        farm_name: data.farms?.name
      });
    } catch (error) {
      console.error('Errore nel caricamento dettagli attrezzatura:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveQuotes = async () => {
    if (!equipment?.farm_id || !equipment?.name) {
      return;
    }

    try {
      // Check for quotes related to this equipment through reports or direct farm association
      const { data, error } = await supabase
        .from('quotes')
        .select('id, title')
        .eq('farm_id', equipment?.farm_id)
        .in('status', ['requested', 'received'])
        .ilike('title', `%${equipment?.name}%`);

      if (error) throw error;
      setActiveQuotes(data?.length || 0);
    } catch (error) {
      console.error('Errore nel caricamento preventivi attivi:', error);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-green-100 text-green-800 border-green-200';
      case 'not_working': return 'bg-red-100 text-red-800 border-red-200';
      case 'regenerated': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'repaired': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'working': return 'Funzionante';
      case 'not_working': return 'Non Funzionante';
      case 'regenerated': return 'Rigenerata';
      case 'repaired': return 'Riparata';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return <CheckCircle size={20} className="text-green-600" />;
      case 'not_working': return <AlertTriangle size={20} className="text-red-600" />;
      case 'regenerated': return <Wrench size={20} className="text-blue-600" />;
      case 'repaired': return <Wrench size={20} className="text-yellow-600" />;
      default: return null;
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6">
          <p className="text-brand-red">Errore nel caricamento dell'attrezzatura</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-brand-blue text-white rounded-lg">
            Chiudi
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-brand-coral/20 bg-gradient-to-r from-brand-blue/5 to-brand-coral/5">
            <div className="flex items-center space-x-3">
              <Package size={24} className="text-brand-blue" />
              <h2 className="text-xl font-bold text-brand-blue">Dettagli Attrezzatura</h2>
            </div>
            <div className="flex items-center space-x-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(equipment)}
                  className="p-2 text-brand-gray hover:text-brand-coral transition-colors"
                  title="Modifica attrezzatura"
                >
                  <Edit size={20} />
                </button>
              )}
              {currentUser && (
                <button
                  onClick={() => setShowQuoteRequest(true)}
                  className="p-2 text-brand-gray hover:text-brand-coral transition-colors relative"
                  title="Richiedi preventivo"
                >
                  <Mail size={20} />
                  {activeQuotes > 0 && (
                    <span className="absolute -top-1 -right-1 bg-brand-red text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {activeQuotes}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowAttachments(true)}
                className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
                title="Gestisci allegati"
              >
                <Paperclip size={20} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-brand-gray hover:text-brand-red transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Title and Status */}
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-3">
                {getStatusIcon(equipment.status)}
                <h1 className="text-2xl font-bold text-brand-blue">{equipment.name}</h1>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(equipment.status)}`}>
                  {getStatusText(equipment.status)}
                </span>
              </div>
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Building size={16} className="text-brand-blue" />
                    <span className="font-medium text-brand-blue">Allevamento</span>
                  </div>
                  <p className="text-brand-gray pl-6">{equipment.farm_name}</p>
                </div>

                {equipment.model && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Package size={16} className="text-brand-blue" />
                      <span className="font-medium text-brand-blue">Modello</span>
                    </div>
                    <p className="text-brand-gray pl-6">{equipment.model}</p>
                  </div>
                )}

                {equipment.serial_number && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Package size={16} className="text-brand-blue" />
                      <span className="font-medium text-brand-blue">Numero di Serie</span>
                    </div>
                    <p className="text-brand-gray pl-6">{equipment.serial_number}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar size={16} className="text-brand-blue" />
                    <span className="font-medium text-brand-blue">Intervallo Manutenzione</span>
                  </div>
                  <p className="text-brand-gray pl-6">{equipment.maintenance_interval_days} giorni</p>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar size={16} className="text-brand-blue" />
                    <span className="font-medium text-brand-blue">Data Creazione</span>
                  </div>
                  <p className="text-brand-gray pl-6">{new Date(equipment.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Maintenance Info */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-brand-blue mb-4">Informazioni Manutenzione</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {equipment.last_maintenance && (
                  <div className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar size={16} className="text-brand-blue" />
                      <span className="font-medium text-brand-blue">Ultima Manutenzione</span>
                    </div>
                    <p className="text-brand-gray">{new Date(equipment.last_maintenance).toLocaleDateString()}</p>
                  </div>
                )}

                {equipment.next_maintenance_due && (
                  <div className={`rounded-lg border p-4 ${
                    isMaintenanceOverdue(equipment.next_maintenance_due)
                      ? 'bg-red-50 border-red-200'
                      : isMaintenanceDueSoon(equipment.next_maintenance_due)
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 border-brand-coral/20'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar size={16} className={
                        isMaintenanceOverdue(equipment.next_maintenance_due)
                          ? 'text-red-600'
                          : isMaintenanceDueSoon(equipment.next_maintenance_due)
                          ? 'text-yellow-600'
                          : 'text-brand-blue'
                      } />
                      <span className={`font-medium ${
                        isMaintenanceOverdue(equipment.next_maintenance_due)
                          ? 'text-red-600'
                          : isMaintenanceDueSoon(equipment.next_maintenance_due)
                          ? 'text-yellow-600'
                          : 'text-brand-blue'
                      }`}>
                        Prossima Manutenzione
                      </span>
                    </div>
                    <p className={
                      isMaintenanceOverdue(equipment.next_maintenance_due)
                        ? 'text-red-700 font-medium'
                        : isMaintenanceDueSoon(equipment.next_maintenance_due)
                        ? 'text-yellow-700 font-medium'
                        : 'text-brand-gray'
                    }>
                      {new Date(equipment.next_maintenance_due).toLocaleDateString()}
                      {isMaintenanceOverdue(equipment.next_maintenance_due) && ' (Scaduta)'}
                      {isMaintenanceDueSoon(equipment.next_maintenance_due) && 
                       !isMaintenanceOverdue(equipment.next_maintenance_due) && ' (In scadenza)'}
                    </p>
                  </div>
                )}
              </div>

              {/* Maintenance Alert */}
              {(isMaintenanceOverdue(equipment.next_maintenance_due) || isMaintenanceDueSoon(equipment.next_maintenance_due)) && (
                <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-red-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle size={20} className="text-yellow-600" />
                    <span className="font-medium text-yellow-800">
                      {isMaintenanceOverdue(equipment.next_maintenance_due) ? 'Manutenzione Scaduta' : 'Manutenzione in Scadenza'}
                    </span>
                  </div>
                  <p className="text-yellow-700 text-sm mt-1">
                    È necessario programmare la manutenzione per questa attrezzatura.
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            {equipment.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-brand-blue mb-2">Descrizione</h3>
                <div className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-4">
                  <p className="text-brand-gray">{equipment.description}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-brand-coral/20 bg-gradient-to-r from-brand-blue/5 to-brand-coral/5">
            {currentUser && (
              <button
                onClick={() => setShowQuoteRequest(true)}
                className="bg-gradient-to-r from-brand-coral to-brand-coral-light text-white px-4 py-2 rounded-lg hover:from-brand-coral-light hover:to-brand-coral transition-all duration-200 flex items-center space-x-2"
              >
                <Mail size={16} />
                <span>Richiedi Preventivo</span>
                {activeQuotes > 0 && (
                  <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
                    {activeQuotes} attivi
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setShowAttachments(true)}
              className="bg-gradient-to-r from-brand-blue to-brand-blue-light text-white px-4 py-2 rounded-lg hover:from-brand-blue-dark hover:to-brand-blue transition-all duration-200 flex items-center space-x-2"
            >
              <Paperclip size={16} />
              <span>Allegati</span>
            </button>
            {onEdit && (
              <button
                onClick={() => onEdit(equipment)}
                className="bg-gradient-to-r from-brand-coral to-brand-coral-light text-white px-4 py-2 rounded-lg hover:from-brand-coral-light hover:to-brand-coral transition-all duration-200 flex items-center space-x-2"
              >
                <Edit size={16} />
                <span>Modifica</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 text-brand-gray hover:text-brand-blue transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>

      {/* Attachments Manager */}
      {showAttachments && (
        <AttachmentsManager
          entityType="equipment"
          entityId={equipment.id}
          entityName={equipment.name}
          onClose={() => setShowAttachments(false)}
        />
      )}

      {/* Quote Request Modal */}
      {showQuoteRequest && currentUser && equipment && (
        <QuoteRequestModal
          entityType="equipment"
          entityId={equipment.id}
          entityName={equipment.name}
          entityDescription={equipment.description}
          farmName={equipment.farm_name}
          currentUser={currentUser}
          onClose={() => {
            setShowQuoteRequest(false);
            fetchActiveQuotes(); // Refresh active quotes count
          }}
        />
      )}
    </>
  );
};

export default EquipmentDetailModal;
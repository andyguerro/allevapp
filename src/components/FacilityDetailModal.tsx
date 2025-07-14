import React, { useState, useEffect } from 'react';
import { X, Wrench, Building, Calendar, AlertTriangle, CheckCircle, Clock, Paperclip, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AttachmentsManager from './AttachmentsManager';

interface FacilityDetailModalProps {
  facilityId: string;
  onClose: () => void;
  onEdit?: (facility: any) => void;
}

interface FacilityDetail {
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

const FacilityDetailModal: React.FC<FacilityDetailModalProps> = ({ facilityId, onClose, onEdit }) => {
  const [facility, setFacility] = useState<FacilityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAttachments, setShowAttachments] = useState(false);

  useEffect(() => {
    fetchFacilityDetail();
  }, [facilityId]);

  const fetchFacilityDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select(`
          *,
          farms(name)
        `)
        .eq('id', facilityId)
        .single();

      if (error) throw error;

      setFacility({
        ...data,
        farm_name: data.farms?.name
      });
    } catch (error) {
      console.error('Errore nel caricamento dettagli impianto:', error);
    } finally {
      setLoading(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return <CheckCircle size={20} className="text-green-600" />;
      case 'not_working': return <AlertTriangle size={20} className="text-red-600" />;
      case 'maintenance_required': return <Clock size={20} className="text-yellow-600" />;
      case 'under_maintenance': return <Wrench size={20} className="text-blue-600" />;
      default: return null;
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6">
          <p className="text-brand-red">Errore nel caricamento dell'impianto</p>
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
              <Wrench size={24} className="text-brand-coral" />
              <h2 className="text-xl font-bold text-brand-blue">Dettagli Impianto</h2>
            </div>
            <div className="flex items-center space-x-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(facility)}
                  className="p-2 text-brand-gray hover:text-brand-coral transition-colors"
                  title="Modifica impianto"
                >
                  <Edit size={20} />
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
                {getStatusIcon(facility.status)}
                <h1 className="text-2xl font-bold text-brand-blue">{facility.name}</h1>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(facility.type)}`}>
                  {getTypeText(facility.type)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(facility.status)}`}>
                  {getStatusText(facility.status)}
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
                  <p className="text-brand-gray pl-6">{facility.farm_name}</p>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Wrench size={16} className="text-brand-blue" />
                    <span className="font-medium text-brand-blue">Tipo Impianto</span>
                  </div>
                  <p className="text-brand-gray pl-6">{getTypeText(facility.type)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar size={16} className="text-brand-blue" />
                    <span className="font-medium text-brand-blue">Intervallo Manutenzione</span>
                  </div>
                  <p className="text-brand-gray pl-6">{facility.maintenance_interval_days} giorni</p>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar size={16} className="text-brand-blue" />
                    <span className="font-medium text-brand-blue">Data Creazione</span>
                  </div>
                  <p className="text-brand-gray pl-6">{new Date(facility.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Maintenance Info */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-brand-blue mb-4">Informazioni Manutenzione</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {facility.last_maintenance && (
                  <div className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar size={16} className="text-brand-blue" />
                      <span className="font-medium text-brand-blue">Ultima Manutenzione</span>
                    </div>
                    <p className="text-brand-gray">{new Date(facility.last_maintenance).toLocaleDateString()}</p>
                  </div>
                )}

                {facility.next_maintenance_due && (
                  <div className={`rounded-lg border p-4 ${
                    isMaintenanceOverdue(facility.next_maintenance_due)
                      ? 'bg-red-50 border-red-200'
                      : isMaintenanceDueSoon(facility.next_maintenance_due)
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 border-brand-coral/20'
                  }`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar size={16} className={
                        isMaintenanceOverdue(facility.next_maintenance_due)
                          ? 'text-red-600'
                          : isMaintenanceDueSoon(facility.next_maintenance_due)
                          ? 'text-yellow-600'
                          : 'text-brand-blue'
                      } />
                      <span className={`font-medium ${
                        isMaintenanceOverdue(facility.next_maintenance_due)
                          ? 'text-red-600'
                          : isMaintenanceDueSoon(facility.next_maintenance_due)
                          ? 'text-yellow-600'
                          : 'text-brand-blue'
                      }`}>
                        Prossima Manutenzione
                      </span>
                    </div>
                    <p className={
                      isMaintenanceOverdue(facility.next_maintenance_due)
                        ? 'text-red-700 font-medium'
                        : isMaintenanceDueSoon(facility.next_maintenance_due)
                        ? 'text-yellow-700 font-medium'
                        : 'text-brand-gray'
                    }>
                      {new Date(facility.next_maintenance_due).toLocaleDateString()}
                      {isMaintenanceOverdue(facility.next_maintenance_due) && ' (Scaduta)'}
                      {isMaintenanceDueSoon(facility.next_maintenance_due) && 
                       !isMaintenanceOverdue(facility.next_maintenance_due) && ' (In scadenza)'}
                    </p>
                  </div>
                )}
              </div>

              {/* Maintenance Alert */}
              {(isMaintenanceOverdue(facility.next_maintenance_due) || isMaintenanceDueSoon(facility.next_maintenance_due)) && (
                <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-red-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle size={20} className="text-yellow-600" />
                    <span className="font-medium text-yellow-800">
                      {isMaintenanceOverdue(facility.next_maintenance_due) ? 'Manutenzione Scaduta' : 'Manutenzione in Scadenza'}
                    </span>
                  </div>
                  <p className="text-yellow-700 text-sm mt-1">
                    È necessario programmare la manutenzione per questo impianto.
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            {facility.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-brand-blue mb-2">Descrizione</h3>
                <div className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-4">
                  <p className="text-brand-gray">{facility.description}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-brand-coral/20 bg-gradient-to-r from-brand-blue/5 to-brand-coral/5">
            <button
              onClick={() => setShowAttachments(true)}
              className="bg-gradient-to-r from-brand-blue to-brand-blue-light text-white px-4 py-2 rounded-lg hover:from-brand-blue-dark hover:to-brand-blue transition-all duration-200 flex items-center space-x-2"
            >
              <Paperclip size={16} />
              <span>Allegati</span>
            </button>
            {onEdit && (
              <button
                onClick={() => onEdit(facility)}
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
          entityType="facility"
          entityId={facility.id}
          entityName={facility.name}
          onClose={() => setShowAttachments(false)}
        />
      )}
    </>
  );
};

export default FacilityDetailModal;
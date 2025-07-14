import React, { useState, useEffect } from 'react';
import { X, ClipboardList, User, Building, Package, Calendar, AlertTriangle, Clock, CheckCircle, Paperclip, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AttachmentsManager from './AttachmentsManager';

interface ReportDetailModalProps {
  reportId: string;
  onClose: () => void;
  onEdit?: (report: any) => void;
}

interface ReportDetail {
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

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({ reportId, onClose, onEdit }) => {
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAttachments, setShowAttachments] = useState(false);

  useEffect(() => {
    fetchReportDetail();
  }, [reportId]);

  const fetchReportDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          farms(name),
          equipment(name),
          suppliers(name),
          assigned_user:users!reports_assigned_to_fkey(full_name),
          created_user:users!reports_created_by_fkey(full_name)
        `)
        .eq('id', reportId)
        .single();

      if (error) throw error;

      setReport({
        ...data,
        farm_name: data.farms?.name,
        equipment_name: data.equipment?.name,
        supplier_name: data.suppliers?.name,
        assigned_user_name: data.assigned_user?.full_name,
        created_user_name: data.created_user?.full_name
      });
    } catch (error) {
      console.error('Errore nel caricamento dettagli segnalazione:', error);
    } finally {
      setLoading(false);
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
      case 'open': return <AlertTriangle size={20} className="text-brand-red" />;
      case 'in_progress': return <Clock size={20} className="text-brand-coral" />;
      case 'resolved': return <CheckCircle size={20} className="text-brand-blue" />;
      case 'closed': return <CheckCircle size={20} className="text-brand-gray" />;
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6">
          <p className="text-brand-red">Errore nel caricamento della segnalazione</p>
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
              <ClipboardList size={24} className="text-brand-red" />
              <h2 className="text-xl font-bold text-brand-blue">Dettagli Segnalazione</h2>
            </div>
            <div className="flex items-center space-x-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(report)}
                  className="p-2 text-brand-gray hover:text-brand-coral transition-colors"
                  title="Modifica segnalazione"
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
                {getStatusIcon(report.status)}
                <h1 className="text-2xl font-bold text-brand-blue">{report.title}</h1>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(report.status)}`}>
                  {getStatusText(report.status)}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getUrgencyColor(report.urgency)}`}>
                  {getUrgencyText(report.urgency)}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-brand-blue mb-2">Descrizione</h3>
              <div className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-4">
                <p className="text-brand-gray">{report.description}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Building size={16} className="text-brand-blue" />
                    <span className="font-medium text-brand-blue">Allevamento</span>
                  </div>
                  <p className="text-brand-gray pl-6">{report.farm_name}</p>
                </div>

                {report.equipment_name && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Package size={16} className="text-brand-blue" />
                      <span className="font-medium text-brand-blue">Attrezzatura</span>
                    </div>
                    <p className="text-brand-gray pl-6">{report.equipment_name}</p>
                  </div>
                )}

                {report.supplier_name && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Building size={16} className="text-brand-blue" />
                      <span className="font-medium text-brand-blue">Fornitore</span>
                    </div>
                    <p className="text-brand-gray pl-6">{report.supplier_name}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <User size={16} className="text-brand-blue" />
                    <span className="font-medium text-brand-blue">Assegnato a</span>
                  </div>
                  <p className="text-brand-gray pl-6">{report.assigned_user_name}</p>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <User size={16} className="text-brand-blue" />
                    <span className="font-medium text-brand-blue">Creato da</span>
                  </div>
                  <p className="text-brand-gray pl-6">{report.created_user_name}</p>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar size={16} className="text-brand-blue" />
                    <span className="font-medium text-brand-blue">Date</span>
                  </div>
                  <div className="pl-6 space-y-1">
                    <p className="text-brand-gray text-sm">
                      <span className="font-medium">Creata:</span> {new Date(report.created_at).toLocaleString()}
                    </p>
                    <p className="text-brand-gray text-sm">
                      <span className="font-medium">Aggiornata:</span> {new Date(report.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {report.notes && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-brand-blue mb-2">Note</h3>
                <div className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-4">
                  <p className="text-brand-gray">{report.notes}</p>
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
                onClick={() => onEdit(report)}
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
          entityType="report"
          entityId={report.id}
          entityName={report.title}
          onClose={() => setShowAttachments(false)}
        />
      )}
    </>
  );
};

export default ReportDetailModal;
import AttachmentsManager from './AttachmentsManager';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ReportDetailsProps {
  reportId: string;
  reportTitle?: string;
  onClose: () => void;
}

const ReportDetails: React.FC<ReportDetailsProps> = ({ reportId, reportTitle, onClose }) => {
  const [reportName, setReportName] = useState(reportTitle || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reportTitle) {
      fetchReportTitle();
    } else {
      setLoading(false);
    }
  }, [reportId]);

  const fetchReportTitle = async () => {
    try {
      const { data: report, error } = await supabase
        .from('attachments')
        .from('reports')
        .select('title')
        .eq('id', reportId)
        .single();

      if (error) throw error;
      setReportName(report?.title || 'Segnalazione');
    } catch (error) {
      console.error('Errore nel caricamento titolo segnalazione:', error);
      setReportName('Segnalazione');
    } finally {
      setLoading(false);
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

  return (
    <AttachmentsManager
      entityType="report"
      entityId={reportId}
      entityName={reportName}
      onClose={onClose}
    />
  );
};

export default ReportDetails;
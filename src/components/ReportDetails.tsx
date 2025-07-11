import React, { useState, useEffect } from 'react';
import { X, Upload, File, Image, FileText, Download, Trash2, Tag, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Attachment {
  id: string;
  entity_type: 'report' | 'equipment' | 'quote';
  entity_id: string;
  file_name: string;
  file_path: string;
  custom_label?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  created_by: string;
}

interface ReportDetailsProps {
  reportId: string;
  onClose: () => void;
}

const ReportDetails: React.FC<ReportDetailsProps> = ({ reportId, onClose }) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttachments();
  }, [reportId]);

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('entity_type', 'report')
        .eq('entity_id', reportId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Errore nel caricamento allegati:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setSelectedFile(file);
    setCustomLabel(file.name.split('.')[0]); // Nome file senza estensione come default
    setShowLabelModal(true);
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

  const uploadFile = async () => {
    if (!selectedFile) return;

    // Verifica che il bucket 'attachments' esista
    setUploading(true);
    try {
      // Genera un nome file unico
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `reports/${reportId}/${fileName}`;

      // Upload file to Supabase Storage (bucket 'attachments')
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Salva i metadati nel database
      const { error: dbError } = await supabase
        .from('attachments')
        .insert({
          entity_type: 'report',
          entity_id: reportId,
          file_name: selectedFile.name,
          file_path: filePath,
          custom_label: customLabel || selectedFile.name,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          created_by: 'sistema'
        });

      if (dbError) throw dbError;

      await fetchAttachments();
      setShowLabelModal(false);
      setSelectedFile(null);
      setCustomLabel('');
    } catch (error) {
      console.error('Errore nel caricamento file:', error);
      
      // Gestisci errori specifici
      if (error.message?.includes('Bucket not found')) {
        alert('Errore: Il bucket per gli allegati non è configurato. Contatta l\'amministratore.');
      } else if (error.message?.includes('The resource was not found')) {
        alert('Errore: Servizio di storage non disponibile. Riprova più tardi.');
      } else {
        alert('Errore nel caricamento del file. Verifica la connessione e riprova.');
      }
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (attachmentId: string, filePath: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo allegato?')) return;

    try {
      // Elimina il record dal database
      const { error: dbError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachmentId);

      if (dbError) throw dbError;

      // Prova a eliminare il file dallo storage (non bloccante)
      try {
        await supabase.storage
          .from('attachments')
          .remove([filePath]);
      } catch (storageError) {
        console.warn('Impossibile eliminare il file dallo storage:', storageError);
        // Non bloccare l'operazione se il file non può essere eliminato dallo storage
      }

      await fetchAttachments();
    } catch (error) {
      console.error('Errore nell\'eliminazione allegato:', error);
      alert('Errore nell\'eliminazione dell\'allegato');
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      // Prova prima a ottenere un URL pubblico
      const { data: urlData } = await supabase.storage
        .from('attachments')
        .createSignedUrl(filePath, 60); // URL valido per 60 secondi

      if (urlData?.signedUrl) {
        // Usa l'URL firmato per il download
        const a = document.createElement('a');
        a.href = urlData.signedUrl;
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Fallback: prova il download diretto
        const { data, error } = await supabase.storage
          .from('attachments')
          .download(filePath);

        if (error) throw error;

        // Crea un URL per il download
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Errore nel download file:', error);
      alert('Errore nel download del file. Il file potrebbe non essere più disponibile.');
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File size={20} className="text-brand-gray" />;
    
    if (mimeType.startsWith('image/')) {
      return <Image size={20} className="text-brand-blue" />;
    } else if (mimeType.includes('pdf') || mimeType.includes('document')) {
      return <FileText size={20} className="text-brand-red" />;
    } else {
      return <File size={20} className="text-brand-gray" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brand-coral/20 bg-gradient-to-r from-brand-blue/5 to-brand-coral/5">
          <h2 className="text-xl font-bold text-brand-blue">Allegati Segnalazione</h2>
          <button
            onClick={onClose}
            className="p-2 text-brand-gray hover:text-brand-red transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              dragOver
                ? 'border-brand-red bg-brand-red/5'
                : 'border-brand-gray/30 hover:border-brand-coral'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload size={48} className={`mx-auto mb-4 ${dragOver ? 'text-brand-red' : 'text-brand-gray'}`} />
            <h3 className="text-lg font-medium text-brand-blue mb-2">
              Carica un nuovo allegato
            </h3>
            <p className="text-brand-gray mb-4">
              Trascina i file qui o clicca per selezionare
            </p>
            <p className="text-xs text-brand-gray mb-4">
              Formati supportati: immagini, PDF, documenti Word, Excel, file di testo
            </p>
            <input
              type="file"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id="file-upload"
              accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls"
            />
            <label
              htmlFor="file-upload"
              className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-3 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 cursor-pointer inline-flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <Plus size={20} />
              <span>Seleziona File</span>
            </label>
          </div>

          {/* Attachments List */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-brand-blue mb-4">
              Allegati ({attachments.length})
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
              </div>
            ) : attachments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-4 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          {getFileIcon(attachment.mime_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Tag size={14} className="text-brand-coral" />
                            <h4 className="font-medium text-brand-blue truncate">
                              {attachment.custom_label || attachment.file_name}
                            </h4>
                          </div>
                          <p className="text-sm text-brand-gray truncate">
                            {attachment.file_name}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-brand-gray">
                            <span>{formatFileSize(attachment.file_size)}</span>
                            <span>{new Date(attachment.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <button
                          onClick={() => downloadFile(attachment.file_path, attachment.file_name)}
                          className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
                          title="Scarica file"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => deleteAttachment(attachment.id, attachment.file_path)}
                          className="p-2 text-brand-gray hover:text-brand-red transition-colors"
                          title="Elimina"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <File size={48} className="mx-auto text-brand-gray mb-4" />
                <h4 className="text-lg font-medium text-brand-blue mb-2">Nessun allegato</h4>
                <p className="text-brand-gray">Carica il primo allegato per questa segnalazione.</p>
              </div>
            )}
          </div>
        </div>

        {/* Label Modal */}
        {showLabelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-brand-blue mb-4">Aggiungi Etichetta</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Nome File
                  </label>
                  <p className="text-sm text-brand-gray bg-brand-gray/10 p-2 rounded">
                    {selectedFile?.name}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Etichetta Personalizzata
                  </label>
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Es: Foto del problema, Preventivo riparazione..."
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowLabelModal(false);
                    setSelectedFile(null);
                    setCustomLabel('');
                  }}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                  disabled={uploading}
                >
                  Annulla
                </button>
                <button
                  onClick={uploadFile}
                  disabled={uploading}
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Caricamento...' : 'Carica File'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportDetails;
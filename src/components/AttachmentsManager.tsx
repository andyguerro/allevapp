import React, { useState, useEffect } from 'react';
import { X, Upload, File, Image, FileText, Download, Trash2, Tag, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Attachment {
  id: string;
  entity_type: 'report' | 'equipment' | 'quote' | 'facility';
  entity_id: string;
  file_name: string;
  file_path: string;
  custom_label?: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  created_by: string;
}

interface AttachmentsManagerProps {
  entityType: 'report' | 'equipment' | 'quote' | 'facility';
  entityId: string;
  entityName: string;
  onClose: () => void;
}

const AttachmentsManager: React.FC<AttachmentsManagerProps> = ({ 
  entityType, 
  entityId, 
  entityName, 
  onClose 
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showEditLabelModal, setShowEditLabelModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customLabel, setCustomLabel] = useState('');
  const [editingAttachment, setEditingAttachment] = useState<Attachment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttachments();
  }, [entityType, entityId]);

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
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
    
    // Verifica dimensione file (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Il file è troppo grande. Dimensione massima: 10MB');
      return;
    }
    
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

    setUploading(true);
    try {
      // Get current user from localStorage (since we're not using Supabase auth)
      const currentUserStr = localStorage.getItem('allevapp_current_user');
      let currentUser = null;
      
      if (currentUserStr) {
        try {
          currentUser = JSON.parse(currentUserStr);
        } catch (error) {
          console.error('Error parsing current user:', error);
        }
      }

      // Genera un nome file unico
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${entityType}/${entityId}/${fileName}`;

      // Try to upload file to Supabase Storage
      try {
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, selectedFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          
          if (uploadError.message?.includes('new row violates row-level security policy') || 
              uploadError.message?.includes('JWT expired') ||
              uploadError.message?.includes('Invalid JWT')) {
            alert('⚠️ POLICY DI SICUREZZA\n\nLe policy di sicurezza del bucket impediscono il caricamento.\n\nPer risolvere:\n\n1. Vai su Supabase Dashboard\n2. Storage → attachments → Policies\n3. Crea policy con target role "public" (non "authenticated")\n4. USING expression: true\n5. Oppure disabilita RLS temporaneamente\n\nIl problema è che non c\'è autenticazione attiva.');
            return;
          }
          
          throw uploadError;
        }
      } catch (storageError) {
        console.error('Storage error:', storageError);
        alert('⚠️ ERRORE STORAGE\n\nProblema nel caricamento del file:\n\n' + storageError.message + '\n\nSoluzioni:\n1. Verifica policy bucket (usa "public" invece di "authenticated")\n2. Controlla dimensione file (max 10MB)\n3. Verifica formato file supportato\n4. Considera di disabilitare RLS temporaneamente');
        return;
      }

      // Use current user or get a default user from the users table
      let userId = currentUser?.id;
      
      if (!userId) {
        const { data: defaultUser, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('active', true)
          .limit(1)
          .single();

        if (userError || !defaultUser) {
          console.error('No active user found:', userError);
          alert('⚠️ UTENTE MANCANTE\n\nNon è possibile salvare i metadati dell\'allegato.\n\nSoluzione:\n1. Effettua il login\n2. Oppure vai su Impostazioni → Utenti e crea almeno un utente attivo\n3. Riprova il caricamento');
          return;
        }
        
        userId = defaultUser.id;
      }

      // Salva i metadati nel database
      const { error: dbError } = await supabase
        .from('attachments')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          file_name: selectedFile.name,
          file_path: filePath,
          custom_label: customLabel || selectedFile.name,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          created_by: userId
        });

      if (dbError) throw dbError;

      await fetchAttachments();
      setShowLabelModal(false);
      setSelectedFile(null);
      setCustomLabel('');
    } catch (error) {
      console.error('Errore nel caricamento file:', error);
      
      // Gestisci errori specifici del database
      if (error.message?.includes('new row violates row-level security policy')) {
        alert('⚠️ POLICY DATABASE\n\nLe policy di sicurezza della tabella attachments impediscono l\'inserimento.\n\nSoluzione:\n1. Vai su Supabase Dashboard\n2. Database → attachments → RLS\n3. Crea policy con target role "public"\n4. Oppure disabilita RLS temporaneamente');
      } else if (error.message?.includes('duplicate key value')) {
        alert('Errore: File già esistente. Riprova con un nome diverso.');
      } else {
        alert('⚠️ ERRORE GENERICO\n\nErrore nel caricamento del file:\n\n' + error.message + '\n\nVerifica:\n1. Policy bucket e tabella configurate per "public"\n2. Connessione internet\n3. Configurazione Supabase');
      }
    } finally {
      setUploading(false);
    }
  };

  const updateAttachmentLabel = async () => {
    if (!editingAttachment) return;

    try {
      const { error } = await supabase
        .from('attachments')
        .update({ custom_label: customLabel })
        .eq('id', editingAttachment.id);

      if (error) throw error;

      await fetchAttachments();
      setShowEditLabelModal(false);
      setEditingAttachment(null);
      setCustomLabel('');
    } catch (error) {
      console.error('Errore nell\'aggiornamento etichetta:', error);
      alert('Errore nell\'aggiornamento dell\'etichetta');
    }
  };

  const startEditLabel = (attachment: Attachment) => {
    setEditingAttachment(attachment);
    setCustomLabel(attachment.custom_label || attachment.file_name);
    setShowEditLabelModal(true);
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

  const getEntityTypeText = (type: string) => {
    switch (type) {
      case 'report': return 'Segnalazione';
      case 'equipment': return 'Attrezzatura';
      case 'facility': return 'Impianto';
      case 'quote': return 'Preventivo';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-brand-coral/20 bg-gradient-to-r from-brand-blue/5 to-brand-coral/5">
          <h2 className="text-lg sm:text-xl font-bold text-brand-blue pr-4">
            Allegati {getEntityTypeText(entityType)}: {entityName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-brand-gray hover:text-brand-red transition-colors flex-shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-4 sm:p-8 text-center transition-all duration-200 ${
              dragOver
                ? 'border-brand-red bg-brand-red/5'
                : 'border-brand-gray/30 hover:border-brand-coral'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload size={32} className={`mx-auto mb-3 sm:mb-4 ${dragOver ? 'text-brand-red' : 'text-brand-gray'} sm:w-12 sm:h-12`} />
            <h3 className="text-base sm:text-lg font-medium text-brand-blue mb-2">
              Carica un nuovo allegato
            </h3>
            <p className="text-sm sm:text-base text-brand-gray mb-3 sm:mb-4">
              <span className="hidden sm:inline">Trascina i file qui o </span>Tocca per selezionare
            </p>
            <p className="text-xs text-brand-gray mb-3 sm:mb-4">
              Formati supportati: immagini, PDF, documenti Word, Excel, file di testo<br/>
              Dimensione massima: 10MB
            </p>
            
            {/* Storage Status Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 sm:mb-4 text-left">
              <div className="flex items-start space-x-2">
                <div className="text-yellow-600 mt-0.5">⚠️</div>
                <div className="text-sm text-yellow-800">
                  <strong>Nota:</strong> Se il caricamento non funziona, potrebbe essere necessario configurare il sistema di storage in Supabase.
                  <br/>
                  <span className="text-xs">Contatta l'amministratore per la configurazione del bucket "attachments".</span>
                </div>
              </div>
            </div>
            
            <input
              type="file"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              id="file-upload"
              accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls"
              capture="environment"
              multiple
            />
            <label
              htmlFor="file-upload"
              className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-3 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 cursor-pointer inline-flex items-center space-x-2 shadow-lg hover:shadow-xl text-base font-medium min-h-[48px] touch-manipulation"
            >
              <Plus size={18} className="sm:w-5 sm:h-5" />
              <span>📱 Seleziona File</span>
            </label>
            
            {/* Mobile Camera Button */}
            <div className="mt-3 sm:hidden">
              <input
                type="file"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                id="camera-upload"
                accept="image/*"
                capture="environment"
              />
              <label
                htmlFor="camera-upload"
                className="bg-gradient-to-r from-brand-blue to-brand-blue-light text-white px-6 py-3 rounded-lg hover:from-brand-blue-dark hover:to-brand-blue transition-all duration-200 cursor-pointer inline-flex items-center space-x-2 shadow-lg hover:shadow-xl text-base font-medium min-h-[48px] touch-manipulation"
              >
                <span>📷</span>
                <span>Scatta Foto</span>
              </label>
            </div>
          </div>

          {/* Attachments List */}
          <div className="mt-6 sm:mt-8">
            <h3 className="text-base sm:text-lg font-semibold text-brand-blue mb-3 sm:mb-4">
              Allegati ({attachments.length})
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
              </div>
            ) : attachments.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-3 sm:p-4 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          {getFileIcon(attachment.mime_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1 sm:space-x-2 mb-1">
                            <Tag size={14} className="text-brand-coral" />
                            <h4 className="font-medium text-brand-blue truncate text-sm sm:text-base">
                              {attachment.custom_label || attachment.file_name}
                            </h4>
                          </div>
                          <p className="text-xs sm:text-sm text-brand-gray truncate">
                            {attachment.file_name}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1 sm:mt-2 text-xs text-brand-gray space-y-1 sm:space-y-0">
                            <span>{formatFileSize(attachment.file_size)}</span>
                            <span>{new Date(attachment.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-1 ml-2 flex-shrink-0">
                        <button
                          onClick={() => startEditLabel(attachment)}
                          className="p-1.5 sm:p-2 text-brand-gray hover:text-brand-coral transition-colors rounded"
                          title="Modifica etichetta"
                        >
                          <Tag size={14} className="sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => downloadFile(attachment.file_path, attachment.file_name)}
                          className="p-1.5 sm:p-2 text-brand-gray hover:text-brand-blue transition-colors rounded"
                          title="Scarica file"
                        >
                          <Download size={14} className="sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => deleteAttachment(attachment.id, attachment.file_path)}
                          className="p-1.5 sm:p-2 text-brand-gray hover:text-brand-red transition-colors rounded"
                          title="Elimina"
                        >
                          <Trash2 size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <File size={32} className="mx-auto text-brand-gray mb-3 sm:mb-4 sm:w-12 sm:h-12" />
                <h4 className="text-base sm:text-lg font-medium text-brand-blue mb-2">Nessun allegato</h4>
                <p className="text-sm sm:text-base text-brand-gray">Carica il primo allegato per questo {getEntityTypeText(entityType).toLowerCase()}.</p>
              </div>
            )}
          </div>
        </div>

        {/* Label Modal */}
        {showLabelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-md mx-4">
              <h3 className="text-base sm:text-lg font-bold text-brand-blue mb-4">Aggiungi Etichetta</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-brand-blue mb-2">
                    Nome File
                  </label>
                  <p className="text-xs sm:text-sm text-brand-gray bg-brand-gray/10 p-2 rounded break-all">
                    {selectedFile?.name}
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-brand-blue mb-2">
                    Etichetta Personalizzata
                  </label>
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Es: Foto del problema, Manuale d'uso, Certificato..."
                    className="w-full px-3 py-2 text-sm border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowLabelModal(false);
                    setSelectedFile(null);
                    setCustomLabel('');
                  }}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors text-sm sm:text-base"
                  disabled={uploading}
                >
                  Annulla
                </button>
                <button
                  onClick={uploadFile}
                  disabled={uploading}
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-4 sm:px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {uploading ? 'Caricamento...' : 'Carica File'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Label Modal */}
        {showEditLabelModal && editingAttachment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-md mx-4">
              <h3 className="text-base sm:text-lg font-bold text-brand-blue mb-4">Modifica Etichetta</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-brand-blue mb-2">
                    Nome File Originale
                  </label>
                  <p className="text-xs sm:text-sm text-brand-gray bg-brand-gray/10 p-2 rounded break-all">
                    {editingAttachment.file_name}
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-brand-blue mb-2">
                    Etichetta Personalizzata
                  </label>
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Es: Foto del problema, Manuale d'uso, Certificato..."
                    className="w-full px-3 py-2 text-sm border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditLabelModal(false);
                    setEditingAttachment(null);
                    setCustomLabel('');
                  }}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors text-sm sm:text-base"
                >
                  Annulla
                </button>
                <button
                  onClick={updateAttachmentLabel}
                  className="bg-gradient-to-r from-brand-coral to-brand-coral-light text-white px-4 sm:px-6 py-2 rounded-lg hover:from-brand-coral-light hover:to-brand-coral transition-all duration-200 text-sm sm:text-base"
                >
                  Aggiorna Etichetta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttachmentsManager;
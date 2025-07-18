import React, { useState, useEffect } from 'react';
import { FileText, Upload, Plus, Search, Filter, Download, Trash2, Edit, Tag, Calendar, AlertCircle, Eye, X, Save, FolderOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SearchFilters, { Option } from './SearchFilters';

interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  created_at: string;
}

interface FarmDocument {
  id: string;
  farm_id: string;
  category_id?: string;
  title: string;
  description?: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  document_date?: string;
  expiry_date?: string;
  tags?: string[];
  is_important: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  farm_name?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  created_user_name?: string;
}

interface Farm {
  id: string;
  name: string;
  company: string;
}

interface DocumentsManagementProps {
  currentUser?: any;
  userFarms?: string[];
  initialFilters?: {
    farmId?: string;
  };
}

const DocumentsManagement: React.FC<DocumentsManagementProps> = ({ currentUser, userFarms = [] }) => {
  const [documents, setDocuments] = useState<FarmDocument[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, Option[]>>({
    category: [],
    farm: [],
    important: []
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [filterOptions, setFilterOptions] = useState<Array<{ id: string; label: string; options: Option[] }>>([]);

  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    farm_id: '',
    category_id: '',
    document_date: '',
    expiry_date: '',
    tags: '',
    is_important: false
  });

  const [categoryData, setCategoryData] = useState({
    name: '',
    description: '',
    color: '#6b7280',
    icon: 'folder'
  });

  const iconOptions = [
    { value: 'folder', label: '📁 Cartella' },
    { value: 'file-text', label: '📄 Documento' },
    { value: 'award', label: '🏆 Certificato' },
    { value: 'shield', label: '🛡️ Licenza' },
    { value: 'receipt', label: '🧾 Fattura' },
    { value: 'book', label: '📚 Manuale' },
    { value: 'heart', label: '❤️ Sanitario' },
    { value: 'file-bar-chart', label: '📊 Relazione' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch documents with joined data
      let documentsQuery = supabase
        .from('farm_documents')
        .select(`
          *,
          farms(name, company),
          document_categories(name, color, icon),
          users!farm_documents_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      // Filter by user farms if they're a technician
      if (currentUser?.role === 'technician' && userFarms.length > 0) {
        documentsQuery = documentsQuery.in('farm_id', userFarms);
      }

      const { data: documentsData, error: documentsError } = await documentsQuery;
      if (documentsError) throw documentsError;

      // Transform documents data
      const transformedDocuments = documentsData.map(doc => ({
        ...doc,
        farm_name: doc.farms?.name,
        category_name: doc.document_categories?.name,
        category_color: doc.document_categories?.color,
        category_icon: doc.document_categories?.icon,
        created_user_name: doc.users?.full_name
      }));

      setDocuments(transformedDocuments);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('document_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData);

      // Fetch farms
      let farmsQuery = supabase
        .from('farms')
        .select('id, name, company')
        .order('name');

      if (currentUser?.role === 'technician' && userFarms.length > 0) {
        farmsQuery = farmsQuery.in('id', userFarms);
      }

      const { data: farmsData, error: farmsError } = await farmsQuery;
      if (farmsError) throw farmsError;
      setFarms(farmsData);

      // Prepare filter options
      const categoryOptions: Option[] = categoriesData.map(cat => ({
        value: cat.id,
        label: cat.name
      }));

      const farmOptions: Option[] = farmsData.map(farm => ({
        value: farm.id,
        label: `${farm.name} (${farm.company})`
      }));

      const importantOptions: Option[] = [
        { value: 'true', label: 'Importante' },
        { value: 'false', label: 'Normale' }
      ];

      setFilterOptions([
        {
          id: 'category',
          label: 'Categoria',
          options: categoryOptions
        },
        {
          id: 'farm',
          label: 'Allevamento',
          options: farmOptions
        },
        {
          id: 'important',
          label: 'Priorità',
          options: importantOptions
        }
      ]);

    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Verifica dimensione file (max 50MB per documenti)
    if (file.size > 50 * 1024 * 1024) {
      alert('Il file è troppo grande. Dimensione massima: 50MB');
      return;
    }
    
    setSelectedFile(file);
    setUploadData(prev => ({
      ...prev,
      title: file.name.split('.')[0] // Nome file senza estensione come default
    }));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !currentUser) {
      alert('Seleziona un file e assicurati di essere loggato');
      return;
    }

    setUploading(true);
    try {
      // Genera un nome file unico
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `documents/${uploadData.farm_id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Errore nel caricamento del file. Verifica la configurazione dello storage.');
        return;
      }

      // Parse tags
      const tagsArray = uploadData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Save document metadata
      const { error: dbError } = await supabase
        .from('farm_documents')
        .insert({
          farm_id: uploadData.farm_id,
          category_id: uploadData.category_id || null,
          title: uploadData.title,
          description: uploadData.description || null,
          file_name: selectedFile.name,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          document_date: uploadData.document_date || null,
          expiry_date: uploadData.expiry_date || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
          is_important: uploadData.is_important,
          created_by: currentUser.id
        });

      if (dbError) throw dbError;

      await fetchData();
      resetUploadForm();
      alert('Documento caricato con successo!');
    } catch (error) {
      console.error('Errore nel caricamento documento:', error);
      alert('Errore nel caricamento del documento');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const categoryPayload = {
        name: categoryData.name,
        description: categoryData.description || null,
        color: categoryData.color,
        icon: categoryData.icon
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('document_categories')
          .update(categoryPayload)
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('document_categories')
          .insert([categoryPayload]);

        if (error) throw error;
      }

      await fetchData();
      resetCategoryForm();
    } catch (error) {
      console.error('Errore nel salvare categoria:', error);
      alert('Errore nel salvare la categoria');
    }
  };

  const handleDeleteDocument = async (documentId: string, filePath: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('farm_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      // Try to delete file from storage (non-blocking)
      try {
        await supabase.storage
          .from('attachments')
          .remove([filePath]);
      } catch (storageError) {
        console.warn('Could not delete file from storage:', storageError);
      }

      await fetchData();
    } catch (error) {
      console.error('Errore nell\'eliminazione documento:', error);
      alert('Errore nell\'eliminazione del documento');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa categoria? I documenti associati non verranno eliminati.')) return;

    try {
      const { error } = await supabase
        .from('document_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Errore nell\'eliminazione categoria:', error);
      alert('Errore nell\'eliminazione della categoria');
    }
  };

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data: urlData } = await supabase.storage
        .from('attachments')
        .createSignedUrl(filePath, 60);

      if (urlData?.signedUrl) {
        const a = document.createElement('a');
        a.href = urlData.signedUrl;
        a.download = fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        throw new Error('Could not generate download URL');
      }
    } catch (error) {
      console.error('Errore nel download:', error);
      alert('Errore nel download del documento');
    }
  };

  const resetUploadForm = () => {
    setUploadData({
      title: '',
      description: '',
      farm_id: '',
      category_id: '',
      document_date: '',
      expiry_date: '',
      tags: '',
      is_important: false
    });
    setSelectedFile(null);
    setShowUploadModal(false);
  };

  const resetCategoryForm = () => {
    setCategoryData({
      name: '',
      description: '',
      color: '#6b7280',
      icon: 'folder'
    });
    setEditingCategory(null);
    setShowCategoryModal(false);
  };

  const handleFilterChange = (filterId: string, selected: Option[]) => {
    setSelectedFilters(prev => ({ ...prev, [filterId]: selected }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      category: [],
      farm: [],
      important: []
    });
    setSearchTerm('');
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return '📄';
    
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    
    return '📄';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.farm_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedFilters.category.length === 0 || 
                           (doc.category_id && selectedFilters.category.some(option => option.value === doc.category_id));
    
    const matchesFarm = selectedFilters.farm.length === 0 || 
                        selectedFilters.farm.some(option => option.value === doc.farm_id);
    
    const matchesImportant = selectedFilters.important.length === 0 || 
                            selectedFilters.important.some(option => option.value === doc.is_important.toString());
    
    return matchesSearch && matchesCategory && matchesFarm && matchesImportant;
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
        <h1 className="text-3xl font-bold text-brand-blue">Gestione Documenti</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-gradient-to-r from-brand-coral to-brand-coral-light text-white px-4 py-2 rounded-lg hover:from-brand-coral-light hover:to-brand-coral transition-all duration-200 flex items-center space-x-2"
          >
            <Tag size={16} />
            <span>Gestisci Categorie</span>
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-3 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus size={20} />
            <span>Carica Documento</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Totali</p>
              <p className="text-2xl font-bold text-brand-blue">{documents.length}</p>
            </div>
            <FileText size={24} className="text-brand-blue" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Importanti</p>
              <p className="text-2xl font-bold text-brand-red">
                {documents.filter(d => d.is_important).length}
              </p>
            </div>
            <AlertCircle size={24} className="text-brand-red" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">In Scadenza</p>
              <p className="text-2xl font-bold text-yellow-600">
                {documents.filter(d => isExpiringSoon(d.expiry_date)).length}
              </p>
            </div>
            <Calendar size={24} className="text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Categorie</p>
              <p className="text-2xl font-bold text-brand-coral">{categories.length}</p>
            </div>
            <Tag size={24} className="text-brand-coral" />
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
        placeholder="Cerca documenti..."
      />

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocuments.map((document) => (
          <div key={document.id} className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">
                  {getFileIcon(document.mime_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-brand-blue truncate">{document.title}</h3>
                  <p className="text-sm text-brand-gray">{document.farm_name}</p>
                  {document.is_important && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 mt-1">
                      <AlertCircle size={12} className="mr-1" />
                      Importante
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => downloadDocument(document.file_path, document.file_name)}
                  className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
                  title="Scarica documento"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => handleDeleteDocument(document.id, document.file_path)}
                  className="p-2 text-brand-gray hover:text-brand-red transition-colors"
                  title="Elimina documento"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {document.category_name && (
                <div className="flex items-center space-x-2">
                  <span 
                    className="px-3 py-1 rounded-full text-sm font-medium text-white"
                    style={{ backgroundColor: document.category_color }}
                  >
                    {document.category_name}
                  </span>
                </div>
              )}

              {document.description && (
                <p className="text-sm text-brand-gray">{document.description}</p>
              )}

              <div className="text-sm text-brand-gray space-y-1">
                <div>File: {document.file_name}</div>
                <div>Dimensione: {formatFileSize(document.file_size)}</div>
                {document.document_date && (
                  <div>Data: {new Date(document.document_date).toLocaleDateString()}</div>
                )}
                {document.expiry_date && (
                  <div className={`${isExpired(document.expiry_date) ? 'text-red-600 font-medium' : isExpiringSoon(document.expiry_date) ? 'text-yellow-600 font-medium' : ''}`}>
                    Scadenza: {new Date(document.expiry_date).toLocaleDateString()}
                    {isExpired(document.expiry_date) && ' (Scaduto)'}
                    {isExpiringSoon(document.expiry_date) && !isExpired(document.expiry_date) && ' (In scadenza)'}
                  </div>
                )}
              </div>

              {document.tags && document.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {document.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-brand-blue/10 text-brand-blue rounded-full text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-xs text-brand-gray pt-2 border-t border-brand-coral/20">
                Caricato da {document.created_user_name} il {new Date(document.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Carica Nuovo Documento</h2>
            
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  File *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                />
                {selectedFile && (
                  <p className="text-sm text-brand-gray mt-1">
                    File selezionato: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Titolo *
                </label>
                <input
                  type="text"
                  required
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Allevamento *
                  </label>
                  <select
                    required
                    value={uploadData.farm_id}
                    onChange={(e) => setUploadData({ ...uploadData, farm_id: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    <option value="">Seleziona allevamento</option>
                    {farms.map(farm => (
                      <option key={farm.id} value={farm.id}>
                        {farm.name} ({farm.company})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Categoria
                  </label>
                  <select
                    value={uploadData.category_id}
                    onChange={(e) => setUploadData({ ...uploadData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    <option value="">Nessuna categoria</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Descrizione
                </label>
                <textarea
                  rows={3}
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Data Documento
                  </label>
                  <input
                    type="date"
                    value={uploadData.document_date}
                    onChange={(e) => setUploadData({ ...uploadData, document_date: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Data Scadenza
                  </label>
                  <input
                    type="date"
                    value={uploadData.expiry_date}
                    onChange={(e) => setUploadData({ ...uploadData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Tag (separati da virgola)
                </label>
                <input
                  type="text"
                  value={uploadData.tags}
                  onChange={(e) => setUploadData({ ...uploadData, tags: e.target.value })}
                  placeholder="es: contratto, 2025, importante"
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="is_important"
                  checked={uploadData.is_important}
                  onChange={(e) => setUploadData({ ...uploadData, is_important: e.target.checked })}
                  className="h-4 w-4 text-brand-red focus:ring-brand-red border-brand-gray/30 rounded"
                />
                <label htmlFor="is_important" className="text-sm font-medium text-brand-blue">
                  Documento importante
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetUploadForm}
                  className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Caricamento...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      <span>Carica Documento</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-brand-blue">Gestione Categorie</h2>
              <button
                onClick={resetCategoryForm}
                className="p-2 text-brand-gray hover:text-brand-red transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Create/Edit Category Form */}
            <form onSubmit={handleCreateCategory} className="mb-6 p-4 bg-brand-blue/5 rounded-lg border border-brand-blue/20">
              <h3 className="text-lg font-semibold text-brand-blue mb-4">
                {editingCategory ? 'Modifica Categoria' : 'Nuova Categoria'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryData.name}
                    onChange={(e) => setCategoryData({ ...categoryData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Icona
                  </label>
                  <select
                    value={categoryData.icon}
                    onChange={(e) => setCategoryData({ ...categoryData, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  >
                    {iconOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Colore
                  </label>
                  <input
                    type="color"
                    value={categoryData.color}
                    onChange={(e) => setCategoryData({ ...categoryData, color: e.target.value })}
                    className="w-full h-10 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Descrizione
                  </label>
                  <input
                    type="text"
                    value={categoryData.description}
                    onChange={(e) => setCategoryData({ ...categoryData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-4">
                {editingCategory && (
                  <button
                    type="button"
                    onClick={resetCategoryForm}
                    className="px-4 py-2 text-brand-gray hover:text-brand-blue transition-colors"
                  >
                    Annulla
                  </button>
                )}
                <button
                  type="submit"
                  className="bg-gradient-to-r from-brand-coral to-brand-coral-light text-white px-6 py-2 rounded-lg hover:from-brand-coral-light hover:to-brand-coral transition-all duration-200 flex items-center space-x-2"
                >
                  <Save size={16} />
                  <span>{editingCategory ? 'Aggiorna' : 'Crea'} Categoria</span>
                </button>
              </div>
            </form>

            {/* Categories List */}
            <div>
              <h3 className="text-lg font-semibold text-brand-blue mb-4">Categorie Esistenti</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <div key={category.id} className="p-4 border border-brand-coral/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        ></span>
                        <span className="font-medium text-brand-blue">{category.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setCategoryData({
                              name: category.name,
                              description: category.description || '',
                              color: category.color,
                              icon: category.icon
                            });
                            setEditingCategory(category);
                          }}
                          className="p-1 text-brand-gray hover:text-brand-coral transition-colors"
                          title="Modifica categoria"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-1 text-brand-gray hover:text-brand-red transition-colors"
                          title="Elimina categoria"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {category.description && (
                      <p className="text-sm text-brand-gray">{category.description}</p>
                    )}
                    <p className="text-xs text-brand-gray mt-2">
                      {documents.filter(d => d.category_id === category.id).length} documenti
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-brand-gray mb-4" />
          <h3 className="text-lg font-medium text-brand-blue mb-2">Nessun documento trovato</h3>
          <p className="text-brand-gray">
            {documents.length === 0 
              ? 'Carica il primo documento per iniziare.' 
              : 'Prova a modificare i filtri di ricerca.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default DocumentsManagement;

import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, Edit, Eye, Calendar, Building, FileText, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SearchFilters, { Option } from './SearchFilters';

interface Project {
  id: string;
  title: string;
  description?: string;
  project_number: string;
  company: string;
  sequential_number: number;
  farm_id: string;
  status: 'open' | 'defined' | 'in_progress' | 'completed' | 'discarded';
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  farm_name?: string;
  created_user_name?: string;
  quotes_count?: number;
  total_quotes_value?: number;
}

interface Farm {
  id: string;
  name: string;
  company: string;
}

interface User {
  id: string;
  full_name: string;
}

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, Option[]>>({
    status: [],
    company: [],
    farm: []
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Prepare filter options
  const [filterOptions, setFilterOptions] = useState<Array<{ id: string; label: string; options: Option[] }>>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    farm_id: '',
    status: 'open' as 'open' | 'defined' | 'in_progress' | 'completed' | 'discarded'
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Apply initial farm filter when component mounts
  useEffect(() => {
    if (initialFilters?.farmId && farms.length > 0) {
      const farm = farms.find(f => f.id === initialFilters.farmId);
      if (farm) {
        setSelectedFilters(prev => ({
          ...prev,
          farm: [{ value: farm.id, label: farm.name }]
        }));
      }
    }
  }, [initialFilters?.farmId, farms]);

  const fetchData = async () => {
    try {
      // Fetch projects with joined data and quotes count
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          farms(name, company),
          users!projects_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Get quotes count and total value for each project
      const projectsWithQuotes = await Promise.all(
        projectsData.map(async (project) => {
          const { data: quotes, error: quotesError } = await supabase
            .from('quotes')
            .select('amount')
            .eq('farm_id', project.farm_id)
            .gte('created_at', project.created_at);

          if (quotesError) {
            console.error('Error fetching quotes for project:', quotesError);
          }

          const quotesCount = quotes?.length || 0;
          const totalValue = quotes?.reduce((sum, quote) => sum + (quote.amount || 0), 0) || 0;

          return {
            ...project,
            farm_name: project.farms?.name,
            created_user_name: project.users?.full_name,
            quotes_count: quotesCount,
            total_quotes_value: totalValue
          };
        })
      );

      setProjects(projectsWithQuotes);

      // Fetch farms
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id, name, company');

      if (farmsError) throw farmsError;
      setFarms(farmsData);

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('active', true);

      if (usersError) throw usersError;
      setUsers(usersData);

      // Prepare filter options
      const statusOptions: Option[] = [
        { value: 'open', label: 'Aperto' },
        { value: 'defined', label: 'Definito' },
        { value: 'in_progress', label: 'In Corso' },
        { value: 'completed', label: 'Concluso' },
        { value: 'discarded', label: 'Scartato' }
      ];

      const companyOptions: Option[] = [
        { value: 'Zoogamma Spa', label: 'Zoogamma Spa' },
        { value: 'So. Agr. Zooagri Srl', label: 'So. Agr. Zooagri Srl' },
        { value: 'Soc. Agr. Zooallevamenti Srl', label: 'Soc. Agr. Zooallevamenti Srl' }
      ];

      const farmOptions: Option[] = farmsData.map(farm => ({
        value: farm.id,
        label: farm.name
      }));

      setFilterOptions([
        {
          id: 'status',
          label: 'Stato',
          options: statusOptions
        },
        {
          id: 'company',
          label: 'Azienda',
          options: companyOptions
        },
        {
          id: 'farm',
          label: 'Allevamento',
          options: farmOptions
        }
      ]);

    } catch (error) {
      console.error('Errore nel caricamento dati:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      let createdBy = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Default fallback
      if (user) {
        createdBy = user.id;
      }

      const { error } = await supabase
        .from('projects')
        .insert({
          title: formData.title,
          description: formData.description || null,
          farm_id: formData.farm_id,
          status: formData.status,
          created_by: createdBy
        });

      if (error) throw error;

      await fetchData();
      resetForm();
    } catch (error) {
      console.error('Errore nel creare progetto:', error);
      alert('Errore nel creare il progetto');
    }
  };

  const handleEdit = (project: Project) => {
    setFormData({
      title: project.title,
      description: project.description || '',
      farm_id: project.farm_id,
      status: project.status
    });
    setEditingProject(project);
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingProject) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          title: formData.title,
          description: formData.description || null,
          farm_id: formData.farm_id,
          status: formData.status
        })
        .eq('id', editingProject.id);

      if (error) throw error;

      await fetchData();
      resetEditForm();
    } catch (error) {
      console.error('Errore nell\'aggiornamento progetto:', error);
      alert('Errore nell\'aggiornamento del progetto');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      farm_id: '',
      status: 'open'
    });
    setShowCreateModal(false);
  };

  const resetEditForm = () => {
    setFormData({
      title: '',
      description: '',
      farm_id: '',
      status: 'open'
    });
    setEditingProject(null);
    setShowEditModal(false);
  };

  const handleFilterChange = (filterId: string, selected: Option[]) => {
    setSelectedFilters(prev => ({ ...prev, [filterId]: selected }));
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      status: [],
      company: [],
      farm: []
    });
    setSearchTerm('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'defined': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'discarded': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock size={16} className="text-blue-600" />;
      case 'defined': return <AlertCircle size={16} className="text-yellow-600" />;
      case 'in_progress': return <Clock size={16} className="text-green-600" />;
      case 'completed': return <CheckCircle size={16} className="text-blue-600" />;
      case 'discarded': return <AlertCircle size={16} className="text-red-600" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Aperto';
      case 'defined': return 'Definito';
      case 'in_progress': return 'In Corso';
      case 'completed': return 'Concluso';
      case 'discarded': return 'Scartato';
      default: return status;
    }
  };

  const getCompanyPrefix = (company: string) => {
    switch (company) {
      case 'Zoogamma Spa': return 'ZG';
      case 'So. Agr. Zooagri Srl': return 'ZR';
      case 'Soc. Agr. Zooallevamenti Srl': return 'ZL';
      default: return 'PR';
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.project_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.farm_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedFilters.status.length === 0 || 
                          selectedFilters.status.some(option => option.value === project.status);
    
    const matchesCompany = selectedFilters.company.length === 0 || 
                           selectedFilters.company.some(option => option.value === project.company);
    
    const matchesFarm = selectedFilters.farm.length === 0 || 
                        selectedFilters.farm.some(option => option.value === project.farm_id);
    
    return matchesSearch && matchesStatus && matchesCompany && matchesFarm;
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
        <h1 className="text-3xl font-bold text-brand-blue">Progetti</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-6 py-3 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Plus size={20} />
          <span>Nuovo Progetto</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Progetti Attivi</p>
              <p className="text-2xl font-bold text-green-600">
                {projects.filter(p => p.status === 'open' || p.status === 'defined' || p.status === 'in_progress').length}
              </p>
            </div>
            <Clock size={24} className="text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Completati</p>
              <p className="text-2xl font-bold text-blue-600">
                {projects.filter(p => p.status === 'completed').length}
              </p>
            </div>
            <CheckCircle size={24} className="text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Valore Totale</p>
              <p className="text-2xl font-bold text-brand-blue">
                €{projects.reduce((sum, p) => sum + (p.total_quotes_value || 0), 0).toLocaleString()}
              </p>
            </div>
            <FileText size={24} className="text-brand-blue" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Totali</p>
              <p className="text-2xl font-bold text-brand-blue">{projects.length}</p>
            </div>
            <FolderOpen size={24} className="text-brand-blue" />
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
        placeholder="Cerca progetti..."
      />

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <div key={project.id} className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-brand-blue/10 rounded-lg">
                  <FolderOpen size={24} className="text-brand-blue" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="text-lg font-semibold text-brand-blue">{project.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                      {getStatusText(project.status)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-brand-red/10 text-brand-red rounded-full text-sm font-bold">
                      {project.project_number}
                    </span>
                    <span className="text-sm text-brand-gray">{project.company}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleEdit(project)}
                  className="p-2 text-brand-gray hover:text-brand-coral transition-colors"
                  title="Modifica progetto"
                >
                  <Edit size={16} />
                </button>
                <button className="p-2 text-brand-gray hover:text-brand-blue transition-colors">
                  <Eye size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-brand-blue">Allevamento:</span>
                <p className="text-sm text-brand-gray">{project.farm_name}</p>
              </div>
              {project.description && (
                <div>
                  <span className="text-sm font-medium text-brand-blue">Descrizione:</span>
                  <p className="text-sm text-brand-gray">{project.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-brand-blue">Preventivi:</span>
                  <p className="text-sm text-brand-gray font-semibold">{project.quotes_count || 0}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-brand-blue">Valore:</span>
                  <p className="text-sm text-brand-gray font-semibold">
                    €{(project.total_quotes_value || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-brand-blue">Creato da:</span>
                <p className="text-sm text-brand-gray">{project.created_user_name}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-brand-blue">Data creazione:</span>
                <p className="text-sm text-brand-gray">{new Date(project.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Nuovo Progetto</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Titolo Progetto
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  placeholder="Es: Ristrutturazione Stalla A"
                />
              </div>

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
                    <option key={farm.id} value={farm.id}>
                      {farm.name} ({farm.company})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-brand-gray mt-1">
                  Il numero progetto sarà generato automaticamente in base all'azienda selezionata
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Descrizione (opzionale)
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  placeholder="Descrizione dettagliata del progetto..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Stato
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'open' | 'defined' | 'in_progress' | 'completed' | 'discarded' })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                >
                  <option value="open">Aperto</option>
                  <option value="defined">Definito</option>
                  <option value="in_progress">In Corso</option>
                  <option value="completed">Concluso</option>
                  <option value="discarded">Scartato</option>
                </select>
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
                  Crea Progetto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-brand-blue mb-4">Modifica Progetto</h2>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Numero Progetto
                </label>
                <div className="px-3 py-2 bg-brand-gray/10 border border-brand-gray/30 rounded-lg text-brand-gray">
                  {editingProject.project_number}
                </div>
                <p className="text-xs text-brand-gray mt-1">Il numero progetto non può essere modificato</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Titolo Progetto
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
                    <option key={farm.id} value={farm.id}>
                      {farm.name} ({farm.company})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Descrizione (opzionale)
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Stato
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'open' | 'defined' | 'in_progress' | 'completed' | 'discarded' })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                >
                  <option value="open">Aperto</option>
                  <option value="defined">Definito</option>
                  <option value="in_progress">In Corso</option>
                  <option value="completed">Concluso</option>
                  <option value="discarded">Scartato</option>
                </select>
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
                  Aggiorna Progetto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen size={48} className="mx-auto text-brand-gray mb-4" />
          <h3 className="text-lg font-medium text-brand-blue mb-2">Nessun progetto trovato</h3>
          <p className="text-brand-gray">Prova a modificare i filtri di ricerca o crea un nuovo progetto.</p>
        </div>
      )}
    </div>
  );
};

export default Projects;
import React, { useState, useEffect } from 'react';
import { ClipboardList, Package, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  onNavigate: (page: string, filters?: any) => void;
  userFarms?: string[];
}

interface DashboardStats {
  totalReports: number;
  openReports: number;
  totalEquipment: number;
  urgentReports: number;
}

interface RecentReport {
  id: string;
  title: string;
  urgency: string;
  status: string;
  created_at: string;
  barn_name?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, userFarms = [] }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    openReports: 0,
    totalEquipment: 0,
    urgentReports: 0
  });
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch reports stats
      let reportsQuery = supabase
        .from('reports')
        .select('id, status, urgency, title, created_at, farms(name)');
        
      // Filter by user farms if they're a technician with assigned farms
      if (userFarms.length > 0) {
        reportsQuery = reportsQuery.in('farm_id', userFarms);
      }
      
      const { data: reports, error: reportsError } = await reportsQuery;

      if (reportsError) throw reportsError;

      // Fetch equipment count
      let equipmentQuery = supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true });
        
      // Filter by user farms if they're a technician with assigned farms
      if (userFarms.length > 0) {
        equipmentQuery = equipmentQuery.in('farm_id', userFarms);
      }
      
      const { count: equipmentCount, error: equipmentError } = await equipmentQuery;

      if (equipmentError) throw equipmentError;

      // Calculate stats
      const openReports = reports.filter(r => r.status === 'open').length;
      const urgentReports = reports.filter(r => r.urgency === 'high' || r.urgency === 'critical').length;

      setStats({
        totalReports: reports.length,
        openReports,
        totalEquipment: equipmentCount || 0,
        urgentReports
      });

      // Set recent reports
      const recentReportsData = reports
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map(report => ({
          ...report,
          farm_name: report.farms?.name
        }));

      setRecentReports(recentReportsData);

    } catch (error) {
      console.error('Errore nel caricamento dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (type: string) => {
    switch (type) {
      case 'openReports':
        onNavigate('reports', { filterStatus: 'open' });
        break;
      case 'urgentReports':
        onNavigate('reports', { filterUrgency: 'urgent' });
        break;
      case 'equipment':
        onNavigate('equipment');
        break;
      default:
        break;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-brand-red/20 text-brand-red border border-brand-red/30';
      case 'medium': return 'bg-brand-coral/20 text-brand-coral border border-brand-coral/30';
      case 'low': return 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30';
      case 'critical': return 'bg-purple-100 text-purple-800 border border-purple-200';
      default: return 'bg-brand-gray/20 text-brand-gray border border-brand-gray/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle size={16} className="text-brand-red" />;
      case 'in_progress': return <Clock size={16} className="text-brand-coral" />;
      case 'resolved': return <CheckCircle size={16} className="text-brand-blue" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Segnalazioni Aperte',
      value: stats.openReports.toString(),
      icon: ClipboardList,
      color: 'bg-brand-red',
      textColor: 'text-brand-red',
      bgColor: 'bg-brand-red/10',
      onClick: () => handleCardClick('openReports'),
      clickable: true,
    },
    {
      title: 'Attrezzature',
      value: stats.totalEquipment.toString(),
      icon: Package,
      color: 'bg-brand-blue',
      textColor: 'text-brand-blue',
      bgColor: 'bg-brand-blue/10',
      onClick: () => handleCardClick('equipment'),
      clickable: true,
    },
    {
      title: 'Urgenze',
      value: stats.urgentReports.toString(),
      icon: AlertTriangle,
      color: 'bg-brand-red-light',
      textColor: 'text-brand-red-light',
      bgColor: 'bg-brand-red-light/10',
      onClick: () => handleCardClick('urgentReports'),
      clickable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brand-blue">Dashboard</h1>
        <div className="text-sm text-brand-gray bg-white px-4 py-2 rounded-lg shadow-sm border border-brand-coral/20">
          Sistema di Gestione Allevamenti
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {statsCards.map((stat, index) => (
          <div 
            key={index} 
            className={`bg-white rounded-xl shadow-lg border border-brand-coral/20 p-4 sm:p-6 transition-all duration-200 ${
              stat.clickable 
                ? 'hover:shadow-xl hover:scale-105 cursor-pointer transform hover:border-brand-coral/40' 
                : 'hover:shadow-xl hover:scale-105'
            }`}
            onClick={stat.onClick}
            title={stat.clickable ? `Clicca per vedere ${stat.title.toLowerCase()}` : ''}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-brand-gray">{stat.title}</p>
                <p className="text-2xl sm:text-3xl font-bold text-brand-blue mt-1 sm:mt-2">{stat.value}</p>
                {stat.clickable && (
                  <p className="text-xs text-brand-gray mt-1 opacity-70 hidden sm:block">Clicca per dettagli</p>
                )}
              </div>
              <div className={`p-2 sm:p-3 rounded-full ${stat.bgColor} shadow-lg`}>
                <stat.icon size={20} className={`${stat.textColor} sm:w-6 sm:h-6`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20">
        <div className="p-4 sm:p-6 border-b border-brand-coral/20 bg-gradient-to-r from-brand-blue/5 to-brand-coral/5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-brand-blue">Segnalazioni Recenti</h2>
            <button
              onClick={() => onNavigate('reports')}
              className="text-sm text-brand-coral hover:text-brand-red transition-colors font-medium"
            >
              <span className="hidden sm:inline">Vedi tutte →</span>
              <span className="sm:hidden">Tutte</span>
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          {recentReports.length > 0 ? (
            <div className="space-y-4">
              {recentReports.map((report) => (
                <div 
                  key={report.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/10 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-brand-coral/30 space-y-2 sm:space-y-0"
                  onClick={() => onNavigate('reports')}
                  title="Clicca per aprire le segnalazioni"
                >
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    {getStatusIcon(report.status)}
                    <div>
                      <h3 className="font-medium text-brand-blue text-sm sm:text-base">{report.title}</h3>
                      <p className="text-xs sm:text-sm text-brand-gray">{report.farm_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:space-x-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(report.urgency)}`}>
                      {report.urgency === 'high' ? 'Alta' : 
                       report.urgency === 'medium' ? 'Media' : 
                       report.urgency === 'low' ? 'Bassa' : 'Critica'}
                    </span>
                    <span className="text-xs sm:text-sm text-brand-gray">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ClipboardList size={48} className="mx-auto text-brand-gray mb-4" />
              <h3 className="text-lg font-medium text-brand-blue mb-2">Nessuna segnalazione</h3>
              <p className="text-brand-gray">Non ci sono segnalazioni recenti da mostrare.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div 
          className="bg-gradient-to-br from-brand-red/10 to-brand-red-light/10 rounded-xl p-4 sm:p-6 border border-brand-red/20 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => onNavigate('reports')}
        >
          <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <ClipboardList size={20} className="text-brand-red sm:w-6 sm:h-6" />
            <h3 className="text-base sm:text-lg font-semibold text-brand-red">Segnalazioni</h3>
          </div>
          <p className="text-brand-gray text-xs sm:text-sm mb-3 sm:mb-4">
            Gestisci le segnalazioni di problemi e manutenzioni
          </p>
          <div className="text-xl sm:text-2xl font-bold text-brand-red">
            {stats.totalReports} totali
          </div>
          <p className="text-xs text-brand-gray mt-1 sm:mt-2 opacity-70 hidden sm:block">Clicca per gestire</p>
        </div>

        <div 
          className="bg-gradient-to-br from-brand-blue/10 to-brand-blue-light/10 rounded-xl p-4 sm:p-6 border border-brand-blue/20 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => onNavigate('equipment')}
        >
          <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <Package size={20} className="text-brand-blue sm:w-6 sm:h-6" />
            <h3 className="text-base sm:text-lg font-semibold text-brand-blue">Attrezzature</h3>
          </div>
          <p className="text-brand-gray text-xs sm:text-sm mb-3 sm:mb-4">
            Monitora lo stato delle attrezzature dell'allevamento
          </p>
          <div className="text-xl sm:text-2xl font-bold text-brand-blue">
            {stats.totalEquipment} registrate
          </div>
          <p className="text-xs text-brand-gray mt-1 sm:mt-2 opacity-70 hidden sm:block">Clicca per gestire</p>
        </div>

        <div 
          className="bg-gradient-to-br from-brand-coral/10 to-brand-coral-light/10 rounded-xl p-4 sm:p-6 border border-brand-coral/20 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 sm:col-span-2 lg:col-span-1"
          onClick={() => onNavigate('quotes')}
        >
          <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <FileText size={20} className="text-brand-coral sm:w-6 sm:h-6" />
            <h3 className="text-base sm:text-lg font-semibold text-brand-coral">Preventivi</h3>
          </div>
          <p className="text-brand-gray text-xs sm:text-sm mb-3 sm:mb-4">
            Gestisci i preventivi e le richieste
          </p>
          <div className="text-xl sm:text-2xl font-bold text-brand-coral">
            Sistema attivo
          </div>
          <p className="text-xs text-brand-gray mt-1 sm:mt-2 opacity-70 hidden sm:block">Clicca per gestire</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
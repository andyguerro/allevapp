import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle, Package, Wrench, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MaintenanceItem {
  id: string;
  name: string;
  type: 'equipment' | 'facility';
  farm_name: string;
  farm_id: string;
  status: string;
  last_maintenance?: string;
  next_maintenance_due?: string;
  maintenance_interval_days?: number;
  description?: string;
  facility_type?: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  maintenanceItems: MaintenanceItem[];
  isToday: boolean;
  isOverdue: boolean;
}

const MaintenanceCalendar: React.FC = () => {
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'equipment' | 'facility'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'due' | 'overdue'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  const fetchMaintenanceData = async () => {
    try {
      // Fetch equipment with maintenance dates
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select(`
          id, name, status, last_maintenance, next_maintenance_due, maintenance_interval_days, description,
          farms(id, name)
        `)
        .not('next_maintenance_due', 'is', null);

      if (equipmentError) throw equipmentError;

      // Fetch facilities with maintenance dates
      const { data: facilities, error: facilitiesError } = await supabase
        .from('facilities')
        .select(`
          id, name, type, status, last_maintenance, next_maintenance_due, maintenance_interval_days, description,
          farms(id, name)
        `)
        .not('next_maintenance_due', 'is', null);

      if (facilitiesError) throw facilitiesError;

      // Transform and combine data
      const equipmentItems: MaintenanceItem[] = equipment.map(item => ({
        id: item.id,
        name: item.name,
        type: 'equipment',
        farm_name: item.farms?.name || 'N/A',
        farm_id: item.farms?.id || '',
        status: item.status,
        last_maintenance: item.last_maintenance,
        next_maintenance_due: item.next_maintenance_due,
        maintenance_interval_days: item.maintenance_interval_days,
        description: item.description
      }));

      const facilityItems: MaintenanceItem[] = facilities.map(item => ({
        id: item.id,
        name: item.name,
        type: 'facility',
        farm_name: item.farms?.name || 'N/A',
        farm_id: item.farms?.id || '',
        status: item.status,
        last_maintenance: item.last_maintenance,
        next_maintenance_due: item.next_maintenance_due,
        maintenance_interval_days: item.maintenance_interval_days,
        description: item.description,
        facility_type: item.type
      }));

      setMaintenanceItems([...equipmentItems, ...facilityItems]);
    } catch (error) {
      console.error('Errore nel caricamento dati manutenzione:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMaintenanceDate = async (itemId: string, type: 'equipment' | 'facility', newDate: string) => {
    try {
      const table = type === 'equipment' ? 'equipment' : 'facilities';
      const { error } = await supabase
        .from(table)
        .update({ 
          last_maintenance: newDate,
          next_maintenance_due: new Date(new Date(newDate).getTime() + (365 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        })
        .eq('id', itemId);

      if (error) throw error;
      await fetchMaintenanceData();
    } catch (error) {
      console.error('Errore nell\'aggiornamento data manutenzione:', error);
      alert('Errore nell\'aggiornamento della data di manutenzione');
    }
  };

  const getCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.getTime() === today.getTime();
      
      // Filter maintenance items for this date
      const dayMaintenanceItems = maintenanceItems.filter(item => {
        if (!item.next_maintenance_due) return false;
        const itemDate = new Date(item.next_maintenance_due);
        return itemDate.toDateString() === date.toDateString();
      }).filter(item => {
        if (filterType !== 'all' && item.type !== filterType) return false;
        if (filterStatus === 'due') {
          const dueDate = new Date(item.next_maintenance_due!);
          const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff >= 0 && daysDiff <= 7;
        }
        if (filterStatus === 'overdue') {
          const dueDate = new Date(item.next_maintenance_due!);
          return dueDate < today;
        }
        return true;
      });

      const isOverdue = dayMaintenanceItems.some(item => {
        const dueDate = new Date(item.next_maintenance_due!);
        return dueDate < today;
      });

      days.push({
        date,
        isCurrentMonth,
        maintenanceItems: dayMaintenanceItems,
        isToday,
        isOverdue
      });
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const getStatusColor = (status: string, type: 'equipment' | 'facility') => {
    if (type === 'equipment') {
      switch (status) {
        case 'working': return 'bg-green-100 text-green-800 border-green-200';
        case 'not_working': return 'bg-red-100 text-red-800 border-red-200';
        case 'repaired': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'regenerated': return 'bg-purple-100 text-purple-800 border-purple-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    } else {
      switch (status) {
        case 'working': return 'bg-green-100 text-green-800 border-green-200';
        case 'not_working': return 'bg-red-100 text-red-800 border-red-200';
        case 'maintenance_required': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'under_maintenance': return 'bg-blue-100 text-blue-800 border-blue-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }
  };

  const getTypeIcon = (type: 'equipment' | 'facility') => {
    return type === 'equipment' ? <Package size={16} /> : <Wrench size={16} />;
  };

  const getFacilityTypeText = (type?: string) => {
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

  const getUpcomingMaintenance = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    return maintenanceItems
      .filter(item => {
        if (!item.next_maintenance_due) return false;
        const dueDate = new Date(item.next_maintenance_due);
        return dueDate >= today && dueDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.next_maintenance_due!).getTime() - new Date(b.next_maintenance_due!).getTime());
  };

  const getOverdueMaintenance = () => {
    const today = new Date();
    return maintenanceItems
      .filter(item => {
        if (!item.next_maintenance_due) return false;
        const dueDate = new Date(item.next_maintenance_due);
        return dueDate < today;
      })
      .sort((a, b) => new Date(a.next_maintenance_due!).getTime() - new Date(b.next_maintenance_due!).getTime());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  const calendarDays = getCalendarDays();
  const upcomingMaintenance = getUpcomingMaintenance();
  const overdueMaintenance = getOverdueMaintenance();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brand-blue">Calendario Manutenzioni</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter size={18} className="text-brand-gray" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
            >
              <option value="all">Tutto</option>
              <option value="equipment">Attrezzature</option>
              <option value="facility">Impianti</option>
            </select>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
          >
            <option value="all">Tutti gli stati</option>
            <option value="due">In scadenza (7 giorni)</option>
            <option value="overdue">Scadute</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Manutenzioni in Scadenza</p>
              <p className="text-3xl font-bold text-brand-coral">{upcomingMaintenance.length}</p>
              <p className="text-xs text-brand-gray mt-1">Prossimi 7 giorni</p>
            </div>
            <div className="p-3 bg-brand-coral/10 rounded-lg">
              <Clock size={24} className="text-brand-coral" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Manutenzioni Scadute</p>
              <p className="text-3xl font-bold text-brand-red">{overdueMaintenance.length}</p>
              <p className="text-xs text-brand-gray mt-1">Richiedono attenzione</p>
            </div>
            <div className="p-3 bg-brand-red/10 rounded-lg">
              <AlertTriangle size={24} className="text-brand-red" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Totale Elementi</p>
              <p className="text-3xl font-bold text-brand-blue">{maintenanceItems.length}</p>
              <p className="text-xs text-brand-gray mt-1">Attrezzature e impianti</p>
            </div>
            <div className="p-3 bg-brand-blue/10 rounded-lg">
              <Calendar size={24} className="text-brand-blue" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-brand-coral/20">
          <div className="p-6 border-b border-brand-coral/20">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-brand-blue">
                {currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1 text-sm bg-brand-blue/10 text-brand-blue rounded-lg hover:bg-brand-blue/20 transition-colors"
                >
                  Oggi
                </button>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-brand-gray">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`min-h-[80px] p-2 border border-gray-100 rounded-lg cursor-pointer transition-all duration-200 ${
                    day.isCurrentMonth ? 'bg-white hover:bg-brand-blue/5' : 'bg-gray-50 text-gray-400'
                  } ${day.isToday ? 'ring-2 ring-brand-blue' : ''} ${
                    day.isOverdue ? 'bg-red-50 border-red-200' : ''
                  }`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <div className={`text-sm font-medium mb-1 ${day.isToday ? 'text-brand-blue' : ''}`}>
                    {day.date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {day.maintenanceItems.slice(0, 2).map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className={`text-xs p-1 rounded flex items-center space-x-1 ${
                          item.type === 'equipment' ? 'bg-brand-blue/20 text-brand-blue' : 'bg-brand-coral/20 text-brand-coral'
                        }`}
                      >
                        {getTypeIcon(item.type)}
                        <span className="truncate">{item.name}</span>
                      </div>
                    ))}
                    {day.maintenanceItems.length > 2 && (
                      <div className="text-xs text-brand-gray">
                        +{day.maintenanceItems.length - 2} altri
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Maintenance */}
          <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20">
            <div className="p-4 border-b border-brand-coral/20 bg-gradient-to-r from-brand-coral/5 to-brand-blue/5">
              <h3 className="font-semibold text-brand-blue flex items-center space-x-2">
                <Clock size={18} className="text-brand-coral" />
                <span>In Scadenza (7 giorni)</span>
              </h3>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              {upcomingMaintenance.length > 0 ? (
                <div className="space-y-3">
                  {upcomingMaintenance.map((item) => (
                    <div key={item.id} className="p-3 bg-gradient-to-r from-brand-coral/5 to-brand-blue/5 rounded-lg border border-brand-coral/20">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            {getTypeIcon(item.type)}
                            <span className="font-medium text-brand-blue text-sm">{item.name}</span>
                          </div>
                          <p className="text-xs text-brand-gray">{item.farm_name}</p>
                          {item.type === 'facility' && (
                            <p className="text-xs text-brand-gray">{getFacilityTypeText(item.facility_type)}</p>
                          )}
                          <p className="text-xs font-medium text-brand-coral">
                            Scadenza: {new Date(item.next_maintenance_due!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateMaintenanceDate(item.id, item.type, new Date().toISOString().split('T')[0])}
                        className="mt-2 w-full px-2 py-1 bg-brand-blue/10 text-brand-blue rounded text-xs hover:bg-brand-blue/20 transition-colors"
                      >
                        Segna come Completata
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-brand-gray">Nessuna manutenzione in scadenza</p>
                </div>
              )}
            </div>
          </div>

          {/* Overdue Maintenance */}
          {overdueMaintenance.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-red-200">
              <div className="p-4 border-b border-red-200 bg-red-50">
                <h3 className="font-semibold text-red-800 flex items-center space-x-2">
                  <AlertTriangle size={18} className="text-red-600" />
                  <span>Scadute</span>
                </h3>
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                <div className="space-y-3">
                  {overdueMaintenance.map((item) => (
                    <div key={item.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            {getTypeIcon(item.type)}
                            <span className="font-medium text-red-800 text-sm">{item.name}</span>
                          </div>
                          <p className="text-xs text-red-600">{item.farm_name}</p>
                          {item.type === 'facility' && (
                            <p className="text-xs text-red-600">{getFacilityTypeText(item.facility_type)}</p>
                          )}
                          <p className="text-xs font-medium text-red-700">
                            Scaduta il: {new Date(item.next_maintenance_due!).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => updateMaintenanceDate(item.id, item.type, new Date().toISOString().split('T')[0])}
                        className="mt-2 w-full px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                      >
                        Segna come Completata
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Selected Date Details */}
          {selectedDate && (
            <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20">
              <div className="p-4 border-b border-brand-coral/20 bg-gradient-to-r from-brand-blue/5 to-brand-coral/5">
                <h3 className="font-semibold text-brand-blue">
                  {selectedDate.toLocaleDateString('it-IT', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h3>
              </div>
              <div className="p-4">
                {calendarDays.find(day => day.date.toDateString() === selectedDate.toDateString())?.maintenanceItems.length ? (
                  <div className="space-y-3">
                    {calendarDays.find(day => day.date.toDateString() === selectedDate.toDateString())?.maintenanceItems.map((item) => (
                      <div key={item.id} className="p-3 bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20">
                        <div className="flex items-center space-x-2 mb-2">
                          {getTypeIcon(item.type)}
                          <span className="font-medium text-brand-blue">{item.name}</span>
                        </div>
                        <p className="text-sm text-brand-gray mb-1">{item.farm_name}</p>
                        {item.type === 'facility' && (
                          <p className="text-sm text-brand-gray mb-1">{getFacilityTypeText(item.facility_type)}</p>
                        )}
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status, item.type)}`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-brand-gray text-center py-4">
                    Nessuna manutenzione programmata per questa data
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceCalendar;
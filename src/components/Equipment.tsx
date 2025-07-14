import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, Wrench, AlertTriangle, Paperclip, Calendar } from 'lucide-react';
import AttachmentsManager from './AttachmentsManager';

interface Equipment {
  id: string;
  name: string;
  model: string;
  serial_number: string;
  farm_id: string;
  status: 'working' | 'not_working' | 'regenerated' | 'repaired';
  description: string;
  last_maintenance: string;
  next_maintenance_due: string;
  maintenance_interval_days: number;
  created_at: string;
  farms: {
    name: string;
  };
}

interface Farm {
  id: string;
  name: string;
}

export default function Equipment() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [selectedAttachmentEquipment, setSelectedAttachmentEquipment] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    serial_number: '',
    farm_id: '',
    status: 'working' as const,
    description: '',
    last_maintenance: '',
    maintenance_interval_days: 365
  });

  useEffect(() => {
    fetchEquipment();
    fetchFarms();
  }, []);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select(`
          *,
          farms (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFarms = async () => {
    try {
      const { data, error } = await supabase
        .from('farms')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setFarms(data || []);
    } catch (error) {
      console.error('Error fetching farms:', error);
    }
  };

  const calculateNextMaintenanceDate = (lastMaintenance: string, intervalDays: number) => {
    if (!lastMaintenance) return null;
    const lastDate = new Date(lastMaintenance);
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + intervalDays);
    return nextDate.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const nextMaintenanceDue = formData.last_maintenance 
        ? calculateNextMaintenanceDate(formData.last_maintenance, formData.maintenance_interval_days)
        : null;

      const equipmentData = {
        ...formData,
        next_maintenance_due: nextMaintenanceDue
      };

      if (editingEquipment) {
        const { error } = await supabase
          .from('equipment')
          .update(equipmentData)
          .eq('id', editingEquipment.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('equipment')
          .insert([equipmentData]);

        if (error) throw error;
      }

      await fetchEquipment();
      resetForm();
    } catch (error) {
      console.error('Error saving equipment:', error);
      alert('Errore nel salvare l\'attrezzatura');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa attrezzatura?')) return;

    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchEquipment();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      alert('Errore nell\'eliminare l\'attrezzatura');
    }
  };

  const updateMaintenanceDate = async (equipmentId: string, maintenanceDate: string) => {
    try {
      const equipmentItem = equipment.find(e => e.id === equipmentId);
      if (!equipmentItem) return;

      const nextMaintenanceDue = calculateNextMaintenanceDate(
        maintenanceDate, 
        equipmentItem.maintenance_interval_days
      );

      const { error } = await supabase
        .from('equipment')
        .update({
          last_maintenance: maintenanceDate,
          next_maintenance_due: nextMaintenanceDue,
          status: 'working'
        })
        .eq('id', equipmentId);

      if (error) throw error;
      await fetchEquipment();
    } catch (error) {
      console.error('Error updating maintenance:', error);
      alert('Errore nell\'aggiornare la manutenzione');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      model: '',
      serial_number: '',
      farm_id: '',
      status: 'working',
      description: '',
      last_maintenance: '',
      maintenance_interval_days: 365
    });
    setEditingEquipment(null);
    setShowForm(false);
  };

  const handleEdit = (equipmentItem: Equipment) => {
    setFormData({
      name: equipmentItem.name,
      model: equipmentItem.model || '',
      serial_number: equipmentItem.serial_number || '',
      farm_id: equipmentItem.farm_id,
      status: equipmentItem.status,
      description: equipmentItem.description || '',
      last_maintenance: equipmentItem.last_maintenance || '',
      maintenance_interval_days: equipmentItem.maintenance_interval_days || 365
    });
    setEditingEquipment(equipmentItem);
    setShowForm(true);
  };

  const isMaintenanceOverdue = (nextMaintenanceDate: string | null) => {
    if (!nextMaintenanceDate) return false;
    return new Date(nextMaintenanceDate) < new Date();
  };

  const isMaintenanceDueSoon = (nextMaintenanceDate: string | null) => {
    if (!nextMaintenanceDate) return false;
    const nextDate = new Date(nextMaintenanceDate);
    const today = new Date();
    const daysUntilMaintenance = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilMaintenance <= 7 && daysUntilMaintenance >= 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-green-100 text-green-800';
      case 'not_working': return 'bg-red-100 text-red-800';
      case 'regenerated': return 'bg-blue-100 text-blue-800';
      case 'repaired': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Attrezzature</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-brand-blue-dark flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Nuova Attrezzatura</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            {editingEquipment ? 'Modifica Attrezzatura' : 'Nuova Attrezzatura'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modello
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numero di Serie
              </label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Azienda *
              </label>
              <select
                required
                value={formData.farm_id}
                onChange={(e) => setFormData({ ...formData, farm_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              >
                <option value="">Seleziona azienda</option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stato
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              >
                <option value="working">Funzionante</option>
                <option value="not_working">Non Funzionante</option>
                <option value="regenerated">Rigenerata</option>
                <option value="repaired">Riparata</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ultima Manutenzione
              </label>
              <input
                type="date"
                value={formData.last_maintenance}
                onChange={(e) => setFormData({ ...formData, last_maintenance: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Intervallo Manutenzione (giorni)
              </label>
              <input
                type="number"
                min="1"
                value={formData.maintenance_interval_days}
                onChange={(e) => setFormData({ ...formData, maintenance_interval_days: parseInt(e.target.value) || 365 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrizione
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark"
              >
                {editingEquipment ? 'Aggiorna' : 'Crea'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {equipment.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.farms.name}</p>
                {item.model && (
                  <p className="text-sm text-gray-500">Modello: {item.model}</p>
                )}
                {item.serial_number && (
                  <p className="text-sm text-gray-500">S/N: {item.serial_number}</p>
                )}
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                {getStatusText(item.status)}
              </span>
            </div>

            {item.description && (
              <p className="text-sm text-gray-600 mb-4">{item.description}</p>
            )}

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {item.last_maintenance && (
                <div className="flex items-center space-x-2">
                  <Calendar size={14} />
                  <span>Ultima manutenzione: {new Date(item.last_maintenance).toLocaleDateString()}</span>
                </div>
              )}
              {item.next_maintenance_due && (
                <div className="flex items-center space-x-2">
                  <Calendar size={14} />
                  <span>Prossima manutenzione: {new Date(item.next_maintenance_due).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {(isMaintenanceOverdue(item.next_maintenance_due) || isMaintenanceDueSoon(item.next_maintenance_due)) && (
              <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-red-50 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle size={16} className="text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">
                      {isMaintenanceOverdue(item.next_maintenance_due) ? 'Manutenzione Scaduta' : 'Manutenzione in Scadenza'}
                    </span>
                  </div>
                  <button
                    onClick={() => updateMaintenanceDate(item.id, new Date().toISOString().split('T')[0])}
                    className="px-3 py-1 bg-brand-blue text-white rounded-lg text-xs hover:bg-brand-blue-dark transition-colors"
                  >
                    Completata
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-2 text-gray-600 hover:text-brand-blue hover:bg-gray-100 rounded-lg transition-colors"
                  title="Modifica attrezzatura"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => setSelectedAttachmentEquipment(item.id)}
                  className="p-2 text-gray-600 hover:text-brand-blue hover:bg-gray-100 rounded-lg transition-colors"
                  title="Gestisci allegati"
                >
                  <Paperclip size={16} />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Elimina attrezzatura"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {equipment.length === 0 && (
        <div className="text-center py-12">
          <Wrench size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna attrezzatura trovata</h3>
          <p className="text-gray-600">Inizia aggiungendo la tua prima attrezzatura.</p>
        </div>
      )}

      {selectedAttachmentEquipment && (
        <AttachmentsManager
          entityType="equipment"
          entityId={selectedAttachmentEquipment}
          onClose={() => setSelectedAttachmentEquipment(null)}
        />
      )}
    </div>
  );
}
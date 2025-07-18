import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Plus, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CalendarIntegrationProps {
  onClose: () => void;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultLocation?: string;
  defaultAttendees?: string[];
}

const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({
  onClose,
  defaultTitle = '',
  defaultDescription = '',
  defaultLocation = '',
  defaultAttendees = []
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    subject: defaultTitle,
    description: defaultDescription,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: defaultLocation,
    attendees: defaultAttendees.join(', '),
    selectedUser: '',
    isAllDay: false,
    reminderMinutes: 15
  });

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Errore nel caricamento utenti:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.subject || !formData.startDate) {
        throw new Error('Titolo e data di inizio sono obbligatori');
      }

      // Prepare datetime strings
      let startDateTime: string;
      let endDateTime: string;

      if (formData.isAllDay) {
        startDateTime = `${formData.startDate}T00:00:00`;
        endDateTime = formData.endDate || formData.startDate;
        endDateTime = `${endDateTime}T23:59:59`;
      } else {
        if (!formData.startTime) {
          throw new Error('Orario di inizio è obbligatorio per eventi non giornalieri');
        }
        
        startDateTime = `${formData.startDate}T${formData.startTime}:00`;
        
        if (formData.endDate && formData.endTime) {
          endDateTime = `${formData.endDate}T${formData.endTime}:00`;
        } else {
          // Default to 1 hour duration
          const start = new Date(`${formData.startDate}T${formData.startTime}:00`);
          start.setHours(start.getHours() + 1);
          endDateTime = start.toISOString().slice(0, 19);
        }
      }

      // Parse attendees
      const attendeesList = formData.attendees
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0 && email.includes('@'));

      // Add selected user to attendees if not already included
      if (formData.selectedUser) {
        const selectedUserData = users.find(u => u.id === formData.selectedUser);
        if (selectedUserData && !attendeesList.includes(selectedUserData.email)) {
          attendeesList.push(selectedUserData.email);
        }
      }

      // Call the edge function to create calendar event
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-calendar-event`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: formData.subject,
          description: formData.description,
          startDateTime,
          endDateTime,
          location: formData.location || undefined,
          attendees: attendeesList,
          isAllDay: formData.isAllDay,
          reminderMinutes: formData.reminderMinutes
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Errore nella creazione dell\'evento');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
          <div className="text-center">
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-brand-blue mb-2">Evento Creato!</h3>
            <p className="text-brand-gray">L'evento è stato aggiunto al calendario Microsoft 365.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brand-coral/20 bg-gradient-to-r from-brand-blue/5 to-brand-coral/5">
          <div className="flex items-center space-x-3">
            <Calendar size={24} className="text-brand-blue" />
            <h2 className="text-xl font-bold text-brand-blue">Crea Evento Calendario</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-brand-gray hover:text-brand-red transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle size={16} className="text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Titolo Evento *
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                placeholder="Es: Manutenzione Attrezzatura X"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Descrizione
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                placeholder="Descrizione dettagliata dell'evento..."
              />
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isAllDay"
                checked={formData.isAllDay}
                onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                className="h-4 w-4 text-brand-red focus:ring-brand-red border-brand-gray/30 rounded"
              />
              <label htmlFor="isAllDay" className="text-sm font-medium text-brand-blue">
                Evento di tutta la giornata
              </label>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  <Clock size={16} className="inline mr-2" />
                  Data Inizio *
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              {!formData.isAllDay && (
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Orario Inizio *
                  </label>
                  <input
                    type="time"
                    required={!formData.isAllDay}
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Data Fine
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              {!formData.isAllDay && (
                <div>
                  <label className="block text-sm font-medium text-brand-blue mb-2">
                    Orario Fine
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                  />
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                <MapPin size={16} className="inline mr-2" />
                Luogo
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                placeholder="Es: Allevamento XYZ, Sala Riunioni..."
              />
            </div>

            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                <Users size={16} className="inline mr-2" />
                Invita Utente AllevApp
              </label>
              {loadingUsers ? (
                <div className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg bg-gray-50 text-gray-500">
                  Caricamento utenti...
                </div>
              ) : (
                <select
                  value={formData.selectedUser}
                  onChange={(e) => setFormData({ ...formData, selectedUser: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                >
                 <option value={1440}>1 giorno</option>
                 <option value={120}>2 ore</option>
                 <option value={60}>1 ora</option>
                 <option value={30}>30 minuti</option>
                 <option value={15}>15 minuti</option>
                 <option value={5}>5 minuti</option>
                </select>
              )}
              <p className="text-xs text-brand-gray mt-1">
                L'utente selezionato riceverà automaticamente l'invito calendario
              </p>
            </div>

            {/* Attendees */}
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Altri Partecipanti (Email)
              </label>
              <input
                type="text"
                value={formData.attendees}
                onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                placeholder="email1@example.com, email2@example.com"
              />
              <p className="text-xs text-brand-gray mt-1">
                Inserisci altri indirizzi email separati da virgola (oltre all'utente selezionato sopra)
              </p>
            </div>

            {/* Reminder */}
            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Promemoria (minuti prima)
              </label>
              <select
                value={formData.reminderMinutes}
                onChange={(e) => setFormData({ ...formData, reminderMinutes: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
              >
                <option value={0}>Nessun promemoria</option>
                <option value={5}>5 minuti</option>
                <option value={15}>15 minuti</option>
                <option value={30}>30 minuti</option>
                <option value={60}>1 ora</option>
                <option value={120}>2 ore</option>
                <option value={1440}>1 giorno</option>
              </select>
            </div>

            {/* Microsoft 365 Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Calendar size={16} className="text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Integrazione Microsoft 365:</strong>
                  <p className="mt-1">
                    L'evento verrà creato nel calendario Microsoft 365 configurato e sarà visibile in Outlook.
                    I partecipanti riceveranno automaticamente un invito via email.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-brand-gray hover:text-brand-blue transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-brand-blue to-brand-blue-light text-white px-8 py-2 rounded-lg hover:from-brand-blue-dark hover:to-brand-blue transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creazione...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Crea Evento</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CalendarIntegration;
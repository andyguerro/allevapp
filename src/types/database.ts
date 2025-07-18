export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: 'admin' | 'user';
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: 'admin' | 'user';
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: 'admin' | 'user';
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          username: string;
          password: string;
          role: 'admin' | 'manager' | 'technician';
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          username: string;
          password: string;
          role?: 'admin' | 'manager' | 'technician';
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          username?: string;
          password?: string;
          role?: 'admin' | 'manager' | 'technician';
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      farms: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          company: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          company?: string;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          company?: string;
          created_at?: string;
          created_by?: string | null;
        };
      };
      farm_technicians: {
        Row: {
          farm_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          farm_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          farm_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      barns: {
        Row: {
          id: string;
          name: string;
          farm_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          farm_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          farm_id?: string;
          created_at?: string;
        };
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
        };
      };
      equipment: {
        Row: {
          id: string;
          name: string;
          model: string | null;
          serial_number: string | null;
          farm_id: string;
          barn_id: string | null;
          status: 'working' | 'not_working' | 'regenerated' | 'repaired';
          description: string | null;
          last_maintenance: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          model?: string | null;
          serial_number?: string | null;
          farm_id: string;
          barn_id?: string | null;
          status?: 'working' | 'not_working' | 'regenerated' | 'repaired';
          description?: string | null;
          last_maintenance?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          model?: string | null;
          serial_number?: string | null;
          farm_id?: string;
          barn_id?: string | null;
          status?: 'working' | 'not_working' | 'regenerated' | 'repaired';
          description?: string | null;
          last_maintenance?: string | null;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          title: string;
          description: string;
          farm_id: string;
          equipment_id: string | null;
          supplier_id: string | null;
          assigned_to: string;
          created_by: string;
          urgency: 'low' | 'medium' | 'high' | 'critical';
          status: 'open' | 'in_progress' | 'resolved' | 'closed';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          farm_id: string;
          equipment_id?: string | null;
          supplier_id?: string | null;
          assigned_to: string;
          created_by?: string;
          urgency?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'open' | 'in_progress' | 'resolved' | 'closed';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          farm_id?: string;
          equipment_id?: string | null;
          supplier_id?: string | null;
          assigned_to?: string;
          created_by?: string;
          urgency?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'open' | 'in_progress' | 'resolved' | 'closed';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      quotes: {
        Row: {
          id: string;
          report_id: string | null;
          supplier_id: string;
          farm_id: string | null;
          project_id: string | null;
          title: string;
          description: string;
          amount: number | null;
          status: 'requested' | 'received' | 'accepted' | 'rejected';
          requested_at: string;
          due_date: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id?: string | null;
          supplier_id: string;
          farm_id?: string | null;
          project_id?: string | null;
          title: string;
          description: string;
          amount?: number | null;
          status?: 'requested' | 'received' | 'accepted' | 'rejected';
          requested_at?: string;
          due_date?: string | null;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string | null;
          supplier_id?: string;
          farm_id?: string | null;
          project_id?: string | null;
          title?: string;
          description?: string;
          amount?: number | null;
          status?: 'requested' | 'received' | 'accepted' | 'rejected';
          requested_at?: string;
          due_date?: string | null;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
        };
      };
      attachments: {
        Row: {
          id: string;
          entity_type: 'report' | 'equipment' | 'quote';
          entity_id: string;
          file_name: string;
          file_path: string;
          custom_label: string | null;
          file_size: number | null;
          mime_type: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          entity_type: 'report' | 'equipment' | 'quote';
          entity_id: string;
          file_name: string;
          file_path: string;
          custom_label?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          created_at?: string;
          created_by?: string;
        };
        Update: {
          id?: string;
          entity_type?: 'report' | 'equipment' | 'quote';
          entity_id?: string;
          file_name?: string;
          file_path?: string;
          custom_label?: string | null;
          file_size?: number | null;
          mime_type?: string | null;
          created_at?: string;
          created_by?: string;
        };
      };
      order_confirmations: {
        Row: {
          id: string;
          quote_id: string;
          order_number: string;
          company: string;
          sequential_number: number;
          farm_id: string;
          supplier_id: string;
          total_amount: number;
          order_date: string;
          delivery_date: string | null;
          notes: string | null;
          status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          order_number: string;
          company: string;
          sequential_number: number;
          farm_id: string;
          supplier_id: string;
          total_amount: number;
          order_date?: string;
          delivery_date?: string | null;
          notes?: string | null;
          status?: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
          created_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          quote_id?: string;
          order_number?: string;
          company?: string;
          sequential_number?: number;
          farm_id?: string;
          supplier_id?: string;
          total_amount?: number;
          order_date?: string;
          delivery_date?: string | null;
          notes?: string | null;
          status?: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
          created_at?: string;
          created_by?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          project_number: string;
          company: string;
          sequential_number: number;
          farm_id: string;
          status: 'open' | 'defined' | 'in_progress' | 'completed' | 'discarded';
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          project_number: string;
          company: string;
          sequential_number: number;
          farm_id: string;
          status?: 'open' | 'defined' | 'in_progress' | 'completed' | 'discarded';
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          project_number?: string;
          company?: string;
          sequential_number?: number;
          farm_id?: string;
          status?: 'open' | 'defined' | 'in_progress' | 'completed' | 'discarded';
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
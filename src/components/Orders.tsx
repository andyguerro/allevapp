import React, { useState, useEffect } from 'react';
import { ShoppingCart, FileText, Calendar, Building, Truck, DollarSign, Package, Eye, Download, Filter, Search, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OrderConfirmation {
  id: string;
  quote_id: string;
  order_number: string;
  company: string;
  sequential_number: number;
  farm_id: string;
  supplier_id: string;
  total_amount: number;
  order_date: string;
  delivery_date?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  created_at: string;
  created_by: string;
  // Joined data
  farm_name?: string;
  supplier_name?: string;
  supplier_email?: string;
  quote_title?: string;
  quote_description?: string;
  created_user_name?: string;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<OrderConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const companies = [
    'Zoogamma Spa',
    'So. Agr. Zooagri Srl',
    'Soc. Agr. Zooallevamenti Srl'
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('order_confirmations')
        .select(`
          *,
          farms(name),
          suppliers(name, email),
          quotes(title, description),
          users!order_confirmations_created_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data
      const transformedOrders = ordersData.map(order => ({
        ...order,
        farm_name: order.farms?.name,
        supplier_name: order.suppliers?.name,
        supplier_email: order.suppliers?.email,
        quote_title: order.quotes?.title,
        quote_description: order.quotes?.description,
        created_user_name: order.users?.full_name
      }));

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Errore nel caricamento ordini:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('order_confirmations')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      await fetchOrders();
    } catch (error) {
      console.error('Errore nell\'aggiornamento stato ordine:', error);
      alert('Errore nell\'aggiornamento dello stato');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo ordine? Questa azione non può essere annullata.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('order_confirmations')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      await fetchOrders();
    } catch (error) {
      console.error('Errore nell\'eliminazione ordine:', error);
      alert('Errore nell\'eliminazione dell\'ordine');
    }
  };

  const generateOrderDocument = (order: OrderConfirmation) => {
    // Company templates
    const companyTemplates = {
      'Zoogamma Spa': {
        letterhead: 'ZOOGAMMA SPA',
        address: 'Via Trento 3, 25025 Manerbio (BS)',
        phone: '+39 030 9938433',
        email: 'ordini@zoogamma.it',
        color: '#E31E24',
        logo: '/ZooG.png'
      },
      'So. Agr. Zooagri Srl': {
        letterhead: 'SO. AGR. ZOOAGRI SRL',
        address: 'Via Trento 3, 25025 Manerbio (BS)', 
        phone: '+39 030 9938433',
        email: 'ordini@zooagri.it',
        color: '#1E3A8A',
        logo: '/ZooG.png'
      },
      'Soc. Agr. Zooallevamenti Srl': {
        letterhead: 'SOC. AGR. ZOOALLEVAMENTI SRL',
        address: 'Via Trento 3, 25025 Manerbio (BS)',
        phone: '+39 030 9938433', 
        email: 'ordini@zooallevamenti.it',
        color: '#059669',
        logo: '/ZooG.png'
      }
    };

    const template = companyTemplates[order.company as keyof typeof companyTemplates];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Conferma Ordine ${order.order_number}</title>
          <style>
            @page { size: 21cm 29.7cm; margin: 2cm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; line-height: 1.5; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid ${template.color}; padding-bottom: 15px; margin-bottom: 30px; }
            .logo-container { width: 80px; }
            .logo { max-width: 100%; height: auto; }
            .company-details { text-align: right; }
            .company-name { font-size: 24px; font-weight: bold; color: ${template.color}; margin-bottom: 5px; }
            .company-info { font-size: 11px; color: #666; line-height: 1.3; }
            .document-title { text-align: center; margin: 30px 0; }
            .order-title { font-size: 22px; font-weight: bold; color: ${template.color}; margin: 0; text-transform: uppercase; }
            .order-number { font-size: 18px; font-weight: bold; background: ${template.color}; color: white; padding: 8px 15px; text-align: center; margin: 15px auto 30px; display: inline-block; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 14px; font-weight: bold; color: ${template.color}; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .info-item { margin-bottom: 8px; }
            .label { font-weight: bold; color: #333; display: block; margin-bottom: 3px; }
            .value { color: #444; }
            .amount { font-size: 18px; font-weight: bold; color: ${template.color}; }
            .notes-section { background-color: #f9f9f9; padding: 15px; border: 1px solid #eee; border-radius: 5px; margin-top: 20px; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 11px; color: #666; text-align: center; }
            .signature-section { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; }
            .signature-box { text-align: center; }
            .signature-line { border-bottom: 1px solid #333; margin-bottom: 5px; height: 40px; }
            .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <header class="header">
            <div class="logo-container">
              <img src="${template.logo}" alt="${template.letterhead}" class="logo">
            </div>
            <div class="company-details">
              <div class="company-name">${template.letterhead}</div>
              <div class="company-info">
                ${template.address}<br>
                Tel: ${template.phone}<br>
                Email: ${template.email}<br>
                P.IVA: 00633870981
              </div>
            </div>
          </header>

          <div class="document-title">
            <h1 class="order-title">Conferma Ordine</h1>
            <div class="order-number">N. ${order.order_number}</div>
            <div class="status-badge" style="background: ${getStatusColor(order.status)}; color: white;">
              ${getStatusText(order.status)}
            </div>
          </div>

          <div class="info-grid">
            <div class="section">
              <div class="section-title">Dati Fornitore</div>
              <div class="info-item">
                <span class="label">Ragione Sociale:</span>
                <span class="value">${order.supplier_name}</span>
              </div>
              <div class="info-item">
                <span class="label">Email:</span>
                <span class="value">${order.supplier_email}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Dati Ordine</div>
              <div class="info-item">
                <span class="label">Data Ordine:</span>
                <span class="value">${new Date(order.order_date).toLocaleDateString('it-IT')}</span>
              </div>
              ${order.delivery_date ? `
                <div class="info-item">
                  <span class="label">Data Consegna Richiesta:</span>
                  <span class="value">${new Date(order.delivery_date).toLocaleDateString('it-IT')}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Dettagli Fornitura</div>
            <div class="info-item">
              <span class="label">Oggetto:</span>
              <span class="value">${order.quote_title}</span>
            </div>
            <div class="info-item">
              <span class="label">Descrizione:</span>
              <span class="value">${order.quote_description}</span>
            </div>
            <div class="info-item">
              <span class="label">Allevamento:</span>
              <span class="value">${order.farm_name}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Importo</div>
            <div class="info-item">
              <span class="label">Totale Ordine:</span>
              <span class="amount">€ ${order.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          ${order.notes ? `
            <div class="section notes-section">
              <div class="section-title">Note</div>
              <div class="value">${order.notes}</div>
            </div>
          ` : ''}

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div><strong>Firma e Timbro ${template.letterhead}</strong></div>
              <div>Data: _______________</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div><strong>Firma e Timbro Fornitore</strong></div>
              <div>Data: _______________</div>
            </div>
          </div>

          <div class="footer">
            <p>Documento generato automaticamente dal sistema AllevApp - ${new Date().toLocaleDateString('it-IT')}</p>
            <p>${template.letterhead} - ${template.address} - Tel: ${template.phone}</p>
          </div>
        </body>
      </html>
    `;

    // Create and download document
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Conferma_Ordine_${order.order_number}_${order.quote_title?.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#10b981';
      case 'delivered': return '#3b82f6';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'In Attesa';
      case 'confirmed': return 'Confermato';
      case 'delivered': return 'Consegnato';
      case 'cancelled': return 'Annullato';
      default: return status;
    }
  };

  const getCompanyColor = (company: string) => {
    switch (company) {
      case 'Zoogamma Spa': return 'bg-brand-red/10 text-brand-red border-brand-red/30';
      case 'So. Agr. Zooagri Srl': return 'bg-brand-blue/10 text-brand-blue border-brand-blue/30';
      case 'Soc. Agr. Zooallevamenti Srl': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-brand-gray/10 text-brand-gray border-brand-gray/30';
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesCompany = selectedCompany === 'all' || order.company === selectedCompany;
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.quote_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.farm_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCompany && matchesStatus && matchesSearch;
  });

  const getOrdersByCompany = () => {
    const ordersByCompany: Record<string, OrderConfirmation[]> = {};
    
    filteredOrders.forEach(order => {
      if (!ordersByCompany[order.company]) {
        ordersByCompany[order.company] = [];
      }
      ordersByCompany[order.company].push(order);
    });
    
    return ordersByCompany;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  const ordersByCompany = getOrdersByCompany();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brand-blue">Gestione Ordini</h1>
        <div className="flex items-center space-x-2">
          <ShoppingCart size={24} className="text-brand-red" />
          <span className="text-sm text-brand-gray">
            {orders.length} ordini totali
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">In Attesa</p>
              <p className="text-2xl font-bold text-yellow-600">
                {orders.filter(o => o.status === 'pending').length}
              </p>
            </div>
            <Calendar size={24} className="text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Confermati</p>
              <p className="text-2xl font-bold text-green-600">
                {orders.filter(o => o.status === 'confirmed').length}
              </p>
            </div>
            <Package size={24} className="text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Consegnati</p>
              <p className="text-2xl font-bold text-blue-600">
                {orders.filter(o => o.status === 'delivered').length}
              </p>
            </div>
            <Truck size={24} className="text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-brand-coral/20 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-gray">Valore Totale</p>
              <p className="text-2xl font-bold text-brand-blue">
                €{orders.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()}
              </p>
            </div>
            <DollarSign size={24} className="text-brand-blue" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-blue mb-2">
              <Search size={16} className="inline mr-2" />
              Cerca
            </label>
            <input
              type="text"
              placeholder="Numero ordine, fornitore..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-blue mb-2">
              <Building size={16} className="inline mr-2" />
              Azienda
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
            >
              <option value="all">Tutte le aziende</option>
              {companies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-blue mb-2">
              <Filter size={16} className="inline mr-2" />
              Stato
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
            >
              <option value="all">Tutti gli stati</option>
              <option value="pending">In Attesa</option>
              <option value="confirmed">Confermato</option>
              <option value="delivered">Consegnato</option>
              <option value="cancelled">Annullato</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedCompany('all');
                setSelectedStatus('all');
                setSearchTerm('');
              }}
              className="w-full px-4 py-2 bg-brand-gray/10 text-brand-gray rounded-lg hover:bg-brand-gray/20 transition-colors"
            >
              Cancella Filtri
            </button>
          </div>
        </div>
      </div>

      {/* Orders by Company */}
      {Object.keys(ordersByCompany).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(ordersByCompany).map(([company, companyOrders]) => (
            <div key={company} className="bg-white rounded-xl shadow-lg border border-brand-coral/20">
              <div className="p-6 border-b border-brand-coral/20 bg-gradient-to-r from-brand-blue/5 to-brand-coral/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Building size={24} className="text-brand-blue" />
                    <h2 className="text-xl font-semibold text-brand-blue">{company}</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getCompanyColor(company)}`}>
                      {companyOrders.length} ordini
                    </span>
                  </div>
                  <div className="text-sm text-brand-gray">
                    Valore: €{companyOrders.reduce((sum, o) => sum + o.total_amount, 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {companyOrders.map((order) => (
                    <div key={order.id} className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-lg font-semibold text-brand-blue">{order.order_number}</h3>
                            <span 
                              className="px-3 py-1 rounded-full text-sm font-medium text-white"
                              style={{ backgroundColor: getStatusColor(order.status) }}
                            >
                              {getStatusText(order.status)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                            <div>
                              <span className="font-medium text-brand-blue">Oggetto:</span>
                              <p className="text-brand-gray">{order.quote_title}</p>
                            </div>
                            <div>
                              <span className="font-medium text-brand-blue">Fornitore:</span>
                              <p className="text-brand-gray">{order.supplier_name}</p>
                            </div>
                            <div>
                              <span className="font-medium text-brand-blue">Allevamento:</span>
                              <p className="text-brand-gray">{order.farm_name}</p>
                            </div>
                            <div>
                              <span className="font-medium text-brand-blue">Importo:</span>
                              <p className="text-brand-gray font-semibold">
                                €{order.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium text-brand-blue">Data Ordine:</span>
                              <p className="text-brand-gray">{new Date(order.order_date).toLocaleDateString()}</p>
                            </div>
                            {order.delivery_date && (
                              <div>
                                <span className="font-medium text-brand-blue">Consegna:</span>
                                <p className="text-brand-gray">{new Date(order.delivery_date).toLocaleDateString()}</p>
                              </div>
                            )}
                            <div>
                              <span className="font-medium text-brand-blue">Creato da:</span>
                              <p className="text-brand-gray">{order.created_user_name}</p>
                            </div>
                          </div>

                          {order.quote_description && (
                            <div className="mb-4">
                              <span className="font-medium text-brand-blue">Descrizione:</span>
                              <p className="text-brand-gray text-sm">{order.quote_description}</p>
                            </div>
                          )}

                          {order.notes && (
                            <div className="mb-4 p-3 bg-white rounded-lg border border-brand-blue/10">
                              <span className="font-medium text-brand-blue">Note:</span>
                              <p className="text-brand-gray text-sm mt-1">{order.notes}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => generateOrderDocument(order)}
                            className="p-2 text-brand-gray hover:text-brand-blue transition-colors"
                            title="Scarica ordine"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-2 text-brand-gray hover:text-brand-red transition-colors"
                            title="Elimina ordine"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Status Change Buttons */}
                      <div className="mt-4 flex items-center space-x-2">
                        <span className="text-xs font-medium text-brand-blue">Cambia stato:</span>
                        <div className="flex space-x-1">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'confirmed')}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                            >
                              Conferma
                            </button>
                          )}
                          {order.status === 'confirmed' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                            >
                              Consegnato
                            </button>
                          )}
                          {(order.status === 'pending' || order.status === 'confirmed') && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'cancelled')}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                            >
                              Annulla
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <ShoppingCart size={48} className="mx-auto text-brand-gray mb-4" />
          <h3 className="text-lg font-medium text-brand-blue mb-2">Nessun ordine trovato</h3>
          <p className="text-brand-gray">
            {orders.length === 0 
              ? 'Non ci sono ancora ordini confermati.' 
              : 'Prova a modificare i filtri di ricerca.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Orders;
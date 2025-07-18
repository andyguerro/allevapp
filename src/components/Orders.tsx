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
        logo: '/ZooG.png',
        vat: '00633870981',
        footer: 'Società soggetta a direzione e coordinamento di Duerre S.p.A.'
      },
      'So. Agr. Zooagri Srl': {
        letterhead: 'SO. AGR. ZOOAGRI SRL',
        address: 'Via Trento 3, 25025 Manerbio (BS)', 
        phone: '+39 030 9938433',
        email: 'ordini@zooagri.it',
        color: '#1E3A8A',
        logo: '/ZooG.png',
        vat: '02309000980',
        footer: 'Società soggetta a direzione e coordinamento di Duerre S.p.A.'
      },
      'Soc. Agr. Zooallevamenti Srl': {
        letterhead: 'SOC. AGR. ZOOALLEVAMENTI SRL',
        address: 'Via Trento 3, 25025 Manerbio (BS)',
        phone: '+39 030 9938433', 
        email: 'ordini@zooallevamenti.it',
        color: '#059669',
        logo: '/ZooG.png'
        vat: '02309010989',
        footer: 'Società soggetta a direzione e coordinamento di Duerre S.p.A.'
      }
    };

    const template = companyTemplates[order.company as keyof typeof companyTemplates];

    // Genera contenuto HTML identico al PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Conferma Ordine ${order.order_number}</title>
          <style>
            @page { size: 21cm 29.7cm; margin: 2cm 2.5cm; }
            * { box-sizing: border-box; }
            body { 
              font-family: 'Times New Roman', Times, serif; 
              margin: 0; 
              padding: 0;
              line-height: 1.4;
              color: #333;
              background-color: #fff;
              font-size: 11pt;
            }
            
            /* Header Section */
            .header {
              border-bottom: 3px solid ${template.color};
              padding-bottom: 20px;
              margin-bottom: 30px;
              position: relative;
            }
            .header-content {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
            }
            .logo-section {
              width: 100px;
            }
            .logo-section img {
              width: 80px;
              height: auto;
            }
            .company-details {
              text-align: right;
              flex: 1;
              margin-left: 20px;
            }
            .company-name {
              font-size: 22px;
              font-weight: 700;
              color: ${template.color};
              margin-bottom: 5px;
              text-transform: uppercase;
            }
            .company-info {
              font-size: 10pt;
              color: #666;
              line-height: 1.3;
            }
            
            /* Document Title Section */
            .document-title-section {
              text-align: center;
              margin: 30px 0;
            }
            .document-title {
              font-size: 24pt;
              font-weight: bold;
              color: ${template.color};
              text-transform: uppercase;
              letter-spacing: 1px;
              margin: 0 0 10px 0;
            }
            .order-number-box {
              display: inline-block;
              background-color: ${template.color};
              color: white;
              padding: 8px 20px;
              font-size: 14pt;
              font-weight: bold;
              margin: 10px 0;
            }
            .order-date {
              font-size: 11pt;
              color: #666;
              margin-top: 10px;
            }
            
            /* Two Column Layout */
            .two-column {
              display: flex;
              justify-content: space-between;
              margin: 30px 0;
              gap: 30px;
            }
            .column {
              flex: 1;
            }
            
            /* Section Styling */
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 12pt;
              font-weight: 700;
              color: ${template.color};
              border-bottom: 2px solid ${template.color};
              padding-bottom: 5px;
              margin-bottom: 15px;
              text-transform: uppercase;
            }
            .info-row {
              margin-bottom: 8px;
              display: flex;
            }
            .info-label {
              font-weight: bold;
              width: 120px;
              color: #333;
            }
            .info-value {
              color: #666;
              flex: 1;
            }
            
            /* Order Details Box */
            .order-details-box {
              border: 2px solid ${template.color};
              margin: 25px 0;
              background-color: #fafafa;
            }
            .order-details-header {
              background-color: ${template.color};
              color: white;
              padding: 10px 15px;
              font-weight: bold;
              font-size: 12pt;
            }
            .order-details-content {
              padding: 15px;
            }
            .order-description {
              margin: 15px 0;
              line-height: 1.5;
              color: #444;
            }
            
            /* Amount Section */
            .amount-section {
              text-align: center;
              margin: 25px 0;
              padding: 20px;
              background-color: #f8f9fa;
              border: 1px solid #ddd;
            }
            .amount-label {
              font-size: 11pt;
              color: #666;
              margin-bottom: 5px;
            }
            .amount-value {
              font-size: 20pt;
              font-weight: 600;
              color: ${template.color};
            }
            .amount-note {
              font-size: 9pt;
              color: #666;
              margin-top: 5px;
              font-style: italic;
            }
            
            /* Notes Section */
            .notes-section {
              background-color: #f8f9fa;
              border: 1px solid #ddd;
              padding: 15px;
              margin: 20px 0;
            }
            .notes-title {
              font-weight: bold;
              margin-bottom: 10px;
              color: ${template.color};
            }
            
            /* Signature Section */
            .signature-section {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
              gap: 50px;
            }
            .signature-box {
              flex: 1;
              text-align: center;
            }
            .signature-line {
              border-bottom: 1px solid #333;
              height: 40px;
              margin-bottom: 8px;
            }
            .signature-label {
              font-weight: 700;
              font-size: 10pt;
              margin-bottom: 5px;
            }
            .signature-date {
              font-size: 9pt;
              color: #666;
            }
            
            /* Footer */
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid ${template.color};
              font-size: 9pt;
              color: #666;
              text-align: center;
            }
            .footer-info {
              margin-bottom: 10px;
            }
            
            /* Table Styling */
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            .info-table td {
              padding: 5px 0;
              vertical-align: top;
            }
            .info-table .label-col {
              width: 120px;
              font-weight: bold;
              color: #333;
            }
            .info-table .value-col {
              color: #666;
            }
            
            /* Payment Terms Box */
            .payment-terms {
              background-color: #e8f4fd;
              border: 1px solid #b3d9ff;
              padding: 12px;
              margin: 20px 0;
              font-size: 10pt;
            }
            .payment-terms-title {
              font-weight: bold;
              color: ${template.color};
              margin-bottom: 5px;
            }
            
            /* Status Badge */
            .status-badge {
              display: inline-block;
              padding: 5px 15px;
              background-color: #ffc107;
              color: #333;
              font-weight: bold;
              font-size: 10pt;
              margin: 10px 0;
            }
            
            /* Utilities */
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .mb-10 { margin-bottom: 10px; }
            .mb-15 { margin-bottom: 15px; }
            .mb-20 { margin-bottom: 20px; }
            .mt-20 { margin-top: 20px; }
            .bold { font-weight: bold; }
            
            /* Print Optimizations */
            @media print {
              body { font-size: 10pt; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <header class="header">
            <div class="header-content">
              <div class="logo-section">
                <img src="${template.logo}" alt="${template.letterhead}">
              </div>
              <div class="company-details">
                <div class="company-name">${template.letterhead}</div>
                <div class="company-info">
                  ${template.address}<br>
                  Tel: ${template.phone}<br>
                  Email: ${template.email}<br>
                  P.IVA: ${template.vat}
                </div>
              </div>
            </div>
          </header>

          <!-- Document Title -->
          <div class="document-title-section">
            <h1 class="document-title">Conferma d'Ordine</h1>
            <div class="order-number-box">N. ${order.order_number}</div>
            <div class="order-date">Data: ${new Date(order.order_date).toLocaleDateString('it-IT')}</div>
            <div class="status-badge">
              ${getStatusText(order.status)}
            </div>
          </div>

          <!-- Two Column Layout -->
          <div class="two-column">
            <!-- Left Column - Supplier Info -->
            <div class="column">
              <div class="section">
                <div class="section-title">Dati Fornitore</div>
                <table class="info-table">
                  <tr>
                    <td class="label-col">Ragione Sociale:</td>
                    <td class="value-col">${order.supplier_name}</td>
                  </tr>
                  <tr>
                    <td class="label-col">Email:</td>
                    <td class="value-col">${order.supplier_email}</td>
                  </tr>
                  <tr>
                    <td class="label-col">Rif. Preventivo:</td>
                    <td class="value-col">N° ${order.quote_id?.substring(0, 8).toUpperCase() || 'N/A'}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- Right Column - Order Info -->
            <div class="column">
              <div class="section">
                <div class="section-title">Dati Ordine</div>
                <table class="info-table">
                  <tr>
                    <td class="label-col">Data Ordine:</td>
                    <td class="value-col">${new Date(order.order_date).toLocaleDateString('it-IT')}</td>
                  </tr>
                  ${order.delivery_date ? `
                    <tr>
                      <td class="label-col">Consegna Richiesta:</td>
                      <td class="value-col">${new Date(order.delivery_date).toLocaleDateString('it-IT')}</td>
                    </tr>
                  ` : ''}
                  <tr>
                    <td class="label-col">Allevamento:</td>
                    <td class="value-col">${order.farm_name}</td>
                  </tr>
                </table>
              </div>
            </div>
          </div>

          <!-- Order Details -->
          <div class="order-details-box">
            <div class="order-details-header">
              OGGETTO DELL'ORDINE
            </div>
            <div class="order-details-content">
              <table class="info-table">
                <tr>
                  <td class="label-col">Oggetto:</td>
                  <td class="value-col"><strong>${order.quote_title}</strong></td>
                </tr>
              </table>
              <div class="order-description">
                ${order.quote_description}
              </div>
            </div>
          </div>

          <!-- Payment Terms -->
          <div class="payment-terms">
            <div class="payment-terms-title">Condizioni di Pagamento</div>
            Bonifico Bancario a 60 giorni data fattura fine mese
          </div>

          <!-- Total Amount -->
          <div class="amount-section">
            <div class="amount-label">IMPORTO TOTALE ORDINE</div>
            <div class="amount-value">€ ${order.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
            <div class="amount-note">I prezzi si intendono IVA esclusa</div>
          </div>

          ${order.notes ? `
            <div class="notes-section">
              <div class="notes-title">Note Aggiuntive</div>
              <div>${order.notes}</div>
            </div>
          ` : ''}

          <!-- Signatures -->
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Firma e Timbro</div>
              <div class="signature-label">${template.letterhead}</div>
              <div class="signature-date">Data: _________________</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div class="signature-label">Firma e Timbro</div>
              <div class="signature-label">FORNITORE</div>
              <div class="signature-date">Data: _________________</div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-info">
              <strong>${template.letterhead}</strong> - ${template.address}<br>
              Tel: ${template.phone} - Email: ${template.email} - P.IVA: ${template.vat}
            </div>
            <div class="footer-info">
              Documento generato automaticamente il ${new Date().toLocaleDateString('it-IT')} - Sistema AllevApp
            </div>
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
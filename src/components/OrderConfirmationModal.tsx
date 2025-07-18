import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, DollarSign, Building, Truck, MapPin, Download, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OrderConfirmationModalProps {
  currentUser: any;
  quote: {
    id: string;
    title: string;
    description: string;
    amount?: number;
    supplier_id: string;
    supplier_name?: string;
    supplier_email?: string;
    farm_id?: string;
    farm_name?: string;
    farm_company?: string;
  };
  onClose: () => void;
  onConfirm: (orderData: any) => void;
}

interface OrderConfirmation {
  id: string;
  order_number: string;
  company: string;
  sequential_number: number;
  total_amount: number;
  order_date: string;
  delivery_date?: string;
  notes?: string;
  status: string;
}

const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({ 
  currentUser,
  quote, 
  onClose, 
  onConfirm 
}) => {
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState({
    delivery_date: '',
    notes: '',
    total_amount: quote.amount || 0
  });
  const [previewOrder, setPreviewOrder] = useState<OrderConfirmation | null>(null);

  useEffect(() => {
    generateOrderPreview();
  }, []);

  const generateOrderPreview = async () => {
    try {
      // Get farm details to determine company
      const { data: farm, error: farmError } = await supabase
        .from('farms')
        .select('company')
        .eq('id', quote.farm_id)
        .single();

      if (farmError) throw farmError;

      // Get next sequential number for this company
      const { data: nextNumber, error: numberError } = await supabase
        .rpc('get_next_order_number', { company_name: farm.company });

      if (numberError) throw numberError;

      // Generate order number
      const { data: orderNumber, error: orderError } = await supabase
        .rpc('generate_order_number', { 
          company_name: farm.company, 
          seq_number: nextNumber 
        });

      if (orderError) throw orderError;

      setPreviewOrder({
        id: 'preview',
        order_number: orderNumber,
        company: farm.company,
        sequential_number: nextNumber,
        total_amount: orderData.total_amount,
        order_date: new Date().toISOString().split('T')[0],
        delivery_date: orderData.delivery_date,
        notes: orderData.notes,
        status: 'pending'
      });
    } catch (error) {
      console.error('Errore nella generazione anteprima ordine:', error);
    }
  };

  const handleConfirmOrder = async () => {
    setLoading(true);
    try {
      // Use the current user from props
      if (!currentUser) throw new Error('Utente non selezionato');

      // Get farm details
      const { data: farm, error: farmError } = await supabase
        .from('farms')
        .select('company')
        .eq('id', quote.farm_id)
        .single();

      if (farmError) throw farmError;

      // Get next sequential number
      const { data: nextNumber, error: numberError } = await supabase
        .rpc('get_next_order_number', { company_name: farm.company });

      if (numberError) throw numberError;

      // Generate order number
      const { data: orderNumber, error: orderError } = await supabase
        .rpc('generate_order_number', { 
          company_name: farm.company, 
          seq_number: nextNumber 
        });

      if (orderError) throw orderError;

      // Create order confirmation
      const { data: orderConfirmation, error: createError } = await supabase
        .from('order_confirmations')
        .insert({
          quote_id: quote.id,
          order_number: orderNumber,
          company: farm.company,
          sequential_number: nextNumber,
          farm_id: quote.farm_id,
          supplier_id: quote.supplier_id,
          total_amount: orderData.total_amount,
          order_date: new Date().toISOString().split('T')[0],
          delivery_date: orderData.delivery_date || null,
          notes: orderData.notes || null,
          created_by: currentUser.id
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update quote status to accepted (this will trigger auto-rejection of competing quotes)
      const { error: updateError } = await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      // Auto-reject competing quotes with the same title and farm
      if (quote.farm_id && quote.title) {
        const { error: rejectError } = await supabase
          .from('quotes')
          .update({ status: 'rejected' })
          .eq('farm_id', quote.farm_id)
          .eq('title', quote.title)
          .neq('id', quote.id)
          .in('status', ['requested', 'received']);

        if (rejectError) {
          console.error('Errore nel rifiuto automatico preventivi concorrenti:', rejectError);
          // Non bloccare l'operazione principale
        }
      }

      onConfirm(orderConfirmation);
    } catch (error) {
      console.error('Errore nella creazione ordine:', error);
      alert('Errore nella creazione dell\'ordine');
    } finally {
      setLoading(false);
    }
  };

  const generateWordDocument = () => {
    if (!previewOrder) return;

    // Modelli di conferma d'ordine moderni personalizzati per ciascuna azienda
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
        logo: '/ZooG.png',
        vat: '02309010989',
        footer: 'Società soggetta a direzione e coordinamento di Duerre S.p.A.'
      }
    };

    const template = companyTemplates[previewOrder.company as keyof typeof companyTemplates];

    // Genera contenuto HTML moderno per il documento Word
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Conferma Ordine ${previewOrder.order_number}</title>
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
          <!-- Header -->
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
            <div class="order-number-box">N. ${previewOrder.order_number}</div>
            <div class="order-date">Data: ${new Date(previewOrder.order_date).toLocaleDateString('it-IT')}</div>
            <div class="status-badge">In Attesa di Conferma</div>
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
                    <td class="value-col">${quote.supplier_name}</td>
                  </tr>
                  <tr>
                    <td class="label-col">Email:</td>
                    <td class="value-col">${quote.supplier_email}</td>
                  </tr>
                  <tr>
                    <td class="label-col">Rif. Preventivo:</td>
                    <td class="value-col">N° ${quote.id.substring(0, 8).toUpperCase()}</td>
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
                    <td class="value-col">${new Date(previewOrder.order_date).toLocaleDateString('it-IT')}</td>
                  </tr>
                  ${previewOrder.delivery_date ? `
                    <tr>
                      <td class="label-col">Consegna Richiesta:</td>
                      <td class="value-col">${new Date(previewOrder.delivery_date).toLocaleDateString('it-IT')}</td>
                    </tr>
                  ` : ''}
                  <tr>
                    <td class="label-col">Allevamento:</td>
                    <td class="value-col">${quote.farm_name}</td>
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
                  <td class="value-col"><strong>${quote.title}</strong></td>
                </tr>
              </table>
              <div class="order-description">
                ${quote.description}
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
            <div class="amount-value">€ ${previewOrder.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
            <div class="amount-note">I prezzi si intendono IVA esclusa</div>
          </div>

          ${previewOrder.notes ? `
            <div class="notes-section">
              <div class="notes-title">Note Aggiuntive</div>
              <div>${previewOrder.notes}</div>
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

    // Crea e scarica il documento
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Conferma_Ordine_${previewOrder.order_number}_${quote.title.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brand-coral/20 bg-gradient-to-r from-brand-blue/5 to-brand-coral/5">
          <h2 className="text-xl font-bold text-brand-blue">Conferma Ordine</h2>
          <button
            onClick={onClose}
            className="p-2 text-brand-gray hover:text-brand-red transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Quote Summary */}
          <div className="bg-gradient-to-r from-brand-blue/5 to-brand-coral/5 rounded-lg border border-brand-coral/20 p-6 mb-6">
            <h3 className="text-lg font-semibold text-brand-blue mb-4">Riepilogo Preventivo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-brand-blue">Oggetto:</span>
                <p className="text-brand-gray">{quote.title}</p>
              </div>
              <div>
                <span className="font-medium text-brand-blue">Fornitore:</span>
                <p className="text-brand-gray">{quote.supplier_name}</p>
              </div>
              <div>
                <span className="font-medium text-brand-blue">Allevamento:</span>
                <p className="text-brand-gray">{quote.farm_name}</p>
              </div>
              <div>
                <span className="font-medium text-brand-blue">Importo:</span>
                <p className="text-brand-gray font-semibold">
                  €{quote.amount?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || 'N/A'}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <span className="font-medium text-brand-blue">Descrizione:</span>
              <p className="text-brand-gray">{quote.description}</p>
            </div>
          </div>

          {/* Order Preview */}
          {previewOrder && (
            <div className="bg-white rounded-lg border border-brand-coral/20 p-6 mb-6">
              <h3 className="text-lg font-semibold text-brand-blue mb-4 flex items-center space-x-2">
                <FileText size={20} />
                <span>Anteprima Ordine</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-brand-blue/5 rounded-lg">
                  <div className="text-2xl font-bold text-brand-blue">{previewOrder.order_number}</div>
                  <div className="text-sm text-brand-gray">Numero Ordine</div>
                </div>
                <div className="text-center p-4 bg-brand-coral/5 rounded-lg">
                  <div className="text-2xl font-bold text-brand-coral">{previewOrder.company}</div>
                  <div className="text-sm text-brand-gray">Azienda</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">#{previewOrder.sequential_number}</div>
                  <div className="text-sm text-brand-gray">Numero Sequenziale</div>
                </div>
              </div>
            </div>
          )}

          {/* Order Form */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  <Building size={16} className="inline mr-2" />
                  Azienda
                </label>
                <input
                  type="text"
                  value={previewOrder?.company || ''}
                  disabled
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  <FileText size={16} className="inline mr-2" />
                  Numero Ordine
                </label>
                <input
                  type="text"
                  value={previewOrder?.order_number || ''}
                  disabled
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  <Calendar size={16} className="inline mr-2" />
                  Data Ordine
                </label>
                <input
                  type="date"
                  value={new Date().toISOString().split('T')[0]}
                  disabled
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  <Calendar size={16} className="inline mr-2" />
                  Data Consegna Richiesta (opzionale)
                </label>
                <input
                  type="date"
                  value={orderData.delivery_date}
                  onChange={(e) => setOrderData({ ...orderData, delivery_date: e.target.value })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  <Building size={16} className="inline mr-2" />
                  Fornitore
                </label>
                <input
                  type="text"
                  value={quote.supplier_name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  <Building size={16} className="inline mr-2" />
                  Allevamento
                </label>
                <input
                  type="text"
                  value={quote.farm_name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                <FileText size={16} className="inline mr-2" />
                Oggetto Ordine
              </label>
              <input
                type="text"
                value={quote.title}
                disabled
                className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Descrizione Ordine
              </label>
              <textarea
                rows={3}
                value={quote.description}
                disabled
                className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  <DollarSign size={16} className="inline mr-2" />
                  Importo Totale (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={orderData.total_amount}
                  onChange={(e) => setOrderData({ ...orderData, total_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-blue mb-2">
                  Stato Ordine
                </label>
                <input
                  type="text"
                  value="In Attesa"
                  disabled
                  className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-blue mb-2">
                Note Aggiuntive (opzionale)
              </label>
              <textarea
                rows={3}
                value={orderData.notes}
                onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                placeholder="Inserisci eventuali note per l'ordine..."
                className="w-full px-3 py-2 border border-brand-gray/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-brand-coral/20">
            <div className="flex items-center space-x-3">
              <button
                onClick={generateWordDocument}
                disabled={!previewOrder}
                className="flex items-center space-x-2 px-4 py-2 bg-brand-blue/10 text-brand-blue rounded-lg hover:bg-brand-blue/20 transition-colors disabled:opacity-50"
              >
                <Download size={16} />
                <span>Anteprima Word</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-brand-gray hover:text-brand-blue transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={loading}
                className="bg-gradient-to-r from-brand-red to-brand-red-light text-white px-8 py-2 rounded-lg hover:from-brand-red-dark hover:to-brand-red transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creazione...</span>
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    <span>Conferma Ordine</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Warning */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="text-yellow-600 mt-0.5">⚠️</div>
              <div className="text-sm text-yellow-800">
                <strong>Attenzione:</strong> Confermando questo ordine, tutti gli altri preventivi con lo stesso oggetto per questo allevamento verranno automaticamente rifiutati.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationModal;
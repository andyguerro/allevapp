import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, DollarSign, Building, Truck, MapPin, Download, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OrderConfirmationModalProps {
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
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Utente non autenticato');

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
          created_by: user.id
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

    // Modelli di conferma d'ordine personalizzati per ciascuna azienda
    const companyTemplates = {
      'Zoogamma Spa': {
        letterhead: 'ZOOGAMMA SPA',
        address: 'Via Trento 3, 25025 Manerbio (BS)',
        phone: '+39 030 9938433',
        email: 'ordini@zoogammma.it',
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

    const template = companyTemplates[previewOrder.company as keyof typeof companyTemplates];

    // Genera contenuto HTML per il documento Word basato sul modello fornito
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Conferma Ordine ${previewOrder.order_number}</title>
          <style>
            @page {
              size: 21cm 29.7cm;
              margin: 2cm;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
              line-height: 1.5;
              color: #333;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid ${template.color};
              padding-bottom: 15px;
              margin-bottom: 30px;
            }
            .logo-container {
              width: 80px;
            }
            .logo {
              max-width: 100%;
              height: auto;
            }
            .company-details {
              text-align: right;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: ${template.color};
              margin-bottom: 5px;
            }
            .company-info {
              font-size: 11px;
              color: #666;
              line-height: 1.3;
            }
            .document-title {
              text-align: center;
              margin: 30px 0;
            }
            .order-title {
              font-size: 22px;
              font-weight: bold;
              color: ${template.color};
              margin: 0;
              text-transform: uppercase;
            }
            .order-number {
              font-size: 18px;
              font-weight: bold;
              background: ${template.color};
              color: white;
              padding: 8px 15px;
              text-align: center;
              margin: 15px auto 30px;
              display: inline-block;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 14px;
              font-weight: bold;
              color: ${template.color};
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .info-item {
              margin-bottom: 8px;
            }
            .label {
              font-weight: bold;
              color: #333;
              display: block;
              margin-bottom: 3px;
            }
            .value {
              color: #444;
            }
            .amount {
              font-size: 18px;
              font-weight: bold;
              color: ${template.color};
            }
            .notes-section {
              background-color: #f9f9f9;
              padding: 15px;
              border: 1px solid #eee;
              border-radius: 5px;
              margin-top: 20px;
            }
            .footer {
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 11px;
              color: #666;
              text-align: center;
            }
            .signature-section {
              margin-top: 60px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 50px;
            }
            .signature-box {
              text-align: center;
            }
            .signature-line {
              border-bottom: 1px solid #333;
              margin-bottom: 5px;
              height: 40px;
            }
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
            <div class="order-number">N. ${previewOrder.order_number}</div>
          </div>

          <div class="info-grid">
            <div class="section">
              <div class="section-title">Dati Fornitore</div>
              <div class="info-item">
                <span class="label">Ragione Sociale:</span>
                <span class="value">${quote.supplier_name}</span>
              </div>
              <div class="info-item">
                <span class="label">Email:</span>
                <span class="value">${quote.supplier_email}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Dati Ordine</div>
              <div class="info-item">
                <span class="label">Data Ordine:</span>
                <span class="value">${new Date(previewOrder.order_date).toLocaleDateString('it-IT')}</span>
              </div>
              ${previewOrder.delivery_date ? `
                <div class="info-item">
                  <span class="label">Data Consegna Richiesta:</span>
                  <span class="value">${new Date(previewOrder.delivery_date).toLocaleDateString('it-IT')}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Dettagli Fornitura</div>
            <div class="info-item">
              <span class="label">Oggetto:</span>
              <span class="value">${quote.title}</span>
            </div>
            <div class="info-item">
              <span class="label">Descrizione:</span>
              <span class="value">${quote.description}</span>
            </div>
            <div class="info-item">
              <span class="label">Allevamento:</span>
              <span class="value">${quote.farm_name}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Importo</div>
            <div class="info-item">
              <span class="label">Totale Ordine:</span>
              <span class="amount">€ ${previewOrder.total_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          ${previewOrder.notes ? `
            <div class="section notes-section">
              <div class="section-title">Note</div>
              <div class="value">${previewOrder.notes}</div>
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
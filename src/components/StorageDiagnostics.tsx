import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Settings, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';

const StorageDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    try {
      // Test 1: Check if storage is available
      results.tests.push({
        name: 'Storage API Disponibile',
        status: 'running'
      });

      try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
          results.tests[0] = {
            name: 'Storage API Disponibile',
            status: 'error',
            message: `Errore API Storage: ${bucketsError.message}`,
            details: bucketsError
          };
        } else {
          results.tests[0] = {
            name: 'Storage API Disponibile',
            status: 'success',
            message: `Trovati ${buckets?.length || 0} bucket`,
            data: buckets
          };

          // Test 2: Check for attachments bucket
          const attachmentsBucket = buckets?.find(bucket => bucket.name === 'attachments');
          results.tests.push({
            name: 'Bucket "attachments" Esistente',
            status: attachmentsBucket ? 'success' : 'error',
            message: attachmentsBucket 
              ? `Bucket trovato - ID: ${attachmentsBucket.id}, Pubblico: ${attachmentsBucket.public}`
              : 'Bucket "attachments" non trovato',
            data: attachmentsBucket
          });

          // Test 3: Check bucket policies if bucket exists
          if (attachmentsBucket) {
            try {
              // Try to upload a test file
              const testFile = new Blob(['test'], { type: 'text/plain' });
              const testPath = `test-${Date.now()}.txt`;
              
              const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(testPath, testFile);

              if (uploadError) {
                results.tests.push({
                  name: 'Policy Upload Test',
                  status: 'error',
                  message: `Errore upload test: ${uploadError.message}`,
                  details: uploadError
                });
              } else {
                results.tests.push({
                  name: 'Policy Upload Test',
                  status: 'success',
                  message: 'Upload test riuscito'
                });

                // Clean up test file
                await supabase.storage
                  .from('attachments')
                  .remove([testPath]);
              }
            } catch (policyError) {
              results.tests.push({
                name: 'Policy Upload Test',
                status: 'error',
                message: `Errore test policy: ${policyError.message}`,
                details: policyError
              });
            }
          }
        }
      } catch (storageError) {
        results.tests[0] = {
          name: 'Storage API Disponibile',
          status: 'error',
          message: `Errore connessione storage: ${storageError.message}`,
          details: storageError
        };
      }

      // Test 4: Check environment variables
      results.tests.push({
        name: 'Variabili Ambiente',
        status: 'info',
        message: 'Configurazione ambiente',
        data: {
          VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? '✓ Configurata' : '✗ Mancante',
          VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ Configurata' : '✗ Mancante'
        }
      });

    } catch (error) {
      results.tests.push({
        name: 'Errore Generale',
        status: 'error',
        message: `Errore durante la diagnostica: ${error.message}`,
        details: error
      });
    }

    setDiagnostics(results);
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="text-green-600" size={20} />;
      case 'error': return <AlertCircle className="text-red-600" size={20} />;
      case 'running': return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>;
      default: return <Settings className="text-blue-600" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'running': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg border border-brand-coral/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Database size={24} className="text-brand-blue" />
            <h2 className="text-xl font-semibold text-brand-blue">Diagnostica Storage Supabase</h2>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-gradient-to-r from-brand-blue to-brand-blue-light text-white px-6 py-2 rounded-lg hover:from-brand-blue-dark hover:to-brand-blue transition-all duration-200 disabled:opacity-50"
          >
            {loading ? 'Analizzando...' : 'Avvia Diagnostica'}
          </button>
        </div>

        {diagnostics && (
          <div className="space-y-4">
            <div className="bg-brand-blue/5 rounded-lg p-4 border border-brand-blue/20">
              <h3 className="font-medium text-brand-blue mb-2">
                Risultati Diagnostica - {new Date(diagnostics.timestamp).toLocaleString()}
              </h3>
            </div>

            {diagnostics.tests.map((test: any, index: number) => (
              <div key={index} className={`rounded-lg p-4 border ${getStatusColor(test.status)}`}>
                <div className="flex items-start space-x-3">
                  {getStatusIcon(test.status)}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{test.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                    
                    {test.data && (
                      <div className="mt-3 p-3 bg-gray-50 rounded border">
                        <h5 className="text-xs font-medium text-gray-700 mb-2">Dettagli:</h5>
                        <pre className="text-xs text-gray-600 overflow-x-auto">
                          {JSON.stringify(test.data, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {test.details && test.status === 'error' && (
                      <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
                        <h5 className="text-xs font-medium text-red-700 mb-2">Errore Dettagliato:</h5>
                        <pre className="text-xs text-red-600 overflow-x-auto">
                          {JSON.stringify(test.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Istruzioni per risolvere i problemi */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-3">🔧 Istruzioni per Risolvere i Problemi</h4>
              <div className="space-y-3 text-sm text-yellow-700">
                <div>
                  <strong>1. Se il bucket "attachments" non esiste:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>Vai su Supabase Dashboard → Storage</li>
                    <li>Clicca "New bucket"</li>
                    <li>Nome: <code className="bg-yellow-100 px-1 rounded">attachments</code></li>
                    <li>Public bucket: <strong>NO</strong> (lascia deselezionato)</li>
                    <li>Clicca "Create bucket"</li>
                  </ul>
                </div>
                
                <div>
                  <strong>2. Se ci sono errori di policy:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>Vai su Storage → attachments → Policies</li>
                    <li>Clicca "New policy"</li>
                    <li>Seleziona "For full customization"</li>
                    <li>Policy name: <code className="bg-yellow-100 px-1 rounded">Allow authenticated uploads</code></li>
                    <li>Allowed operation: <strong>INSERT</strong></li>
                    <li>Target roles: <code className="bg-yellow-100 px-1 rounded">authenticated</code></li>
                    <li>USING expression: <code className="bg-yellow-100 px-1 rounded">true</code></li>
                    <li>Ripeti per SELECT, UPDATE, DELETE</li>
                  </ul>
                </div>

                <div>
                  <strong>3. Policy di esempio complete:</strong>
                  <div className="bg-yellow-100 p-2 rounded mt-2 font-mono text-xs">
                    <div>INSERT: <code>true</code></div>
                    <div>SELECT: <code>true</code></div>
                    <div>UPDATE: <code>true</code></div>
                    <div>DELETE: <code>true</code></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!diagnostics && (
          <div className="text-center py-8">
            <Database size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Diagnostica Storage</h3>
            <p className="text-gray-600">Clicca "Avvia Diagnostica" per verificare la configurazione del bucket attachments</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StorageDiagnostics;
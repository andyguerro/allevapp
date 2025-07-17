import React, { useState } from 'react';
import { X, Mail, Calendar, CheckCircle, AlertCircle, Copy, ExternalLink, Settings, Shield, Key, Database } from 'lucide-react';

interface Microsoft365SetupGuideProps {
  onClose: () => void;
}

const Microsoft365SetupGuide: React.FC<Microsoft365SetupGuideProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const markStepComplete = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step]);
    }
  };

  const steps = [
    {
      id: 1,
      title: "Creazione App Registration in Azure AD",
      icon: <Settings size={24} className="text-blue-600" />,
      description: "Configura l'applicazione in Azure Active Directory"
    },
    {
      id: 2,
      title: "Configurazione Autenticazione",
      icon: <Shield size={24} className="text-green-600" />,
      description: "Imposta client secret e permessi API"
    },
    {
      id: 3,
      title: "Configurazione Email Mittente",
      icon: <Mail size={24} className="text-purple-600" />,
      description: "Seleziona l'account email per l'invio"
    },
    {
      id: 4,
      title: "Configurazione Supabase",
      icon: <Database size={24} className="text-orange-600" />,
      description: "Aggiungi le variabili d'ambiente"
    },
    {
      id: 5,
      title: "Test della Configurazione",
      icon: <CheckCircle size={24} className="text-green-600" />,
      description: "Verifica che tutto funzioni correttamente"
    }
  ];

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">🎯 Obiettivo</h4>
        <p className="text-blue-700 text-sm">
          Creare un'applicazione in Azure AD che permetta ad AllevApp di inviare email e creare eventi calendario.
        </p>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">1.1 Accesso al Portale Azure</h5>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Vai su <a href="https://portal.azure.com" target="_blank" className="text-blue-600 hover:underline">portal.azure.com</a></li>
            <li>Accedi con il tuo account <strong>amministratore Microsoft 365</strong></li>
            <li>Nel menu laterale, cerca <strong>"Azure Active Directory"</strong></li>
            <li>Clicca su <strong>"Azure Active Directory"</strong></li>
          </ol>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">1.2 Creazione Nuova App</h5>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Nel menu di Azure AD, clicca su <strong>"App registrations"</strong></li>
            <li>Clicca il pulsante <strong>"+ New registration"</strong> in alto</li>
            <li>Compila il form con questi valori:</li>
          </ol>
          <div className="mt-3 bg-gray-50 rounded p-3 font-mono text-sm">
            <div className="flex items-center justify-between">
              <span>Name: AllevApp Email Service</span>
              <button
                onClick={() => copyToClipboard('AllevApp Email Service', 'name')}
                className="text-blue-600 hover:text-blue-800"
              >
                <Copy size={16} />
              </button>
            </div>
            <div>Supported account types: Accounts in this organizational directory only</div>
            <div>Redirect URI: (lascia vuoto)</div>
          </div>
          <ol start={4} className="list-decimal list-inside space-y-2 text-sm text-gray-700 mt-3">
            <li>Clicca <strong>"Register"</strong></li>
          </ol>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">1.3 Annotare gli ID Importanti</h5>
          <p className="text-sm text-gray-700 mb-3">
            Dopo la creazione, nella pagina <strong>Overview</strong> dell'app, copia questi valori:
          </p>
          <div className="space-y-2">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">Application (client) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</span>
                <span className="text-xs text-yellow-700">📝 Copia questo valore</span>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">Directory (tenant) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</span>
                <span className="text-xs text-yellow-700">📝 Copia questo valore</span>
              </div>
            </div>
          </div>
          <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-700 text-sm">
              <strong>⚠️ IMPORTANTE:</strong> Conserva questi ID in un posto sicuro - li userai nel Passo 4!
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(2)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Passo Successivo →
        </button>
        <button
          onClick={() => markStepComplete(1)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <CheckCircle size={16} />
          <span>Completato</span>
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-800 mb-2">🔐 Obiettivo</h4>
        <p className="text-green-700 text-sm">
          Configurare l'autenticazione e i permessi necessari per l'invio email e gestione calendario.
        </p>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">2.1 Creazione Client Secret</h5>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Nel menu laterale dell'app, clicca <strong>"Certificates & secrets"</strong></li>
            <li>Nella sezione <strong>"Client secrets"</strong>, clicca <strong>"+ New client secret"</strong></li>
            <li>Compila:</li>
          </ol>
          <div className="mt-3 bg-gray-50 rounded p-3 font-mono text-sm">
            <div>Description: AllevApp Secret</div>
            <div>Expires: 24 months (consigliato)</div>
          </div>
          <ol start={4} className="list-decimal list-inside space-y-2 text-sm text-gray-700 mt-3">
            <li>Clicca <strong>"Add"</strong></li>
            <li><strong>🚨 CRITICO:</strong> Copia immediatamente il <strong>Value</strong> del secret</li>
          </ol>
          <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-700 text-sm">
              <strong>⚠️ ATTENZIONE:</strong> Non potrai più vedere il secret dopo aver lasciato questa pagina!
            </p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">2.2 Configurazione Permessi API</h5>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Nel menu laterale, clicca <strong>"API permissions"</strong></li>
            <li>Clicca <strong>"+ Add a permission"</strong></li>
            <li>Seleziona <strong>"Microsoft Graph"</strong></li>
            <li>Seleziona <strong>"Application permissions"</strong> (NON Delegated)</li>
            <li>Cerca e aggiungi questi permessi:</li>
          </ol>
          <div className="mt-3 space-y-2">
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-center space-x-2">
                <CheckCircle size={16} className="text-blue-600" />
                <span className="font-mono text-sm">Mail.Send</span>
                <span className="text-xs text-blue-700">- Per inviare email</span>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-center space-x-2">
                <CheckCircle size={16} className="text-blue-600" />
                <span className="font-mono text-sm">Calendars.ReadWrite</span>
                <span className="text-xs text-blue-700">- Per creare eventi calendario</span>
              </div>
            </div>
          </div>
          <ol start={6} className="list-decimal list-inside space-y-2 text-sm text-gray-700 mt-3">
            <li>Clicca <strong>"Add permissions"</strong></li>
          </ol>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">2.3 Consenso Amministratore</h5>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Nella pagina <strong>"API permissions"</strong></li>
            <li>Clicca <strong>"Grant admin consent for [TuaAzienda]"</strong></li>
            <li>Conferma cliccando <strong>"Yes"</strong></li>
            <li>Verifica che tutti i permessi abbiano lo stato <strong>"Granted"</strong> (verde)</li>
          </ol>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(1)}
          className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Passo Precedente
        </button>
        <div className="flex space-x-3">
          <button
            onClick={() => setCurrentStep(3)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Passo Successivo →
          </button>
          <button
            onClick={() => markStepComplete(2)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <CheckCircle size={16} />
            <span>Completato</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h4 className="font-semibold text-purple-800 mb-2">📧 Obiettivo</h4>
        <p className="text-purple-700 text-sm">
          Configurare l'account email che verrà usato come mittente per tutte le comunicazioni automatiche.
        </p>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">3.1 Requisiti Account Email</h5>
          <p className="text-sm text-gray-700 mb-3">
            L'email mittente deve soddisfare questi requisiti:
          </p>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm">Account Microsoft 365 valido</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm">Licenza Exchange Online attiva</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm">Accessibile e funzionante</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm">Preferibilmente un account di servizio</span>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">3.2 Email Consigliate</h5>
          <p className="text-sm text-gray-700 mb-3">
            Esempi di email mittente appropriate:
          </p>
          <div className="space-y-2">
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">sistema@tuaazienda.com</span>
                <button
                  onClick={() => copyToClipboard('sistema@tuaazienda.com', 'email1')}
                  className="text-green-600 hover:text-green-800"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">allevapp@tuaazienda.com</span>
                <button
                  onClick={() => copyToClipboard('allevapp@tuaazienda.com', 'email2')}
                  className="text-green-600 hover:text-green-800"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">noreply@tuaazienda.com</span>
                <button
                  onClick={() => copyToClipboard('noreply@tuaazienda.com', 'email3')}
                  className="text-green-600 hover:text-green-800"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <h5 className="font-medium text-red-800 mb-2">❌ Email da Evitare</h5>
          <div className="space-y-1 text-sm text-red-700">
            <div>• Email personali (es: mario.rossi@tuaazienda.com)</div>
            <div>• Account condivisi tra più persone</div>
            <div>• Email con inoltro automatico attivo</div>
            <div>• Account senza licenza Exchange</div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">3.3 Verifica Account</h5>
          <p className="text-sm text-gray-700 mb-3">
            Per verificare che l'account sia configurato correttamente:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Accedi a <a href="https://outlook.office.com" target="_blank" className="text-blue-600 hover:underline">outlook.office.com</a> con l'account</li>
            <li>Verifica che la casella di posta sia accessibile</li>
            <li>Invia un'email di test per confermare il funzionamento</li>
            <li>Controlla che non ci siano regole di inoltro attive</li>
          </ol>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(2)}
          className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Passo Precedente
        </button>
        <div className="flex space-x-3">
          <button
            onClick={() => setCurrentStep(4)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Passo Successivo →
          </button>
          <button
            onClick={() => markStepComplete(3)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <CheckCircle size={16} />
            <span>Completato</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h4 className="font-semibold text-orange-800 mb-2">⚙️ Obiettivo</h4>
        <p className="text-orange-700 text-sm">
          Configurare le variabili d'ambiente in Supabase con i valori ottenuti da Azure AD.
        </p>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">4.1 Accesso a Supabase</h5>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Vai su <a href="https://supabase.com" target="_blank" className="text-blue-600 hover:underline">supabase.com</a></li>
            <li>Accedi al tuo progetto AllevApp</li>
            <li>Nel menu laterale, clicca <strong>"Settings"</strong></li>
            <li>Clicca <strong>"Environment variables"</strong></li>
          </ol>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">4.2 Variabili da Configurare</h5>
          <p className="text-sm text-gray-700 mb-4">
            Aggiungi queste 4 variabili d'ambiente con i valori che hai annotato nei passi precedenti:
          </p>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h6 className="font-medium text-blue-800">1. MICROSOFT_TENANT_ID</h6>
                <button
                  onClick={() => copyToClipboard('MICROSOFT_TENANT_ID', 'var1')}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-sm text-blue-700 mb-2">
                <strong>Valore:</strong> Directory (tenant) ID da Azure AD (Passo 1.3)
              </p>
              <div className="bg-white rounded p-2 font-mono text-sm border">
                xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h6 className="font-medium text-green-800">2. MICROSOFT_CLIENT_ID</h6>
                <button
                  onClick={() => copyToClipboard('MICROSOFT_CLIENT_ID', 'var2')}
                  className="text-green-600 hover:text-green-800"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-sm text-green-700 mb-2">
                <strong>Valore:</strong> Application (client) ID da Azure AD (Passo 1.3)
              </p>
              <div className="bg-white rounded p-2 font-mono text-sm border">
                xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h6 className="font-medium text-purple-800">3. MICROSOFT_CLIENT_SECRET</h6>
                <button
                  onClick={() => copyToClipboard('MICROSOFT_CLIENT_SECRET', 'var3')}
                  className="text-purple-600 hover:text-purple-800"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-sm text-purple-700 mb-2">
                <strong>Valore:</strong> Client Secret da Azure AD (Passo 2.1)
              </p>
              <div className="bg-white rounded p-2 font-mono text-sm border">
                xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
              </div>
              <div className="mt-2 bg-red-100 border border-red-200 rounded p-2">
                <p className="text-red-700 text-xs">
                  ⚠️ Questo è il valore più importante - assicurati di copiarlo correttamente!
                </p>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h6 className="font-medium text-orange-800">4. MICROSOFT_SENDER_EMAIL</h6>
                <button
                  onClick={() => copyToClipboard('MICROSOFT_SENDER_EMAIL', 'var4')}
                  className="text-orange-600 hover:text-orange-800"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-sm text-orange-700 mb-2">
                <strong>Valore:</strong> Email mittente Microsoft 365 (Passo 3)
              </p>
              <div className="bg-white rounded p-2 font-mono text-sm border">
                sistema@tuaazienda.com
              </div>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">4.3 Procedura di Inserimento</h5>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Per ogni variabile, clicca <strong>"Add variable"</strong> in Supabase</li>
            <li>Inserisci il <strong>Name</strong> esattamente come mostrato sopra</li>
            <li>Inserisci il <strong>Value</strong> con il tuo valore specifico</li>
            <li>Clicca <strong>"Save"</strong></li>
            <li>Ripeti per tutte e 4 le variabili</li>
            <li><strong>Riavvia</strong> il progetto se richiesto</li>
          </ol>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h5 className="font-medium text-yellow-800 mb-2">💡 Suggerimenti</h5>
          <div className="space-y-1 text-sm text-yellow-700">
            <div>• Copia e incolla i valori per evitare errori di digitazione</div>
            <div>• Controlla che non ci siano spazi extra all'inizio o alla fine</div>
            <div>• I nomi delle variabili sono case-sensitive</div>
            <div>• Salva ogni variabile prima di passare alla successiva</div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(3)}
          className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Passo Precedente
        </button>
        <div className="flex space-x-3">
          <button
            onClick={() => setCurrentStep(5)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Passo Successivo →
          </button>
          <button
            onClick={() => markStepComplete(4)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <CheckCircle size={16} />
            <span>Completato</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-800 mb-2">🧪 Obiettivo</h4>
        <p className="text-green-700 text-sm">
          Testare la configurazione per verificare che email e calendario funzionino correttamente.
        </p>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">5.1 Test Email Preventivi</h5>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Accedi ad AllevApp</li>
            <li>Vai su <strong>"Attrezzature"</strong> o <strong>"Impianti"</strong></li>
            <li>Clicca sull'icona <strong>📧</strong> di un elemento</li>
            <li>Compila il form di richiesta preventivo</li>
            <li>Seleziona un fornitore e clicca <strong>"Invia Richieste"</strong></li>
          </ol>
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-blue-700 text-sm">
              <strong>✅ Successo:</strong> Dovresti vedere "Email inviata con successo"
            </p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">5.2 Test Report Giornaliero</h5>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Vai su <strong>"Impostazioni"</strong> → <strong>"Generali"</strong></li>
            <li>Nella sezione <strong>"Report Giornaliero Email"</strong></li>
            <li>Clicca <strong>"Invia Report Test"</strong></li>
            <li>Controlla la tua casella di posta</li>
          </ol>
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-blue-700 text-sm">
              <strong>✅ Successo:</strong> Dovresti ricevere un'email con il report
            </p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-2">5.3 Test Calendario</h5>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Vai su <strong>"Calendario"</strong></li>
            <li>Clicca <strong>"Nuovo Evento"</strong> o l'icona calendario su una manutenzione</li>
            <li>Compila il form evento</li>
            <li>Clicca <strong>"Crea Evento"</strong></li>
            <li>Verifica che l'evento appaia in Outlook</li>
          </ol>
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-blue-700 text-sm">
              <strong>✅ Successo:</strong> L'evento dovrebbe apparire nel calendario Microsoft 365
            </p>
          </div>
        </div>

        <div className="border border-red-200 rounded-lg p-4 bg-red-50">
          <h5 className="font-medium text-red-800 mb-2">❌ Se Qualcosa Non Funziona</h5>
          <div className="space-y-3 text-sm text-red-700">
            <div>
              <strong>403 Forbidden:</strong> Verifica permessi API e consenso amministratore
            </div>
            <div>
              <strong>401 Unauthorized:</strong> Controlla Tenant ID, Client ID e Client Secret
            </div>
            <div>
              <strong>400 Bad Request:</strong> Verifica che l'email mittente sia valida
            </div>
            <div>
              <strong>Email non arrivano:</strong> Controlla cartella spam e filtri
            </div>
          </div>
        </div>

        <div className="border border-green-200 rounded-lg p-4 bg-green-50">
          <h5 className="font-medium text-green-800 mb-2">🎉 Configurazione Completata!</h5>
          <p className="text-green-700 text-sm mb-3">
            Se tutti i test sono andati a buon fine, il tuo sistema può ora:
          </p>
          <div className="space-y-1 text-sm text-green-700">
            <div className="flex items-center space-x-2">
              <CheckCircle size={16} />
              <span>Inviare email di richiesta preventivi</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle size={16} />
              <span>Creare eventi nel calendario Microsoft 365</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle size={16} />
              <span>Inviare report giornalieri automatici</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle size={16} />
              <span>Gestire inviti per riunioni e manutenzioni</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(4)}
          className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          ← Passo Precedente
        </button>
        <button
          onClick={() => markStepComplete(5)}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <CheckCircle size={16} />
          <span>Configurazione Completata! 🎉</span>
        </button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <Mail size={28} className="text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configurazione Microsoft 365</h1>
              <p className="text-gray-600">Guida passo-passo per collegare la tua casella postale</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Passo {currentStep} di {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {completedSteps.length} di {steps.length} completati
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Steps Navigation */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between overflow-x-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    currentStep === step.id
                      ? 'bg-blue-100 text-blue-700'
                      : completedSteps.includes(step.id)
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {completedSteps.includes(step.id) ? (
                    <CheckCircle size={20} className="text-green-600" />
                  ) : (
                    step.icon
                  )}
                  <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
                  <span className="text-sm font-medium sm:hidden">{step.id}</span>
                </button>
                {index < steps.length - 1 && (
                  <div className="w-8 h-px bg-gray-300 mx-2"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-280px)]">
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-2">
              {steps[currentStep - 1].icon}
              <h2 className="text-xl font-semibold text-gray-900">
                {steps[currentStep - 1].title}
              </h2>
            </div>
            <p className="text-gray-600">{steps[currentStep - 1].description}</p>
          </div>

          {renderCurrentStep()}
        </div>

        {/* Copy Notification */}
        {copiedText && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
            ✅ {copiedText} copiato!
          </div>
        )}
      </div>
    </div>
  );
};

export default Microsoft365SetupGuide;
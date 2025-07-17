# 📧 Guida Completa: Collegamento Microsoft 365 ad AllevApp

## 🎯 Panoramica
Questa guida ti aiuterà a configurare Microsoft 365 per l'invio automatico di email dal sistema AllevApp, inclusi preventivi, report giornalieri e inviti calendario.

---

## 📋 Prerequisiti

### ✅ Cosa Ti Serve
- **Account Microsoft 365** (Business o Enterprise)
- **Diritti di amministratore** sul tenant Microsoft 365
- **Accesso a Supabase Dashboard** (per configurare le variabili d'ambiente)
- **Email aziendale** da usare come mittente

### ⚠️ Importante
- La configurazione richiede circa **15-20 minuti**
- Avrai bisogno di creare un'**App Registration** in Azure AD
- Alcune impostazioni richiedono **consenso dell'amministratore**

---

## 🚀 FASE 1: Creazione App Registration in Azure AD

### Passo 1.1: Accesso al Portale Azure
1. Vai su **[portal.azure.com](https://portal.azure.com)**
2. Accedi con il tuo account **amministratore Microsoft 365**
3. Nel menu laterale, cerca **"Azure Active Directory"**
4. Clicca su **"Azure Active Directory"**

### Passo 1.2: Creazione Nuova App
1. Nel menu di Azure AD, clicca su **"App registrations"**
2. Clicca il pulsante **"+ New registration"** in alto
3. Compila il form:
   ```
   Name: AllevApp Email Service
   Supported account types: Accounts in this organizational directory only
   Redirect URI: (lascia vuoto per ora)
   ```
4. Clicca **"Register"**

### Passo 1.3: Annotare gli ID Importanti
Dopo la creazione, nella pagina **Overview** dell'app, annota:
```
Application (client) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Directory (tenant) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```
**💡 Conserva questi ID - li userai più tardi!**

---

## 🔐 FASE 2: Configurazione Autenticazione

### Passo 2.1: Creazione Client Secret
1. Nel menu laterale dell'app, clicca **"Certificates & secrets"**
2. Nella sezione **"Client secrets"**, clicca **"+ New client secret"**
3. Compila:
   ```
   Description: AllevApp Secret
   Expires: 24 months (consigliato)
   ```
4. Clicca **"Add"**
5. **⚠️ IMPORTANTE**: Copia immediatamente il **Value** del secret
   ```
   Client Secret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   **🚨 Non potrai più vederlo dopo aver lasciato questa pagina!**

### Passo 2.2: Configurazione Permessi API
1. Nel menu laterale, clicca **"API permissions"**
2. Clicca **"+ Add a permission"**
3. Seleziona **"Microsoft Graph"**
4. Seleziona **"Application permissions"** (NON Delegated)
5. Cerca e aggiungi questi permessi:
   ```
   ✅ Mail.Send
   ✅ Calendars.ReadWrite
   ✅ User.Read.All (opzionale, per leggere info utenti)
   ```
6. Clicca **"Add permissions"**

### Passo 2.3: Consenso Amministratore
1. Nella pagina **"API permissions"**
2. Clicca **"Grant admin consent for [TuaAzienda]"**
3. Conferma cliccando **"Yes"**
4. Verifica che tutti i permessi abbiano lo stato **"Granted"** (verde)

---

## 📧 FASE 3: Configurazione Email Mittente

### Passo 3.1: Verifica Account Email
1. Assicurati che l'email che vuoi usare come mittente:
   ```
   ✅ Sia un account Microsoft 365 valido
   ✅ Abbia una licenza Exchange Online
   ✅ Sia accessibile e funzionante
   ```

### Passo 3.2: Email Consigliate
Esempi di email mittente appropriate:
```
✅ sistema@tuaazienda.com
✅ allevapp@tuaazienda.com  
✅ noreply@tuaazienda.com
✅ automazione@tuaazienda.com
```

**❌ Evita email personali** come mario.rossi@tuaazienda.com

---

## ⚙️ FASE 4: Configurazione Supabase

### Passo 4.1: Accesso a Supabase
1. Vai su **[supabase.com](https://supabase.com)**
2. Accedi al tuo progetto AllevApp
3. Nel menu laterale, clicca **"Settings"**
4. Clicca **"Environment variables"**

### Passo 4.2: Aggiunta Variabili d'Ambiente
Aggiungi queste 4 variabili con i valori che hai annotato:

```bash
# 1. Tenant ID (Directory ID da Azure)
MICROSOFT_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# 2. Client ID (Application ID da Azure)  
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# 3. Client Secret (il secret che hai copiato)
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 4. Email mittente (la tua email Microsoft 365)
MICROSOFT_SENDER_EMAIL=sistema@tuaazienda.com
```

### Passo 4.3: Salvataggio
1. Clicca **"Add variable"** per ogni variabile
2. Inserisci **Name** e **Value** esattamente come sopra
3. Clicca **"Save"** per ogni variabile
4. **Riavvia** il progetto se richiesto

---

## 🧪 FASE 5: Test della Configurazione

### Passo 5.1: Test Email Preventivi
1. Accedi ad AllevApp
2. Vai su **"Attrezzature"** o **"Impianti"**
3. Clicca sull'icona **📧** di un elemento
4. Compila il form di richiesta preventivo
5. Seleziona un fornitore e clicca **"Invia Richieste"**

### Passo 5.2: Test Report Giornaliero
1. Vai su **"Impostazioni"** → **"Generali"**
2. Nella sezione **"Report Giornaliero Email"**
3. Clicca **"Invia Report Test"**
4. Controlla se ricevi l'email

### Passo 5.3: Test Calendario
1. Vai su **"Calendario"** 
2. Clicca **"Nuovo Evento"** o l'icona calendario su una manutenzione
3. Compila il form evento
4. Clicca **"Crea Evento"**
5. Verifica che l'evento appaia in Outlook

---

## ❌ Risoluzione Problemi Comuni

### Problema 1: "403 Forbidden"
**Causa**: Permessi insufficienti
**Soluzione**:
1. Verifica che i permessi **Mail.Send** e **Calendars.ReadWrite** siano aggiunti
2. Controlla che il **consenso amministratore** sia stato dato
3. Aspetta 5-10 minuti per la propagazione

### Problema 2: "401 Unauthorized"  
**Causa**: Credenziali errate
**Soluzione**:
1. Verifica che **MICROSOFT_TENANT_ID** e **MICROSOFT_CLIENT_ID** siano corretti
2. Controlla che **MICROSOFT_CLIENT_SECRET** sia stato copiato completamente
3. Assicurati che il secret non sia scaduto

### Problema 3: "400 Bad Request"
**Causa**: Email mittente non valida
**Soluzione**:
1. Verifica che **MICROSOFT_SENDER_EMAIL** sia un account Microsoft 365 valido
2. Controlla che l'account abbia licenza Exchange Online
3. Prova con un'email diversa

### Problema 4: Email non arrivano
**Causa**: Filtri spam o configurazione Exchange
**Soluzione**:
1. Controlla la cartella **Spam/Junk** del destinatario
2. Aggiungi l'email mittente ai **contatti fidati**
3. Verifica le **regole di trasporto** in Exchange Admin

### Problema 5: Eventi calendario non si creano
**Causa**: Permessi calendario insufficienti
**Soluzione**:
1. Verifica permesso **Calendars.ReadWrite**
2. Controlla che l'account mittente abbia accesso al calendario
3. Prova con un account diverso

---

## 🔍 Verifica Configurazione

### Checklist Finale
Prima di considerare la configurazione completa, verifica:

```
✅ App Registration creata in Azure AD
✅ Client Secret generato e copiato
✅ Permessi API aggiunti (Mail.Send, Calendars.ReadWrite)
✅ Consenso amministratore concesso
✅ 4 variabili d'ambiente configurate in Supabase
✅ Email mittente valida e funzionante
✅ Test email riuscito
✅ Test calendario riuscito
```

### Comandi di Test
Puoi testare la configurazione con questi comandi:

```javascript
// Test connessione Microsoft Graph
fetch('https://login.microsoftonline.com/[TENANT_ID]/oauth2/v2.0/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: '[CLIENT_ID]',
    client_secret: '[CLIENT_SECRET]',
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  })
})
```

---

## 📞 Supporto

### Se Hai Problemi
1. **Controlla i log** in Supabase → Functions → Logs
2. **Verifica le variabili** in Supabase → Settings → Environment variables
3. **Testa i permessi** in Azure AD → App registrations → API permissions
4. **Contatta l'amministratore** Microsoft 365 se necessario

### Informazioni Utili
- **Documentazione Microsoft Graph**: [docs.microsoft.com/graph](https://docs.microsoft.com/graph)
- **Azure AD App Registration**: [docs.microsoft.com/azure/active-directory](https://docs.microsoft.com/azure/active-directory)
- **Supabase Edge Functions**: [supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)

---

## 🎉 Congratulazioni!

Se hai completato tutti i passaggi, il tuo sistema AllevApp è ora collegato a Microsoft 365 e può:

- ✅ **Inviare email** di richiesta preventivi ai fornitori
- ✅ **Creare eventi** nel calendario Microsoft 365/Outlook  
- ✅ **Inviare report giornalieri** automatici
- ✅ **Gestire inviti** per riunioni e manutenzioni

Il sistema è ora completamente operativo! 🚀

---

*Guida creata per AllevApp - Sistema di Gestione Allevamenti*
*Versione 1.0 - Gennaio 2025*
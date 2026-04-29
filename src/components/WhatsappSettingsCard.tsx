import { useState, type FormEvent } from 'react';
import { MessageSquare, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

type Mode = 'link' | 'green-api';

interface Settings {
  whatsappConnected: boolean;
  whatsappPhone?: string;
  whatsappMode?: Mode;
  greenApiInstanceId?: string;
  greenApiTokenInstance?: string;
  greenApiHost?: string;
}

interface Props {
  settings: any;
  setSettings: (updater: (prev: any) => any) => void;
}

export function WhatsappSettingsCard({ settings, setSettings }: Props) {
  const [mode, setMode] = useState<Mode>(settings.whatsappMode ?? 'link');
  const [phone, setPhone] = useState<string>(settings.whatsappPhone ?? '');
  const [instanceId, setInstanceId] = useState<string>(settings.greenApiInstanceId ?? '');
  const [tokenInstance, setTokenInstance] = useState<string>(settings.greenApiTokenInstance ?? '');
  const [apiHost, setApiHost] = useState<string>(settings.greenApiHost ?? 'https://api.green-api.com');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const isConnected = !!settings.whatsappConnected;

  const connectLinkMode = (e: FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      alert('Numero non valido. Inserisci almeno 10 cifre con prefisso internazionale.');
      return;
    }
    setSettings(prev => ({
      ...prev,
      whatsappConnected: true,
      whatsappMode: 'link',
      whatsappPhone: digits,
    }));
  };

  const connectGreenApi = async (e: FormEvent) => {
    e.preventDefault();
    if (!instanceId.trim() || !tokenInstance.trim()) {
      alert('Inserisci sia Instance ID che API Token Instance.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/.netlify/functions/wa-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: instanceId.trim(),
          apiTokenInstance: tokenInstance.trim(),
          apiHost: apiHost.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTestResult(`Errore: ${data?.error ?? data?.message ?? 'connessione fallita'}`);
        setTesting(false);
        return;
      }
      const state = data?.stateInstance ?? 'unknown';
      const phoneOk = phone.replace(/\D/g, '');
      setSettings(prev => ({
        ...prev,
        whatsappConnected: true,
        whatsappMode: 'green-api',
        whatsappPhone: phoneOk || prev.whatsappPhone || '',
        greenApiInstanceId: instanceId.trim(),
        greenApiTokenInstance: tokenInstance.trim(),
        greenApiHost: apiHost.trim() || 'https://api.green-api.com',
        greenApiState: state,
      }));
      setTestResult(`Connesso. Stato istanza: ${state}`);
    } catch (err: any) {
      setTestResult(`Errore di rete: ${err?.message ?? err}`);
    } finally {
      setTesting(false);
    }
  };

  const disconnect = () => {
    if (!confirm('Sei sicuro di voler scollegare WhatsApp?')) return;
    setSettings(prev => ({
      ...prev,
      whatsappConnected: false,
      whatsappMode: 'link',
      whatsappPhone: '',
      greenApiInstanceId: '',
      greenApiTokenInstance: '',
    }));
    setTestResult(null);
  };

  if (isConnected) {
    const activeMode = settings.whatsappMode ?? 'link';
    return (
      <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-tight flex items-center gap-2">
          <MessageSquare size={16} className="text-[#25D366]" /> Collegamento WhatsApp
        </h3>
        <div className="flex items-center justify-between p-4 bg-dr7-green/5 rounded-lg border border-dr7-green/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-dr7-green text-white">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="font-bold text-sm">{activeMode === 'green-api' ? 'Green API connesso' : 'Numero WhatsApp collegato'}</p>
              <p className="text-xs text-text-secondary font-mono">{settings.whatsappPhone ? `+${settings.whatsappPhone}` : 'Senza numero'}</p>
              {activeMode === 'green-api' && (
                <p className="text-[10px] text-text-muted mt-0.5">Instance: <span className="font-mono">{settings.greenApiInstanceId}</span></p>
              )}
            </div>
          </div>
          <button
            onClick={disconnect}
            className="px-4 py-2 rounded font-bold text-[10px] uppercase tracking-wide bg-dr7-red text-white hover:bg-red-600"
          >
            Scollega
          </button>
        </div>
        <div className="bg-gray-50 border border-border-primary rounded p-3 text-xs text-text-secondary">
          Modalit&agrave;:{' '}
          <strong className="text-black">
            {activeMode === 'green-api' ? 'Green API (invio reale automatico)' : 'Link diretti wa.me (manuale, gratis)'}
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-5">
      <h3 className="font-bold text-sm uppercase tracking-tight flex items-center gap-2">
        <MessageSquare size={16} className="text-[#25D366]" /> Collegamento WhatsApp
      </h3>

      <div className="flex bg-gray-100 p-1 rounded-lg border border-border-primary">
        <button
          onClick={() => setMode('link')}
          className={`flex-1 py-2 text-[11px] font-bold uppercase rounded transition-all ${
            mode === 'link' ? 'bg-white shadow-sm text-dr7-teal' : 'text-text-secondary'
          }`}
        >
          Link diretti (gratis)
        </button>
        <button
          onClick={() => setMode('green-api')}
          className={`flex-1 py-2 text-[11px] font-bold uppercase rounded transition-all ${
            mode === 'green-api' ? 'bg-white shadow-sm text-dr7-teal' : 'text-text-secondary'
          }`}
        >
          Green API (invio automatico)
        </button>
      </div>

      {mode === 'link' && (
        <>
          <p className="text-xs text-text-secondary">
            Inserisci il numero WhatsApp della tua attivit&agrave; con prefisso internazionale (es. 39 per Italia, senza il +).
          </p>
          <form onSubmit={connectLinkMode} className="flex gap-2">
            <span className="px-3 py-2.5 bg-gray-50 border border-border-primary rounded text-sm font-mono text-text-secondary">+</span>
            <input
              type="tel"
              required
              placeholder="393331234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm font-mono border border-border-primary rounded focus:outline-none focus:border-dr7-teal"
            />
            <button type="submit" className="btn-teal px-4 py-2 font-bold text-xs">Collega</button>
          </form>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-[11px] text-blue-900 leading-relaxed">
            <strong>Come funziona?</strong> L&#39;app apre WhatsApp con il messaggio gi&agrave; scritto per ogni cliente: tu controlli e premi invia.
            Nessuna API, nessun costo, funziona con WhatsApp normale o Business.
          </div>
        </>
      )}

      {mode === 'green-api' && (
        <>
          <p className="text-xs text-text-secondary">
            Collega il tuo account <a href="https://green-api.com/" target="_blank" rel="noopener noreferrer" className="text-dr7-teal underline">Green API</a>.
            Invio automatico, ricezione messaggi, niente clic manuali. Costo gestito direttamente con Green API (~10€/mese a istanza).
          </p>
          <form onSubmit={connectGreenApi} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">ID Istanza (idInstance)</label>
              <input
                type="text"
                required
                value={instanceId}
                onChange={(e) => setInstanceId(e.target.value)}
                placeholder="es. 1101000001"
                className="w-full px-3 py-2 text-sm font-mono border border-border-primary rounded focus:outline-none focus:border-dr7-teal"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">API Token Instance</label>
              <input
                type="password"
                required
                value={tokenInstance}
                onChange={(e) => setTokenInstance(e.target.value)}
                placeholder="es. d75b3a..."
                className="w-full px-3 py-2 text-sm font-mono border border-border-primary rounded focus:outline-none focus:border-dr7-teal"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">API Host (lascia di default)</label>
              <input
                type="text"
                value={apiHost}
                onChange={(e) => setApiHost(e.target.value)}
                placeholder="https://api.green-api.com"
                className="w-full px-3 py-2 text-sm font-mono border border-border-primary rounded focus:outline-none focus:border-dr7-teal"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Numero WhatsApp dell&#39;attivit&agrave; (opzionale, per le risposte)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="393331234567"
                className="w-full px-3 py-2 text-sm font-mono border border-border-primary rounded focus:outline-none focus:border-dr7-teal"
              />
            </div>

            <button
              type="submit"
              disabled={testing}
              className="w-full btn-teal py-2.5 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {testing && <Loader2 size={14} className="animate-spin" />}
              Verifica e collega
            </button>
            {testResult && (
              <div className={`flex items-start gap-2 p-3 rounded text-xs ${
                testResult.startsWith('Errore') || testResult.startsWith('Errore di rete')
                  ? 'bg-dr7-red/5 border border-dr7-red/20 text-dr7-red'
                  : 'bg-dr7-green/5 border border-dr7-green/20 text-dr7-green'
              }`}>
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                <span>{testResult}</span>
              </div>
            )}
          </form>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-[11px] text-blue-900 leading-relaxed">
            <strong>Dove trovo le credenziali?</strong> Login su <a href="https://console.green-api.com/" target="_blank" rel="noopener noreferrer" className="underline">console.green-api.com</a>, crea un&#39;istanza, scansiona il QR code con WhatsApp, copia <code className="bg-white px-1 rounded">idInstance</code> e <code className="bg-white px-1 rounded">apiTokenInstance</code>.
          </div>
        </>
      )}
    </div>
  );
}

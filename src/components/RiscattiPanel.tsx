import { useMemo, useState, type ReactNode } from 'react';
import { Search, Gift, Check, AlertCircle, Calendar, Phone, Mail, X } from 'lucide-react';

interface CampaignRecipient {
  id: string;
  leadId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  code: string;
  clickCount: number;
  redeemed: boolean;
  redeemedAt?: string;
  conversionValue?: number;
  conversionType?: string;
  conversionNote?: string;
  channel?: string;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  createdAt: string;
  recipients?: CampaignRecipient[];
}

interface MatchResult {
  campaign: Campaign;
  recipient: CampaignRecipient;
}

interface RedemptionPayload {
  campaignId: string;
  recipientId: string;
  conversionType: string;
  conversionValue: number;
  conversionNote: string;
}

interface Props {
  campaigns: Campaign[];
  conversionTypes: string[];
  onRedeem: (payload: RedemptionPayload) => void;
}

type Tab = 'codice' | 'qr' | 'cliente';

export function RiscattiPanel({ campaigns, conversionTypes, onRedeem }: Props) {
  const [tab, setTab] = useState<Tab>('codice');
  const [codeInput, setCodeInput] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [conversionType, setConversionType] = useState(conversionTypes[0] ?? '');
  const [conversionValue, setConversionValue] = useState('');
  const [conversionNote, setConversionNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState(false);

  const findByCode = (raw: string): MatchResult | null => {
    const code = raw.trim().toUpperCase();
    if (!code) return null;
    for (const c of campaigns) {
      const r = c.recipients?.find(rec => rec.code === code);
      if (r) return { campaign: c, recipient: r };
    }
    return null;
  };

  const handleSearchCode = () => {
    setSearchError(null);
    setSuccess(false);
    const found = findByCode(codeInput);
    if (!found) {
      setMatch(null);
      setSearchError(`Codice "${codeInput.trim().toUpperCase()}" non trovato.`);
      return;
    }
    setMatch(found);
  };

  const customerResults = useMemo<MatchResult[]>(() => {
    const q = customerQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const results: MatchResult[] = [];
    for (const c of campaigns) {
      for (const r of c.recipients ?? []) {
        const fullName = `${r.firstName} ${r.lastName}`.toLowerCase();
        const phone = r.phone.toLowerCase();
        if (fullName.includes(q) || phone.includes(q.replace(/\D/g, ''))) {
          results.push({ campaign: c, recipient: r });
        }
      }
    }
    return results.slice(0, 20);
  }, [customerQuery, campaigns]);

  const handleConfirmRedemption = () => {
    if (!match) return;
    const value = parseFloat(conversionValue.replace(',', '.')) || 0;
    onRedeem({
      campaignId: match.campaign.id,
      recipientId: match.recipient.id,
      conversionType: conversionType || 'Generico',
      conversionValue: value,
      conversionNote: conversionNote,
    });
    setConfirming(false);
    setSuccess(true);
    setMatch(prev => prev ? {
      ...prev,
      recipient: {
        ...prev.recipient,
        redeemed: true,
        redeemedAt: new Date().toISOString(),
        conversionValue: value,
        conversionType,
        conversionNote,
      },
    } : prev);
  };

  const reset = () => {
    setMatch(null);
    setCodeInput('');
    setCustomerQuery('');
    setConversionType(conversionTypes[0] ?? '');
    setConversionValue('');
    setConversionNote('');
    setConfirming(false);
    setSuccess(false);
    setSearchError(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Riscatta codice / link / QR</h1>
        <p className="text-sm text-text-secondary mt-1">Registra una conversione e collega il cliente alla campagna</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Tab segmented control */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-border-primary">
            <TabBtn active={tab === 'codice'} onClick={() => { setTab('codice'); reset(); }}>Inserisci codice</TabBtn>
            <TabBtn active={tab === 'qr'} onClick={() => { setTab('qr'); reset(); }}>Scansiona QR</TabBtn>
            <TabBtn active={tab === 'cliente'} onClick={() => { setTab('cliente'); reset(); }}>Cerca cliente</TabBtn>
          </div>

          {/* Search panel */}
          {tab === 'codice' && (
            <div className="bg-white border border-border-primary rounded-lg p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Inserisci codice promozionale</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchCode()}
                    placeholder="es. MAR7K4P3"
                    className="flex-1 px-3 py-2.5 font-mono uppercase text-sm border border-border-primary rounded-md focus:outline-none focus:border-dr7-teal"
                  />
                </div>
              </div>
              <button
                onClick={handleSearchCode}
                disabled={!codeInput.trim()}
                className="w-full btn-teal py-2.5 flex items-center justify-center gap-2 font-bold disabled:opacity-50"
              >
                <Search size={14} /> Riscatta codice
              </button>
              {searchError && (
                <div className="flex items-start gap-2 p-3 bg-dr7-red/5 border border-dr7-red/20 rounded text-xs text-dr7-red">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{searchError}</span>
                </div>
              )}
            </div>
          )}

          {tab === 'qr' && (
            <div className="bg-white border border-border-primary rounded-lg p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-text-secondary">
                <Search size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-black">Scansiona o incolla il link tracciato</p>
                <p className="text-xs text-text-secondary mt-1">Il QR contiene un link tipo <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded">/c/CODICE</code>. Incolla qui il link o il codice estratto.</p>
              </div>
              <input
                type="text"
                value={codeInput}
                onChange={(e) => {
                  const val = e.target.value;
                  const m = val.match(/\/c\/([A-Z0-9]+)/i);
                  setCodeInput(m ? m[1].toUpperCase() : val.trim().toUpperCase());
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchCode()}
                placeholder="https://.../c/MAR7K4P3 oppure MAR7K4P3"
                className="w-full px-3 py-2.5 font-mono text-sm border border-border-primary rounded-md focus:outline-none focus:border-dr7-teal"
              />
              <button
                onClick={handleSearchCode}
                disabled={!codeInput.trim()}
                className="w-full btn-teal py-2.5 flex items-center justify-center gap-2 font-bold disabled:opacity-50"
              >
                <Search size={14} /> Riscatta
              </button>
              {searchError && <div className="text-xs text-dr7-red">{searchError}</div>}
            </div>
          )}

          {tab === 'cliente' && (
            <div className="bg-white border border-border-primary rounded-lg p-5 space-y-3">
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest">Cerca per nome o telefono</label>
              <input
                type="text"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                placeholder="es. Mario Rossi o 333..."
                className="w-full px-3 py-2.5 text-sm border border-border-primary rounded-md focus:outline-none focus:border-dr7-teal"
              />
              <div className="divide-y divide-border-primary border border-border-primary rounded-md max-h-72 overflow-y-auto">
                {customerQuery.trim().length < 2 && (
                  <p className="p-4 text-xs text-text-secondary text-center">Digita almeno 2 caratteri per cercare</p>
                )}
                {customerQuery.trim().length >= 2 && customerResults.length === 0 && (
                  <p className="p-4 text-xs text-text-secondary text-center">Nessun risultato</p>
                )}
                {customerResults.map(({ campaign, recipient }) => (
                  <button
                    key={recipient.id}
                    onClick={() => setMatch({ campaign, recipient })}
                    className="w-full text-left p-3 hover:bg-[#FAFAFA] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-black">{recipient.firstName} {recipient.lastName}</p>
                      <p className="text-[11px] text-text-secondary">{recipient.phone} &middot; {campaign.name}</p>
                    </div>
                    <span className="font-mono text-[11px] font-bold bg-dr7-teal/10 text-dr7-teal px-2 py-1 rounded">{recipient.code}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Match result */}
          {match && (
            <div className="bg-white border-2 border-dr7-green rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2 text-dr7-green text-sm font-bold">
                <Check size={16} /> Codice valido e trovato
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#FAFAFA] border border-border-primary rounded-md p-4">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Cliente</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-dr7-teal/10 flex items-center justify-center text-dr7-teal font-bold text-sm">
                      {(match.recipient.firstName[0] || '?').toUpperCase()}{(match.recipient.lastName[0] || '').toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-black text-sm">{match.recipient.firstName} {match.recipient.lastName}</p>
                      <p className="text-[11px] text-text-secondary flex items-center gap-1"><Phone size={10} /> {match.recipient.phone}</p>
                      {match.recipient.email && <p className="text-[11px] text-text-secondary flex items-center gap-1"><Mail size={10} /> {match.recipient.email}</p>}
                    </div>
                  </div>
                </div>

                <div className="bg-[#FAFAFA] border border-border-primary rounded-md p-4">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Campagna</p>
                  <p className="font-bold text-black text-sm">{match.campaign.name}</p>
                  <p className="text-[11px] text-text-secondary mt-1 flex items-center gap-1">
                    <Calendar size={10} /> Inviata il {new Date(match.campaign.createdAt).toLocaleDateString('it-IT')}
                  </p>
                  <p className="text-[11px] text-text-secondary mt-1 font-mono">Codice: {match.recipient.code}</p>
                </div>
              </div>

              {match.recipient.redeemed && !success && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  Attenzione: questo codice e&#39; gia&#39; stato riscattato il {match.recipient.redeemedAt ? new Date(match.recipient.redeemedAt).toLocaleString('it-IT') : '-'}
                  {match.recipient.conversionValue ? ` per €${match.recipient.conversionValue.toFixed(2)}` : ''}.
                </div>
              )}

              {success ? (
                <div className="p-3 bg-dr7-green/10 border border-dr7-green/30 rounded text-sm text-dr7-green flex items-center gap-2">
                  <Check size={14} /> Riscatto registrato con successo.
                  <button onClick={reset} className="ml-auto text-xs underline">Nuovo riscatto</button>
                </div>
              ) : (
                <>
                  <div className="border-t border-border-primary pt-4 space-y-3">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Registra conversione</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Tipo conversione</label>
                        <select
                          value={conversionType}
                          onChange={(e) => setConversionType(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-border-primary rounded-md focus:outline-none focus:border-dr7-teal"
                        >
                          {conversionTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Valore vendita (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={conversionValue}
                          onChange={(e) => setConversionValue(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 text-sm border border-border-primary rounded-md focus:outline-none focus:border-dr7-teal"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Note (opzionale)</label>
                      <textarea
                        value={conversionNote}
                        onChange={(e) => setConversionNote(e.target.value)}
                        rows={2}
                        placeholder="es. Noleggio DR7 7.0 per 3 giorni"
                        className="w-full px-3 py-2 text-sm border border-border-primary rounded-md focus:outline-none focus:border-dr7-teal"
                      />
                    </div>
                  </div>

                  {confirming ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setConfirming(false)}
                        className="bg-white border border-border-primary text-text-secondary py-2.5 rounded font-bold text-sm hover:bg-gray-50"
                      >
                        Annulla
                      </button>
                      <button
                        onClick={handleConfirmRedemption}
                        className="bg-dr7-green text-white py-2.5 rounded font-bold text-sm hover:bg-dr7-green/90 flex items-center justify-center gap-2"
                      >
                        <Check size={14} /> Conferma riscatto
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming(true)}
                      className="w-full bg-dr7-green text-white py-2.5 rounded font-bold text-sm hover:bg-dr7-green/90 flex items-center justify-center gap-2"
                    >
                      <Gift size={14} /> Conferma riscatto
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right column — info */}
        <div className="space-y-4">
          <div className="bg-white border border-border-primary rounded-lg p-4">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Come funziona</p>
            <ol className="space-y-2 text-xs text-text-secondary">
              <Step n={1}>Inserisci il codice o scansiona il QR del cliente</Step>
              <Step n={2}>Verifica i dati del cliente e della campagna</Step>
              <Step n={3}>Conferma il riscatto e inserisci il valore</Step>
              <Step n={4}>La conversione viene registrata automaticamente</Step>
            </ol>
          </div>

          {match && (
            <div className="bg-white border border-border-primary rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Dettagli campagna</p>
                <button onClick={reset} className="text-text-secondary hover:text-black"><X size={14} /></button>
              </div>
              <p className="text-sm font-bold text-black">{match.campaign.name}</p>
              <p className="text-[11px] text-text-secondary mt-1 line-clamp-3">{match.campaign.message}</p>
              <p className="text-[10px] text-text-muted mt-2">Click ricevuti: {match.recipient.clickCount}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-[11px] font-bold uppercase rounded transition-all ${
        active ? 'bg-white shadow-sm text-dr7-teal' : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-2 items-start">
      <span className="flex-shrink-0 w-5 h-5 bg-dr7-teal/10 text-dr7-teal rounded-full text-[10px] font-bold flex items-center justify-center">{n}</span>
      <span className="leading-snug">{children}</span>
    </li>
  );
}

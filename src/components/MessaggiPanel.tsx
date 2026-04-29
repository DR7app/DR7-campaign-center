import { useMemo, useState } from 'react';
import { MessageSquare, ChevronRight, Send, Settings as SettingsIcon } from 'lucide-react';

interface CampaignRecipient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  code: string;
  redeemed: boolean;
  clickCount: number;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: string;
  createdAt: string;
  recipients?: CampaignRecipient[];
}

interface Props {
  campaigns: Campaign[];
  whatsappConnected: boolean;
  whatsappPhone?: string;
  onOpenSettings: () => void;
  onSendCampaign: (campaignId: string) => void;
}

export function MessaggiPanel({ campaigns, whatsappConnected, whatsappPhone, onOpenSettings, onSendCampaign }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sortedCampaigns = useMemo(
    () => [...campaigns].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [campaigns]
  );

  const selected = sortedCampaigns.find(c => c.id === selectedId);
  const totalSent = sortedCampaigns.reduce((s, c) => s + (c.recipients?.length ?? 0), 0);
  const totalRedeemed = sortedCampaigns.reduce((s, c) => s + (c.recipients?.filter(r => r.redeemed).length ?? 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messaggi</h1>
        <p className="text-sm text-text-secondary mt-1">Storico messaggi inviati e risposte clienti</p>
      </div>

      {!whatsappConnected ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0">
            <SettingsIcon size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-black">Numero WhatsApp non collegato</p>
            <p className="text-xs text-text-secondary mt-1">
              Per inviare messaggi devi collegare il numero WhatsApp della tua attivit&agrave;. Servir&agrave; per generare i link a una conversazione con i tuoi clienti. Gratis, niente API necessarie.
            </p>
          </div>
          <button onClick={onOpenSettings} className="btn-teal text-xs px-3 py-2 font-bold whitespace-nowrap">
            Collega ora
          </button>
        </div>
      ) : (
        <div className="bg-dr7-green/5 border border-dr7-green/30 rounded-lg p-3 flex items-center gap-3 text-xs">
          <span className="w-7 h-7 rounded-full bg-dr7-green text-white flex items-center justify-center"><Send size={12} /></span>
          <span>WhatsApp collegato (<strong className="font-mono">+{whatsappPhone}</strong>) &mdash; pronto per inviare campagne.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Campagne inviate" value={sortedCampaigns.length.toString()} />
        <Stat label="Messaggi totali" value={totalSent.toLocaleString()} />
        <Stat label="Riscatti ricevuti" value={totalRedeemed.toString()} />
      </div>

      <div className="bg-white border border-border-primary rounded-lg overflow-hidden flex" style={{ minHeight: 480 }}>
        <div className="w-80 border-r border-border-primary overflow-y-auto">
          {sortedCampaigns.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-secondary">Nessuna campagna inviata</div>
          ) : (
            <div className="divide-y divide-border-primary">
              {sortedCampaigns.map(c => {
                const count = c.recipients?.length ?? 0;
                const redeemed = c.recipients?.filter(r => r.redeemed).length ?? 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-3 flex items-start gap-2 hover:bg-[#FAFAFA] ${selectedId === c.id ? 'bg-dr7-teal/5 border-l-2 border-dr7-teal' : ''}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-dr7-teal/10 text-dr7-teal flex items-center justify-center flex-shrink-0">
                      <MessageSquare size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-black truncate">{c.name}</p>
                      <p className="text-[10px] text-text-secondary truncate">{c.message}</p>
                      <div className="flex gap-2 mt-1 text-[9px] text-text-muted">
                        <span>{count} dest.</span>
                        {redeemed > 0 && <span className="text-dr7-green font-bold">{redeemed} riscatti</span>}
                        <span>{new Date(c.createdAt).toLocaleDateString('it-IT')}</span>
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-text-muted mt-3 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex-1 p-5 overflow-y-auto">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-text-secondary text-sm">
              <MessageSquare size={32} className="text-text-muted mb-2" />
              <p>Seleziona una campagna per vedere i dettagli</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Campagna</p>
                  <h2 className="text-lg font-bold text-black">{selected.name}</h2>
                  <p className="text-[11px] text-text-secondary">Stato: {selected.status} &middot; Creata il {new Date(selected.createdAt).toLocaleString('it-IT')}</p>
                </div>
                {(selected.recipients?.length ?? 0) > 0 && (
                  <button
                    onClick={() => onSendCampaign(selected.id)}
                    className="bg-[#25D366] hover:bg-[#1eb755] text-white px-3 py-2 rounded text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Send size={12} /> Invia con WhatsApp
                  </button>
                )}
              </div>

              <div className="bg-[#FAFAFA] border border-border-primary rounded p-4">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Messaggio inviato</p>
                <p className="text-sm text-black whitespace-pre-wrap">{selected.message}</p>
              </div>

              <div className="bg-white border border-border-primary rounded p-4">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Destinatari</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(selected.recipients ?? []).map(r => (
                    <div key={r.id} className="flex items-center justify-between bg-[#FAFAFA] rounded p-2">
                      <div>
                        <p className="text-xs font-bold text-black">{r.firstName} {r.lastName}</p>
                        <p className="text-[10px] text-text-muted font-mono">{r.phone}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-mono text-[10px] font-bold text-dr7-teal">{r.code}</span>
                        {r.redeemed && <span className="text-[9px] font-bold text-dr7-green uppercase">Riscattato</span>}
                      </div>
                    </div>
                  ))}
                </div>
                {(selected.recipients?.length ?? 0) === 0 && (
                  <p className="text-xs text-text-secondary text-center py-4">Nessun destinatario</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-border-primary rounded-lg p-4">
      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-bold text-black mt-1">{value}</p>
    </div>
  );
}

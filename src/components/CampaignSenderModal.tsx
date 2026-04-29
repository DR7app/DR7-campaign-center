import { useMemo, useState } from 'react';
import { X, Send, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { buildTrackingUrl } from '../lib/codes';

interface CampaignRecipient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  code: string;
  redeemed: boolean;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  recipients?: CampaignRecipient[];
  trackingBaseUrl?: string;
}

interface Props {
  campaign: Campaign;
  onClose: () => void;
  onMarkAllSent: (campaignId: string) => void;
}

const personalize = (
  template: string,
  recipient: CampaignRecipient,
  trackingUrl: string
): string => {
  return template
    .replace(/\{nome\}/gi, recipient.firstName)
    .replace(/\{cognome\}/gi, recipient.lastName)
    .replace(/\{name\}/gi, recipient.firstName)
    .replace(/\{codice\}/gi, recipient.code)
    .replace(/\{code\}/gi, recipient.code)
    .replace(/\{link\}/gi, trackingUrl)
    .replace(/\{url\}/gi, trackingUrl);
};

export function CampaignSenderModal({ campaign, onClose, onMarkAllSent }: Props) {
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  const baseUrl = campaign.trackingBaseUrl ?? window.location.origin;
  const recipients = campaign.recipients ?? [];

  const rows = useMemo(() => recipients.map(r => {
    const trackingUrl = buildTrackingUrl(baseUrl, r.code);
    const message = personalize(campaign.message, r, trackingUrl);
    const phoneDigits = r.phone.replace(/\D/g, '');
    const waUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
    return { recipient: r, trackingUrl, message, waUrl };
  }), [recipients, campaign.message, baseUrl]);

  const sentCount = sentIds.size;
  const allSent = sentCount === recipients.length && recipients.length > 0;

  const markSent = (id: string) => {
    setSentIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const sendAll = () => {
    if (!confirm(`Aprire WhatsApp per tutti i ${recipients.length} destinatari? Si aprirà una scheda per ogni cliente.`)) return;
    rows.forEach((row, i) => {
      setTimeout(() => {
        window.open(row.waUrl, '_blank');
        markSent(row.recipient.id);
      }, i * 600);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-border-primary">
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Invia campagna</p>
            <h2 className="text-lg font-bold text-black mt-0.5">{campaign.name}</h2>
            <p className="text-xs text-text-secondary mt-1">
              <strong className="text-black">{recipients.length}</strong> destinatari &middot; <strong className="text-dr7-green">{sentCount}</strong> inviati
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {!allSent && recipients.length > 0 && (
              <button
                onClick={sendAll}
                className="text-[11px] font-bold text-white bg-[#25D366] hover:bg-[#1eb755] px-3 py-2 rounded flex items-center gap-1.5"
                title="Apre WhatsApp per ogni destinatario in sequenza"
              >
                <Send size={12} /> Invia tutti
              </button>
            )}
            {allSent && (
              <button
                onClick={() => { onMarkAllSent(campaign.id); onClose(); }}
                className="text-[11px] font-bold text-white bg-dr7-green hover:bg-dr7-green/90 px-3 py-2 rounded flex items-center gap-1.5"
              >
                <Check size={12} /> Conferma campagna inviata
              </button>
            )}
            <button onClick={onClose} className="text-text-secondary hover:text-black p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-5 py-3 bg-blue-50 border-b border-blue-200 text-[11px] text-blue-900 leading-relaxed flex items-start gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>Come funziona:</strong> clicca <strong>Invia</strong> a destra di ogni cliente. Si apre WhatsApp con il messaggio gi&agrave; pronto, controlli e premi invia. Il messaggio &egrave; personalizzato con il nome e il codice unico.
            Placeholder supportati nel messaggio: <code className="bg-white px-1 py-0.5 rounded">{'{nome}'}</code> <code className="bg-white px-1 py-0.5 rounded">{'{codice}'}</code> <code className="bg-white px-1 py-0.5 rounded">{'{link}'}</code>
          </div>
        </div>

        {recipients.length === 0 ? (
          <div className="p-12 text-center text-text-secondary text-sm">
            Nessun destinatario in questa campagna.
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAFAFA] border-b border-border-primary sticky top-0">
                <tr>
                  <th className="table-header">Destinatario</th>
                  <th className="table-header">Codice</th>
                  <th className="table-header">Anteprima messaggio</th>
                  <th className="table-header text-center">Stato</th>
                  <th className="table-header text-right">Azione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {rows.map(({ recipient, message, waUrl }) => {
                  const sent = sentIds.has(recipient.id);
                  return (
                    <tr key={recipient.id} className="hover:bg-[#FAFAFA]">
                      <td className="p-3 align-top">
                        <p className="font-bold text-black text-xs">{recipient.firstName} {recipient.lastName}</p>
                        <p className="text-[11px] text-text-muted font-mono">{recipient.phone}</p>
                      </td>
                      <td className="p-3 align-top">
                        <span className="font-mono text-[11px] font-bold bg-dr7-teal/10 text-dr7-teal px-2 py-1 rounded">{recipient.code}</span>
                      </td>
                      <td className="p-3 align-top text-[11px] text-text-secondary max-w-md whitespace-pre-wrap line-clamp-3">{message}</td>
                      <td className="p-3 align-top text-center">
                        {sent ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-dr7-green/10 text-dr7-green inline-flex items-center gap-1">
                            <Check size={10} /> Inviato
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-text-muted">Da inviare</span>
                        )}
                      </td>
                      <td className="p-3 align-top text-right">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => markSent(recipient.id)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#25D366] hover:bg-[#1eb755] px-3 py-1.5 rounded"
                        >
                          {sent ? <ExternalLink size={11} /> : <Send size={11} />}
                          {sent ? 'Re-invia' : 'Invia'}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

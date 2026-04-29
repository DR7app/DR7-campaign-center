import { useState } from 'react';
import { X, Copy, Check, Download, QrCode, Link2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { buildTrackingUrl } from '../lib/codes';

interface CampaignRecipient {
  id: string;
  leadId: string;
  firstName: string;
  lastName: string;
  phone: string;
  code: string;
  clickCount: number;
  redeemed: boolean;
  redeemedAt?: string;
  conversionValue?: number;
}

interface Campaign {
  id: string;
  name: string;
  recipients?: CampaignRecipient[];
  trackingBaseUrl?: string;
  createdAt: string;
}

interface Props {
  campaign: Campaign;
  onClose: () => void;
}

export function RecipientsModal({ campaign, onClose }: Props) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<string | null>(null);

  const baseUrl = campaign.trackingBaseUrl ?? window.location.origin;
  const recipients = campaign.recipients ?? [];

  const copy = async (text: string, code: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {
      // ignore
    }
  };

  const exportCSV = () => {
    const header = ['code', 'first_name', 'last_name', 'phone', 'tracking_url', 'clicks', 'redeemed'];
    const rows = recipients.map(r => [
      r.code,
      r.firstName,
      r.lastName,
      r.phone,
      buildTrackingUrl(baseUrl, r.code),
      String(r.clickCount),
      r.redeemed ? 'yes' : 'no',
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `campagna-${campaign.name.replace(/[^a-z0-9]/gi, '_')}-codici.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const totalClicks = recipients.reduce((s, r) => s + r.clickCount, 0);
  const totalRedeemed = recipients.filter(r => r.redeemed).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-border-primary">
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Codici campagna</p>
            <h2 className="text-lg font-bold text-black mt-0.5">{campaign.name}</h2>
            <div className="flex gap-3 mt-2 text-xs text-text-secondary">
              <span><strong className="text-black">{recipients.length}</strong> destinatari</span>
              <span><strong className="text-black">{totalClicks}</strong> click</span>
              <span><strong className="text-black">{totalRedeemed}</strong> riscatti</span>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={exportCSV}
              className="text-xs font-bold text-dr7-teal border border-dr7-teal/30 hover:bg-dr7-teal/5 px-3 py-2 rounded flex items-center gap-1.5"
            >
              <Download size={12} /> CSV
            </button>
            <button onClick={onClose} className="text-text-secondary hover:text-black p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {recipients.length === 0 ? (
          <div className="p-12 text-center text-text-secondary text-sm">
            Nessun destinatario. La campagna non ha ancora codici generati.
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAFAFA] border-b border-border-primary sticky top-0">
                <tr>
                  <th className="table-header">Destinatario</th>
                  <th className="table-header">Codice</th>
                  <th className="table-header">Link</th>
                  <th className="table-header">QR</th>
                  <th className="table-header text-center">Click</th>
                  <th className="table-header text-center">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {recipients.map((r) => {
                  const url = buildTrackingUrl(baseUrl, r.code);
                  return (
                    <tr key={r.id} className="hover:bg-[#FAFAFA]">
                      <td className="p-3 align-middle">
                        <div className="font-bold text-black text-xs">{r.firstName} {r.lastName}</div>
                        <div className="text-[11px] text-text-muted font-mono">{r.phone}</div>
                      </td>
                      <td className="p-3 align-middle">
                        <button
                          onClick={() => copy(r.code, r.code)}
                          className="font-mono text-[11px] font-bold bg-dr7-teal/10 text-dr7-teal px-2 py-1 rounded inline-flex items-center gap-1.5 hover:bg-dr7-teal/20"
                          title="Copia codice"
                        >
                          {r.code}
                          {copiedCode === r.code ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      </td>
                      <td className="p-3 align-middle">
                        <button
                          onClick={() => copy(url, `url-${r.code}`)}
                          className="text-[11px] text-text-secondary hover:text-dr7-teal inline-flex items-center gap-1.5 max-w-xs truncate"
                          title="Copia link"
                        >
                          <Link2 size={11} className="shrink-0" />
                          <span className="truncate">{url.replace(/^https?:\/\//, '')}</span>
                          {copiedCode === `url-${r.code}` && <Check size={11} className="text-dr7-green shrink-0" />}
                        </button>
                      </td>
                      <td className="p-3 align-middle">
                        <button
                          onClick={() => setQrFor(qrFor === r.code ? null : r.code)}
                          className="w-8 h-8 flex items-center justify-center border border-border-primary rounded hover:border-dr7-teal hover:bg-dr7-teal/5"
                          title="Mostra QR code"
                        >
                          {qrFor === r.code ? (
                            <QRCodeSVG value={url} size={28} />
                          ) : (
                            <QrCode size={14} className="text-text-secondary" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 text-center align-middle font-mono text-xs">{r.clickCount}</td>
                      <td className="p-3 text-center align-middle">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          r.redeemed
                            ? 'bg-dr7-green/10 text-dr7-green'
                            : 'bg-gray-100 text-text-muted'
                        }`}>
                          {r.redeemed ? 'Riscattato' : 'In attesa'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {qrFor && (
          <div className="border-t border-border-primary p-4 bg-[#FAFAFA] flex items-center gap-4">
            <QRCodeSVG value={buildTrackingUrl(baseUrl, qrFor)} size={120} level="M" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">QR Code per</p>
              <p className="font-mono font-bold text-sm text-black">{qrFor}</p>
              <p className="text-xs text-text-secondary mt-1 truncate">{buildTrackingUrl(baseUrl, qrFor)}</p>
            </div>
            <button
              onClick={() => setQrFor(null)}
              className="text-xs text-text-secondary hover:text-black"
            >
              Chiudi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

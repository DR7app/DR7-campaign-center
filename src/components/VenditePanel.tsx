import { useMemo, useState } from 'react';
import { Receipt, TrendingUp, Calendar, Download } from 'lucide-react';

interface CampaignRecipient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  code: string;
  redeemed: boolean;
  redeemedAt?: string;
  conversionValue?: number;
  conversionType?: string;
  conversionNote?: string;
}

interface Campaign {
  id: string;
  name: string;
  recipients?: CampaignRecipient[];
}

interface Props { campaigns: Campaign[]; }

interface Row {
  recipientId: string;
  campaignId: string;
  campaignName: string;
  customer: string;
  phone: string;
  code: string;
  amount: number;
  type: string;
  note?: string;
  redeemedAt: string;
}

export function VenditePanel({ campaigns }: Props) {
  const [campaignFilter, setCampaignFilter] = useState<string>('all');

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const c of campaigns) {
      for (const r of c.recipients ?? []) {
        if (!r.redeemed || !r.redeemedAt) continue;
        out.push({
          recipientId: r.id,
          campaignId: c.id,
          campaignName: c.name,
          customer: `${r.firstName} ${r.lastName}`.trim(),
          phone: r.phone,
          code: r.code,
          amount: r.conversionValue ?? 0,
          type: r.conversionType ?? 'Generico',
          note: r.conversionNote,
          redeemedAt: r.redeemedAt,
        });
      }
    }
    return out.sort((a, b) => b.redeemedAt.localeCompare(a.redeemedAt));
  }, [campaigns]);

  const filtered = campaignFilter === 'all' ? rows : rows.filter(r => r.campaignId === campaignFilter);

  const total = filtered.reduce((s, r) => s + r.amount, 0);
  const today = new Date().toDateString();
  const todayTotal = filtered.filter(r => new Date(r.redeemedAt).toDateString() === today).reduce((s, r) => s + r.amount, 0);
  const last7 = filtered.filter(r => Date.now() - new Date(r.redeemedAt).getTime() < 7 * 24 * 3600 * 1000).reduce((s, r) => s + r.amount, 0);

  const exportCSV = () => {
    const header = ['data', 'cliente', 'telefono', 'codice', 'campagna', 'tipo', 'importo', 'note'];
    const data = filtered.map(r => [
      new Date(r.redeemedAt).toLocaleString('it-IT'),
      r.customer,
      r.phone,
      r.code,
      r.campaignName,
      r.type,
      r.amount.toFixed(2),
      r.note ?? '',
    ]);
    const csv = [header, ...data]
      .map(row => row.map(c => `"${(c ?? '').toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendite-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendite</h1>
          <p className="text-sm text-text-secondary mt-1">Tutte le conversioni registrate dai riscatti dei codici</p>
        </div>
        {filtered.length > 0 && (
          <button onClick={exportCSV} className="text-xs font-bold text-dr7-teal border border-dr7-teal/30 hover:bg-dr7-teal/5 px-3 py-2 rounded flex items-center gap-1.5">
            <Download size={12} /> CSV
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Totale incassato" value={`€${total.toFixed(2)}`} icon={Receipt} />
        <Stat label="Oggi" value={`€${todayTotal.toFixed(2)}`} icon={Calendar} />
        <Stat label="Ultimi 7 giorni" value={`€${last7.toFixed(2)}`} icon={TrendingUp} />
      </div>

      <div className="bg-white border border-border-primary rounded-lg overflow-hidden">
        <div className="p-3 border-b border-border-primary flex items-center gap-2">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Filtra per campagna:</span>
          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="text-xs border border-border-primary rounded px-2 py-1"
          >
            <option value="all">Tutte le campagne</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-text-secondary">
            Nessuna vendita registrata. Vai su <strong>Riscatti</strong> per registrare una conversione.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAFAFA]">
              <tr>
                <th className="table-header">Data</th>
                <th className="table-header">Cliente</th>
                <th className="table-header">Codice</th>
                <th className="table-header">Campagna</th>
                <th className="table-header">Tipo</th>
                <th className="table-header text-right">Importo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              {filtered.map((r) => (
                <tr key={r.recipientId} className="hover:bg-[#FAFAFA]">
                  <td className="p-3 text-xs text-text-secondary font-mono">{new Date(r.redeemedAt).toLocaleDateString('it-IT')}</td>
                  <td className="p-3">
                    <p className="font-bold text-black text-xs">{r.customer}</p>
                    <p className="text-[10px] text-text-muted font-mono">{r.phone}</p>
                  </td>
                  <td className="p-3 font-mono text-[11px] font-bold text-dr7-teal">{r.code}</td>
                  <td className="p-3 text-xs text-text-secondary">{r.campaignName}</td>
                  <td className="p-3 text-[10px] text-text-secondary">
                    <span className="bg-gray-100 px-2 py-0.5 rounded">{r.type}</span>
                  </td>
                  <td className="p-3 text-right font-bold text-black">€{r.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="bg-white border border-border-primary rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{label}</span>
        <Icon size={14} className="text-dr7-teal" />
      </div>
      <p className="text-2xl font-bold text-black">{value}</p>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Search, UserCheck } from 'lucide-react';

interface CampaignRecipient {
  id: string;
  leadId: string;
  firstName: string;
  lastName: string;
  phone: string;
  redeemed: boolean;
  redeemedAt?: string;
  conversionValue?: number;
}

interface Campaign {
  id: string;
  name: string;
  recipients?: CampaignRecipient[];
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  list: string;
  createdAt: string;
}

interface Props {
  leads: Lead[];
  campaigns: Campaign[];
}

interface ClientStats {
  lead: Lead;
  redemptionCount: number;
  totalSpent: number;
  lastRedemptionAt?: string;
  campaignsCount: number;
}

export function ClientiPanel({ leads, campaigns }: Props) {
  const [query, setQuery] = useState('');

  const clients = useMemo<ClientStats[]>(() => {
    const map = new Map<string, ClientStats>();
    for (const c of campaigns) {
      for (const r of c.recipients ?? []) {
        if (!r.redeemed) continue;
        const lead = leads.find(l => l.id === r.leadId);
        if (!lead) continue;
        const existing = map.get(lead.id);
        if (existing) {
          existing.redemptionCount += 1;
          existing.totalSpent += r.conversionValue ?? 0;
          if (!existing.lastRedemptionAt || (r.redeemedAt && r.redeemedAt > existing.lastRedemptionAt)) {
            existing.lastRedemptionAt = r.redeemedAt;
          }
          existing.campaignsCount += 1;
        } else {
          map.set(lead.id, {
            lead,
            redemptionCount: 1,
            totalSpent: r.conversionValue ?? 0,
            lastRedemptionAt: r.redeemedAt,
            campaignsCount: 1,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [leads, campaigns]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c => {
      const fullName = `${c.lead.firstName} ${c.lead.lastName}`.toLowerCase();
      return fullName.includes(q) || c.lead.phone.includes(q.replace(/\D/g, ''));
    });
  }, [clients, query]);

  const totalLifetimeValue = clients.reduce((s, c) => s + c.totalSpent, 0);
  const avgValue = clients.length > 0 ? totalLifetimeValue / clients.length : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clienti</h1>
        <p className="text-sm text-text-secondary mt-1">Lead che hanno riscattato almeno un codice (clienti convertiti)</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Clienti totali" value={clients.length.toString()} />
        <Stat label="Valore totale" value={`€${totalLifetimeValue.toFixed(2)}`} />
        <Stat label="Valore medio" value={`€${avgValue.toFixed(2)}`} />
      </div>

      <div className="bg-white border border-border-primary rounded-lg overflow-hidden">
        <div className="p-3 border-b border-border-primary">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca per nome o telefono..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-border-primary rounded focus:outline-none focus:border-dr7-teal"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-text-secondary">
            {clients.length === 0
              ? <>Nessun cliente convertito. Va&#39; su <strong>Riscatti</strong> per registrare la prima conversione.</>
              : 'Nessun risultato per la tua ricerca'}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FAFAFA]">
              <tr>
                <th className="table-header">Cliente</th>
                <th className="table-header text-center">Riscatti</th>
                <th className="table-header text-right">Valore totale</th>
                <th className="table-header">Ultimo riscatto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              {filtered.map((c) => (
                <tr key={c.lead.id} className="hover:bg-[#FAFAFA]">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-dr7-teal/10 text-dr7-teal flex items-center justify-center text-[11px] font-bold">
                        {(c.lead.firstName[0] || '?').toUpperCase()}{(c.lead.lastName[0] || '').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-black text-xs">{c.lead.firstName} {c.lead.lastName}</p>
                        <p className="text-[10px] text-text-muted font-mono">{c.lead.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className="bg-dr7-green/10 text-dr7-green px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1">
                      <UserCheck size={11} /> {c.redemptionCount}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-black">€{c.totalSpent.toFixed(2)}</td>
                  <td className="p-3 text-xs text-text-secondary">
                    {c.lastRedemptionAt ? new Date(c.lastRedemptionAt).toLocaleDateString('it-IT') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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

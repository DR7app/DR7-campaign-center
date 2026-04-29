import { useMemo } from 'react';
import { TrendingUp, MousePointerClick, Gift, Receipt, Users } from 'lucide-react';

interface CampaignRecipient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  code: string;
  clickCount: number;
  redeemed: boolean;
  conversionValue?: number;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: string;
  createdAt: string;
  recipients?: CampaignRecipient[];
}

interface Props { campaigns: Campaign[]; }

export function ReportsPanel({ campaigns }: Props) {
  const stats = useMemo(() => {
    const sentCampaigns = campaigns.filter(c => ['Inviata', 'Simulata', 'Programmata'].includes(c.status));
    let totalRecipients = 0;
    let totalClicks = 0;
    let totalRedemptions = 0;
    let totalRevenue = 0;
    const perCampaign = sentCampaigns.map(c => {
      const recipients = c.recipients ?? [];
      const clicks = recipients.reduce((s, r) => s + r.clickCount, 0);
      const redemptions = recipients.filter(r => r.redeemed).length;
      const revenue = recipients.reduce((s, r) => s + (r.conversionValue ?? 0), 0);
      totalRecipients += recipients.length;
      totalClicks += clicks;
      totalRedemptions += redemptions;
      totalRevenue += revenue;
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        createdAt: c.createdAt,
        sent: recipients.length,
        clicks,
        redemptions,
        revenue,
        clickRate: recipients.length > 0 ? (clicks / recipients.length) * 100 : 0,
        redemptionRate: recipients.length > 0 ? (redemptions / recipients.length) * 100 : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    return {
      totalCampaigns: sentCampaigns.length,
      totalRecipients,
      totalClicks,
      totalRedemptions,
      totalRevenue,
      clickRate: totalRecipients > 0 ? (totalClicks / totalRecipients) * 100 : 0,
      redemptionRate: totalRecipients > 0 ? (totalRedemptions / totalRecipients) * 100 : 0,
      avgRevenue: totalRedemptions > 0 ? totalRevenue / totalRedemptions : 0,
      perCampaign,
    };
  }, [campaigns]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Report e Statistiche</h1>
        <p className="text-sm text-text-secondary mt-1">Performance globale delle tue campagne — funnel completo dal click al riscatto</p>
      </div>

      {stats.totalCampaigns === 0 ? (
        <div className="bg-white border border-border-primary rounded-lg p-12 text-center">
          <TrendingUp size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-text-secondary">Nessuna campagna inviata. I dati delle conversioni appariranno qui dopo il primo invio.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Destinatari totali" value={stats.totalRecipients.toLocaleString('it-IT')} icon={Users} />
            <Stat
              label="Click tracciati"
              value={stats.totalClicks.toLocaleString('it-IT')}
              sub={`${stats.clickRate.toFixed(1)}% sui destinatari`}
              icon={MousePointerClick}
            />
            <Stat
              label="Riscatti"
              value={stats.totalRedemptions.toLocaleString('it-IT')}
              sub={`${stats.redemptionRate.toFixed(1)}% conversion`}
              icon={Gift}
            />
            <Stat
              label="Revenue"
              value={`€${stats.totalRevenue.toFixed(2)}`}
              sub={`Media €${stats.avgRevenue.toFixed(2)} per riscatto`}
              icon={Receipt}
            />
          </div>

          <div className="bg-white border border-border-primary rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border-primary">
              <h2 className="font-bold text-sm">Performance per campagna</h2>
              <p className="text-xs text-text-secondary mt-1">Ordinato per ricavi</p>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAFAFA]">
                <tr>
                  <th className="table-header">Campagna</th>
                  <th className="table-header text-center">Inviati</th>
                  <th className="table-header text-center">Click</th>
                  <th className="table-header text-center">Riscatti</th>
                  <th className="table-header text-right">Revenue</th>
                  <th className="table-header text-right">CTR</th>
                  <th className="table-header text-right">Conv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {stats.perCampaign.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAFAFA]">
                    <td className="p-3">
                      <p className="font-bold text-black text-xs">{c.name}</p>
                      <p className="text-[10px] text-text-muted">{new Date(c.createdAt).toLocaleDateString('it-IT')} &middot; {c.status}</p>
                    </td>
                    <td className="p-3 text-center font-mono text-xs">{c.sent}</td>
                    <td className="p-3 text-center font-mono text-xs">{c.clicks}</td>
                    <td className="p-3 text-center font-mono text-xs font-bold text-dr7-green">{c.redemptions}</td>
                    <td className="p-3 text-right font-bold">€{c.revenue.toFixed(2)}</td>
                    <td className="p-3 text-right text-xs text-text-secondary">{c.clickRate.toFixed(1)}%</td>
                    <td className="p-3 text-right text-xs font-bold text-black">{c.redemptionRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-4 text-xs text-blue-900 leading-relaxed">
            <strong>Nota sulle metriche:</strong> i click vengono registrati quando un destinatario clicca il link tracciato (<code className="bg-white px-1 py-0.5 rounded">{`{link}`}</code> nei messaggi) o scansiona il QR. I riscatti sono inseriti dalla sezione <strong>Riscatti</strong> dopo che il cliente usa il codice.
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: any }) {
  return (
    <div className="bg-white border border-border-primary rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{label}</span>
        <Icon size={14} className="text-dr7-teal" />
      </div>
      <p className="text-2xl font-bold text-black">{value}</p>
      {sub && <p className="text-[10px] text-text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}

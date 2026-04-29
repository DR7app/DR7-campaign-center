import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';

interface CampaignSchedule {
  type: 'single' | 'recurring';
  isActive: boolean;
  singleDate?: string;
  singleTime?: string;
  recurrenceCount: number;
  recurrenceUnit: 'day' | 'week' | 'month';
  dailyTimes: string[];
  weeklySlots: { day: string; time: string }[];
  monthlySlots: { day: number; time: string }[];
  allowedWindows: any[];
  blockedWindows: any[];
  conditions: any[];
  conditionMatchType: 'all' | 'any';
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: string;
  schedule?: CampaignSchedule;
}

const STATUSES: Array<Campaign['status']> = ['Bozza', 'Programmata', 'Inviata', 'Sospesa', 'Simulata', 'Fallita'];

interface Props {
  campaign: Campaign;
  onClose: () => void;
  onSave: (updates: Partial<Campaign>) => void;
}

export function EditCampaignModal({ campaign, onClose, onSave }: Props) {
  const [name, setName] = useState(campaign.name);
  const [message, setMessage] = useState(campaign.message);
  const [status, setStatus] = useState<Campaign['status']>(campaign.status as Campaign['status']);
  const [singleDate, setSingleDate] = useState(campaign.schedule?.singleDate ?? '');
  const [singleTime, setSingleTime] = useState(campaign.schedule?.singleTime ?? '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const updates: Partial<Campaign> = {
      name: name.trim(),
      message: message.trim(),
      status,
    };
    if (campaign.schedule) {
      updates.schedule = {
        ...campaign.schedule,
        singleDate: singleDate || undefined,
        singleTime: singleTime || undefined,
      };
    }
    onSave(updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-border-primary">
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Modifica campagna</p>
            <h2 className="text-lg font-bold text-black mt-0.5">{campaign.name}</h2>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-black">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Nome</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-primary rounded focus:outline-none focus:border-dr7-teal"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Messaggio WhatsApp</label>
            <textarea
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border-primary rounded focus:outline-none focus:border-dr7-teal resize-none"
            />
            <p className="text-[10px] text-text-muted mt-1">Placeholder: <code className="bg-gray-100 px-1 rounded">{'{nome}'}</code> <code className="bg-gray-100 px-1 rounded">{'{codice}'}</code> <code className="bg-gray-100 px-1 rounded">{'{link}'}</code></p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Stato</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Campaign['status'])}
              className="w-full px-3 py-2 text-sm border border-border-primary rounded focus:outline-none focus:border-dr7-teal"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {campaign.schedule && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Data invio</label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border-primary rounded focus:outline-none focus:border-dr7-teal"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5">Ora</label>
                <input
                  type="time"
                  value={singleTime}
                  onChange={(e) => setSingleTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border-primary rounded focus:outline-none focus:border-dr7-teal"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-white border border-border-primary text-text-secondary py-2.5 rounded font-bold text-sm hover:bg-gray-50"
            >
              Annulla
            </button>
            <button type="submit" className="btn-teal py-2.5 font-bold text-sm">
              Salva modifiche
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

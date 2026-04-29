import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';

interface CampaignSchedule {
  type: 'single' | 'recurring';
  isActive: boolean;
  singleDate?: string;
  singleTime?: string;
  recurrenceCount: number;
  recurrenceUnit: 'day' | 'week' | 'month';
  dailyTimes?: string[];
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  status: string;
  createdAt: string;
  schedule?: CampaignSchedule;
  recipients?: { length?: number }[];
}

interface Props { campaigns: Campaign[]; }

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export function CalendarPanel({ campaigns }: Props) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const campaignsByDate = useMemo(() => {
    const map = new Map<string, Campaign[]>();
    for (const c of campaigns) {
      const dates: string[] = [];
      const created = new Date(c.createdAt).toISOString().slice(0, 10);
      if (c.status === 'Inviata' || c.status === 'Simulata') dates.push(created);
      if (c.schedule?.singleDate) dates.push(c.schedule.singleDate);
      for (const d of dates) {
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(c);
      }
    }
    return map;
  }, [campaigns]);

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: Array<{ day: number | null; date?: string }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, date: dateStr });
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const upcoming = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return campaigns
      .filter(c => c.schedule?.singleDate && c.schedule.singleDate >= todayStr)
      .sort((a, b) => (a.schedule!.singleDate ?? '').localeCompare(b.schedule!.singleDate ?? ''))
      .slice(0, 5);
  }, [campaigns]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketing Calendar</h1>
        <p className="text-sm text-text-secondary mt-1">Visualizza le campagne inviate e quelle programmate</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-border-primary rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded">
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-sm font-bold">{MONTH_NAMES[viewMonth]} {viewYear}</h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-[10px] font-bold text-text-secondary uppercase py-1">{d}</div>
            ))}
            {cells.map((cell, i) => {
              if (!cell.day) return <div key={i} />;
              const items = cell.date ? (campaignsByDate.get(cell.date) ?? []) : [];
              const isToday = cell.date === today.toISOString().slice(0, 10);
              return (
                <div
                  key={i}
                  className={`min-h-[60px] p-1.5 border rounded text-left ${
                    isToday ? 'border-dr7-teal bg-dr7-teal/5' : 'border-border-primary bg-white hover:bg-[#FAFAFA]'
                  }`}
                >
                  <div className={`text-[11px] font-bold ${isToday ? 'text-dr7-teal' : 'text-text-primary'}`}>{cell.day}</div>
                  <div className="space-y-0.5 mt-1">
                    {items.slice(0, 2).map(c => (
                      <div
                        key={c.id}
                        title={c.name}
                        className="text-[9px] truncate px-1 py-0.5 bg-dr7-teal/10 text-dr7-teal rounded font-bold"
                      >
                        {c.name}
                      </div>
                    ))}
                    {items.length > 2 && (
                      <div className="text-[9px] text-text-muted">+{items.length - 2} altri</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-border-primary rounded-lg p-4">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Prossime campagne</p>
            {upcoming.length === 0 ? (
              <p className="text-xs text-text-secondary text-center py-4">Nessuna campagna programmata</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map(c => (
                  <div key={c.id} className="border border-border-primary rounded p-2.5">
                    <p className="text-xs font-bold text-black">{c.name}</p>
                    <p className="text-[10px] text-text-secondary mt-1 flex items-center gap-1">
                      <CalIcon size={10} />
                      {c.schedule?.singleDate} {c.schedule?.singleTime ? `&middot; ${c.schedule.singleTime}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-border-primary rounded-lg p-4">
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Legenda</p>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded border-2 border-dr7-teal bg-dr7-teal/5"></span>
                <span>Oggi</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-dr7-teal/10 border border-dr7-teal/30"></span>
                <span>Campagna programmata o inviata</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

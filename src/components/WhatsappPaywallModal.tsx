import { X, Check, Lock, Send } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onActivate: () => void;
}

const FEATURES = [
  'Invio reale dei messaggi WhatsApp ai destinatari',
  'Inbox messaggi: ricevi le risposte direttamente in app',
  'Rilevamento automatico dei codici nelle risposte clienti',
  'Notifiche in tempo reale per ogni messaggio in arrivo',
  'Numero WhatsApp Business verificato per la tua attività',
  'Cronologia completa dei messaggi e ricerca per cliente',
];

export function WhatsappPaywallModal({ open, onClose, onActivate }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-dr7-teal to-dr7-teal/70 text-white p-6 relative">
          <button onClick={onClose} className="absolute top-3 right-3 text-white/70 hover:text-white">
            <X size={18} />
          </button>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
            <Send size={22} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Funzione premium</p>
          <h2 className="text-xl font-bold mt-1">Sblocca WhatsApp Business</h2>
          <p className="text-sm text-white/80 mt-1">Invia campagne reali e ricevi risposte direttamente in DR7 Campaign Center.</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Cosa include</p>
            <ul className="space-y-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-text-primary">
                  <span className="w-4 h-4 bg-dr7-green/10 text-dr7-green rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={10} />
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#FAFAFA] border border-border-primary rounded p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-black">€49</span>
              <span className="text-sm text-text-secondary">/mese</span>
              <span className="text-[10px] font-bold text-text-muted uppercase ml-auto">+ messaggi a consumo</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-2">Annullabile in qualsiasi momento. Costo dei singoli messaggi WhatsApp Business addebitato separatamente.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onClose}
              className="bg-white border border-border-primary text-text-secondary py-2.5 rounded font-bold text-sm hover:bg-gray-50"
            >
              Non ora
            </button>
            <button
              onClick={onActivate}
              className="btn-teal py-2.5 font-bold text-sm flex items-center justify-center gap-2"
            >
              <Lock size={12} /> Attiva ora
            </button>
          </div>

          <p className="text-[10px] text-text-muted text-center">Per ora questa funzione e&#39; in modalita&#39; demo. Contattaci a info@dr7.it per attivarla.</p>
        </div>
      </div>
    </div>
  );
}

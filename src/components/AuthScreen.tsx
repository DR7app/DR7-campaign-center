import { useState, type FormEvent, type ReactNode } from 'react';
import { Send, Mail, Lock, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type Mode = 'login' | 'signup';

const BUSINESS_TYPES = [
  { value: 'rental', label: 'Noleggio / Autonoleggio' },
  { value: 'pizzeria', label: 'Pizzeria / Ristorazione' },
  { value: 'bar', label: 'Bar / Caffetteria' },
  { value: 'gym', label: 'Palestra / Fitness' },
  { value: 'beauty', label: 'Estetica / Parrucchiere' },
  { value: 'retail', label: 'Negozio / Retail' },
  { value: 'services', label: 'Servizi' },
  { value: 'other', label: 'Altro' },
];

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('rental');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  const handleSignup = async () => {
    setError(null);
    setInfo(null);
    if (!businessName.trim()) {
      setError('Inserisci il nome della tua attività.');
      return;
    }
    setLoading(true);
    const { data, error: signUpErr } = await supabase.auth.signUp({ email, password });
    if (signUpErr) {
      setLoading(false);
      setError(signUpErr.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setLoading(false);
      setError('Errore inatteso: utente non creato.');
      return;
    }

    if (!data.session) {
      setLoading(false);
      setInfo('Account creato. Controlla la tua email per confermare l\'indirizzo.');
      return;
    }

    const { error: merchantErr } = await supabase.from('merchants').insert({
      owner_id: userId,
      name: businessName.trim(),
      business_type: businessType,
      contact_email: email,
    });

    setLoading(false);
    if (merchantErr) {
      setError(`Account creato ma errore nel profilo: ${merchantErr.message}`);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'login') handleLogin();
    else handleSignup();
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white border border-border-primary rounded-lg p-8 shadow-sm space-y-3 text-center">
          <AlertCircle className="text-dr7-red mx-auto" size={32} />
          <h1 className="text-lg font-bold text-black">Supabase non configurato</h1>
          <p className="text-sm text-text-secondary">
            Manca <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code> o{' '}
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-dr7-teal rounded-lg shadow-sm">
            <Send size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-black tracking-tight">DR7 Campaign Center</h1>
          <p className="text-sm text-text-secondary">
            {mode === 'login' ? 'Accedi al tuo account' : 'Crea il tuo account'}
          </p>
        </div>

        <div className="bg-white border border-border-primary rounded-lg shadow-sm overflow-hidden">
          <div className="flex bg-gray-100 m-1 p-1 rounded-md">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setInfo(null); }}
              className={`flex-1 py-2 text-[11px] font-bold uppercase rounded transition-all ${
                mode === 'login' ? 'bg-white shadow-sm text-dr7-teal' : 'text-text-secondary'
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setInfo(null); }}
              className={`flex-1 py-2 text-[11px] font-bold uppercase rounded transition-all ${
                mode === 'signup' ? 'bg-white shadow-sm text-dr7-teal' : 'text-text-secondary'
              }`}
            >
              Registrati
            </button>
          </div>

          <form onSubmit={submit} className="p-6 space-y-4">
            {mode === 'signup' && (
              <>
                <Field icon={Building2} label="Nome attività">
                  <input
                    type="text"
                    required
                    placeholder="es. Pizzeria Da Mario"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="auth-input"
                  />
                </Field>

                <Field icon={Building2} label="Tipo di attività">
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="auth-input"
                  >
                    {BUSINESS_TYPES.map((b) => (
                      <option key={b.value} value={b.value}>{b.label}</option>
                    ))}
                  </select>
                </Field>
              </>
            )}

            <Field icon={Mail} label="Email">
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="tu@esempio.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />
            </Field>

            <Field icon={Lock} label="Password">
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'signup' ? 'almeno 6 caratteri' : ''}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
              />
            </Field>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-dr7-red/5 border border-dr7-red/20 rounded text-xs text-dr7-red">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="flex items-start gap-2 p-3 bg-dr7-teal/5 border border-dr7-teal/20 rounded text-xs text-dr7-teal">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{info}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-teal py-2.5 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {mode === 'login' ? 'Accedi' : 'Crea account'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-text-muted mt-4">
          Una sola attività per account. Per gestire più attività, crea account separati.
        </p>
      </div>

      <style>{`
        .auth-input {
          width: 100%;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          background: white;
          border: 1px solid var(--border-primary, #E5E7EB);
          border-radius: 0.375rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .auth-input:focus {
          border-color: var(--dr7-teal, #0EA5A4);
          box-shadow: 0 0 0 3px rgba(14, 165, 164, 0.1);
        }
      `}</style>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: any; label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={11} className="text-text-secondary" />
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{label}</span>
      </div>
      {children}
    </label>
  );
}

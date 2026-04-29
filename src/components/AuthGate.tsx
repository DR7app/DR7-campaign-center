import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AuthScreen } from './AuthScreen';

interface Merchant {
  id: string;
  owner_id: string;
  name: string;
  business_type: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  default_target_url: string | null;
  conversion_modes: string[];
  brand_color: string | null;
}

interface MerchantContext {
  merchant: Merchant;
  signOut: () => Promise<void>;
}

let currentMerchantContext: MerchantContext | null = null;

export function getMerchantContext(): MerchantContext | null {
  return currentMerchantContext;
}

interface Props {
  children: ReactNode;
}

export function AuthGate({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [merchantError, setMerchantError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setMerchant(null);
        currentMerchantContext = null;
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    setLoading(true);
    setMerchantError(null);

    supabase
      .from('merchants')
      .select('id, owner_id, name, business_type, contact_phone, contact_email, default_target_url, conversion_modes, brand_color')
      .eq('owner_id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setMerchantError(error.message);
          setLoading(false);
          return;
        }
        setMerchant(data as Merchant | null);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [session?.user.id]);

  useEffect(() => {
    if (merchant) {
      currentMerchantContext = {
        merchant,
        signOut: async () => { await supabase.auth.signOut(); },
      };
    } else {
      currentMerchantContext = null;
    }
  }, [merchant]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-dr7-teal" size={28} />
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  if (merchantError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md w-full bg-white border border-dr7-red/30 rounded-lg p-6 text-center space-y-3">
          <h1 className="text-lg font-bold text-dr7-red">Errore caricamento profilo</h1>
          <p className="text-xs text-text-secondary break-all">{merchantError}</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-dr7-teal font-bold underline"
          >
            Esci e riprova
          </button>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <MissingMerchantOnboarding userId={session.user.id} email={session.user.email ?? ''} onCreated={(m) => setMerchant(m)} />
      </div>
    );
  }

  return <>{children}</>;
}

function MissingMerchantOnboarding({ userId, email, onCreated }: { userId: string; email: string; onCreated: (m: Merchant) => void }) {
  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('rental');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('merchants')
      .insert({
        owner_id: userId,
        name: name.trim(),
        business_type: businessType,
        contact_email: email,
      })
      .select('id, owner_id, name, business_type, contact_phone, contact_email, default_target_url, conversion_modes, brand_color')
      .single();
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    onCreated(data as Merchant);
  };

  return (
    <form onSubmit={submit} className="max-w-md w-full bg-white border border-border-primary rounded-lg p-6 shadow-sm space-y-4">
      <div className="text-center space-y-1">
        <h1 className="text-lg font-bold text-black">Completa il tuo profilo</h1>
        <p className="text-xs text-text-secondary">Inserisci il nome della tua attività per continuare.</p>
      </div>

      <label className="block">
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">Nome attività</span>
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="es. Pizzeria Da Mario"
          className="w-full px-3 py-2 text-sm border border-border-primary rounded-md focus:outline-none focus:border-dr7-teal"
        />
      </label>

      <label className="block">
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">Tipo</span>
        <select
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-border-primary rounded-md focus:outline-none focus:border-dr7-teal"
        >
          <option value="rental">Noleggio</option>
          <option value="pizzeria">Pizzeria / Ristorazione</option>
          <option value="bar">Bar</option>
          <option value="gym">Palestra</option>
          <option value="beauty">Estetica</option>
          <option value="retail">Negozio</option>
          <option value="services">Servizi</option>
          <option value="other">Altro</option>
        </select>
      </label>

      {error && <div className="text-xs text-dr7-red">{error}</div>}

      <button type="submit" disabled={loading} className="w-full btn-teal py-2.5 disabled:opacity-60">
        {loading ? 'Creazione...' : 'Continua'}
      </button>
    </form>
  );
}

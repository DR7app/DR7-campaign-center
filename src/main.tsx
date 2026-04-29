import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthGate } from './components/AuthGate.tsx';
import { isSupabaseConfigured } from './lib/supabase.ts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSupabaseConfigured ? (
      <AuthGate>
        <App />
      </AuthGate>
    ) : (
      <App />
    )}
  </StrictMode>,
);

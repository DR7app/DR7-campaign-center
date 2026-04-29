import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Send, Calendar, History, Settings, LayoutDashboard, Plus, 
  Image as ImageIcon, Video, MessageSquare, Search, Bell, MoreVertical, 
  CheckCircle2, Clock, Sparkles, ChevronRight, Filter, AlertTriangle,
  Menu, ArrowLeft, MoreHorizontal, Download, Share2, Eye, FileUp, Trash2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';

// --- Types ---
type Section = 'dashboard' | 'leads' | 'lists' | 'campaigns' | 'calendar' | 'reports' | 'settings' | 'ai';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  tags: string[];
  list: string;
  consent: 'Attivo' | 'Inattivo';
  createdAt: string;
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  recipients: string; // List ID or 'all'
  status: 'Bozza' | 'Programmata' | 'Inviata' | 'Fallita' | 'Simulata';
  createdAt: string;
  scheduledAt?: string;
  media?: { type: 'image' | 'video', url: string };
}

interface MediaFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  size: number;
  createdAt: string;
}

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('tutte');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- Real State Layer (with LocalStorage persistence) ---
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('dr7_leads');
    return saved ? JSON.parse(saved) : [];
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const saved = localStorage.getItem('dr7_campaigns');
    return saved ? JSON.parse(saved) : [];
  });

  const [media, setMedia] = useState<MediaFile[]>(() => {
    const saved = localStorage.getItem('dr7_media');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('dr7_settings');
    // @ts-ignore - env doesn't exist on all meta types
    const hasGemini = !!(import.meta as any).env?.VITE_GEMINI_API_KEY;
    return saved ? JSON.parse(saved) : {
      companyName: 'DR7 Management',
      whatsappConnected: false,
      geminiConnected: hasGemini,
      testMode: true
    };
  });

  useEffect(() => {
    localStorage.setItem('dr7_leads', JSON.stringify(leads));
  }, [leads]);

  useEffect(() => {
    localStorage.setItem('dr7_campaigns', JSON.stringify(campaigns));
  }, [campaigns]);

  useEffect(() => {
    localStorage.setItem('dr7_media', JSON.stringify(media));
  }, [media]);

  useEffect(() => {
    localStorage.setItem('dr7_settings', JSON.stringify(settings));
  }, [settings]);

  // --- Handlers ---
  const handleImportLeads = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const newLeads: Lead[] = results.data.map((row: any, i) => ({
          id: `lead-${Date.now()}-${i}`,
          firstName: row.firstName || row.Nome || '',
          lastName: row.lastName || row.Cognome || '',
          phone: row.phone || row.Cellulare || '',
          email: row.email || row.Email || '',
          tags: row.tags ? row.tags.split(',') : [],
          list: row.list || 'Generale',
          consent: 'Attivo' as const,
          createdAt: new Date().toISOString()
        })).filter(l => l.phone);
        
        setLeads(prev => [...prev, ...newLeads]);
        alert(`Importati ${newLeads.length} lead con successo.`);
      }
    });
  };

  // --- Lead Form State ---
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleCreateLead = () => {
    const errors: Record<string, string> = {};
    if (!newLeadForm.firstName.trim()) errors.firstName = 'Il nome è obbligatorio.';
    if (!newLeadForm.phone.trim()) {
      errors.phone = 'Il numero di telefono è obbligatorio.';
    } else if (!/^\+?[\d\s-]{8,20}$/.test(newLeadForm.phone.trim())) {
      errors.phone = 'Inserisci un numero di telefono valido.';
    } else if (leads.some(l => l.phone.replace(/\s+/g, '') === newLeadForm.phone.replace(/\s+/g, ''))) {
      errors.phone = 'Un lead con questo numero esiste già.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      firstName: newLeadForm.firstName.trim(),
      lastName: newLeadForm.lastName.trim(),
      phone: newLeadForm.phone.trim(),
      tags: [],
      list: 'Generale',
      consent: 'Attivo',
      createdAt: new Date().toISOString()
    };

    setLeads(prev => [newLead, ...prev]);
    setIsLeadModalOpen(false);
    setNewLeadForm({ firstName: '', lastName: '', phone: '' });
    setFormErrors({});
    alert("Lead creato con successo.");
  };

  // --- Campaign Form State ---
  const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
    name: '',
    message: '',
    recipients: 'all',
    status: 'Bozza'
  });

  const handleSendCampaign = (status: Campaign['status']) => {
    if (!newCampaign.name || !newCampaign.message) {
      return alert("Completa il nome e il messaggio della campagna.");
    }

    const campaign: Campaign = {
      id: `camp-${Date.now()}`,
      name: newCampaign.name!,
      message: newCampaign.message!,
      recipients: newCampaign.recipients!,
      status: settings.whatsappConnected ? status : 'Simulata',
      createdAt: new Date().toISOString()
    };

    setCampaigns(prev => [campaign, ...prev]);
    setActiveSubTab('tutte');
    alert(settings.whatsappConnected ? "Campagna inviata/programmata!" : "Modalità Test: Campagna salvata come 'Simulata'.");
  };

  // --- Dashboard Stats Calculation ---
  const dashboardStats = {
    totalLeads: leads.length,
    activeCampaigns: campaigns.filter(c => c.status === 'Programmata').length,
    sentMessages: campaigns.filter(c => ['Inviata', 'Simulata'].includes(c.status)).length,
    mediaCount: media.length
  };

  return (
    <div className="flex h-screen bg-bg-page font-sans text-text-primary overflow-hidden">
      {/* 1. Sidebar Navigation (Restored Design) */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 80 }}
        className="bg-white border-r border-border-primary flex flex-col z-40 shrink-0 shadow-sm"
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border-primary">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-dr7-teal rounded flex items-center justify-center text-white font-bold">D7</div>
              <span className="font-bold text-lg tracking-tighter uppercase italic">DR7 <span className="text-dr7-teal">App</span></span>
            </div>
          ) : (
            <div className="w-8 h-8 bg-dr7-teal rounded mx-auto flex items-center justify-center text-white font-bold">D</div>
          )}
        </div>

        <nav className="flex-1 py-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="px-3 space-y-1">
            <SidebarItem 
              icon={LayoutDashboard} 
              label="Dashboard" 
              active={activeSection === 'dashboard'} 
              onClick={() => setActiveSection('dashboard')} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={Users} 
              label="Lead Management" 
              active={activeSection === 'leads'} 
              onClick={() => setActiveSection('leads')} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={Send} 
              label="Campaign Center" 
              active={activeSection === 'campaigns'} 
              onClick={() => setActiveSection('campaigns')} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={ImageIcon} 
              label="Media Library" 
              active={activeSection === 'lists'} // Using 'lists' as a temporary key or renaming
              onClick={() => setActiveSection('lists')} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={Calendar} 
              label="Marketing Calendar" 
              active={activeSection === 'calendar'} 
              onClick={() => setActiveSection('calendar')} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={Sparkles} 
              label="AI Assistant" 
              active={activeSection === 'ai'} 
              onClick={() => setActiveSection('ai')} 
              collapsed={!sidebarOpen}
              isPremium
            />
          </div>

          <div className="mt-8 px-6 mb-2">
            <p className={`text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              Business & Tools
            </p>
          </div>

          <div className="px-3 space-y-1">
            <SidebarItem 
              icon={History} 
              label="Activity Log" 
              active={activeSection === 'reports'} 
              onClick={() => setActiveSection('reports')} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={Settings} 
              label="Platform Settings" 
              active={activeSection === 'settings'} 
              onClick={() => setActiveSection('settings')} 
              collapsed={!sidebarOpen}
            />
          </div>
        </nav>

        <div className="p-4 border-t border-border-primary">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full h-10 flex items-center justify-center bg-gray-50 border border-border-primary rounded-md text-text-secondary hover:text-dr7-teal hover:border-dr7-teal/50 transition-all"
          >
            {sidebarOpen ? <ArrowLeft size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </motion.aside>

      {/* 2. Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Bar */}
        <header className="h-16 bg-white border-b border-border-primary flex items-center justify-between px-8 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary">
              {activeSection.replace('-', ' ')}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-border-primary px-3 py-1.5 rounded-md focus-within:border-dr7-teal transition-all">
              <Search size={14} className="text-text-secondary" />
              <input type="text" placeholder="Global search..." className="bg-transparent border-none focus:ring-0 text-xs w-48" />
            </div>
            
            <div className="flex items-center gap-4">
              <button className="p-2 text-text-secondary hover:bg-gray-100 rounded-full relative">
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-dr7-red rounded-full border-2 border-white"></span>
              </button>
              <div className="h-8 w-[1px] bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-black uppercase">Dr7 Admin</p>
                  <p className="text-[10px] text-dr7-teal font-medium">Enterprise Tier</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-dr7-teal-soft border border-dr7-teal/20 flex items-center justify-center text-dr7-teal font-bold text-xs shadow-inner">
                  AD
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-bg-page">
          <AnimatePresence mode="wait">
          {activeSection === 'campaigns' && activeSubTab === 'nuova' && (
            <motion.div key="nuova-campagna" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-end">
                <h1 className="text-3xl font-bold tracking-tight">Nuova Campagna</h1>
                <div className="flex gap-3">
                  <button onClick={() => setActiveSubTab('tutte')} className="bg-white border border-border-primary px-5 py-2 rounded-md text-xs font-bold uppercase tracking-tight flex items-center gap-2">
                    ANNULLA
                  </button>
                  <button onClick={() => handleSendCampaign('Bozza')} className="btn-teal px-6 py-2 content-center font-bold text-sm">
                    SALVA BOZZA
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Nome Campagna</label>
                      <input 
                        type="text" 
                        placeholder="Es. Promozione Audi Primavera 2026" 
                        className="w-full bg-white border border-border-primary rounded-md px-4 py-2.5 text-sm focus:border-dr7-teal outline-none transition-colors" 
                        value={newCampaign.name}
                        onChange={e => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Messaggio WhatsApp</label>
                      <textarea 
                        rows={8}
                        placeholder="Scrivi qui il corpo del messaggio..." 
                        className="w-full bg-white border border-border-primary rounded-md px-4 py-3 text-sm focus:border-dr7-teal outline-none transition-colors resize-none mb-3"
                        value={newCampaign.message}
                        onChange={e => setNewCampaign(prev => ({ ...prev, message: e.target.value }))}
                      />
                      <div className="flex justify-between items-center bg-gray-50 p-3 rounded border border-gray-100">
                        <div className="flex gap-2">
                          <button className="p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 text-text-secondary transition-all">
                            <ImageIcon size={18} />
                          </button>
                          <button className="p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 text-text-secondary transition-all">
                            <Video size={18} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button className="text-[10px] font-bold px-3 py-1 bg-white border border-border-primary rounded hover:border-dr7-teal transition-all">AI: MIGLIORA</button>
                          <button className="text-[10px] font-bold px-3 py-1 bg-white border border-border-primary rounded hover:border-dr7-teal transition-all">STRUMENTI AI</button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Destinatari</label>
                      <div className="grid grid-cols-2 gap-3">
                        <RecipientOption label="Tutti i Lead" count={leads.length} checked={newCampaign.recipients === 'all'} onChange={() => setNewCampaign(prev => ({ ...prev, recipients: 'all' }))} />
                        <RecipientOption label="Test Group" count={0} checked={newCampaign.recipients === 'test'} onChange={() => setNewCampaign(prev => ({ ...prev, recipients: 'test' }))} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6">
                    <h3 className="font-bold text-sm uppercase tracking-tight mb-4">Programmazione Invio</h3>
                    <div className="flex gap-6">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-2">Data e Ora</label>
                        <div className="flex gap-2">
                          <input type="date" className="flex-1 bg-white border border-border-primary rounded px-3 py-2 text-sm" />
                          <input type="time" className="flex-1 bg-white border border-border-primary rounded px-3 py-2 text-sm" />
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-end">
                        <button onClick={() => handleSendCampaign('Programmata')} className="w-full bg-[#16A34A] hover:bg-dr7-green text-white font-bold text-sm py-2 px-4 rounded-md transition-all shadow-sm">
                          CONFERMA E PROGRAMMA
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white border border-border-primary rounded-lg shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border-primary bg-gray-50 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-text-secondary uppercase">Preview WhatsApp</span>
                      <Bell size={14} className="text-gray-400" />
                    </div>
                    <div className="p-6 bg-[#E5DDD5] min-h-[400px] flex flex-col gap-4 relative">
                      {newCampaign.message ? (
                        <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[85%] text-xs relative">
                          <p className="leading-relaxed whitespace-pre-wrap">{newCampaign.message}</p>
                          <span className="absolute bottom-1 right-2 text-[8px] text-gray-400">
                             {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <div className="bg-white/50 p-3 rounded-lg rounded-tl-none shadow-sm max-w-[85%] text-xs relative italic text-gray-500">
                          Inizia a scrivere per l'anteprima...
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#2C8F7B] text-white p-6 rounded-lg shadow-md space-y-4">
                    <h4 className="font-bold text-sm uppercase">Resoconto Campagna</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b border-white/20 pb-2">
                        <span className="opacity-80">Destinatari:</span>
                        <span className="font-bold italic">{leads.length}</span>
                      </div>
                    </div>
                    <button onClick={() => handleSendCampaign('Inviata')} className="w-full bg-white text-dr7-teal font-black text-xs py-4 rounded-md shadow-lg flex items-center justify-center gap-2 group hover:bg-gray-100 transition-all">
                      {settings.whatsappConnected ? 'INVIA ORA' : 'INVIA TEST SIMULATO'} <Send size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    {!settings.whatsappConnected && (
                       <p className="text-[9px] uppercase font-black text-center opacity-70 tracking-tighter">Provider WhatsApp non collegato</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'campaigns' && activeSubTab !== 'nuova' && (
            <motion.div key="lista-campagne" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Page Title Bar */}
              <div className="flex justify-between items-end">
                <h1 className="text-3xl font-bold tracking-tight">Campagne</h1>
                <button onClick={() => setActiveSubTab('nuova')} className="btn-teal px-6 py-2 content-center font-bold text-sm">
                  + NUOVA CAMPAGNA
                </button>
              </div>

              {/* Section Tabs (Segmented Control Style) */}
              <div className="w-full flex bg-gray-100 p-1 rounded-lg border border-border-primary">
                <SectionTab label="Tutte le Campagne" active={activeSubTab === 'tutte'} onClick={() => setActiveSubTab('tutte')} />
                <SectionTab label="Invii Programmati" active={activeSubTab === 'programmati'} onClick={() => setActiveSubTab('programmati')} />
                <SectionTab label="Report d'Invio" active={activeSubTab === 'report'} onClick={() => setActiveSubTab('report')} />
              </div>

              {/* Filter Pills */}
              <div className="flex gap-2 items-center flex-wrap">
                <FilterPill label="Tutte" count={campaigns.length} active />
                <FilterPill label="Bozza" count={campaigns.filter(c => c.status === 'Bozza').length} />
                <FilterPill label="Programmata" count={campaigns.filter(c => c.status === 'Programmata').length} />
                <FilterPill label="Inviata" count={campaigns.filter(c => c.status === 'Inviata').length} />
              </div>

              {/* Operational Data Table */}
              <div className="bg-white border border-border-primary rounded-lg overflow-hidden shadow-sm min-h-[300px] flex flex-col">
                {campaigns.length > 0 ? (
                  <table className="w-full text-left">
                    <thead className="bg-[#FAFAFA] border-b border-border-primary">
                      <tr>
                        <th className="table-header">Dati Campagna</th>
                        <th className="table-header">Data Creazione</th>
                        <th className="table-header">Target</th>
                        <th className="table-header">Tipo Contenuto</th>
                        <th className="table-header">Stato</th>
                        <th className="table-header text-right">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary text-sm font-medium">
                      {campaigns.map(campaign => (
                         <CampaignTableRow 
                            key={campaign.id} 
                            name={campaign.name} 
                            list={campaign.recipients} 
                            status={campaign.status} 
                            date={new Date(campaign.createdAt).toLocaleDateString()} 
                            recipients={campaign.recipients === 'all' ? leads.length : 0} 
                            onDelete={() => setCampaigns(prev => prev.filter(c => c.id !== campaign.id))}
                         />
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 border border-gray-100">
                      <Send size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-black">Nessuna campagna</h3>
                      <p className="text-sm text-text-secondary max-w-sm">Crea la tua prima campagna per iniziare a comunicare con i tuoi lead su WhatsApp.</p>
                    </div>
                    <button onClick={() => setActiveSubTab('nuova')} className="btn-teal px-6 py-2">
                       Inizia ora
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeSection === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">Panoramica Sistema</p>
                  <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      if (leads.length === 0) return alert("Nessun dato da esportare.");
                      const csv = Papa.unparse(leads);
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `leads_export_${Date.now()}.csv`;
                      a.click();
                    }}
                    className="bg-white border border-border-primary px-4 py-2 rounded-md text-xs font-bold uppercase tracking-tight flex items-center gap-2 hover:bg-gray-50 transition-all"
                  >
                    <Download size={14} /> Esporta Lead
                  </button>
                  <button onClick={() => { setActiveSection('campaigns'); setActiveSubTab('nuova'); }} className="btn-teal px-6 py-2 content-center font-bold text-sm">
                    + NUOVA CAMPAGNA
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Totale Lead" value={dashboardStats.totalLeads.toLocaleString()} subValue="Reali nel database" icon={Users} />
                <StatCard label="Campagne Attive" value={dashboardStats.activeCampaigns.toString()} subValue="In programmazione" icon={Send} />
                <StatCard label="Messaggi Inviati" value={dashboardStats.sentMessages.toLocaleString()} subValue={settings.testMode ? "Modalità Test" : "100% Successo"} icon={CheckCircle2} />
                <StatCard label="Media in Libreria" value={dashboardStats.mediaCount.toString()} subValue="Asset caricati" icon={ImageIcon} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-border-primary rounded-lg shadow-sm">
                  <div className="p-4 border-b border-border-primary flex justify-between items-center bg-[#FAFAFA]">
                    <h3 className="font-bold text-sm uppercase tracking-tight">Ultimi Invii Effettuati</h3>
                    <button onClick={() => setActiveSection('campaigns')} className="text-dr7-teal text-xs font-bold hover:underline">Vedi Tutti</button>
                  </div>
                  <div className="overflow-x-auto min-h-[150px] flex flex-col justify-center">
                    {campaigns.length > 0 ? (
                      <table className="w-full text-left text-xs text-medium">
                        <thead>
                          <tr className="bg-gray-50 border-b border-border-primary">
                            <th className="p-3 font-semibold text-text-secondary uppercase">Campagna</th>
                            <th className="p-3 font-semibold text-text-secondary uppercase">Data</th>
                            <th className="p-3 font-semibold text-text-secondary uppercase">Target</th>
                            <th className="p-3 font-semibold text-text-secondary uppercase text-right">Stato</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-primary italic">
                          {campaigns.slice(0, 5).map(c => (
                            <RecentScanRow key={c.id} name={c.name} date={new Date(c.createdAt).toLocaleDateString()} target={c.recipients} status={c.status} />
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-10 space-y-2">
                        <p className="text-sm font-bold text-text-secondary">Nessuna campagna ancora creata.</p>
                        <p className="text-xs text-text-muted">Crea la tua prima campagna per visualizzare le statistiche.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-border-primary rounded-lg shadow-sm p-4 space-y-4 text-xs font-bold">
                  <h3 className="font-bold text-sm uppercase tracking-tight border-b border-border-primary pb-3">Status Business API</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p>{settings.companyName}</p>
                        <p className="text-[10px] text-text-secondary">{settings.whatsappConnected ? "+971 50 123 4567" : "Canale non collegato"}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-white text-[9px] font-bold rounded uppercase ${settings.whatsappConnected ? 'bg-dr7-green' : 'bg-dr7-red'}`}>
                        {settings.whatsappConnected ? 'Connesso' : 'Disconnesso'}
                      </span>
                    </div>
                    {!settings.whatsappConnected && (
                      <div className="p-3 bg-dr7-teal-soft border border-dr7-teal/20 rounded text-[11px] text-dr7-teal">
                        Configura il provider nelle impostazioni per abilitare l'invio reale.
                      </div>
                    )}
                    <div className="p-3 bg-gray-50 border border-border-primary rounded text-[10px] text-text-secondary space-y-1">
                      <p className="uppercase">Informazioni Provider</p>
                      <p className="font-normal">WABA Enterprise Connector</p>
                      <p className="font-normal">Quota: 250k / mese</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )} 


          {activeSection === 'leads' && (
            <motion.div key="leads" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-end">
                <h1 className="text-3xl font-bold tracking-tight">Gestione Lead</h1>
                <div className="flex gap-3">
                  <label className="bg-white border border-border-primary px-5 py-2 rounded-md text-xs font-bold uppercase tracking-tight flex items-center gap-2 hover:bg-gray-50 transition-all cursor-pointer">
                    <FileUp size={14} /> IMPORTA CSV
                    <input type="file" accept=".csv" className="hidden" onChange={handleImportLeads} />
                  </label>
                  <button onClick={() => setIsLeadModalOpen(true)} className="btn-teal px-6 py-2 content-center font-bold text-sm">
                    + NUOVO LEAD
                  </button>
                </div>
              </div>

              <div className="bg-white border border-border-primary rounded-lg shadow-sm">
                <div className="p-4 border-b border-border-primary flex gap-4 bg-[#FAFAFA]">
                  <div className="flex-1 bg-white border border-border-primary rounded-md px-3 py-1.5 flex items-center gap-2 focus-within:border-dr7-teal transition-colors">
                    <Search size={16} className="text-text-muted" />
                    <input type="text" placeholder="Cerca per nome, numero o tag..." className="bg-transparent border-none focus:ring-0 text-sm w-full" />
                  </div>
                  <button className="bg-white border border-border-primary px-4 py-2 rounded-md text-xs font-bold uppercase tracking-tight flex items-center gap-2">
                    <Filter size={14} /> Filtri
                  </button>
                </div>
                
                <div className="overflow-x-auto min-h-[300px] flex flex-col">
                  {leads.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="bg-[#FAFAFA] border-b border-border-primary">
                        <tr>
                          <th className="table-header">Anagrafica</th>
                          <th className="table-header">Canale WhatsApp</th>
                          <th className="table-header">Liste / Segmenti</th>
                          <th className="table-header">Consenso</th>
                          <th className="table-header">Data Import</th>
                          <th className="table-header text-right">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-primary text-sm font-medium">
                        {leads.map(lead => (
                          <LeadTableRow 
                            key={lead.id} 
                            name={`${lead.firstName} ${lead.lastName}`} 
                            phone={lead.phone} 
                            lists={[lead.list, ...lead.tags]} 
                            status={lead.consent} 
                            date={new Date(lead.createdAt).toLocaleDateString()} 
                            onDelete={() => setLeads(prev => prev.filter(l => l.id !== lead.id))}
                          />
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 border border-gray-100">
                        <Users size={32} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">Nessun lead importato</h3>
                        <p className="text-sm text-text-secondary max-w-sm">Carica un file CSV per iniziare a costruire il tuo database di contatti per le campagne.</p>
                      </div>
                      <label className="btn-teal px-6 py-2 cursor-pointer">
                        Carica il tuo primo CSV
                        <input type="file" accept=".csv" className="hidden" onChange={handleImportLeads} />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'ai' && (
            <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">Potenziato da Gemini AI</p>
                  <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-6">
                    <h3 className="font-bold text-sm uppercase tracking-tight">Ottimizzatore Copy</h3>
                    <textarea 
                      rows={6} 
                      className="w-full bg-white border border-border-primary rounded-md px-4 py-3 text-sm focus:border-dr7-teal outline-none transition-colors resize-none font-medium" 
                      placeholder="Inserisci il tuo messaggio per l'ottimizzazione..."
                    />
                    <div className="flex flex-wrap gap-2">
                       <button className="text-[10px] font-bold px-4 py-2 bg-dr7-teal-soft text-dr7-teal border border-dr7-teal/20 rounded hover:bg-dr7-teal hover:text-white transition-all uppercase">
                          {settings.geminiConnected ? 'Rendi Persuasivo' : 'Simula Ottimizzazione'}
                       </button>
                       <button className="text-[10px] font-bold px-4 py-2 bg-dr7-teal-soft text-dr7-teal border border-dr7-teal/20 rounded hover:bg-dr7-teal hover:text-white transition-all uppercase">
                          {settings.geminiConnected ? 'Check Spam' : 'Simula Check Spam'}
                       </button>
                    </div>
                    {!settings.geminiConnected && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-700 font-bold uppercase">
                         Gemini non configurato. Gli strumenti AI sono in modalità dimostrativa.
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-[#2C8F7B] text-white p-6 rounded-lg shadow-md space-y-4">
                    <div className="flex items-center gap-3"><Sparkles size={24} /><h4 className="font-bold text-sm uppercase">Smart Insights</h4></div>
                    <p className="text-xs leading-relaxed opacity-90 italic">
                      {leads.length > 0 ? `Analisi basata su ${leads.length} contatti reali.` : "Nessun dato lead da analizzare."}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'lists' && (
            <motion.div key="media" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-end">
                <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
                <div className="flex gap-3">
                  <label className="btn-teal px-6 py-2 cursor-pointer flex items-center gap-2">
                    <Plus size={16} /> CARICA MEDIA
                    <input 
                      type="file" 
                      accept="image/*,video/*" 
                      className="hidden" 
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const newMedia: MediaFile = {
                            id: `media-${Date.now()}`,
                            name: file.name,
                            url: URL.createObjectURL(file), // Warning: transient URL
                            type: file.type.startsWith('video') ? 'video' : 'image',
                            size: file.size,
                            createdAt: new Date().toISOString()
                          };
                          setMedia(prev => [newMedia, ...prev]);
                        }
                      }} 
                    />
                  </label>
                </div>
              </div>

              <div className="bg-white border border-border-primary rounded-lg shadow-sm min-h-[400px] p-6">
                {media.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {media.map(m => (
                      <div key={m.id} className="group relative border border-border-primary rounded-lg overflow-hidden bg-gray-50 aspect-square">
                        {m.type === 'image' ? (
                          <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-black">
                            <Video size={32} className="text-white" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                           <button onClick={() => setMedia(prev => prev.filter(x => x.id !== m.id))} className="p-2 bg-white/20 hover:bg-dr7-red rounded text-white transition-all">
                              <Trash2 size={16} />
                           </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-white/90 backdrop-blur-sm border-t border-border-primary">
                           <p className="text-[10px] font-bold truncate">{m.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 border border-gray-100">
                      <ImageIcon size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-black">Nessun media caricato</h3>
                      <p className="text-sm text-text-secondary max-w-sm">Carica immagini o video per utilizzarli nelle tue campagne WhatsApp.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeSection === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <h1 className="text-3xl font-bold tracking-tight">Report e Analisi</h1>
              
              {campaigns.filter(c => ['Inviata', 'Simulata'].includes(c.status)).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                   <div className="bg-white border border-border-primary rounded-lg p-6 space-y-1">
                      <p className="text-[10px] font-bold text-text-secondary uppercase">Deliverability</p>
                      <p className="text-3xl font-black text-dr7-teal">99.8%</p>
                   </div>
                   <div className="bg-white border border-border-primary rounded-lg p-6 space-y-1">
                      <p className="text-[10px] font-bold text-text-secondary uppercase">Engagement</p>
                      <p className="text-3xl font-black text-dr7-blue">~12%</p>
                   </div>
                   <div className="bg-white border border-border-primary rounded-lg p-6 space-y-1">
                      <p className="text-[10px] font-bold text-text-secondary uppercase">Test Mode</p>
                      <p className="text-3xl font-black text-dr7-red">{settings.testMode ? 'SI' : 'NO'}</p>
                   </div>
                </div>
              ) : (
                <div className="bg-white border border-border-primary rounded-lg p-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 border border-gray-100 mx-auto">
                      <History size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-black">Nessun report disponibile</h3>
                      <p className="text-sm text-text-secondary max-w-sm mx-auto">Le statistiche di performance appariranno qui dopo l'invio delle prime campagne reali o di test.</p>
                    </div>
                </div>
              )}
            </motion.div>
          )}

          {activeSection === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
               <h1 className="text-3xl font-bold tracking-tight">Marketing Calendar</h1>
               <div className="bg-white border border-border-primary rounded-lg p-20 text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 border border-gray-100 mx-auto">
                      <Calendar size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-black">Calendario vuoto</h3>
                      <p className="text-sm text-text-secondary max-w-sm mx-auto">Le campagne programmate appariranno qui. Programma la tua prima campagna ora.</p>
                    </div>
                    <button onClick={() => { setActiveSection('campaigns'); setActiveSubTab('nuova'); }} className="btn-teal px-6 py-2">
                       Aggiungi Evento
                    </button>
                </div>
            </motion.div>
          )}
          {activeSection === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">Configurazione Piattaforma</p>
                  <h1 className="text-3xl font-bold tracking-tight">Impostazioni</h1>
                </div>
                <button 
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="bg-dr7-red text-white px-4 py-2 rounded-md text-xs font-bold uppercase tracking-tight flex items-center gap-2 hover:bg-red-600 transition-all"
                >
                  <Trash2 size={14} /> RESET COMPLETO DATI
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-6">
                    <h3 className="font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                       <Settings size={16} className="text-dr7-teal" /> Profilo Aziendale
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-2">Nome Azienda</label>
                        <input 
                          type="text" 
                          className="w-full bg-white border border-border-primary rounded px-3 py-2 text-sm focus:border-dr7-teal focus:ring-0 outline-none" 
                          value={settings.companyName}
                          onChange={e => setSettings((prev: any) => ({ ...prev, companyName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-2">Email Amministratore</label>
                        <input type="email" placeholder="admin@dr7.app" className="w-full bg-white border border-border-primary rounded px-3 py-2 text-sm opacity-50 cursor-not-allowed" disabled />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-6">
                    <h3 className="font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                       <MessageSquare size={16} className="text-[#25D366]" /> Connessione WhatsApp
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-border-primary">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${settings.whatsappConnected ? 'bg-dr7-green ring-4 ring-dr7-green/10' : 'bg-gray-300'}`}>
                             <CheckCircle2 size={24} />
                          </div>
                          <div>
                             <p className="font-bold text-sm">Official WhatsApp Business API</p>
                             <p className="text-xs text-text-secondary">{settings.whatsappConnected ? "Connessione attiva e stabile" : "Nessun provider configurato"}</p>
                          </div>
                       </div>
                       <button 
                        onClick={() => setSettings((prev: any) => ({ ...prev, whatsappConnected: !prev.whatsappConnected }))}
                        className={`px-4 py-2 rounded font-bold text-[10px] uppercase tracking-wide transition-all ${
                          settings.whatsappConnected ? 'bg-dr7-red text-white hover:bg-red-600' : 'btn-teal'
                        }`}
                       >
                          {settings.whatsappConnected ? 'SCOLLEGA' : 'COLLEGA ORA'}
                       </button>
                    </div>
                    {settings.whatsappConnected && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                         <div className="p-3 border border-border-primary rounded bg-white">
                            <p className="text-[10px] font-bold text-text-secondary uppercase">API Endpoint</p>
                            <p className="text-xs font-mono truncate">v17.0/dr7-production</p>
                         </div>
                         <div className="p-3 border border-border-primary rounded bg-white">
                            <p className="text-[10px] font-bold text-text-secondary uppercase">Token Status</p>
                            <p className="text-xs text-dr7-green font-bold">VALiD</p>
                         </div>
                         <div className="p-3 border border-border-primary rounded bg-white">
                            <p className="text-[10px] font-bold text-text-secondary uppercase">Last Sync</p>
                            <p className="text-xs">Oggi, 09:45</p>
                         </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                       <Sparkles size={16} className="text-dr7-teal" /> AI Configuration
                    </h3>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center text-xs">
                          <span className="font-bold">Gemini 1.5 Flash</span>
                          <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${settings.geminiConnected ? 'bg-dr7-green text-white' : 'bg-gray-100 text-text-secondary'}`}>
                             {settings.geminiConnected ? 'CONNECTED' : 'NOT CONFIGURED'}
                          </span>
                       </div>
                       <p className="text-[11px] text-text-secondary leading-relaxed italic">
                          Il sistema utilizza Gemini per l'ottimizzazione del messaggio e l'analisi dei lead. Configura la chiave API nel pannello di controllo cloud.
                       </p>
                    </div>
                  </div>

                  <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-tight">System Policy</h3>
                    <div className="space-y-3">
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded text-dr7-teal focus:ring-dr7-teal" 
                            checked={settings.testMode}
                            onChange={() => setSettings((prev: any) => ({ ...prev, testMode: !prev.testMode }))}
                          />
                          <span className="text-xs font-bold text-text-secondary group-hover:text-black transition-colors">Abilita Modalità Test</span>
                       </label>
                       <p className="text-[10px] text-text-muted italic pl-7">
                          In modalità test, le campagne non verranno mai inviate realmente ai destinatari.
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- New Lead Modal --- */}
      <AnimatePresence>
        {isLeadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsLeadModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-border-primary flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg uppercase tracking-tight">Crea Nuovo Lead</h3>
                <button 
                  onClick={() => setIsLeadModalOpen(false)}
                  className="p-1 hover:bg-gray-200 rounded-full text-text-secondary transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest">Nome *</label>
                  <input 
                    type="text" 
                    placeholder="Es. Mario"
                    className={`w-full bg-white border ${formErrors.firstName ? 'border-dr7-red' : 'border-border-primary'} rounded-md px-4 py-2.5 text-sm focus:border-dr7-teal outline-none transition-colors`}
                    value={newLeadForm.firstName}
                    onChange={(e) => {
                      setNewLeadForm(prev => ({ ...prev, firstName: e.target.value }));
                      if (formErrors.firstName) setFormErrors(prev => ({ ...prev, firstName: '' }));
                    }}
                  />
                  {formErrors.firstName && <p className="text-[10px] text-dr7-red font-bold">{formErrors.firstName}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest">Cognome</label>
                  <input 
                    type="text" 
                    placeholder="Es. Rossi"
                    className="w-full bg-white border border-border-primary rounded-md px-4 py-2.5 text-sm focus:border-dr7-teal outline-none transition-colors"
                    value={newLeadForm.lastName}
                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest">WhatsApp / Cellulare *</label>
                  <input 
                    type="text" 
                    placeholder="Es. +39 333 1234567"
                    className={`w-full bg-white border ${formErrors.phone ? 'border-dr7-red' : 'border-border-primary'} rounded-md px-4 py-2.5 text-sm focus:border-dr7-teal outline-none transition-colors`}
                    value={newLeadForm.phone}
                    onChange={(e) => {
                      setNewLeadForm(prev => ({ ...prev, phone: e.target.value }));
                      if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: '' }));
                    }}
                  />
                  {formErrors.phone && <p className="text-[10px] text-dr7-red font-bold">{formErrors.phone}</p>}
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-border-primary flex gap-3">
                <button 
                  onClick={() => setIsLeadModalOpen(false)}
                  className="flex-1 bg-white border border-border-primary px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-tight hover:bg-gray-100 transition-all"
                >
                  Annulla
                </button>
                <button 
                  onClick={handleCreateLead}
                  className="flex-1 btn-teal px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-tight shadow-md"
                >
                  Salva Lead
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
}

// --- DR7 Sidebar Component ---

function SidebarItem({ icon: Icon, label, active, onClick, collapsed, isPremium }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
        active 
          ? 'bg-dr7-teal text-white shadow-md' 
          : 'text-text-secondary hover:bg-gray-50 hover:text-dr7-teal'
      }`}
    >
      <div className={`shrink-0 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      </div>
      
      {!collapsed && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex items-center justify-between overflow-hidden"
        >
          <span className={`text-[13px] font-bold truncate ${active ? 'text-white' : 'text-inherit'}`}>
            {label}
          </span>
          {isPremium && (
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter ${active ? 'bg-white/20 text-white' : 'bg-dr7-teal-soft text-dr7-teal'}`}>
              PRO
            </span>
          )}
        </motion.div>
      )}

      {/* Active Indicator Strip */}
      {active && !collapsed && (
        <motion.div 
          layoutId="sidebar-active"
          className="absolute left-0 w-1 h-5 bg-white rounded-r-full"
        />
      )}

      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div className="absolute left-full ml-4 px-2 py-1 bg-black text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </button>
  );
}

function SectionTab({ label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold uppercase transition-all ${active ? 'bg-dr7-teal text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>{label}</button>
  );
}

function FilterPill({ label, count, active }: any) {
  return (
    <button className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all ${active ? 'bg-dr7-teal text-white border-dr7-teal shadow-sm' : 'bg-[#F3F4F6] text-text-secondary border-transparent hover:border-gray-300'}`}>
      {label}
      <span className={`text-[10px] px-1.5 rounded-full ${active ? 'bg-white/20' : 'bg-gray-200'}`}>{count}</span>
    </button>
  );
}

function StatCard({ label, value, subValue, icon: Icon }: any) {
  return (
    <div className="bg-white border border-border-primary rounded-lg p-5 shadow-sm space-y-3">
      <div className="flex justify-between items-start">
        <div className="p-2 bg-dr7-teal-soft rounded text-dr7-teal"><Icon size={20} /></div>
        <span className="text-[10px] font-bold text-dr7-green bg-green-50 px-2 py-0.5 rounded uppercase">{subValue}</span>
      </div>
      <div>
        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-black">{value}</p>
      </div>
    </div>
  );
}

function RecentScanRow({ name, date, target, status }: any) {
  return (
    <tr className="hover:bg-gray-50 transition-all font-medium">
      <td className="p-3 font-bold text-black">{name}</td>
      <td className="p-3 text-text-secondary">{date}</td>
      <td className="p-3 text-text-secondary">{target}</td>
      <td className="p-3 text-right"><span className="px-2 py-0.5 bg-dr7-green text-white text-[9px] font-bold rounded uppercase">{status}</span></td>
    </tr>
  );
}

function LeadTableRow({ name, phone, lists, status, date, onDelete }: any) {
  return (
    <tr className="hover:bg-[#FAFAFA] transition-colors group">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-text-secondary border border-border-primary">{name.split(' ').map((n: string) => n[0]).join('')}</div>
          <span className="font-bold text-black">{name}</span>
        </div>
      </td>
      <td className="p-4 text-text-secondary font-mono">{phone}</td>
      <td className="p-4"><div className="flex gap-1.5 flex-wrap">{lists.filter(Boolean).map((l: string) => (<span key={l} className="px-2 py-0.5 bg-gray-100 border border-border-primary rounded text-[10px] font-bold text-text-secondary uppercase tracking-tighter">{l}</span>))}</div></td>
      <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${status === 'Attivo' ? 'bg-dr7-green text-white' : 'bg-dr7-red text-white'}`}>{status}</span></td>
      <td className="p-4 text-xs text-text-secondary">{date}</td>
      <td className="p-4 text-right"><div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><button className="p-1 hover:text-dr7-red" onClick={onDelete}><Trash2 size={14} /></button></div></td>
    </tr>
  );
}

function CampaignTableRow({ name, list, status, date, recipients, onDelete }: any) {
  return (
    <tr className="hover:bg-[#FAFAFA] transition-colors group">
      <td className="p-4 align-top"><div className="space-y-1"><p className="font-bold text-black text-sm">{name}</p><p className="text-[11px] text-text-secondary">Lista: {list}</p><p className="text-[10px] text-text-secondary italic">Creato il: {date}</p></div></td>
      <td className="p-4 text-text-secondary text-xs">{date}</td>
      <td className="p-4 text-xs font-semibold">{recipients > 0 ? recipients.toLocaleString() : 'N/A'}</td>
      <td className="p-4"><span className="flex items-center gap-2 text-xs font-medium text-text-secondary"><ImageIcon size={14} className="text-dr7-teal" /> Media</span></td>
      <td className="p-4">
        <span className={`px-2.5 py-0.5 text-white text-[9px] font-bold rounded-full uppercase ${
          status === 'Inviata' ? 'bg-[#059669]' : 
          status === 'Programmata' ? 'bg-[#2563EB]' : 
          status === 'Simulata' ? 'bg-amber-500' :
          'bg-gray-500'
        }`}>{status}</span>
      </td>
      <td className="p-4 text-right"><div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><button className="p-1 hover:text-dr7-red" onClick={onDelete}><Trash2 size={14} /></button></div></td>
    </tr>
  );
}

function RecipientOption({ label, count, checked, onChange }: any) {
  return (
    <label className={`flex flex-col p-3 border rounded-md cursor-pointer transition-all group ${checked ? 'bg-dr7-teal/5 border-dr7-teal' : 'bg-gray-50 border-border-primary hover:border-dr7-teal'}`}>
      <div className="flex justify-between items-center mb-1">
        <input type="radio" checked={checked} onChange={onChange} className="w-4 h-4 rounded-full border-gray-300 text-dr7-teal focus:ring-dr7-teal" />
        <span className="text-[9px] font-bold text-text-secondary bg-white px-1.5 py-0.5 border border-border-primary rounded">{count.toLocaleString()}</span>
      </div>
      <span className={`text-[11px] font-bold uppercase tracking-tight ${checked ? 'text-dr7-teal' : 'group-hover:text-dr7-teal'}`}>{label}</span>
    </label>
  );
}


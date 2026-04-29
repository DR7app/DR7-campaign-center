import React, { useState } from 'react';
import { 
  Users, Send, Calendar, History, Settings, LayoutDashboard, Plus, 
  Image as ImageIcon, Video, MessageSquare, Search, Bell, MoreVertical, 
  CheckCircle2, Clock, Sparkles, ChevronRight, Filter, AlertTriangle,
  Menu, ArrowLeft, MoreHorizontal, Download, Share2, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type Section = 'dashboard' | 'leads' | 'lists' | 'campaigns' | 'calendar' | 'reports' | 'settings' | 'ai';

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('tutte');
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
                  <button className="btn-teal px-6 py-2 content-center font-bold text-sm">
                    SALVA BOZZA
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Multi-Panel Operational Form */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Nome Campagna</label>
                      <input type="text" placeholder="Es. Promozione Audi Primavera 2026" className="w-full bg-white border border-border-primary rounded-md px-4 py-2.5 text-sm focus:border-dr7-teal outline-none transition-colors" />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Messaggio WhatsApp</label>
                      <textarea 
                        rows={8}
                        placeholder="Scrivi qui il corpo del messaggio..." 
                        className="w-full bg-white border border-border-primary rounded-md px-4 py-3 text-sm focus:border-dr7-teal outline-none transition-colors resize-none mb-3"
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
                          <button className="text-[10px] font-bold px-3 py-1 bg-white border border-border-primary rounded hover:border-dr7-teal transition-all">AI: PIÙ DIRETTO</button>
                          <button className="text-[10px] font-bold px-3 py-1 bg-white border border-border-primary rounded hover:border-dr7-teal transition-all">STRUMENTI AI</button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Destinatari</label>
                      <div className="grid grid-cols-2 gap-3">
                        <RecipientOption label="Focus Automobili" count={1200} />
                        <RecipientOption label="VIP Dubai" count={450} />
                        <RecipientOption label="Showroom Bologna" count={3100} />
                        <RecipientOption label="Tutti i Lead" count={48520} />
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
                        <button className="w-full bg-[#16A34A] hover:bg-dr7-green text-white font-bold text-sm py-2 px-4 rounded-md transition-all shadow-sm">
                          CONFERMA E PROGRAMMA
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Summary/Preview Column */}
                <div className="space-y-6">
                  <div className="bg-white border border-border-primary rounded-lg shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border-primary bg-gray-50 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-text-secondary uppercase">Preview WhatsApp</span>
                      <Bell size={14} className="text-gray-400" />
                    </div>
                    <div className="p-6 bg-[#E5DDD5] min-h-[400px] flex flex-col gap-4 relative">
                      <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[85%] text-xs relative">
                        <p className="leading-relaxed">
                          La tua anteprima apparirà qui. Inizia a scrivere nel box a sinistra per visualizzare come i tuoi clienti riceveranno il messaggio.
                        </p>
                        <span className="absolute bottom-1 right-2 text-[8px] text-gray-400">10:45</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#2C8F7B] text-white p-6 rounded-lg shadow-md space-y-4">
                    <h4 className="font-bold text-sm uppercase">Resoconto Campagna</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b border-white/20 pb-2">
                        <span className="opacity-80">Totale Destinatari:</span>
                        <span className="font-bold italic">4.750</span>
                      </div>
                      <div className="flex justify-between border-b border-white/20 pb-2">
                        <span className="opacity-80">Tipo Invio:</span>
                        <span className="font-bold">Massivo</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-80">Stima Completamento:</span>
                        <span className="font-bold">~ 25 min</span>
                      </div>
                    </div>
                    <button className="w-full bg-white text-dr7-teal font-black text-xs py-4 rounded-md shadow-lg flex items-center justify-center gap-2 group hover:bg-gray-100 transition-all">
                      INVIA ORA <Send size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
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
                <SectionTab label="Richieste / Bozze" active={activeSubTab === 'bozze'} onClick={() => setActiveSubTab('bozze')} />
                <SectionTab label="Invii Programmati" active={activeSubTab === 'programmati'} onClick={() => setActiveSubTab('programmati')} />
                <SectionTab label="Report d'Invio" active={activeSubTab === 'report'} onClick={() => setActiveSubTab('report')} />
              </div>

              {/* Filter Pills */}
              <div className="flex gap-2 items-center flex-wrap">
                <FilterPill label="Tutte" count={110} active />
                <FilterPill label="Bozza" count={12} />
                <FilterPill label="Programmata" count={8} />
                <FilterPill label="In invio" count={3} />
                <FilterPill label="Inviata" count={54} />
                <FilterPill label="Fallita" count={2} />
              </div>

              {/* Operational Data Table */}
              <div className="bg-white border border-border-primary rounded-lg overflow-hidden shadow-sm">
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
                    <CampaignTableRow name="Promo RS3 Primavera 2026" list="Clienti Supercar" status="Inviata" date="29/04/26" recipients={1250} />
                    <CampaignTableRow name="Lancio Lamborghini 2026" list="Lead Caldi" status="Programmata" date="15/05/26" recipients={840} />
                    <CampaignTableRow name="Welcome Series Automatic" list="Nuovi Iscritti" status="Bozza" date="28/04/26" recipients={0} />
                  </tbody>
                </table>
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
                  <button className="bg-white border border-border-primary px-4 py-2 rounded-md text-xs font-bold uppercase tracking-tight flex items-center gap-2 hover:bg-gray-50 transition-all">
                    <Download size={14} /> Esporta Report
                  </button>
                  <button className="btn-teal px-6 py-2 content-center font-bold text-sm">
                    + NUOVA CAMPAGNA
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Totale Lead" value="48.520" subValue="+120 oggi" icon={Users} />
                <StatCard label="Campagne Attive" value="12" subValue="3 in programmazione" icon={Send} />
                <StatCard label="Messaggi Inviati" value="1.248.322" subValue="99.4% Successo" icon={CheckCircle2} />
                <StatCard label="Generazioni AI" value="842" subValue="Copy ottimizzati" icon={Sparkles} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-border-primary rounded-lg shadow-sm">
                  <div className="p-4 border-b border-border-primary flex justify-between items-center bg-[#FAFAFA]">
                    <h3 className="font-bold text-sm uppercase tracking-tight">Ultimi Invii Effettuati</h3>
                    <button className="text-dr7-teal text-xs font-bold hover:underline">Vedi Tutti</button>
                  </div>
                  <div className="overflow-x-auto">
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
                        <RecentScanRow name="Promo RS3 Primavera" date="29/04/26" target="Clienti Supercar" status="Inviata" />
                        <RecentScanRow name="Auguri Pasqua 2026" date="20/04/26" target="Tutti i Lead" status="Inviata" />
                        <RecentScanRow name="Aventador Launch" date="15/04/26" target="Focus VIP" status="Inviata" />
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white border border-border-primary rounded-lg shadow-sm p-4 space-y-4 text-xs font-bold">
                  <h3 className="font-bold text-sm uppercase tracking-tight border-b border-border-primary pb-3">Status Canale WhatsApp</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p>DR7 Official Channel</p>
                        <p className="text-[10px] text-text-secondary">+971 50 123 4567</p>
                      </div>
                      <span className="px-2 py-0.5 bg-dr7-green text-white text-[9px] font-bold rounded uppercase">Connesso</span>
                    </div>
                    <div className="p-3 bg-dr7-teal-soft border border-dr7-teal/20 rounded text-[11px] text-dr7-teal">
                      Il sistema è pronto per l'invio. Carico attuale: <strong>0%</strong>.
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
                  <button className="bg-white border border-border-primary px-5 py-2 rounded-md text-xs font-bold uppercase tracking-tight flex items-center gap-2 hover:bg-gray-50 transition-all">
                    <Download size={14} /> IMPORTA CSV
                  </button>
                  <button className="btn-teal px-6 py-2 content-center font-bold text-sm">
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
                    <Filter size={14} /> Filtri Avanzati
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#FAFAFA] border-b border-border-primary">
                      <tr>
                        <th className="table-header">Anagrafica</th>
                        <th className="table-header">Canale WhatsApp</th>
                        <th className="table-header">Liste / Segmenti</th>
                        <th className="table-header">Consenso</th>
                        <th className="table-header">Ultimo Invio</th>
                        <th className="table-header text-right">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary text-sm font-medium">
                      <LeadTableRow name="Alessandro Rossi" phone="+39 333 123 4567" lists={['Focus Automobili', 'VIP']} status="Attivo" date="28/04/26" />
                      <LeadTableRow name="Giulia Bianchi" phone="+39 345 987 6543" lists={['Eventi 2026']} status="Inattivo" date="12/04/26" />
                      <LeadTableRow name="Marco Verdi" phone="+39 320 000 1111" lists={['Prospects Marzaglia']} status="Attivo" date="25/04/26" />
                      <LeadTableRow name="Sofia Neri" phone="+39 392 444 5555" lists={['VIP', 'Sportive']} status="Attivo" date="29/04/26" />
                    </tbody>
                  </table>
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
                  <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-6 text-xs italic">
                    <h3 className="font-bold text-sm uppercase tracking-tight not-italic">Ottimizzatore Copy</h3>
                    <textarea rows={6} className="w-full bg-white border border-border-primary rounded-md px-4 py-3 text-sm focus:border-dr7-teal outline-none transition-colors resize-none not-italic font-medium" defaultValue="Ciao! Abbiamo una nuova RS3 disponibile in showroom. Vieni a trovarci questo weekend per un test drive esclusivo!" />
                    <div className="flex flex-wrap gap-2 not-italic">
                       <button className="text-[10px] font-bold px-4 py-2 bg-dr7-teal-soft text-dr7-teal border border-dr7-teal/20 rounded hover:bg-dr7-teal hover:text-white transition-all uppercase">Rendi Persuasivo</button>
                       <button className="text-[10px] font-bold px-4 py-2 bg-dr7-teal-soft text-dr7-teal border border-dr7-teal/20 rounded hover:bg-dr7-teal hover:text-white transition-all uppercase">Accorcia Testo</button>
                       <button className="text-[10px] font-bold px-4 py-2 bg-dr7-teal-soft text-dr7-teal border border-dr7-teal/20 rounded hover:bg-dr7-teal hover:text-white transition-all uppercase">Check Spam</button>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-[#2C8F7B] text-white p-6 rounded-lg shadow-md space-y-4">
                    <div className="flex items-center gap-3"><Sparkles size={24} /><h4 className="font-bold text-sm uppercase">Smart Insights</h4></div>
                    <p className="text-xs leading-relaxed opacity-90 italic">Analisi IA sui lead correnti.</p>
                    <div className="pt-2 space-y-2 text-xs font-bold text-black bg-white/90 p-4 rounded border border-white/20">
                       <p className="border-b border-black/10 pb-1 uppercase text-[9px] opacity-70">Top Keywords</p>
                       <p>Disponibilità, Prezzo, Test Drive</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <h1 className="text-3xl font-bold tracking-tight">Report e Analisi</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                 <div className="bg-white border border-border-primary rounded-lg p-6 space-y-1">
                    <p className="text-[10px] font-bold text-text-secondary uppercase">Deliverability</p>
                    <p className="text-3xl font-black text-dr7-teal">99.2%</p>
                 </div>
                 <div className="bg-white border border-border-primary rounded-lg p-6 space-y-1">
                    <p className="text-[10px] font-bold text-text-secondary uppercase">Risposte</p>
                    <p className="text-3xl font-black text-dr7-blue">14.1%</p>
                 </div>
                 <div className="bg-white border border-border-primary rounded-lg p-6 space-y-1">
                    <p className="text-[10px] font-bold text-text-secondary uppercase">Lead Persi</p>
                    <p className="text-3xl font-black text-dr7-red">0.8%</p>
                 </div>
              </div>
            </motion.div>
          )}

          {['lists', 'calendar', 'settings'].includes(activeSection) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-40">
              <div className="w-16 h-16 bg-dr7-teal-soft rounded-full flex items-center justify-center text-dr7-teal mb-4"><LayoutDashboard size={32} /></div>
              <h2 className="text-xl font-bold">Modulo {activeSection.toUpperCase()}</h2>
              <p className="text-text-secondary">In fase di configurazione DR7.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
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

function LeadTableRow({ name, phone, lists, status, date }: any) {
  return (
    <tr className="hover:bg-[#FAFAFA] transition-colors group">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-text-secondary border border-border-primary">{name.split(' ').map((n: string) => n[0]).join('')}</div>
          <span className="font-bold text-black">{name}</span>
        </div>
      </td>
      <td className="p-4 text-text-secondary font-mono">{phone}</td>
      <td className="p-4"><div className="flex gap-1.5 flex-wrap">{lists.map((l: string) => (<span key={l} className="px-2 py-0.5 bg-gray-100 border border-border-primary rounded text-[10px] font-bold text-text-secondary uppercase tracking-tighter">{l}</span>))}</div></td>
      <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${status === 'Attivo' ? 'bg-dr7-green text-white' : 'bg-dr7-red text-white'}`}>{status === 'Attivo' ? 'Verificato' : status}</span></td>
      <td className="p-4 text-xs text-text-secondary">{date}</td>
      <td className="p-4 text-right"><div className="flex justify-end gap-1.5"><button className="btn-blue px-3 py-1 text-[10px] uppercase font-bold">Modifica</button><button className="btn-red px-3 py-1 text-[10px] uppercase font-bold">Elimina</button></div></td>
    </tr>
  );
}

function CampaignTableRow({ name, list, status, date, recipients }: any) {
  return (
    <tr className="hover:bg-[#FAFAFA] transition-colors group">
      <td className="p-4 align-top"><div className="space-y-1"><p className="font-bold text-black text-sm">{name}</p><p className="text-[11px] text-text-secondary">Lista: {list}</p><p className="text-[10px] text-text-secondary italic">Creato da: admin@dr7.app • {date}</p></div></td>
      <td className="p-4 text-text-secondary text-xs">{date}</td>
      <td className="p-4 text-xs font-semibold">{recipients > 0 ? recipients.toLocaleString() : 'N/A'}</td>
      <td className="p-4"><span className="flex items-center gap-2 text-xs font-medium text-text-secondary"><ImageIcon size={14} className="text-dr7-teal" /> Media</span></td>
      <td className="p-4"><span className={`px-2.5 py-0.5 text-white text-[9px] font-bold rounded-full uppercase ${status === 'Inviata' ? 'bg-[#059669]' : status === 'Programmata' ? 'bg-[#2563EB]' : 'bg-gray-500'}`}>{status}</span></td>
      <td className="p-4 text-right"><div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><button className="btn-blue px-3 py-1 text-[10px] uppercase font-bold">Modifica</button><button className="btn-green px-3 py-1 text-[10px] uppercase font-bold">Invia</button></div></td>
    </tr>
  );
}

function RecipientOption({ label, count }: any) {
  return (
    <label className="flex flex-col p-3 bg-gray-50 border border-border-primary rounded-md cursor-pointer hover:border-dr7-teal transition-all group">
      <div className="flex justify-between items-center mb-1"><input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-dr7-teal focus:ring-dr7-teal" /><span className="text-[9px] font-bold text-text-secondary bg-white px-1.5 py-0.5 border border-border-primary rounded">{count.toLocaleString()}</span></div>
      <span className="text-[11px] font-bold uppercase tracking-tight group-hover:text-dr7-teal">{label}</span>
    </label>
  );
}


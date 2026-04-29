import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Send, Calendar, History, Settings, LayoutDashboard, Plus,
  Image as ImageIcon, Video, MessageSquare, Search, Bell, MoreVertical,
  CheckCircle2, Clock, Sparkles, ChevronRight, Filter, AlertTriangle,
  Menu, ArrowLeft, MoreHorizontal, Share2, Eye, FileUp, Trash2, X, Globe, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import { translations, Language } from './translations';
import { getMerchantContext } from './components/AuthGate';

// --- Helpers ---
const normalizePhone = (phone: string): string => {
  if (!phone) return "";
  let val = phone.toString().trim();
  
  // Remove all non-digit characters
  let digits = val.replace(/\D/g, '');
  
  // Handle 00 prefix (e.g., 0039 -> 39)
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }
  
  // Italian specific: if 10 digits starting with 3, assume Italian and add 39
  if (digits.length === 10 && digits.startsWith('3')) {
    digits = '39' + digits;
  }
  
  return digits;
};

const sortLeadsAlphabetically = (leads: Lead[]): Lead[] => {
  return [...leads].sort((a, b) => {
    const fnA = (a.firstName || '').trim().toLowerCase();
    const fnB = (b.firstName || '').trim().toLowerCase();
    
    // localeCompare handles accented characters nicely
    const firstNameCompare = fnA.localeCompare(fnB, undefined, { sensitivity: 'base' });
    
    if (firstNameCompare !== 0) return firstNameCompare;
    
    const lnA = (a.lastName || '').trim().toLowerCase();
    const lnB = (b.lastName || '').trim().toLowerCase();
    const lastNameCompare = lnA.localeCompare(lnB, undefined, { sensitivity: 'base' });
    
    if (lastNameCompare !== 0) return lastNameCompare;
    
    return (a.phone || '').localeCompare(b.phone || '');
  });
};

const filterLeads = (leads: Lead[], query: string): Lead[] => {
  if (!query) return leads;
  const q = query.toLowerCase().trim();
  const normalizedQueryPhone = q.replace(/\D/g, '');

  return leads.filter(l => {
    const fullName = `${l.firstName} ${l.lastName}`.toLowerCase();
    const phone = l.phone.toLowerCase();
    const phoneNormalized = l.phoneNormalized.toLowerCase();
    
    // Name search
    if (l.firstName.toLowerCase().includes(q)) return true;
    if (l.lastName.toLowerCase().includes(q)) return true;
    if (fullName.includes(q)) return true;
    
    // Phone search
    if (phone.includes(q)) return true;
    if (phoneNormalized.includes(normalizedQueryPhone)) return true;
    
    // Also check for partial phone digits
    const digitsOnlyLead = l.phone.replace(/\D/g, '');
    if (normalizedQueryPhone && digitsOnlyLead.includes(normalizedQueryPhone)) return true;
    
    return false;
  });
};

const COLUMN_ALIASES = {
  firstName: ['nome', 'name', 'first name', 'first_name', 'firstname', 'lead name'],
  lastName: ['cognome', 'surname', 'last name', 'last_name', 'lastname'],
  phone: [
    'telefono', 'tel', 'phone', 'phone number', 'phone_number', 'phonenumber', 
    'mobile', 'cellulare', 'whatsapp', 'whatsapp number', 'numero', 
    'numero telefono', 'numero_telefono'
  ]
};

const findMappedColumn = (row: any, aliases: string[]): string => {
  const keys = Object.keys(row);
  const matchedKey = keys.find(key => {
    const normalizedKey = key.trim().toLowerCase()
      .replace(/[\s\-_]/g, '')
      .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove accents
    return aliases.some(alias => {
      const normalizedAlias = alias.toLowerCase().replace(/[\s\-_]/g, '');
      return normalizedKey === normalizedAlias;
    });
  });
  return matchedKey ? (row[matchedKey] || '').toString().trim() : '';
};

// --- Types ---
type Section = 'dashboard' | 'leads' | 'broadcast' | 'campaigns' | 'calendar' | 'reports' | 'settings' | 'ai' | 'media';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  phoneNormalized: string;
  email?: string;
  tags: string[];
  list: string;
  consent: 'Attivo' | 'Inattivo';
  notes?: string;
  source: string;
  createdAt: string;
  updatedAt?: string;
  importedAt?: string;
}

interface ImportPreviewStats {
  totalRows: number;
  validUnique: number;
  duplicatesInFile: number;
  alreadyExisting: number;
  invalidRows: number;
  finalToImport: number;
}

interface TimeWindow {
  start: string;
  end: string;
}

interface AutomationCondition {
  id: string;
  type: 'Revenue' | 'Vehicle availability' | 'Lead count' | 'Custom';
  operator: 'reaches' | 'greater than' | 'lower than' | 'is free for more than' | 'equals';
  value: string;
  period?: string;
}

interface CampaignSchedule {
  type: 'single' | 'recurring';
  isActive: boolean;
  singleDate?: string;
  singleTime?: string;
  recurrenceCount: number;
  recurrenceUnit: 'day' | 'week' | 'month';
  dailyTimes: string[];
  weeklySlots: { day: string, time: string }[];
  monthlySlots: { day: number, time: string }[];
  allowedWindows: TimeWindow[];
  blockedWindows: TimeWindow[];
  conditions: AutomationCondition[];
  conditionMatchType: 'all' | 'any';
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  recipientMode: 'all' | 'broadcast' | 'manual';
  selectedBroadcastIds?: string[];
  selectedLeadIds?: string[];
  status: 'Bozza' | 'Programmata' | 'Inviata' | 'Fallita' | 'Simulata' | 'Sospesa';
  createdAt: string;
  schedule?: CampaignSchedule;
  media?: { type: 'image' | 'video', url: string };
}

interface BroadcastList {
  id: string;
  name: string;
  description?: string;
  leadIds: string[];
  createdAt: string;
  updatedAt: string;
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
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('dr7_language');
    return (saved as Language) || 'it';
  });

  const t = (path: string): string => {
    const keys = path.split('.');
    let result: any = translations[language];
    for (const key of keys) {
      if (result && result[key]) {
        result = result[key];
      } else {
        // Fallback to Italian
        let fallback: any = translations['it'];
        for (const fKey of keys) {
          if (fallback && fallback[fKey]) {
            fallback = fallback[fKey];
          } else {
            return path; // Last resort: show path
          }
        }
        return fallback;
      }
    }
    return result;
  };

  useEffect(() => {
    localStorage.setItem('dr7_language', language);
  }, [language]);

  // --- Real State Layer (with LocalStorage persistence) ---
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('dr7_leads');
    return saved ? JSON.parse(saved) : [];
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const saved = localStorage.getItem('dr7_campaigns');
    return saved ? JSON.parse(saved) : [];
  });

  const [broadcastLists, setBroadcastLists] = useState<BroadcastList[]>(() => {
    const saved = localStorage.getItem('dr7_broadcast_lists');
    return saved ? JSON.parse(saved) : [];
  });

  const [media, setMedia] = useState<MediaFile[]>(() => {
    const saved = localStorage.getItem('dr7_media');
    return saved ? JSON.parse(saved) : [];
  });

  const [leadsSearchTerm, setLeadsSearchTerm] = useState('');

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
    localStorage.setItem('dr7_broadcast_lists', JSON.stringify(broadcastLists));
  }, [broadcastLists]);

  useEffect(() => {
    localStorage.setItem('dr7_media', JSON.stringify(media));
  }, [media]);

  useEffect(() => {
    localStorage.setItem('dr7_settings', JSON.stringify(settings));
  }, [settings]);

  // --- Handlers ---
  // --- Import State ---
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStats, setImportStats] = useState<ImportPreviewStats | null>(null);
  const [leadsToImport, setLeadsToImport] = useState<Lead[]>([]);
  const [skippedRows, setSkippedRows] = useState<{ row: any; reason: string }[]>([]);
  const [importModalTab, setImportModalTab] = useState<'valid' | 'skipped'>('valid');

  const processCSVFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawData = results.data;
        if (rawData.length === 0) return;

        console.log('Import Debug - Headers detected:', Object.keys(rawData[0]));

        const seenInFile = new Set<string>();
        const validUniques: Lead[] = [];
        const skipped: { row: any; reason: string }[] = [];
        
        let dupesInFile = 0;
        let alreadyExist = 0;
        let invalid = 0;

        rawData.forEach((row: any, i) => {
          // Robust column mapping with aliases
          const firstName = findMappedColumn(row, COLUMN_ALIASES.firstName);
          const lastName = findMappedColumn(row, COLUMN_ALIASES.lastName);
          const phoneInput = findMappedColumn(row, COLUMN_ALIASES.phone);

          // Validation: Required fields check
          if (!firstName) {
            invalid++;
            skipped.push({ row, reason: 'Nome mancante' });
            return;
          }

          if (!phoneInput) {
            invalid++;
            skipped.push({ row, reason: 'Telefono mancante' });
            return;
          }

          // Normalization
          const phoneNormalized = normalizePhone(phoneInput);
          if (phoneNormalized.length < 8) {
            invalid++;
            skipped.push({ row, reason: 'Numero di telefono non valido o impossibile da normalizzare' });
            return;
          }

          // Deduplication: File level
          if (seenInFile.has(phoneNormalized)) {
            dupesInFile++;
            skipped.push({ row, reason: 'Duplicato nel file CSV' });
            return;
          }

          // Deduplication: Database level
          if (leads.some(l => l.phoneNormalized === phoneNormalized)) {
            alreadyExist++;
            skipped.push({ row, reason: 'Già presente nel database' });
            return;
          }

          // Add to valid import list
          seenInFile.add(phoneNormalized);
          validUniques.push({
            id: `import-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
            firstName,
            lastName: lastName || '', // Optional
            phone: phoneInput,
            phoneNormalized,
            tags: [],
            list: 'CSV Import',
            consent: 'Attivo',
            source: 'CSV Import',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            importedAt: new Date().toISOString()
          });
        });

        console.log(`Import Debug - Results: ${validUniques.length} valid, ${invalid} invalid, ${dupesInFile} file dupes, ${alreadyExist} db exists`);

        setLeadsToImport(validUniques);
        setSkippedRows(skipped);
        setImportStats({
          totalRows: rawData.length,
          validUnique: validUniques.length,
          duplicatesInFile: dupesInFile,
          alreadyExisting: alreadyExist,
          invalidRows: invalid,
          finalToImport: validUniques.length
        });
        setImportModalTab('valid');
        setIsImportModalOpen(true);
      }
    });
  };

  const handleConfirmImport = () => {
    setLeads(prev => [...leadsToImport, ...prev]);
    setIsImportModalOpen(false);
    setLeadsToImport([]);
    setImportStats(null);
    setSkippedRows([]);
    alert(t('csvImport.importSuccess').replace('{count}', leadsToImport.length.toString()));
  };

  const handleImportLeads = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processCSVFile(file);
    e.target.value = ''; // Reset input
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
    const normPhone = normalizePhone(newLeadForm.phone);

    if (!newLeadForm.firstName.trim()) errors.firstName = t('leads.errors.nameRequired');
    if (!newLeadForm.phone.trim()) {
      errors.phone = t('leads.errors.phoneRequired');
    } else if (normPhone.length < 8) {
      errors.phone = t('leads.errors.invalidPhone');
    } else if (leads.some(l => l.phoneNormalized === normPhone)) {
      errors.phone = t('leads.errors.duplicatePhone');
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
      phoneNormalized: normPhone,
      tags: [],
      list: 'Generale',
      consent: 'Attivo',
      source: 'Inserimento Manuale',
      createdAt: new Date().toISOString()
    };

    setLeads(prev => [newLead, ...prev]);
    setIsLeadModalOpen(false);
    setNewLeadForm({ firstName: '', lastName: '', phone: '' });
    setFormErrors({});
    alert(t('leads.createSuccess'));
  };

  // --- Campaign Form State ---
  const initialSchedule: CampaignSchedule = {
    type: 'single',
    isActive: true,
    recurrenceCount: 1,
    recurrenceUnit: 'day',
    dailyTimes: ['09:00'],
    weeklySlots: [],
    monthlySlots: [],
    allowedWindows: [{ start: '07:00', end: '22:00' }],
    blockedWindows: [],
    conditions: [],
    conditionMatchType: 'all'
  };

  // --- Broadcast List State ---
  const [isBroadcastListModalOpen, setIsBroadcastListModalOpen] = useState(false);
  const [editingBroadcastList, setEditingBroadcastList] = useState<BroadcastList | null>(null);
  const [isChooseBroadcastModalOpen, setIsChooseBroadcastModalOpen] = useState(false);
  const [isSelectLeadsModalOpen, setIsSelectLeadsModalOpen] = useState(false);

  const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
    name: '',
    message: '',
    recipientMode: 'all',
    selectedBroadcastIds: [],
    selectedLeadIds: [],
    status: 'Bozza',
    schedule: initialSchedule
  });

  const getScheduleSummary = (sched: CampaignSchedule | undefined) => {
    if (!sched) return t('newCampaign.noSchedule');
    const { type, recurrenceCount, recurrenceUnit, dailyTimes, weeklySlots, monthlySlots, singleDate, singleTime, conditions, isActive } = sched;
    
    let text = isActive ? t('newCampaign.active') : t('newCampaign.paused');

    if (type === 'single') {
      text += t('newCampaign.singleDesc')
        .replace('{date}', singleDate || '--/--/--')
        .replace('{time}', singleTime || '--:--');
    } else {
      const unitLabel = recurrenceUnit === 'day' ? t('common.day') : recurrenceUnit === 'week' ? t('common.week') : t('common.month');
      text += t('newCampaign.recurringDesc')
        .replace('{count}', recurrenceCount.toString())
        .replace('{unit}', unitLabel);
      
      if (recurrenceUnit === 'day') text += ` ${t('newCampaign.times')}: ${dailyTimes.join(', ')}.`;
      if (recurrenceUnit === 'week') text += ` ${t('newCampaign.days')}: ${weeklySlots.map(s => `${s.day} ${s.time}`).join(', ')}.`;
      if (recurrenceUnit === 'month') text += ` ${t('newCampaign.days')}: ${monthlySlots.map(s => `${t('newCampaign.day')} ${s.day} ${s.time}`).join(', ')}.`;
    }

    if (conditions.length > 0) {
      text += ` ${t('newCampaign.autoTriggersSet').replace('{count}', conditions.length.toString())}`;
    }

    return text;
  };

  const handleSendCampaign = (status: Campaign['status']) => {
    if (!newCampaign.name || !newCampaign.message) {
      return alert(t('newCampaign.errors.incomplete'));
    }

    // Validation for schedules
    if (status === 'Programmata' && newCampaign.schedule) {
      const s = newCampaign.schedule;
      if (s.type === 'single' && (!s.singleDate || !s.singleTime)) {
        return alert(t('newCampaign.errors.singleDateTime'));
      }
      if (s.type === 'recurring') {
        if (s.recurrenceUnit === 'day' && s.dailyTimes.length < s.recurrenceCount) return alert(t('newCampaign.errors.dailyTimes').replace('{count}', s.recurrenceCount.toString()));
        if (s.recurrenceUnit === 'week' && s.weeklySlots.length < s.recurrenceCount) return alert(t('newCampaign.errors.weeklySlots').replace('{count}', s.recurrenceCount.toString()));
        if (s.recurrenceUnit === 'month' && s.monthlySlots.length < s.recurrenceCount) return alert(t('newCampaign.errors.monthlySlots').replace('{count}', s.recurrenceCount.toString()));
      }
    }

    const campaign: Campaign = {
      id: `camp-${Date.now()}`,
      name: newCampaign.name!,
      message: newCampaign.message!,
      recipientMode: newCampaign.recipientMode!,
      selectedBroadcastIds: newCampaign.selectedBroadcastIds || [],
      selectedLeadIds: newCampaign.selectedLeadIds || [],
      status: settings.whatsappConnected ? status : 'Simulata',
      createdAt: new Date().toISOString(),
      schedule: newCampaign.schedule ? { ...newCampaign.schedule } : undefined
    };

    setCampaigns(prev => [campaign, ...prev]);
    setActiveSubTab('tutte');
    alert(settings.whatsappConnected ? t('newCampaign.sendSuccess') : t('newCampaign.testSuccess'));
    setNewCampaign({ 
      name: '', 
      message: '', 
      recipientMode: 'all', 
      selectedBroadcastIds: [], 
      selectedLeadIds: [], 
      status: 'Bozza', 
      schedule: initialSchedule 
    });
  };

  const handleCreateBroadcastList = (name: string, description: string, leadIds: string[]) => {
    const list: BroadcastList = {
      id: editingBroadcastList ? editingBroadcastList.id : `bl-${Date.now()}`,
      name,
      description,
      leadIds,
      createdAt: editingBroadcastList ? editingBroadcastList.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingBroadcastList) {
      setBroadcastLists(prev => prev.map(l => l.id === list.id ? list : l));
    } else {
      setBroadcastLists(prev => [list, ...prev]);
    }
    
    setIsBroadcastListModalOpen(false);
    setEditingBroadcastList(null);
  };

  const handleDeleteBroadcastList = (id: string) => {
    if (confirm(t('broadcast.deleteConfirm'))) {
      setBroadcastLists(prev => prev.filter(l => l.id !== id));
    }
  };

  // --- Dashboard Stats Calculation ---
  const dashboardStats = {
    totalLeads: leads.length,
    activeCampaigns: campaigns.filter(c => c.status === 'Programmata').length,
    sentMessages: campaigns.filter(c => ['Inviata', 'Simulata'].includes(c.status)).length,
    mediaCount: media.length
  };

  const displayedLeads = React.useMemo(() => {
    const filtered = filterLeads(leads, leadsSearchTerm);
    return sortLeadsAlphabetically(filtered);
  }, [leads, leadsSearchTerm]);

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
              label={t('sidebar.dashboard')} 
              active={activeSection === 'dashboard'} 
              onClick={() => setActiveSection('dashboard')} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={Users} 
              label={t('sidebar.leads')} 
              active={activeSection === 'leads'} 
              onClick={() => setActiveSection('leads')} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={Share2} 
              label={t('sidebar.broadcast')} 
              active={activeSection === 'broadcast'} 
              onClick={() => setActiveSection('broadcast')} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={Send} 
              label={t('sidebar.campaigns')} 
              active={activeSection === 'campaigns'} 
              onClick={() => setActiveSection('campaigns')} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={ImageIcon} 
              label={t('sidebar.media')} 
              active={activeSection === 'media'} 
              onClick={() => setActiveSection('media')} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={Calendar} 
              label={t('sidebar.calendar')} 
              active={activeSection === 'calendar'} 
              onClick={() => setActiveSection('calendar')} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={Sparkles} 
              label={t('sidebar.ai')} 
              active={activeSection === 'ai'} 
              onClick={() => setActiveSection('ai')} 
              collapsed={!sidebarOpen}
              isPremium
            />
          </div>

          <div className="mt-8 px-6 mb-2">
            <p className={`text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
              {t('sidebar.businessTools')}
            </p>
          </div>

          <div className="px-3 space-y-1">
            <SidebarItem 
              icon={History} 
              label={t('sidebar.reports')} 
              active={activeSection === 'reports'} 
              onClick={() => setActiveSection('reports')} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={Settings} 
              label={t('sidebar.settings')} 
              active={activeSection === 'settings'} 
              onClick={() => setActiveSection('settings')} 
              collapsed={!sidebarOpen}
            />
          </div>

          {/* Language Selector */}
          <div className="mt-8 px-3">
            <div className={`flex flex-col gap-2 p-3 bg-gray-50 border border-border-primary rounded-lg ${!sidebarOpen ? 'items-center justify-center' : ''}`}>
              {sidebarOpen && (
                <div className="flex items-center gap-2 mb-1">
                  <Globe size={12} className="text-dr7-teal" />
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none">{t('sidebar.language')}</p>
                </div>
              )}
              <div className={`flex ${sidebarOpen ? 'gap-1' : 'flex-col gap-2'}`}>
                {(['it', 'en', 'es'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`
                      ${sidebarOpen ? 'flex-1 py-1.5' : 'w-8 h-8 flex items-center justify-center'}
                      text-[10px] font-bold uppercase rounded transition-all
                      ${language === lang 
                        ? 'bg-dr7-teal text-white shadow-sm' 
                        : 'bg-white text-text-secondary hover:bg-gray-100 border border-border-primary'
                      }
                    `}
                  >
                    {lang === 'it' ? 'ITA' : lang === 'en' ? 'ENG' : 'ESP'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-border-primary space-y-2">
          {(() => {
            const ctx = getMerchantContext();
            if (!ctx) return null;
            return (
              <div className={`flex items-center gap-2 ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
                {sidebarOpen && (
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none mb-1">Attivit&agrave;</p>
                    <p className="text-xs font-bold text-black truncate">{ctx.merchant.name}</p>
                  </div>
                )}
                <button
                  onClick={() => ctx.signOut()}
                  title="Esci"
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-border-primary text-text-secondary hover:text-dr7-red hover:border-dr7-red/40 transition-all shrink-0"
                >
                  <LogOut size={14} />
                </button>
              </div>
            );
          })()}
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
              {t('sidebar.' + activeSection)}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-border-primary px-3 py-1.5 rounded-md focus-within:border-dr7-teal transition-all">
              <Search size={14} className="text-text-secondary" />
              <input type="text" placeholder={t('header.search')} className="bg-transparent border-none focus:ring-0 text-xs w-48" />
            </div>
            
            <div className="flex items-center gap-4">
              <button className="p-2 text-text-secondary hover:bg-gray-100 rounded-full relative">
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-dr7-red rounded-full border-2 border-white"></span>
              </button>
              <div className="h-8 w-[1px] bg-gray-200"></div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-black uppercase">{t('header.admin')}</p>
                  <p className="text-[10px] text-dr7-teal font-medium">{t('header.enterprise')}</p>
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
          {activeSection === 'broadcast' && (
            <motion.div key="broadcast" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">{t('broadcast.title')}</h1>
                  <p className="text-text-secondary text-sm">{t('broadcast.subtitle')}</p>
                </div>
                <button 
                  onClick={() => {
                    setEditingBroadcastList(null);
                    setIsBroadcastListModalOpen(true);
                  }}
                  className="btn-teal px-6 py-2.5 rounded-md font-bold text-sm flex items-center gap-2 shadow-md uppercase"
                >
                  <Plus size={18} /> {t('broadcast.create')}
                </button>
              </div>

              {broadcastLists.length === 0 ? (
                <div className="bg-white border border-border-primary rounded-xl p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-text-secondary">
                    <Share2 size={32} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{t('broadcast.noLists')}</h3>
                    <p className="text-text-secondary text-sm max-w-xs mx-auto">{t('broadcast.noListsDesc')}</p>
                  </div>
                  <button 
                    onClick={() => setIsBroadcastListModalOpen(true)}
                    className="text-dr7-teal font-bold text-xs uppercase tracking-widest hover:underline"
                  >
                    {t('broadcast.createFirst')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {broadcastLists.map(list => (
                    <div key={list.id} className="bg-white border border-border-primary rounded-xl p-5 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-dr7-teal-soft rounded text-dr7-teal">
                          <Share2 size={20} />
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingBroadcastList(list);
                              setIsBroadcastListModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded text-text-secondary transition-colors"
                          >
                            <Settings size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteBroadcastList(list.id)}
                            className="p-1.5 hover:bg-red-50 rounded text-dr7-red transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-black uppercase tracking-tight text-sm mb-1">{list.name}</h4>
                        <p className="text-xs text-text-secondary line-clamp-1 h-4">{list.description || t('broadcast.none')}</p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <Users size={14} className="text-text-secondary" />
                          <span className="text-xs font-black text-black">{list.leadIds.length} <span className="font-medium text-text-secondary">{t('broadcast.leadCount')}</span></span>
                        </div>
                        <span className="text-[10px] text-text-muted font-mono">{t('broadcast.updated')} {new Date(list.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeSection === 'media' && (
             <motion.div key="media" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
               <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
               <div className="bg-white border border-border-primary rounded-xl p-12 text-center">
                  <p className="text-text-secondary italic">Sezione in fase di sviluppo...</p>
               </div>
             </motion.div>
          )}
          {activeSection === 'campaigns' && activeSubTab === 'nuova' && (
            <motion.div key="nuova-campagna" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-end">
                <h1 className="text-3xl font-bold tracking-tight">{t('newCampaign.titleNew')}</h1>
                <div className="flex gap-3">
                  <button onClick={() => setActiveSubTab('tutte')} className="bg-white border border-border-primary px-5 py-2 rounded-md text-xs font-bold uppercase tracking-tight flex items-center gap-2">
                    {t('common.cancel')}
                  </button>
                  <button onClick={() => handleSendCampaign('Bozza')} className="btn-teal px-6 py-2 content-center font-bold text-sm">
                    {t('newCampaign.saveDraft')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">{t('newCampaign.campaignName')}</label>
                      <input 
                        type="text" 
                        placeholder={t('newCampaign.namePlaceholder')} 
                        className="w-full bg-white border border-border-primary rounded-md px-4 py-2.5 text-sm focus:border-dr7-teal outline-none transition-colors" 
                        value={newCampaign.name}
                        onChange={e => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">{t('newCampaign.whatsappMessage')}</label>
                      <textarea 
                        rows={8}
                        placeholder={t('newCampaign.messagePlaceholder')} 
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
                      <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">{t('newCampaign.recipients')}</label>
                      <div className="flex bg-gray-100 p-1 rounded-lg border border-border-primary mb-4">
                        <button 
                          onClick={() => setNewCampaign(prev => ({ ...prev, recipientMode: 'all', selectedBroadcastIds: [], selectedLeadIds: [] }))}
                          className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-md transition-all ${newCampaign.recipientMode === 'all' ? 'bg-white shadow-sm text-dr7-teal' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                          {t('newCampaign.allLeads')}
                        </button>
                        <button 
                          onClick={() => setNewCampaign(prev => ({ ...prev, recipientMode: 'broadcast' }))}
                          className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-md transition-all ${newCampaign.recipientMode === 'broadcast' ? 'bg-white shadow-sm text-dr7-teal' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                          {t('newCampaign.broadcast')}
                        </button>
                        <button 
                          onClick={() => setNewCampaign(prev => ({ ...prev, recipientMode: 'manual' }))}
                          className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-md transition-all ${newCampaign.recipientMode === 'manual' ? 'bg-white shadow-sm text-dr7-teal' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                          {t('newCampaign.select')}
                        </button>
                      </div>

                      <div className="bg-gray-50 border border-border-primary rounded-lg p-4">
                        {newCampaign.recipientMode === 'all' && (
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs font-bold text-black uppercase tracking-tight">{t('newCampaign.allLeads')}</p>
                              <p className="text-[10px] text-text-secondary uppercase">{t('newCampaign.allLeadsDesc')}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black text-dr7-teal">{leads.length}</p>
                              <p className="text-[9px] text-text-secondary font-bold uppercase">{t('newCampaign.recipientsCount')}</p>
                            </div>
                          </div>
                        )}

                        {newCampaign.recipientMode === 'broadcast' && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-xs font-bold text-black uppercase tracking-tight">{t('newCampaign.broadcastLists')}</p>
                                <p className="text-[10px] text-text-secondary uppercase">{t('newCampaign.broadcastListsDesc')}</p>
                              </div>
                              <button 
                                onClick={() => setIsChooseBroadcastModalOpen(true)}
                                className="px-3 py-1.5 bg-white border border-border-primary rounded text-[10px] font-bold text-dr7-teal hover:border-dr7-teal transition-all uppercase"
                              >
                                {newCampaign.selectedBroadcastIds && newCampaign.selectedBroadcastIds.length > 0 ? t('common.edit') : t('newCampaign.chooseLists')}
                              </button>
                            </div>
                            
                            {newCampaign.selectedBroadcastIds && newCampaign.selectedBroadcastIds.length > 0 && (
                              <div className="space-y-2 pt-2 border-t border-gray-200">
                                <div className="flex flex-wrap gap-1.5">
                                  {broadcastLists.filter(bl => newCampaign.selectedBroadcastIds?.includes(bl.id)).map(bl => (
                                    <span key={bl.id} className="bg-white border border-border-primary px-2 py-1 rounded text-[9px] font-bold text-text-secondary uppercase flex items-center gap-1">
                                      {bl.name}
                                      <button onClick={() => setNewCampaign(prev => ({ ...prev, selectedBroadcastIds: prev.selectedBroadcastIds?.filter(id => id !== bl.id) }))}>
                                        <X size={10} className="text-dr7-red" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                                <div className="flex justify-between items-center bg-dr7-teal-soft/30 p-2 rounded">
                                  <span className="text-[10px] font-bold text-dr7-teal uppercase">{t('newCampaign.uniqueTotal')}:</span>
                                  <span className="text-sm font-black text-dr7-teal">
                                    {(() => {
                                      const selectedLists = broadcastLists.filter(bl => newCampaign.selectedBroadcastIds?.includes(bl.id));
                                      const allIds = selectedLists.flatMap(bl => bl.leadIds);
                                      const uniqueIds = new Set(allIds);
                                      return uniqueIds.size;
                                    })()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {newCampaign.recipientMode === 'manual' && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-xs font-bold text-black uppercase tracking-tight">{t('newCampaign.select')}</p>
                                <p className="text-[10px] text-text-secondary uppercase">{t('newCampaign.selectLeadsDesc')}</p>
                              </div>
                              <button 
                                onClick={() => setIsSelectLeadsModalOpen(true)}
                                className="px-3 py-1.5 bg-white border border-border-primary rounded text-[10px] font-bold text-dr7-teal hover:border-dr7-teal transition-all uppercase"
                              >
                                {newCampaign.selectedLeadIds && newCampaign.selectedLeadIds.length > 0 ? t('common.edit') : t('newCampaign.selectLeads')}
                              </button>
                            </div>

                            {newCampaign.selectedLeadIds && newCampaign.selectedLeadIds.length > 0 && (
                              <div className="pt-2 border-t border-gray-200">
                                <div className="flex justify-between items-center bg-dr7-teal-soft/30 p-2 rounded">
                                  <span className="text-[10px] font-bold text-dr7-teal uppercase">{t('common.selected')}:</span>
                                  <span className="text-sm font-black text-dr7-teal">{newCampaign.selectedLeadIds.length}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-6">
                    <div className="flex justify-between items-center bg-gray-50 -m-6 mb-6 p-6 border-b border-border-primary">
                       <h3 className="font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                          <Calendar size={16} className="text-dr7-teal" /> {t('newCampaign.schedulingAutomation')}
                       </h3>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-text-secondary uppercase">{t('dashboard.status')}:</span>
                          <button 
                            onClick={() => setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, isActive: !prev.schedule!.isActive } }))}
                            className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all ${newCampaign.schedule?.isActive ? 'bg-dr7-green text-white' : 'bg-dr7-red text-white'}`}
                          >
                             {newCampaign.schedule?.isActive ? 'On' : 'Off'}
                          </button>
                       </div>
                    </div>

                    <div className="space-y-6">
                      {/* Type Selector */}
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-3 tracking-widest">{t('newCampaign.scheduleType')}</label>
                        <div className="flex bg-gray-100 p-1 rounded-md border border-border-primary">
                          <button 
                            onClick={() => setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, type: 'single' } }))}
                            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${newCampaign.schedule?.type === 'single' ? 'bg-white shadow-sm text-dr7-teal' : 'text-text-secondary'}`}
                          >
                            {t('newCampaign.singleSend')}
                          </button>
                          <button 
                            onClick={() => setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, type: 'recurring' } }))}
                            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded transition-all ${newCampaign.schedule?.type === 'recurring' ? 'bg-white shadow-sm text-dr7-teal' : 'text-text-secondary'}`}
                          >
                            {t('newCampaign.recurringSend')}
                          </button>
                        </div>
                      </div>

                      {newCampaign.schedule?.type === 'single' ? (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-2">{t('newCampaign.date')}</label>
                            <input 
                              type="date" 
                              className="w-full bg-white border border-border-primary rounded px-3 py-2 text-sm focus:border-dr7-teal outline-none" 
                              value={newCampaign.schedule.singleDate || ''}
                              onChange={e => setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, singleDate: e.target.value } }))}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-2">{t('newCampaign.time')}</label>
                            <input 
                              type="time" 
                              className="w-full bg-white border border-border-primary rounded px-3 py-2 text-sm focus:border-dr7-teal outline-none" 
                              value={newCampaign.schedule.singleTime || ''}
                              onChange={e => setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, singleTime: e.target.value } }))}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="block text-[10px] font-bold text-text-secondary uppercase mb-2">{t('newCampaign.howManyTimes')}</label>
                               <select 
                                 className="w-full bg-white border border-border-primary rounded px-3 py-2 text-sm"
                                 value={newCampaign.schedule?.recurrenceCount}
                                 onChange={e => setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, recurrenceCount: parseInt(e.target.value) } }))}
                               >
                                  {[1, 2, 3, 5].map(v => <option key={v} value={v}>{v} {v === 1 ? t('newCampaign.timeUnit') : t('newCampaign.timesUnit')}</option>)}
                               </select>
                            </div>
                            <div>
                               <label className="block text-[10px] font-bold text-text-secondary uppercase mb-2">{t('newCampaign.cadence')}</label>
                               <select 
                                 className="w-full bg-white border border-border-primary rounded px-3 py-2 text-sm"
                                 value={newCampaign.schedule?.recurrenceUnit}
                                 onChange={e => setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, recurrenceUnit: e.target.value as any } }))}
                               >
                                  <option value="day">{t('newCampaign.perDay')}</option>
                                  <option value="week">{t('newCampaign.perWeek')}</option>
                                  <option value="month">{t('newCampaign.perMonth')}</option>
                               </select>
                            </div>
                          </div>

                          {/* Dynamic Slots based on count & unit */}
                          <div className="space-y-3 pt-2 border-t border-gray-100">
                             <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('newCampaign.configureSlots')}</p>
                             {Array.from({ length: newCampaign.schedule?.recurrenceCount || 0 }).map((_, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                   <span className="text-[10px] font-bold text-text-muted w-14">Slot #{i+1}</span>
                                   {newCampaign.schedule?.recurrenceUnit === 'week' && (
                                     <select 
                                       className="flex-1 bg-white border border-border-primary rounded px-2 py-1.5 text-xs"
                                       value={newCampaign.schedule.weeklySlots[i]?.day || ''}
                                       onChange={e => {
                                         const newSlots = [...newCampaign.schedule!.weeklySlots];
                                         newSlots[i] = { day: e.target.value, time: newSlots[i]?.time || '09:00' };
                                         setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, weeklySlots: newSlots } }));
                                       }}
                                     >
                                        <option value="">{t('newCampaign.selectDay')}</option>
                                        {['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].map(d => <option key={d} value={d}>{d}</option>)}
                                     </select>
                                   )}
                                   {newCampaign.schedule?.recurrenceUnit === 'month' && (
                                     <input 
                                       type="number" min="1" max="31" placeholder={t('newCampaign.dayPlaceholder')}
                                       className="flex-1 bg-white border border-border-primary rounded px-2 py-1.5 text-xs"
                                       value={newCampaign.schedule.monthlySlots[i]?.day || ''}
                                       onChange={e => {
                                           const newSlots = [...newCampaign.schedule!.monthlySlots];
                                           newSlots[i] = { day: parseInt(e.target.value), time: newSlots[i]?.time || '09:00' };
                                           setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, monthlySlots: newSlots } }));
                                       }}
                                     />
                                   )}
                                   <input 
                                     type="time" 
                                     className="flex-1 bg-white border border-border-primary rounded px-2 py-1.5 text-xs"
                                     value={(newCampaign.schedule?.recurrenceUnit === 'day' ? (newCampaign.schedule.dailyTimes[i] || '') : newCampaign.schedule?.recurrenceUnit === 'week' ? (newCampaign.schedule.weeklySlots[i]?.time || '') : (newCampaign.schedule?.monthlySlots[i]?.time || '')) || ''}
                                     onChange={e => {
                                        const s = newCampaign.schedule!;
                                        if (s.recurrenceUnit === 'day') {
                                           const newTimes = [...s.dailyTimes]; newTimes[i] = e.target.value;
                                           setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, dailyTimes: newTimes } }));
                                        } else if (s.recurrenceUnit === 'week') {
                                           const newSlots = [...s.weeklySlots]; newSlots[i] = { day: newSlots[i]?.day || '', time: e.target.value };
                                           setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, weeklySlots: newSlots } }));
                                        } else {
                                           const newSlots = [...s.monthlySlots]; newSlots[i] = { day: newSlots[i]?.day || 1, time: e.target.value };
                                           setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, monthlySlots: newSlots } }));
                                        }
                                     }}
                                   />
                                </div>
                             ))}
                          </div>
                        </div>
                      )}

                      {/* Sending Limits / Windows */}
                      <div className="pt-4 border-t border-gray-100 space-y-4">
                        <div className="flex justify-between items-center">
                           <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('newCampaign.sendWindows')}</label>
                           <button 
                            onClick={() => setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, allowedWindows: [...prev.schedule!.allowedWindows, { start: '09:00', end: '18:00' }] } }))}
                            className="text-[9px] font-black text-dr7-teal border border-dr7-teal/20 px-2 py-1 rounded"
                           >+ {t('newCampaign.addLimit')}</button>
                        </div>
                        <div className="space-y-2">
                           {newCampaign.schedule?.allowedWindows.map((win, idx) => (
                             <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-border-primary">
                               <span className="text-[9px] font-bold text-text-muted uppercase">{t('newCampaign.allowed')}:</span>
                               <input type="time" className="bg-transparent border-none p-0 text-xs w-16" value={win.start} onChange={e => {
                                  const nw = [...newCampaign.schedule!.allowedWindows]; nw[idx].start = e.target.value;
                                  setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, allowedWindows: nw } }));
                               }} />
                               <span className="text-[9px]">-</span>
                               <input type="time" className="bg-transparent border-none p-0 text-xs w-16" value={win.end} onChange={e => {
                                  const nw = [...newCampaign.schedule!.allowedWindows]; nw[idx].end = e.target.value;
                                  setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, allowedWindows: nw } }));
                               }} />
                               <button onClick={() => setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, allowedWindows: prev.schedule!.allowedWindows.filter((_, i) => i !== idx) } }))}>
                                 <X size={12} className="text-dr7-red" />
                               </button>
                             </div>
                           ))}
                        </div>
                      </div>

                      {/* Condition Builder */}
                      <div className="pt-4 border-t border-gray-100 space-y-4">
                        <div className="flex justify-between items-center">
                           <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('newCampaign.autoTriggers')}</label>
                           <button 
                            onClick={() => setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, conditions: [...prev.schedule!.conditions, { id: Date.now().toString(), type: 'Revenue', operator: 'reaches', value: '' }] } }))}
                            className="text-[9px] font-black text-dr7-teal border border-dr7-teal/20 px-2 py-1 rounded"
                           >+ {t('newCampaign.addRule')}</button>
                        </div>
                        <div className="space-y-2">
                           {newCampaign.schedule?.conditions.map((cond, idx) => (
                             <div key={cond.id} className="p-3 bg-gray-50 border border-border-primary rounded-lg space-y-3">
                                <div className="flex justify-between items-center">
                                   <span className="text-[9px] font-bold text-dr7-teal uppercase">{t('newCampaign.rule')} #{idx+1}</span>
                                   <button onClick={() => setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, conditions: prev.schedule!.conditions.filter(c => c.id !== cond.id) } }))}>
                                      <X size={12} className="text-dr7-red" />
                                   </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                   <select className="text-[10px] font-bold bg-white border border-border-primary px-1 py-1 rounded" value={cond.type} onChange={e => {
                                      const nc = [...newCampaign.schedule!.conditions]; nc[idx].type = e.target.value as any;
                                      setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, conditions: nc } }));
                                   }}>
                                      <option value="Revenue">{t('newCampaign.revenue')}</option>
                                      <option value="Vehicle availability">{t('newCampaign.vehicleAvailability')}</option>
                                      <option value="Lead count">{t('newCampaign.leadCountShort')}</option>
                                   </select>
                                   <select className="text-[10px] font-bold bg-white border border-border-primary px-1 py-1 rounded" value={cond.operator} onChange={e => {
                                      const nc = [...newCampaign.schedule!.conditions]; nc[idx].operator = e.target.value as any;
                                      setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, conditions: nc } }));
                                   }}>
                                      <option value="reaches">{t('newCampaign.reaches')}</option>
                                      <option value="greater than">&gt; {t('common.of')}</option>
                                      <option value="is free for more than">{t('newCampaign.isFreeFor')}</option>
                                   </select>
                                   <input type="text" placeholder={t('newCampaign.valuePlaceholder')} className="text-[10px] bg-white border border-border-primary px-2 py-1 rounded" value={cond.value} onChange={e => {
                                      const nc = [...newCampaign.schedule!.conditions]; nc[idx].value = e.target.value;
                                      setNewCampaign(prev => ({ ...prev, schedule: { ...prev.schedule!, conditions: nc } }));
                                   }} />
                                </div>
                             </div>
                           ))}
                        </div>
                      </div>

                      {/* Summary Box */}
                      <div className="bg-dr7-teal-soft p-4 rounded-lg border border-dr7-teal/20">
                         <div className="flex items-center gap-2 mb-2">
                           <MessageSquare size={14} className="text-dr7-teal" />
                           <p className="text-[10px] font-black uppercase text-dr7-teal">{t('newCampaign.logicSummary')}</p>
                         </div>
                         <p className="text-xs text-dr7-teal leading-relaxed font-medium">
                            {getScheduleSummary(newCampaign.schedule)}
                         </p>
                      </div>

                      <div className="pt-2">
                        <button 
                          onClick={() => handleSendCampaign('Programmata')} 
                          className="w-full bg-[#16A34A] hover:bg-dr7-green text-white font-black text-xs py-3 px-4 rounded-md transition-all shadow-md uppercase tracking-tight"
                        >
                          {t('newCampaign.confirmSchedule')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white border border-border-primary rounded-lg shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border-primary bg-gray-50 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-text-secondary uppercase">{t('newCampaign.whatsappPreview')}</span>
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
                          {t('newCampaign.previewStart')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#2C8F7B] text-white p-6 rounded-lg shadow-md space-y-4">
                    <h4 className="font-bold text-sm uppercase">{t('newCampaign.summary')}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b border-white/20 pb-2">
                        <span className="opacity-80">{t('newCampaign.recipients')}:</span>
                        <span className="font-bold italic">{leads.length}</span>
                      </div>
                    </div>
                    <button onClick={() => handleSendCampaign('Inviata')} className="w-full bg-white text-dr7-teal font-black text-xs py-4 rounded-md shadow-lg flex items-center justify-center gap-2 group hover:bg-gray-100 transition-all">
                      {settings.whatsappConnected ? t('newCampaign.sendNow') : t('newCampaign.sendTest')} <Send size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    {!settings.whatsappConnected && (
                       <p className="text-[9px] uppercase font-black text-center opacity-70 tracking-tighter">{t('newCampaign.providerNotConnected')}</p>
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
                <h1 className="text-3xl font-bold tracking-tight">{t('campaigns.title')}</h1>
                <button onClick={() => setActiveSubTab('nuova')} className="btn-teal px-6 py-2 content-center font-bold text-sm">
                  + {t('campaigns.new')}
                </button>
              </div>

              {/* Section Tabs (Segmented Control Style) */}
              <div className="w-full flex bg-gray-100 p-1 rounded-lg border border-border-primary">
                <SectionTab label={t('campaigns.all')} active={activeSubTab === 'tutte'} onClick={() => setActiveSubTab('tutte')} />
                <SectionTab label={t('sidebar.reports')} active={activeSubTab === 'programmati'} onClick={() => setActiveSubTab('programmati')} />
                <SectionTab label={t('sidebar.reports')} active={activeSubTab === 'report'} onClick={() => setActiveSubTab('report')} />
              </div>

              {/* Filter Pills */}
              <div className="flex gap-2 items-center flex-wrap">
                <FilterPill label={t('campaigns.all')} count={campaigns.length} active />
                <FilterPill label={t('status.draft')} count={campaigns.filter(c => c.status === 'Bozza').length} />
                <FilterPill label={t('status.scheduled')} count={campaigns.filter(c => c.status === 'Programmata').length} />
                <FilterPill label={t('status.sent')} count={campaigns.filter(c => c.status === 'Inviata').length} />
              </div>

              {/* Operational Data Table */}
              <div className="bg-white border border-border-primary rounded-lg overflow-hidden shadow-sm min-h-[300px] flex flex-col">
                {campaigns.length > 0 ? (
                  <table className="w-full text-left">
                    <thead className="bg-[#FAFAFA] border-b border-border-primary">
                      <tr>
                        <th className="table-header">{t('campaigns.tableHeaders.campaign')}</th>
                        <th className="table-header">{t('campaigns.tableHeaders.schedule')}</th>
                        <th className="table-header">{t('campaigns.tableHeaders.recipients')}</th>
                        <th className="table-header">{t('campaigns.tableHeaders.media')}</th>
                        <th className="table-header">{t('campaigns.tableHeaders.status')}</th>
                        <th className="table-header text-right">{t('leads.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary text-sm font-medium">
                      {campaigns.filter(c => {
                         if (activeSubTab === 'programmati') return c.status === 'Programmata' || c.status === 'Sospesa';
                         if (activeSubTab === 'report') return ['Inviata', 'Simulata', 'Fallita'].includes(c.status);
                         return true;
                      }).map(campaign => (
                         <CampaignTableRow 
                            key={campaign.id} 
                            name={campaign.name} 
                            recipientMode={campaign.recipientMode} 
                            status={campaign.status} 
                            date={new Date(campaign.createdAt).toLocaleDateString()} 
                            uniqueCount={(() => {
                              if (campaign.recipientMode === 'all') return leads.length;
                              if (campaign.recipientMode === 'broadcast') {
                                const selected = broadcastLists.filter(bl => campaign.selectedBroadcastIds?.includes(bl.id));
                                return new Set(selected.flatMap(bl => bl.leadIds)).size;
                              }
                              return campaign.selectedLeadIds?.length || 0;
                            })()} 
                            onDelete={() => setCampaigns(prev => prev.filter(c => c.id !== campaign.id))}
                            schedule={campaign.schedule}
                            getSummary={getScheduleSummary}
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
                      <h3 className="text-lg font-bold text-black">{t('campaigns.noCampaigns')}</h3>
                      <p className="text-sm text-text-secondary max-w-sm">{t('campaigns.noCampaignsDesc')}</p>
                    </div>
                    <button onClick={() => setActiveSubTab('nuova')} className="btn-teal px-6 py-2">
                       {t('campaigns.startNow')}
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
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">{t('dashboard.subtitle')}</p>
                  <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
                </div>
                <div className="flex gap-3">
                  <label className="bg-white border border-border-primary px-4 py-2 rounded-md text-xs font-bold uppercase tracking-tight flex items-center gap-2 hover:bg-gray-50 transition-all cursor-pointer shadow-sm">
                     <FileUp size={14} /> {t('leads.import')}
                     <input type="file" accept=".csv" className="hidden" onChange={handleImportLeads} />
                  </label>
                  <button onClick={() => { setActiveSection('campaigns'); setActiveSubTab('nuova'); }} className="btn-teal px-6 py-2 content-center font-bold text-sm">
                    + {t('campaigns.new')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label={t('dashboard.totalLeads')} value={dashboardStats.totalLeads.toLocaleString()} subValue={t('dashboard.realInDb')} icon={Users} />
                <StatCard label={t('dashboard.activeCampaigns')} value={dashboardStats.activeCampaigns.toString()} subValue={t('dashboard.scheduled')} icon={Send} />
                <StatCard label={t('dashboard.messagesSent')} value={dashboardStats.sentMessages.toLocaleString()} subValue={settings.testMode ? t('dashboard.testMode') : t('dashboard.successRate')} icon={CheckCircle2} />
                <StatCard label={t('dashboard.mediaAssets')} value={dashboardStats.mediaCount.toString()} subValue={t('dashboard.assetsUploaded')} icon={ImageIcon} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-border-primary rounded-lg shadow-sm">
                  <div className="p-4 border-b border-border-primary flex justify-between items-center bg-[#FAFAFA]">
                    <h3 className="font-bold text-sm uppercase tracking-tight">{t('dashboard.recentCampaigns')}</h3>
                    <button onClick={() => setActiveSection('campaigns')} className="text-dr7-teal text-xs font-bold hover:underline">{t('dashboard.viewAll')}</button>
                  </div>
                  <div className="overflow-x-auto min-h-[150px] flex flex-col justify-center">
                    {campaigns.length > 0 ? (
                      <table className="w-full text-left text-xs text-medium">
                        <thead>
                          <tr className="bg-gray-50 border-b border-border-primary">
                            <th className="p-3 font-semibold text-text-secondary uppercase">{t('dashboard.name')}</th>
                            <th className="p-3 font-semibold text-text-secondary uppercase">{t('dashboard.date')}</th>
                            <th className="p-3 font-semibold text-text-secondary uppercase">{t('dashboard.target')}</th>
                            <th className="p-3 font-semibold text-text-secondary uppercase text-right">{t('dashboard.status')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-primary italic">
                          {campaigns.slice(0, 5).map(c => (
                            <RecentScanRow 
                              key={c.id} 
                              name={c.name} 
                              date={new Date(c.createdAt).toLocaleDateString()} 
                              targetLabel={c.recipientMode === 'all' ? t('newCampaign.allLeads') : c.recipientMode === 'broadcast' ? t('newCampaign.broadcast') : t('newCampaign.select')} 
                              status={t(`status.${c.status.toLowerCase()}`)} 
                            />
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-10 space-y-2">
                        <p className="text-sm font-bold text-text-secondary">{t('dashboard.noCampaigns')}</p>
                        <p className="text-xs text-text-muted">{t('campaigns.createFirst')}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-border-primary rounded-lg shadow-sm p-4 space-y-4 text-xs font-bold">
                  <h3 className="font-bold text-sm uppercase tracking-tight border-b border-border-primary pb-3">{t('dashboard.businessApiStatus')}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p>{settings.companyName}</p>
                        <p className="text-[10px] text-text-secondary">{settings.whatsappConnected ? "+971 50 123 4567" : t('dashboard.channelNotConnected')}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-white text-[9px] font-bold rounded uppercase ${settings.whatsappConnected ? 'bg-dr7-green' : 'bg-dr7-red'}`}>
                        {settings.whatsappConnected ? t('status.connected') : t('status.disconnected')}
                      </span>
                    </div>
                    {!settings.whatsappConnected && (
                      <div className="p-3 bg-dr7-teal-soft border border-dr7-teal/20 rounded text-[11px] text-dr7-teal">
                        {t('dashboard.configureProvider')}
                      </div>
                    )}
                    <div className="p-3 bg-gray-50 border border-border-primary rounded text-[10px] text-text-secondary space-y-1">
                      <p className="uppercase">{t('dashboard.providerInfo')}</p>
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
                <h1 className="text-3xl font-bold tracking-tight">{t('leads.title')}</h1>
                <div className="flex gap-3">
                  <label className="bg-white border border-border-primary px-4 py-2 rounded-md text-xs font-bold uppercase tracking-tight flex items-center gap-2 hover:bg-gray-50 transition-all cursor-pointer">
                    <FileUp size={14} /> {t('leads.import')}
                    <input type="file" accept=".csv" className="hidden" onChange={handleImportLeads} />
                  </label>
                  <button onClick={() => setIsLeadModalOpen(true)} className="btn-teal px-6 py-2 content-center font-bold text-sm">
                    + {t('leads.create')}
                  </button>
                </div>
              </div>

              <div className="bg-white border border-border-primary rounded-lg shadow-sm">
                <div className="p-4 border-b border-border-primary flex gap-4 bg-[#FAFAFA]">
                  <div className="flex-1 bg-white border border-border-primary rounded-md px-3 py-1.5 flex items-center gap-2 focus-within:border-dr7-teal transition-colors">
                    <Search size={16} className="text-text-muted" />
                    <input 
                      type="text" 
                      placeholder={t('leads.searchPlaceholder')} 
                      className="bg-transparent border-none focus:ring-0 text-sm w-full" 
                      value={leadsSearchTerm}
                      onChange={(e) => setLeadsSearchTerm(e.target.value)}
                    />
                  </div>
                  <button className="bg-white border border-border-primary px-4 py-2 rounded-md text-xs font-bold uppercase tracking-tight flex items-center gap-2">
                    <Filter size={14} /> Filtri
                  </button>
                </div>
                
                <div className="overflow-x-auto min-h-[300px] flex flex-col">
                  {displayedLeads.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="bg-[#FAFAFA] border-b border-border-primary">
                <tr>
                  <th className="table-header">{t('leads.name')}</th>
                  <th className="table-header">{t('leads.phone')}</th>
                  <th className="table-header">{t('leads.segment')}</th>
                  <th className="table-header">{t('leads.consent')}</th>
                  <th className="table-header">{t('leads.date')}</th>
                  <th className="table-header text-right">{t('leads.actions')}</th>
                </tr>
                      </thead>
                      <tbody className="divide-y divide-border-primary text-sm font-medium">
                        {displayedLeads.map(lead => (
                          <LeadTableRow 
                            key={lead.id} 
                            name={`${lead.firstName} ${lead.lastName}`} 
                            phone={lead.phone} 
                            lists={[lead.list, ...lead.tags]} 
                            status={lead.consent} 
                            date={new Date(lead.createdAt).toLocaleDateString()} 
                            source={lead.source}
                            onDelete={() => setLeads(prev => prev.filter(l => l.id !== lead.id))}
                          />
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 border border-gray-100">
                        {leadsSearchTerm ? <Search size={32} /> : <Users size={32} />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-black">
                          {leadsSearchTerm ? t('leads.noLeads') : 'Nessun lead importato'}
                        </h3>
                        <p className="text-sm text-text-secondary max-w-sm">
                          {leadsSearchTerm ? '' : 'Carica un file CSV per iniziare a costruire il tuo database di contatti per le campagne.'}
                        </p>
                      </div>
                      {!leadsSearchTerm && (
                        <label className="btn-teal px-6 py-2 cursor-pointer">
                          Carica il tuo primo CSV
                          <input type="file" accept=".csv" className="hidden" onChange={handleImportLeads} />
                        </label>
                      )}
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
                    <h3 className="font-bold text-sm uppercase tracking-tight">{t('sidebar.ai')} - Ottimizzatore Copy</h3>
                    <textarea 
                      rows={6} 
                      className="w-full bg-white border border-border-primary rounded-md px-4 py-3 text-sm focus:border-dr7-teal outline-none transition-colors resize-none font-medium" 
                      placeholder={t('newCampaign.messagePlaceholder')}
                    />
                    <div className="flex flex-wrap gap-2">
                       <button className="text-[10px] font-bold px-4 py-2 bg-dr7-teal-soft text-dr7-teal border border-dr7-teal/20 rounded hover:bg-dr7-teal hover:text-white transition-all uppercase">
                          {settings.geminiConnected ? t('newCampaign.aiImprove') : 'Simula Ottimizzazione'}
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

          {activeSection === 'media' && (
            <motion.div key="media" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-end">
                <h1 className="text-3xl font-bold tracking-tight">{t('sidebar.media')}</h1>
                <div className="flex gap-3">
                  <label className="btn-teal px-6 py-2 cursor-pointer flex items-center gap-2">
                    <Plus size={16} /> {t('common.save').toUpperCase()} MEDIA
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
                      <h3 className="text-lg font-bold text-black">{t('dashboard.noCampaigns')}</h3>
                      <p className="text-sm text-text-secondary max-w-sm">{t('campaigns.noCampaignsDesc')}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeSection === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <h1 className="text-3xl font-bold tracking-tight">{t('sidebar.reports')}</h1>
              
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
                      <p className="text-3xl font-black text-dr7-red">{settings.testMode ? t('common.save').toUpperCase() : t('common.none').toUpperCase()}</p>
                   </div>
                </div>
              ) : (
                <div className="bg-white border border-border-primary rounded-lg p-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 border border-gray-100 mx-auto">
                      <History size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-black">{t('dashboard.noCampaigns')}</h3>
                      <p className="text-sm text-text-secondary max-w-sm mx-auto">{t('campaigns.noCampaignsDesc')}</p>
                    </div>
                </div>
              )}
            </motion.div>
          )}

          {activeSection === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
               <h1 className="text-3xl font-bold tracking-tight">{t('sidebar.calendar')}</h1>
               <div className="bg-white border border-border-primary rounded-lg p-20 text-center space-y-4 shadow-sm">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 border border-gray-100 mx-auto">
                      <Calendar size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-black">{t('dashboard.noCampaigns')}</h3>
                      <p className="text-sm text-text-secondary max-w-sm mx-auto">{t('campaigns.noCampaignsDesc')}</p>
                    </div>
                    <button onClick={() => { setActiveSection('campaigns'); setActiveSubTab('nuova'); }} className="btn-teal px-6 py-2">
                       {t('campaigns.new')}
                    </button>
                </div>
            </motion.div>
          )}
          {activeSection === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">{t('settings.platformConfig')}</p>
                  <h1 className="text-3xl font-bold tracking-tight">{t('sidebar.settings')}</h1>
                </div>
                <button 
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="bg-dr7-red text-white px-4 py-2 rounded-md text-xs font-bold uppercase tracking-tight flex items-center gap-2 hover:bg-red-600 transition-all"
                >
                  <Trash2 size={14} /> {t('settings.resetData')}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-6">
                    <h3 className="font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                       <Settings size={16} className="text-dr7-teal" /> {t('settings.companyProfile')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-2">{t('settings.companyName')}</label>
                        <input 
                          type="text" 
                          className="w-full bg-white border border-border-primary rounded px-3 py-2 text-sm focus:border-dr7-teal focus:ring-0 outline-none" 
                          value={settings.companyName}
                          onChange={e => setSettings((prev: any) => ({ ...prev, companyName: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-2">{t('settings.adminEmail')}</label>
                        <input type="email" placeholder="admin@dr7.app" className="w-full bg-white border border-border-primary rounded px-3 py-2 text-sm opacity-50 cursor-not-allowed" disabled />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-6">
                    <h3 className="font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                       <MessageSquare size={16} className="text-[#25D366]" /> {t('settings.whatsappConnection')}
                    </h3>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-border-primary">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${settings.whatsappConnected ? 'bg-dr7-green ring-4 ring-dr7-green/10' : 'bg-gray-300'}`}>
                             <CheckCircle2 size={24} />
                          </div>
                          <div>
                             <p className="font-bold text-sm">Official WhatsApp Business API</p>
                             <p className="text-xs text-text-secondary">{settings.whatsappConnected ? t('settings.activeConnection') : t('settings.noProvider')}</p>
                          </div>
                       </div>
                       <button 
                        onClick={() => setSettings((prev: any) => ({ ...prev, whatsappConnected: !prev.whatsappConnected }))}
                        className={`px-4 py-2 rounded font-bold text-[10px] uppercase tracking-wide transition-all ${
                          settings.whatsappConnected ? 'bg-dr7-red text-white hover:bg-red-600' : 'btn-teal'
                        }`}
                       >
                          {settings.whatsappConnected ? t('settings.disconnect') : t('settings.connectNow')}
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
                           <p className="text-[10px] font-bold text-text-secondary uppercase">{t('settings.lastSync')}</p>
                           <p className="text-xs">{t('settings.today')}, 09:45</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                       <Sparkles size={16} className="text-dr7-teal" /> {t('settings.aiConfig')}
                    </h3>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center text-xs">
                          <span className="font-bold">Gemini 1.5 Flash</span>
                          <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${settings.geminiConnected ? 'bg-dr7-green text-white' : 'bg-gray-100 text-text-secondary'}`}>
                             {settings.geminiConnected ? 'CONNECTED' : 'NOT CONFIGURED'}
                          </span>
                       </div>
                       <p className="text-[11px] text-text-secondary leading-relaxed italic">
                          {t('settings.geminiDesc')}
                       </p>
                    </div>
                  </div>

                  <div className="bg-white border border-border-primary rounded-lg shadow-sm p-6 space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-tight">{t('settings.systemPolicy')}</h3>
                    <div className="space-y-3">
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded text-dr7-teal focus:ring-dr7-teal" 
                            checked={settings.testMode}
                            onChange={() => setSettings((prev: any) => ({ ...prev, testMode: !prev.testMode }))}
                          />
                          <span className="text-xs font-bold text-text-secondary group-hover:text-black transition-colors">{t('dashboard.testMode')}</span>
                       </label>
                       <p className="text-[10px] text-text-muted italic pl-7">
                          {t('settings.testModeDesc')}
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- Import Lead Modal --- */}
      <AnimatePresence>
        {isImportModalOpen && importStats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsImportModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-border-primary flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="font-bold text-lg uppercase tracking-tight">{t('csvImport.title')}</h3>
                  <p className="text-[10px] text-text-secondary uppercase">{t('csvImport.preview')}</p>
                </div>
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-1 hover:bg-gray-200 rounded-full text-text-secondary transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3 bg-gray-50 border border-border-primary rounded-lg text-center">
                    <p className="text-[10px] font-bold text-text-secondary uppercase mb-1">{t('csvImport.total')}</p>
                    <p className="text-xl font-black">{importStats.totalRows}</p>
                  </div>
                  <div className="p-3 bg-dr7-teal-soft border border-dr7-teal/20 rounded-lg text-center">
                    <p className="text-[10px] font-bold text-dr7-teal uppercase mb-1">{t('csvImport.valid')}</p>
                    <p className="text-xl font-black text-dr7-teal">{importStats.validUnique}</p>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                    <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">{t('csvImport.fileDupes')}</p>
                    <p className="text-xl font-black text-amber-700">{importStats.duplicatesInFile}</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                    <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">{t('csvImport.dbDupes')}</p>
                    <p className="text-xl font-black text-blue-700">{importStats.alreadyExisting}</p>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                    <p className="text-[10px] font-bold text-dr7-red uppercase mb-1">{t('csvImport.invalid')}</p>
                    <p className="text-xl font-black text-dr7-red">{importStats.invalidRows}</p>
                  </div>
                </div>

                {/* Tabs for Preview / Skipped */}
                <div className="space-y-4">
                  <div className="flex gap-4 border-b border-border-primary">
                    <button 
                      onClick={() => setImportModalTab('valid')}
                      className={`pb-2 text-xs font-bold uppercase tracking-widest transition-all ${
                        importModalTab === 'valid' ? 'text-dr7-teal border-b-2 border-dr7-teal' : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {t('csvImport.leadsToImport')} ({leadsToImport.length})
                    </button>
                    <button 
                      onClick={() => setImportModalTab('skipped')}
                      className={`pb-2 text-xs font-bold uppercase tracking-widest transition-all ${
                        importModalTab === 'skipped' ? 'text-dr7-teal border-b-2 border-dr7-teal' : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {t('csvImport.excludedRows')} ({skippedRows.length})
                    </button>
                  </div>

                  <div className="bg-white border border-border-primary rounded-lg overflow-hidden">
                    {importModalTab === 'valid' ? (
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr>
                              <th className="p-3 font-bold uppercase text-text-secondary">{t('leads.name')}</th>
                              <th className="p-3 font-bold uppercase text-text-secondary">{t('leads.last_name')}</th>
                              <th className="p-3 font-bold uppercase text-text-secondary">{t('csvImport.originalPhone')}</th>
                              <th className="p-3 font-bold uppercase text-text-secondary">{t('csvImport.normalizedPhone')}</th>
                              <th className="p-3 font-bold uppercase text-text-secondary">{t('leads.segment')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-primary">
                            {leadsToImport.map((l, idx) => (
                              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="p-3 font-bold">{l.firstName}</td>
                                <td className="p-3 font-bold">{l.lastName || '-'}</td>
                                <td className="p-3 font-mono text-text-secondary">{l.phone}</td>
                                <td className="p-3 font-mono text-dr7-teal font-bold">{l.phoneNormalized}</td>
                                <td className="p-3">
                                  <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase text-text-secondary">{l.list}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {leadsToImport.length === 0 && (
                          <div className="py-10 text-center text-text-secondary italic text-sm">
                            Nessun lead valido da importare trovato nel file.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-[#FFF1F2] border-b border-red-100 sticky top-0 z-10">
                            <tr>
                              <th className="p-3 font-bold uppercase text-dr7-red">Motivo Esclusione</th>
                              <th className="p-3 font-bold uppercase text-text-secondary">Contenuto Riga Originale</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-primary">
                            {skippedRows.map((s, idx) => (
                              <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                                <td className="p-3">
                                  <span className="text-dr7-red font-bold flex items-center gap-2">
                                    <AlertTriangle size={12} /> {s.reason}
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-[10px] text-text-muted break-all">
                                  {JSON.stringify(s.row)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

               <div className="p-6 bg-gray-50 border-t border-border-primary flex justify-between items-center">
                <div className="text-xs text-text-secondary font-medium italic">
                  {t('csvImport.footerSummary').replace('{count}', leadsToImport.length.toString())}
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsImportModalOpen(false)}
                    className="bg-white border border-border-primary px-6 py-2 rounded-md font-bold text-xs uppercase tracking-tight hover:bg-gray-100 transition-all shadow-sm"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    onClick={handleConfirmImport}
                    disabled={leadsToImport.length === 0}
                    className="btn-teal px-8 py-2 rounded-md font-bold text-xs uppercase tracking-tight shadow-md disabled:opacity-50 transition-all"
                  >
                    {t('csvImport.confirm')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBroadcastListModalOpen && (
          <BroadcastListModal 
            onClose={() => {
              setIsBroadcastListModalOpen(false);
              setEditingBroadcastList(null);
            }}
            onSave={handleCreateBroadcastList}
            leads={leads}
            initialData={editingBroadcastList}
            t={t}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChooseBroadcastModalOpen && (
          <ChooseBroadcastModal 
            onClose={() => setIsChooseBroadcastModalOpen(false)}
            broadcastLists={broadcastLists}
            selectedIds={newCampaign.selectedBroadcastIds || []}
            onConfirm={(ids) => setNewCampaign(prev => ({ ...prev, selectedBroadcastIds: ids }))}
            t={t}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSelectLeadsModalOpen && (
          <SelectLeadsModal 
            onClose={() => setIsSelectLeadsModalOpen(false)}
            leads={leads}
            selectedIds={newCampaign.selectedLeadIds || []}
            onConfirm={(ids: string[]) => setNewCampaign(prev => ({ ...prev, selectedLeadIds: ids }))}
            onSaveAsBroadcast={(ids: string[]) => {
              const name = prompt(t('broadcast.enterName'));
              if (name) {
                handleCreateBroadcastList(name, t('broadcast.manualSelection'), ids);
                setNewCampaign(prev => ({ ...prev, recipientMode: 'broadcast', selectedBroadcastIds: [broadcastLists[0]?.id || `bl-${Date.now()}`], selectedLeadIds: [] }));
              }
            }}
            t={t}
          />
        )}
      </AnimatePresence>

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
                <h3 className="font-bold text-lg uppercase tracking-tight">{t('leads.create')}</h3>
                <button 
                  onClick={() => setIsLeadModalOpen(false)}
                  className="p-1 hover:bg-gray-200 rounded-full text-text-secondary transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('leads.name')} *</label>
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
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('leads.last_name')}</label>
                  <input 
                    type="text" 
                    placeholder="Es. Rossi"
                    className="w-full bg-white border border-border-primary rounded-md px-4 py-2.5 text-sm focus:border-dr7-teal outline-none transition-colors"
                    value={newLeadForm.lastName}
                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('leads.phone')} *</label>
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
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={handleCreateLead}
                  className="flex-1 btn-teal px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-tight shadow-md"
                >
                  {t('common.save')}
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

// --- Modals for Recipients & Broadcast Lists ---

function BroadcastListModal({ onClose, onSave, leads, initialData, t }: any) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>(initialData?.leadIds || []);
  const [searchTerm, setSearchTerm] = useState('');

  const displayedLeads = React.useMemo(() => {
    const filtered = filterLeads(leads, searchTerm);
    return sortLeadsAlphabetically(filtered);
  }, [leads, searchTerm]);

  const toggleLead = (id: string) => {
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border-primary flex justify-between items-center bg-gray-50 shrink-0">
          <h3 className="font-bold text-lg uppercase tracking-tight">{initialData ? t('broadcast.editList') : t('broadcast.create')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('broadcast.listName')} *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Es. Clienti Supercar" className="w-full bg-white border border-border-primary rounded-md px-4 py-2.5 text-sm outline-none focus:border-dr7-teal" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('broadcast.description')}</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Es. Clienti che hanno noleggiato Ferrari" className="w-full bg-white border border-border-primary rounded-md px-4 py-2.5 text-sm outline-none focus:border-dr7-teal" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-widest">{t('newCampaign.selectLeads')} ({selectedLeadIds.length})</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input type="text" placeholder={t('leads.searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-1.5 bg-gray-100 border border-border-primary rounded-md text-xs w-48 focus:bg-white focus:border-dr7-teal outline-none transition-all" />
              </div>
            </div>

            <div className="border border-border-primary rounded-lg overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-border-primary sticky top-0">
                    <tr>
                      <th className="p-2 w-10 text-center"><input type="checkbox" checked={displayedLeads.length > 0 && displayedLeads.every((l: Lead) => selectedLeadIds.includes(l.id))} onChange={(e) => {
                        if (e.target.checked) setSelectedLeadIds(prev => [...new Set([...prev, ...displayedLeads.map((l: Lead) => l.id)])]);
                        else setSelectedLeadIds(prev => prev.filter(id => !displayedLeads.map((l: Lead) => l.id).includes(id)));
                      }} /></th>
                      <th className="p-2 font-bold uppercase text-text-secondary">{t('leads.name')}</th>
                      <th className="p-2 font-bold uppercase text-text-secondary">{t('leads.phone')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-primary">
                    {displayedLeads.map((l: Lead) => (
                      <tr key={l.id} className={`hover:bg-gray-50 transition-colors ${selectedLeadIds.includes(l.id) ? 'bg-dr7-teal-soft/20' : ''}`} onClick={() => toggleLead(l.id)}>
                        <td className="p-2 w-10 text-center"><input type="checkbox" checked={selectedLeadIds.includes(l.id)} readOnly className="rounded border-gray-300 text-dr7-teal focus:ring-dr7-teal" /></td>
                        <td className="p-2 font-bold">{l.firstName} {l.lastName}</td>
                        <td className="p-2 font-mono text-text-secondary">{l.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-border-primary flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 bg-white border border-border-primary px-4 py-2.5 rounded-md text-xs font-bold uppercase hover:bg-gray-100">{t('common.cancel')}</button>
          <button onClick={() => name && onSave(name, description, selectedLeadIds)} className="flex-1 btn-teal px-4 py-2.5 rounded-md text-xs font-bold uppercase shadow-md disabled:opacity-50" disabled={!name}>{t('common.save')}</button>
        </div>
      </motion.div>
    </div>
  );
}

function ChooseBroadcastModal({ onClose, broadcastLists, selectedIds, onConfirm, t }: any) {
  const [currentSelection, setCurrentSelection] = useState<string[]>(selectedIds);

  const toggleList = (id: string) => {
    setCurrentSelection(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-border-primary flex justify-between items-center bg-gray-50 shrink-0">
          <h3 className="font-bold text-lg uppercase tracking-tight">{t('newCampaign.chooseBroadcast')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {broadcastLists.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <Share2 size={32} className="mx-auto text-text-muted" />
              <p className="text-sm text-text-secondary">{t('broadcast.noLists')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {broadcastLists.map((list: BroadcastList) => (
                <div key={list.id} className={`p-4 border rounded-lg cursor-pointer transition-all ${currentSelection.includes(list.id) ? 'border-dr7-teal bg-dr7-teal-soft/20 shadow-sm' : 'border-border-primary hover:border-dr7-teal/50'}`} onClick={() => toggleList(list.id)}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${currentSelection.includes(list.id) ? 'bg-dr7-teal border-dr7-teal text-white' : 'bg-white border-gray-300'}`}>
                        {currentSelection.includes(list.id) && <CheckCircle2 size={12} />}
                      </div>
                      <div>
                        <p className="font-bold text-sm uppercase tracking-tight">{list.name}</p>
                        <p className="text-[10px] text-text-secondary">{list.leadIds.length} {t('broadcast.leadCount')}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-text-muted font-mono">{new Date(list.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-border-primary flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 bg-white border border-border-primary px-4 py-2.5 rounded-md text-xs font-bold uppercase hover:bg-gray-100">{t('common.cancel')}</button>
          <button onClick={() => { onConfirm(currentSelection); onClose(); }} className="flex-1 btn-teal px-4 py-2.5 rounded-md text-xs font-bold uppercase shadow-md">{t('common.confirm')}</button>
        </div>
      </motion.div>
    </div>
  );
}

function SelectLeadsModal({ onClose, leads, selectedIds, onConfirm, onSaveAsBroadcast, t }: any) {
  const [currentSelection, setCurrentSelection] = useState<string[]>(selectedIds);
  const [searchTerm, setSearchTerm] = useState('');

  const displayedLeads = React.useMemo(() => {
    const filtered = filterLeads(leads, searchTerm);
    return sortLeadsAlphabetically(filtered);
  }, [leads, searchTerm]);

  const toggleLead = (id: string) => {
    setCurrentSelection(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border-primary flex justify-between items-center bg-gray-50 shrink-0">
          <h3 className="font-bold text-lg uppercase tracking-tight">{t('newCampaign.selectLeads')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="p-4 bg-white border-b border-border-primary flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-dr7-teal uppercase tracking-widest bg-dr7-teal-soft/30 px-3 py-1.5 rounded-full">{t('common.selected')}: {currentSelection.length}</span>
            <button onClick={() => setCurrentSelection([])} className="text-[10px] font-bold text-text-secondary uppercase hover:text-dr7-red underline">{t('common.clearAll')}</button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input type="text" placeholder={t('leads.searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 bg-gray-100 border border-border-primary rounded-md text-xs w-64 focus:bg-white focus:border-dr7-teal outline-none transition-all" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-border-primary sticky top-0 z-10">
              <tr>
                <th className="p-3 w-12 text-center">
                  <input type="checkbox" checked={displayedLeads.length > 0 && displayedLeads.every((l: Lead) => currentSelection.includes(l.id))} onChange={(e) => {
                    if (e.target.checked) setCurrentSelection(prev => [...new Set([...prev, ...displayedLeads.map((l: Lead) => l.id)])]);
                    else setCurrentSelection(prev => prev.filter(id => !displayedLeads.map((l: Lead) => l.id).includes(id)));
                  }} className="rounded border-gray-300 text-dr7-teal focus:ring-dr7-teal" />
                </th>
                <th className="p-3 font-bold uppercase text-text-secondary">{t('leads.name')}</th>
                <th className="p-3 font-bold uppercase text-text-secondary">{t('leads.phone')}</th>
                <th className="p-3 font-bold uppercase text-text-secondary text-right">{t('leads.segment')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary">
              {displayedLeads.map((l: Lead) => (
                <tr key={l.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${currentSelection.includes(l.id) ? 'bg-dr7-teal-soft/20' : ''}`} onClick={() => toggleLead(l.id)}>
                  <td className="p-3 w-12 text-center"><input type="checkbox" checked={currentSelection.includes(l.id)} readOnly className="rounded border-gray-300 text-dr7-teal focus:ring-dr7-teal" /></td>
                  <td className="p-3 font-bold">{l.firstName} {l.lastName}</td>
                  <td className="p-3 font-mono text-text-secondary">{l.phone}</td>
                  <td className="p-3 text-right"><span className="px-2 py-0.5 bg-gray-100 border border-border-primary rounded text-[9px] font-bold text-text-secondary uppercase">{l.list}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {displayedLeads.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <Search size={32} className="mx-auto text-text-muted opacity-30" />
              <p className="text-sm text-text-secondary italic">{t('leads.noLeads')}</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-border-primary flex flex-col md:flex-row gap-3 shrink-0">
          <button onClick={() => { onSaveAsBroadcast(currentSelection); onClose(); }} className="flex-1 bg-white border border-border-primary px-4 py-2.5 rounded-md text-xs font-bold uppercase hover:text-dr7-teal transition-all shadow-sm" disabled={currentSelection.length === 0}>{t('broadcast.saveAsList')}</button>
          <div className="flex gap-3 flex-1">
            <button onClick={onClose} className="flex-1 bg-white border border-border-primary px-4 py-2.5 rounded-md text-xs font-bold uppercase hover:bg-gray-100 shadow-sm">{t('common.cancel')}</button>
            <button onClick={() => { onConfirm(currentSelection); onClose(); }} className="flex-1 btn-teal px-4 py-2.5 rounded-md text-xs font-bold uppercase shadow-md" disabled={currentSelection.length === 0}>{t('common.confirm')} ({currentSelection.length})</button>
          </div>
        </div>
      </motion.div>
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

function RecentScanRow({ name, date, targetLabel, status }: any) {
  return (
    <tr className="hover:bg-gray-50 transition-all font-medium">
      <td className="p-3 font-bold text-black">{name}</td>
      <td className="p-3 text-text-secondary">{date}</td>
      <td className="p-3 text-text-secondary italic">{targetLabel}</td>
      <td className="p-3 text-right"><span className="px-2 py-0.5 bg-dr7-green text-white text-[9px] font-bold rounded uppercase">{status}</span></td>
    </tr>
  );
}

function LeadTableRow({ name, phone, lists, status, date, source, onDelete }: any) {
  return (
    <tr className="hover:bg-[#FAFAFA] transition-colors group">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-text-secondary border border-border-primary">{name.split(' ').map((n: string) => n[0]).join('')}</div>
          <div className="flex flex-col">
            <span className="font-bold text-black text-sm">{name}</span>
            <span className="text-[9px] text-text-muted uppercase font-bold tracking-tighter">{source || 'Manuale'}</span>
          </div>
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

function CampaignTableRow({ name, recipientMode, status, date, uniqueCount, onDelete, schedule, getSummary }: any) {
  return (
    <tr className="hover:bg-[#FAFAFA] transition-colors group border-b border-border-primary last:border-0">
      <td className="p-4 align-top">
        <div className="space-y-1">
          <p className="font-bold text-black text-sm">{name}</p>
          <div className="flex gap-2">
            <span className="text-[9px] font-bold text-text-secondary bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
              Target: {recipientMode === 'all' ? 'Tutti i lead' : recipientMode === 'broadcast' ? 'Broadcast' : 'Manuale'}
            </span>
            <span className="text-[9px] font-bold text-text-muted italic">Creato: {date}</span>
          </div>
          {schedule && (
             <div className="mt-2 p-2 bg-gray-50 border border-border-primary rounded flex items-start gap-2 max-w-sm">
                <Calendar size={12} className="text-dr7-teal mt-0.5 shrink-0" />
                <p className="text-[10px] text-text-secondary leading-tight italic">
                   {getSummary(schedule)}
                </p>
             </div>
          )}
        </div>
      </td>
      <td className="p-4 text-text-secondary text-xs align-top font-mono">
         {schedule?.type === 'single' ? schedule.singleDate : `Ogni ${schedule?.recurrenceUnit === 'day' ? 'giorno' : schedule?.recurrenceUnit === 'week' ? 'settimana' : 'mese'}`}
      </td>
      <td className="p-4 text-xs font-semibold align-top">{uniqueCount > 0 ? uniqueCount.toLocaleString() : '0'}</td>
      <td className="p-4 align-top">
         <span className="flex items-center gap-2 text-xs font-medium text-text-secondary">
           <ImageIcon size={14} className="text-dr7-teal" /> Media
         </span>
         {schedule && schedule.conditions && schedule.conditions.length > 0 && (
            <div className="mt-2 flex flex-col gap-1">
               {schedule.conditions.map((c: any) => (
                  <span key={c.id} className="text-[9px] font-bold text-dr7-teal lowercase bg-dr7-teal/5 border border-dr7-teal/10 px-1.5 py-0.5 rounded shrink-0 w-fit">
                     automation: {c.type}
                  </span>
               ))}
            </div>
         )}
      </td>
      <td className="p-4 align-top">
        <div className="flex flex-col gap-2">
          <span className={`inline-block px-2.5 py-0.5 text-white text-[9px] font-bold rounded-full uppercase text-center ${
            status === 'Inviata' ? 'bg-[#059669]' : 
            status === 'Programmata' ? 'bg-[#2563EB]' : 
            status === 'Simulata' ? 'bg-amber-500' :
            status === 'Sospesa' ? 'bg-dr7-red' :
            'bg-gray-500'
          }`}>{status}</span>
          
          {schedule && (
            <div className={`text-[9px] font-black uppercase text-center px-1 py-0.5 rounded border ${schedule.isActive ? 'border-dr7-green text-dr7-green' : 'border-gray-200 text-text-muted'}`}>
               {schedule.isActive ? 'ACTIVE' : 'PAUSED'}
            </div>
          )}
        </div>
      </td>
      <td className="p-4 text-right align-top">
        <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
           <button className="p-2 bg-white border border-border-primary hover:text-dr7-teal rounded shadow-sm transition-all" title="Edit">
              <Settings size={14} />
           </button>
           <button className="p-2 bg-white border border-border-primary hover:text-dr7-red rounded shadow-sm transition-all" onClick={onDelete} title="Delete">
              <Trash2 size={14} />
           </button>
        </div>
      </td>
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


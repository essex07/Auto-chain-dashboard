import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Send, MessageSquareWarning, 
  AlertTriangle, List, MapPin, Bell, ChevronLeft, ChevronRight, Info, CheckCircle
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { Overview, ReadyToPost, NegativeFeedback, ManagerAlerts, Archive } from './components/Pages';

const App = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(localStorage.getItem('selectedBranchId') || 'all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'info' });

  useEffect(() => {
    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public' }, (payload) => {
        setToast({ show: true, msg: `New activity in ${payload.table}`, type: 'success' });
        setRefreshTrigger(prev => prev + 1);
        setTimeout(() => setToast({ show: false, msg: '' }), 4000);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const navItems = [
    { id: 'Overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'Ready to Post', icon: Send, label: 'Ready to Post' },
    { id: 'Negative Feedback', icon: MessageSquareWarning, label: 'Negative Feedback' },
    { id: 'Alerts', icon: AlertTriangle, label: 'Alerts' },
    { id: 'Archive', icon: List, label: 'Archive' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <aside className={`bg-[#0F172A] text-slate-400 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-72'} flex flex-col z-20`}>
        <div className="h-20 flex items-center px-6 gap-3 text-white font-black text-xl border-b border-slate-800/50 uppercase tracking-tighter">
          <div className="w-8 h-8 bg-[#4A90D9] rounded-lg flex-shrink-0 flex items-center justify-center">
            <Bell size={16} className="text-white" />
          </div>
          {!isCollapsed && <span>AutoChain AI</span>}
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          {navItems.map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group ${
                activeTab === item.id ? 'bg-[#4A90D9] text-white shadow-lg shadow-blue-500/20' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />
              {!isCollapsed && <span className="text-sm font-bold tracking-wide">{item.label}</span>}
            </button>
          ))}
        </nav>

        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-6 border-t border-slate-800 flex justify-center hover:text-white transition-colors">
          {isCollapsed ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}
        </button>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <h1 className="text-xl font-black text-slate-800 tracking-tight">{activeTab}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full border border-slate-200">
              <MapPin size={14} className="text-[#4A90D9]" />
              <select 
                value={selectedBranch}
                onChange={(e) => { setSelectedBranch(e.target.value); localStorage.setItem('selectedBranchId', e.target.value); }}
                className="bg-transparent text-[10px] font-black outline-none cursor-pointer uppercase text-slate-600"
              >
                <option value="all">All Locations</option>
              </select>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'Overview' && <Overview selectedBranch={selectedBranch} refreshTrigger={refreshTrigger} />}
              {activeTab === 'Ready to Post' && <ReadyToPost selectedBranch={selectedBranch} refreshTrigger={refreshTrigger} />}
              {activeTab === 'Negative Feedback' && <NegativeFeedback selectedBranch={selectedBranch} refreshTrigger={refreshTrigger} />}
              {activeTab === 'Alerts' && <ManagerAlerts selectedBranch={selectedBranch} refreshTrigger={refreshTrigger} />}
              {activeTab === 'Archive' && <Archive selectedBranch={selectedBranch} refreshTrigger={refreshTrigger} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right-10">
          <div className="bg-[#0F172A] text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              {/* Info icon is now used here! */}
              <Info size={18} className="text-[#4A90D9]" />
            </div>
            <div>
              <p className="text-xs font-bold">{toast.msg}</p>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                <CheckCircle size={10} /> System Sync
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
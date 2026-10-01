import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Star, MessageSquare, MessageSquareWarning, Send, 
  AlertTriangle, ChevronRight, Copy, Check, CheckCircle2, 
  ExternalLink, User, MapPin, Calendar, ArrowUpDown, Filter, Sparkles,
  History, Bell, AlertOctagon, ChevronUp, ChevronDown, BellRing
} from 'lucide-react';

// --- SHARED HELPER COMPONENTS ---
const StarRating = ({ rating }) => (
  <div className="flex text-yellow-400 gap-0.5">
    {[...Array(5)].map((_, i) => (
      <Star key={i} size={14} fill={i < rating ? "currentColor" : "none"} className={i >= rating ? "text-slate-200" : ""} />
    ))}
  </div>
);

const StatusBadge = ({ status }) => {
  const colors = {
    ready_to_post: 'bg-green-100 text-green-700 border-green-200',
    escalated: 'bg-red-100 text-red-700 border-red-200',
    needs_human_review: 'bg-amber-100 text-amber-700 border-amber-200',
    pending: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap uppercase ${colors[status] || 'bg-slate-50 text-slate-400'}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

// --- 1. OVERVIEW PAGE ---
export const Overview = ({ selectedBranch, refreshTrigger }) => {
  const [stats, setStats] = useState({ total: 0, positive: 0, negative: 0, ready: 0, alerts: 0, escalated: 0 });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      const applyF = (q) => selectedBranch !== 'all' ? q.eq('branch_id', selectedBranch) : q;
      const [t, p, n, e, r, a] = await Promise.all([
        applyF(supabase.from('feedback').select('*', { count: 'exact', head: true })),
        applyF(supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('sentiment_label', 'positive')),
        applyF(supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('sentiment_label', 'negative')),
        applyF(supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('routing_status', 'escalated')),
        applyF(supabase.from('review_queue').select('*', { count: 'exact', head: true }).eq('posted_to_public', false)),
        applyF(supabase.from('manager_alerts').select('*', { count: 'exact', head: true }).eq('actioned', false))
      ]);
      setStats({ 
        total: t.count || 0, positive: p.count || 0, negative: n.count || 0, 
        escalated: e.count || 0, ready: r.count || 0, alerts: a.count || 0 
      });

      const { data } = await applyF(supabase.from('feedback').select('*, branches(name)').order('created_at', { ascending: false }).limit(10));
      setRecent(data || []);
    };
    fetchStats();
  }, [selectedBranch, refreshTrigger]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatItem title="Total Feedback" value={stats.total} icon={<MessageSquare />} bg="bg-blue-50" text="text-primary" />
        <StatItem title="Positive" value={stats.positive} icon={<Star fill="currentColor"/>} bg="bg-green-50" text="text-success" />
        <StatItem title="Negative" value={stats.negative} icon={<MessageSquareWarning />} bg="bg-red-50" text="text-danger" />
        <StatItem title="Ready to Post" value={stats.ready} icon={<Send />} bg="bg-blue-50" text="text-primary" />
        <StatItem title="Open Alerts" value={stats.alerts} icon={<AlertTriangle />} bg="bg-purple-50" text="text-info" />
        <StatItem title="Escalated" value={stats.escalated} icon={<ChevronRight />} bg="bg-orange-50" text="text-warning" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 font-bold text-lg flex items-center gap-2">
          <History size={20} className="text-slate-400" /> Recent Activity
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4 text-center">Rating</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recent.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-500 flex items-center gap-2 font-medium">
                  <Calendar size={14} className="text-slate-400"/> {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-800 flex items-center gap-2">
                  <User size={14} className="text-slate-400"/> {r.customer_name}
                </td>
                <td className="px-6 py-4 flex justify-center mt-3"><StarRating rating={r.rating} /></td>
                <td className="px-6 py-4"><StatusBadge status={r.routing_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatItem = ({ title, value, icon, bg, text }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start">
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-3xl font-black text-slate-900">{value}</p>
    </div>
    <div className={`p-3 rounded-xl ${bg} ${text}`}>{icon}</div>
  </div>
);

// --- 2. READY TO POST PAGE ---
export const ReadyToPost = ({ selectedBranch, refreshTrigger }) => {
  const [reviews, setReviews] = useState([]);
  const [copyId, setCopyId] = useState(null);

  useEffect(() => {
    const fetchR = async () => {
      let q = supabase.from('review_queue').select('*').eq('posted_to_public', false);
      if (selectedBranch !== 'all') q = q.eq('branch_id', selectedBranch);
      const { data } = await q;
      setReviews(data || []);
    };
    fetchR();
  }, [selectedBranch, refreshTrigger]);

  const handleMark = async (id, platform) => {
    await supabase.from('review_queue').update({ posted_to_public: true, public_platform: platform, posted_at: new Date() }).eq('id', id);
    setReviews(reviews.filter(r => r.id !== id));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reviews.length === 0 ? <div className="col-span-full py-20 text-center text-slate-400 font-bold">No reviews ready to post.</div> : reviews.map(r => (
        <div key={r.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 uppercase">{r.customer_name?.charAt(0)}</div>
              <div>
                <p className="text-sm font-bold">{r.customer_name}</p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 uppercase font-bold tracking-tight"><MapPin size={10}/> {r.branch_name}</p>
              </div>
            </div>
          </div>
          <p className="text-slate-600 italic text-sm leading-relaxed flex-1">"{r.review_text}"</p>
          <div className="flex gap-2 pt-6">
            <button onClick={() => { navigator.clipboard.writeText(r.review_text); setCopyId(r.id); setTimeout(() => setCopyId(null), 2000); }} 
              className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${copyId === r.id ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
              {copyId === r.id ? <Check size={14}/> : <Copy size={14}/>} {copyId === r.id ? 'Copied' : 'Copy'}
            </button>
            <button onClick={() => handleMark(r.id, 'Google')} className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-600 shadow-lg shadow-blue-200">
              <ExternalLink size={14}/> Mark Posted
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- 3. NEGATIVE FEEDBACK PAGE ---
export const NegativeFeedback = ({ selectedBranch, refreshTrigger }) => {
  const [items, setItems] = useState([]);
  const [copyId, setCopyId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchN = async () => {
      let q = supabase.from('negative_queue').select('*').eq('draft_sent', false).order('severity_score', { ascending: false });
      if (selectedBranch !== 'all') q = q.eq('branch_id', selectedBranch);
      const { data } = await q;
      setItems(data || []);
    };
    fetchN();
  }, [selectedBranch, refreshTrigger]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6 text-slate-800">
        <AlertOctagon className="text-danger" size={28} />
        <h1 className="text-2xl font-black tracking-tight">Negative Queue</h1>
      </div>
      {items.map(item => (
        <div key={item.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm border-l-4 border-l-danger">
          <div className="p-6 cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-red-50 text-danger rounded-lg"><MessageSquareWarning size={20}/></div>
                   <div>
                      <h3 className="font-bold text-slate-800 flex items-center gap-2"><User size={14} className="text-slate-400"/> {item.customer_name}</h3>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{item.branch_name}</p>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                  {expandedId === item.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                </div>
             </div>
             {expandedId === item.id && (
               <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Complaint Text</label>
                    <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600 italic">"{item.response_text}"</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-primary uppercase flex items-center gap-2"><Sparkles size={12}/> AI Recovery Draft</label>
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-900 leading-relaxed">{item.draft_response}</div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(item.draft_response); setCopyId(item.id); setTimeout(()=>setCopyId(null), 2000)}} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${copyId === item.id ? 'bg-green-600 text-white border-green-600':'bg-white border-slate-200'}`}>
                          {copyId === item.id ? <Check size={14}/> : <Copy size={14}/>} {copyId === item.id ? 'Copied' : 'Copy Draft'}
                        </button>
                    </div>
                  </div>
               </div>
             )}
          </div>
        </div>
      ))}
    </div>
  );
};

// --- 4. ALERTS PAGE ---
export const ManagerAlerts = ({ selectedBranch, refreshTrigger }) => {
  const [alerts, setAlerts] = useState([]);
  const [notes, setNotes] = useState({});

  useEffect(() => {
    const fetchA = async () => {
      let q = supabase.from('manager_alerts').select('*, feedback(response_text)').eq('actioned', false).order('created_at', { ascending: false });
      if (selectedBranch !== 'all') q = q.eq('branch_id', selectedBranch);
      const { data } = await q;
      setAlerts(data || []);
    };
    fetchA();
  }, [selectedBranch, refreshTrigger]);

  const handleAction = async (id) => {
    await supabase.from('manager_alerts').update({ actioned: true, actioned_at: new Date(), notes: notes[id] }).eq('id', id);
    setAlerts(alerts.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
         <Bell className="text-primary" size={28} />
         <h1 className="text-2xl font-black text-slate-800 tracking-tight tracking-tight">Active Alerts</h1>
      </div>
      {alerts.map(a => (
        <div key={a.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-danger p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-red-50 text-danger rounded-xl flex items-center justify-center"><BellRing size={24}/></div>
              <div>
                <h3 className="font-bold text-slate-800">{a.customer_name}</h3>
                <p className="text-[10px] text-danger font-black uppercase tracking-widest italic">{a.alert_reason}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1"><MapPin size={10}/> {a.branch_name}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl text-sm italic text-slate-600 mb-6 border border-slate-100">"{a.feedback?.response_text}"</div>
          <div className="flex flex-col md:flex-row gap-4 items-end">
             <textarea 
                className="flex-1 w-full p-4 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" 
                placeholder="Manager resolution notes..."
                value={notes[a.id] || ''}
                onChange={(e) => setNotes({...notes, [a.id]: e.target.value})}
             />
             <button onClick={() => handleAction(a.id)} className="bg-dark text-white px-8 py-4 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2">
                <CheckCircle2 size={18}/> Resolve Alert
             </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- 5. ARCHIVE PAGE ---
export const Archive = ({ selectedBranch, refreshTrigger }) => {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      let q = supabase.from('feedback').select('*, branches(name)').order('created_at', { ascending: false });
      if (selectedBranch !== 'all') q = q.eq('branch_id', selectedBranch);
      const { data } = await q;
      setData(data || []);
    };
    fetchAll();
  }, [selectedBranch, refreshTrigger]);

  const filtered = data.filter(d => d.customer_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
        <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
          <History size={20} className="text-slate-400"/> Feedback Archive
        </h3>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
          <input 
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary w-64 shadow-sm"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
          <tr>
            <th className="px-6 py-4 flex items-center gap-1">Date <ArrowUpDown size={10}/></th>
            <th className="px-6 py-4">Customer</th>
            <th className="px-6 py-4 text-center">Rating</th>
            <th className="px-6 py-4">Sentiment</th>
            <th className="px-6 py-4 text-center">Routing</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filtered.map(d => (
            <tr key={d.id} className="hover:bg-blue-50/30 transition-colors group font-medium text-slate-700">
              <td className="px-6 py-4 text-xs text-slate-500">
                <div className="flex items-center gap-2"><Calendar size={12} className="text-slate-300"/> {new Date(d.created_at).toLocaleDateString()}</div>
              </td>
              <td className="px-6 py-4 font-bold text-slate-800">
                <div className="flex items-center gap-2"><User size={12} className="text-slate-300"/> {d.customer_name}</div>
              </td>
              <td className="px-6 py-4 flex justify-center mt-2"><StarRating rating={d.rating} /></td>
              <td className="px-6 py-4">
                <div className={`text-[10px] font-black uppercase flex items-center gap-1 ${d.sentiment_label === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                  {d.sentiment_label === 'positive' ? <CheckCircle2 size={12}/> : <AlertTriangle size={12}/>}
                  {d.sentiment_label}
                </div>
              </td>
              <td className="px-6 py-4 text-center"><StatusBadge status={d.routing_status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
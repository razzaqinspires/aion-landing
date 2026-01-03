import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  X, Send, Terminal, Cpu, Clock, Database, 
  Hash, ChevronRight, Lock, Image as ImageIcon,
  User, Settings, Zap, BrainCircuit, Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- TYPES ---
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  image?: string;
  timestamp: number;
}

interface UserProfile {
  name: string;
  avatar: string; // URL gambar
}

// --- CONFIG ---
const GENESIS_CONFIG_URL = "https://raw.githubusercontent.com/razzaqinspires/AION/main/aion_genesis.json";

const WebTerminal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  // --- STATE CORE ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [status, setStatus] = useState("INITIALIZING...");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);

  // --- STATE ADVANCED UI ---
  const [isReasoningMode, setIsReasoningMode] = useState(false); // Toggle Mode
  const [showProfileSettings, setShowProfileSettings] = useState(false); // Modal Profil
  
  // --- STATE PROFILE (Persist di LocalStorage) ---
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Guest Operator',
    avatar: ''
  });

  // Load Profile saat pertama kali buka
  useEffect(() => {
    const savedProfile = localStorage.getItem('aion_user_profile');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }
    // Init pesan awal
    setMessages([
      { id: 'init-1', role: 'system', text: 'INITIALIZING NEURAL LINK...', timestamp: Date.now() - 100000 },
      { id: 'init-2', role: 'system', text: 'LOADING EPISODIC MEMORY...', timestamp: Date.now() - 90000 },
      { id: 'init-3', role: 'assistant', text: `Greetings. I am AION. The continuous stream is active. Ready to sync with you.`, timestamp: Date.now() - 80000 },
    ]);
  }, []);

  // Simpan Profile ke LocalStorage setiap berubah
  const saveProfile = (name: string, avatar: string) => {
    const newProfile = { name, avatar };
    setUserProfile(newProfile);
    localStorage.setItem('aion_user_profile', JSON.stringify(newProfile));
    setShowProfileSettings(false);
    
    // Info system
    addMessage('system', `:: USER PROFILE UPDATED: ${name.toUpperCase()} ::`);
  };

  // --- KONEKSI SOCKET (GENESIS) ---
  useEffect(() => {
    if (!isOpen) return;

    const initConnection = async () => {
      try {
        setStatus("FETCHING GENESIS...");
        const genesisRes = await fetch(GENESIS_CONFIG_URL);
        const genesis = await genesisRes.json();
        
        setStatus("LOCATING NODE...");
        const beaconRes = await fetch(genesis.beacon_database_url);
        const beacon = await beaconRes.json();
        
        if (!beacon || !beacon.url) throw new Error("AION Offline");

        const newSocket = io(beacon.url); 
        setSocket(newSocket);

        newSocket.on('connect', () => {
            setStatus("ONLINE");
            addMessage('system', `:: UPLINK ESTABLISHED TO ${beacon.url} ::`);
        });

        newSocket.on('response', (data: any) => {
            addMessage('assistant', data.text, data.image);
        });

        return () => newSocket.disconnect();
      } catch (e) {
        setStatus("OFFLINE");
        addMessage('system', `:: CONNECTION FAILED: AION IS UNREACHABLE ::`);
      }
    };

    initConnection();
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, showProfileSettings]);

  const addMessage = (role: 'user' | 'assistant' | 'system', text: string, image?: string) => {
    const newMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      role,
      text,
      image,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMsg]);
    setActiveLogId(newMsg.id);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    
    addMessage('user', input);
    
    // KIRIM DATA LENGKAP KE BACKEND (Termasuk Mode & Profil)
    socket.emit('input', { 
        text: input, 
        user: userProfile.name, // Kirim Nama User
        mode: isReasoningMode ? 'reasoning' : 'fast' // Kirim Mode
    });
    
    setInput('');
  };

  const formatTime = (ms: number) => {
    return new Date(ms).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full max-w-6xl h-[85vh] bg-[#050505] border border-aion-main/30 rounded-xl shadow-[0_0_80px_rgba(0,243,255,0.1)] overflow-hidden flex flex-col md:flex-row font-mono relative"
          >
            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[2] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-10"></div>

            {/* ======================= SIDEBAR (LOGS) ======================= */}
            <div className="w-full md:w-72 bg-[#0a0a0c] border-r border-white/10 flex flex-col z-10 hidden md:flex">
              <div className="p-4 border-b border-white/10 bg-black/40">
                <div className="flex items-center gap-2 text-aion-main text-xs font-bold tracking-widest uppercase">
                  <Database size={14} /> Memory Logs
                </div>
                <div className="text-[10px] text-slate-500 mt-1">SINGLE CONSCIOUSNESS STREAM</div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {messages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => setActiveLogId(msg.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all group relative overflow-hidden ${
                      activeLogId === msg.id 
                        ? 'bg-aion-main/10 border-aion-main/30 text-white' 
                        : 'bg-transparent border-transparent hover:bg-white/5 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] mb-1 opacity-70">
                      <span className="flex items-center gap-1"><Clock size={10} /> {formatTime(msg.timestamp)}</span>
                      <span className="uppercase">{msg.role}</span>
                    </div>
                    <div className="text-xs truncate font-rajdhani flex items-center gap-2">
                       {msg.image && <ImageIcon size={10} className="text-aion-neon" />}
                       {msg.role === 'system' ? <span className="text-aion-main italic">{msg.text}</span> : msg.text || '[Visual Data]'}
                    </div>
                  </button>
                ))}
                
                <div className="mt-8 p-4 text-center border-t border-dashed border-white/10">
                    <div className="inline-flex items-center gap-2 text-[10px] text-slate-600 uppercase tracking-widest">
                        <Lock size={10} /> Continuous Thread
                    </div>
                </div>
              </div>
            </div>

            {/* ======================= MAIN TERMINAL ======================= */}
            <div className="flex-1 flex flex-col bg-black/80 relative z-10">
              
              {/* --- HEADER --- */}
              <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0a0a0c]/90 backdrop-blur shrink-0">
                
                {/* KIRI: Status & Identifier */}
                <div className="flex items-center gap-4 w-1/3">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                        <Terminal size={18} className="text-slate-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Status</span>
                        <span className={`text-xs font-bold ${status === 'ONLINE' ? 'text-aion-neon' : 'text-red-500'}`}>{status}</span>
                    </div>
                </div>

                {/* TENGAH: MODEL SELECTOR (Seperti ChatGPT/Gemini) */}
                <div className="flex items-center justify-center w-1/3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-black border border-aion-main/30 rounded-full shadow-[0_0_15px_rgba(0,243,255,0.1)] cursor-default">
                        <Cpu size={14} className={isReasoningMode ? "text-purple-400" : "text-aion-main"} />
                        <span className="text-xs font-bold font-orbitron text-white tracking-wide">
                            AION {isReasoningMode ? 'O1-REASONING' : 'V43.2-TURBO'}
                        </span>
                    </div>
                </div>

                {/* KANAN: PROFILE & CLOSE */}
                <div className="flex items-center justify-end gap-4 w-1/3">
                    {/* Profile Trigger */}
                    <button 
                        onClick={() => setShowProfileSettings(!showProfileSettings)}
                        className="flex items-center gap-3 px-3 py-1.5 hover:bg-white/5 rounded-lg transition-all group"
                    >
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Operator</div>
                            <div className="text-xs text-white font-bold truncate max-w-[100px]">{userProfile.name}</div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/20 overflow-hidden flex items-center justify-center group-hover:border-aion-main/50 transition-colors">
                            {userProfile.avatar ? (
                                <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User size={16} className="text-slate-400" />
                            )}
                        </div>
                    </button>

                    <div className="h-8 w-[1px] bg-white/10 mx-2"></div>

                    <button onClick={onClose} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
              </div>

              {/* --- CHAT AREA --- */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 font-rajdhani text-sm relative">
                {/* Profile Settings Modal Overlay */}
                <AnimatePresence>
                    {showProfileSettings && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className="absolute top-4 right-4 z-50 w-72 bg-[#121214] border border-white/10 rounded-xl shadow-2xl p-5"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-white font-bold text-sm flex items-center gap-2"><Settings size={14}/> IDENTITY CONFIG</h4>
                                <button onClick={() => setShowProfileSettings(false)}><X size={14} className="text-slate-500 hover:text-white"/></button>
                            </div>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const form = e.target as HTMLFormElement;
                                saveProfile(form.username.value, form.avatar.value);
                            }}>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase mb-1 block">Designation (Name)</label>
                                        <input name="username" defaultValue={userProfile.name} className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-aion-main outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 uppercase mb-1 block">Avatar URL</label>
                                        <input name="avatar" defaultValue={userProfile.avatar} placeholder="https://..." className="w-full bg-black border border-white/10 rounded px-3 py-2 text-xs text-white focus:border-aion-main outline-none" />
                                    </div>
                                    <button type="submit" className="w-full bg-aion-main text-black font-bold text-xs py-2 rounded mt-2 hover:bg-white transition-colors flex items-center justify-center gap-2">
                                        <Save size={12}/> SAVE IDENTITY
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Messages List */}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] relative group ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                        <span className="text-[10px] text-slate-600 mb-1 ml-1 uppercase tracking-wider flex items-center gap-2">
                            {msg.role === 'assistant' ? <><Cpu size={10}/> AION CORE</> : msg.role === 'system' ? <><Hash size={10}/> SYSTEM</> : userProfile.name}
                        </span>

                        <div className={`p-4 rounded-xl border backdrop-blur-sm ${
                          msg.role === 'user' 
                            ? 'bg-aion-main/10 text-aion-main border-aion-main/20 rounded-tr-none' 
                            : msg.role === 'system'
                            ? 'bg-transparent text-aion-alert border border-aion-alert/20 font-mono text-xs w-full text-center'
                            : 'bg-[#151518] text-slate-200 border-white/10 rounded-tl-none shadow-lg'
                        }`}>
                          {/* Image Rendering */}
                          {msg.image && (
                            <div className="mb-3 rounded-lg overflow-hidden border border-white/20 relative group-image">
                                <img src={msg.image} alt="Visual Output" className="max-w-full h-auto object-cover" />
                                <div className="absolute inset-0 bg-aion-main/10 opacity-0 group-hover/image:opacity-100 transition-opacity pointer-events-none mix-blend-overlay"></div>
                            </div>
                          )}
                          {/* Text Rendering */}
                          <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                        </div>
                        
                        <span className="text-[9px] text-slate-700 mt-1 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {formatTime(msg.timestamp)}
                        </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* --- FOOTER: INPUT & TOOLS --- */}
              <div className="p-4 bg-[#0a0a0c] border-t border-white/10">
                {/* Tool Bar */}
                <div className="flex items-center gap-3 mb-3 px-1">
                    <button 
                        onClick={() => setIsReasoningMode(false)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                            !isReasoningMode 
                            ? 'bg-aion-main/20 border-aion-main text-aion-main' 
                            : 'bg-transparent border-white/10 text-slate-500 hover:text-white'
                        }`}
                    >
                        <Zap size={12} /> FAST MODE
                    </button>
                    <button 
                        onClick={() => setIsReasoningMode(true)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                            isReasoningMode 
                            ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]' 
                            : 'bg-transparent border-white/10 text-slate-500 hover:text-white'
                        }`}
                    >
                        <BrainCircuit size={12} /> REASONING
                    </button>
                </div>

                <form onSubmit={handleSend} className={`relative flex items-center gap-4 bg-black border rounded-xl px-4 py-3 transition-all ${isReasoningMode ? 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'border-white/20 focus-within:border-aion-main/60 focus-within:shadow-[0_0_20px_rgba(0,243,255,0.1)]'}`}>
                  <div className={isReasoningMode ? "text-purple-500 animate-pulse" : "text-aion-main animate-pulse"}>
                    <ChevronRight size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isReasoningMode ? "Ask a complex question for deep analysis..." : "Type a command or quick query..."}
                    className="flex-1 bg-transparent text-white font-mono text-sm focus:outline-none placeholder:text-slate-700"
                    autoFocus
                  />
                  <button 
                    type="submit" 
                    disabled={!input.trim()}
                    className={`transition-colors ${isReasoningMode ? 'text-purple-500 hover:text-white' : 'text-slate-500 hover:text-aion-main'} disabled:opacity-30`}
                  >
                    <Send size={18} />
                  </button>
                </form>
                <div className="text-[9px] text-slate-600 mt-2 text-center font-mono">
                    AION may produce inaccurate information about people, places, or facts.
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WebTerminal;
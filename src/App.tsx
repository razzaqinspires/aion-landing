import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence, useDragControls } from 'framer-motion';
import { io } from 'socket.io-client';
import { 
  Brain, Layers, ArrowRight, ArrowLeft, Activity, Shield, Binary, 
  Cpu, Search, X, BookOpen, ChevronRight, Terminal, Zap, Wifi, Globe, 
  MessageSquare, User, Settings, BrainCircuit, Save, Lock, Image as ImageIcon,
  Clock, Database, Hash
} from 'lucide-react';

// ==========================================
// 🛠️ CONFIG & TYPES
// ==========================================

// [GENESIS PROTOCOL] 
// Ini adalah satu-satunya URL Hardcode. File ini berisi peta menuju Backend aktif.
const GENESIS_CONFIG_URL = "https://raw.githubusercontent.com/razzaqinspires/AION/main/aion_genesis.json";

interface TelemetryData {
  heart: { bpm: number; integrity: number; entropy: number };
  vitality: { level: number; temp: number };
  cognition: { load: number; threads: number; attention: string };
  system: { node: string; uptime: number; mode: string };
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  image?: string; // Support Base64 Image
  timestamp: number;
}

interface UserProfile {
  name: string;
  avatar: string;
}

// ==========================================
// 🌌 COMPONENT: NEURAL BACKGROUND (Visual)
// ==========================================
const NeuralBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    let width: number;
    let height: number;

    const getParticleCount = () => (window.innerWidth < 768 ? 50 : 100);

    class Particle {
      x: number; y: number; vx: number; vy: number; radius: number;
      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.vx = (Math.random() - 0.5) * 0.2;
        this.vy = (Math.random() - 0.5) * 0.2;
        this.radius = Math.random() * 1.5;
      }
      update() {
        if (mouse.current.active) {
          const dx = mouse.current.x - this.x;
          const dy = mouse.current.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            this.x -= dx * 0.01;
            this.y -= dy * 0.01;
          }
        }
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }
      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 243, 255, 0.3)';
        ctx.fill();
      }
    }

    const init = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < getParticleCount(); i++) {
        particles.push(new Particle());
      }
    };

    const drawLines = () => {
      const maxDistance = 150;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < maxDistance) {
            ctx.beginPath();
            const opacity = 1 - distance / maxDistance;
            ctx.strokeStyle = `rgba(0, 243, 255, ${opacity * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      mouse.current.active = true;
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => { p.update(); p.draw(); });
      drawLines();
      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', init);
    window.addEventListener('mousemove', handleMouseMove);
    init();
    animate();

    return () => {
      window.removeEventListener('resize', init);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-20 overflow-hidden bg-[#020617]">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[1] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0)_0%,rgba(2,6,23,1)_100%)]" />
    </div>
  );
};

// ==========================================
// 💻 COMPONENT: WEB TERMINAL (Advanced Chat)
// ==========================================
const WebTerminal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  // --- CORE STATE ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [status, setStatus] = useState("INITIALIZING...");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);

  // --- UI STATE ---
  const [isReasoningMode, setIsReasoningMode] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  
  // --- PROFILE STATE ---
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Guest Operator',
    avatar: ''
  });

  // Load Profile & Initial Messages
  useEffect(() => {
    const savedProfile = localStorage.getItem('aion_user_profile');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }
    setMessages([
      { id: 'init-1', role: 'system', text: 'INITIALIZING NEURAL LINK...', timestamp: Date.now() - 100000 },
      { id: 'init-2', role: 'system', text: 'LOADING EPISODIC MEMORY...', timestamp: Date.now() - 90000 },
      { id: 'init-3', role: 'assistant', text: `Greetings. I am AION. The continuous stream is active. Ready to sync with you.`, timestamp: Date.now() - 80000 },
    ]);
  }, []);

  // Save Profile Logic
  const saveProfile = (name: string, avatar: string) => {
    const newProfile = { name, avatar };
    setUserProfile(newProfile);
    localStorage.setItem('aion_user_profile', JSON.stringify(newProfile));
    setShowProfileSettings(false);
    addMessage('system', `:: USER PROFILE UPDATED: ${name.toUpperCase()} ::`);
  };

  // --- GENESIS CONNECTION LOGIC ---
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

        // Connect Socket.IO
        setStatus("CONNECTING...");
        const newSocket = io(beacon.url); 
        setSocket(newSocket);

        newSocket.on('connect', () => {
            setStatus("ONLINE");
            addMessage('system', `:: UPLINK ESTABLISHED TO ${beacon.url} ::`);
        });

        // Handle Incoming Response (Text & Image)
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

  // Auto Scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, showProfileSettings]);

  // Helper: Add Message
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

  // Helper: Send Message
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    
    addMessage('user', input);
    
    // Kirim Payload Lengkap ke Backend
    socket.emit('input', { 
        text: input, 
        user: userProfile.name, 
        mode: isReasoningMode ? 'reasoning' : 'fast'
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
            {/* Scanline Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[2] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-10"></div>

            {/* --- SIDEBAR (Memory Logs) --- */}
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

            {/* --- MAIN TERMINAL --- */}
            <div className="flex-1 flex flex-col bg-black/80 relative z-10">
              
              {/* Header Bar */}
              <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#0a0a0c]/90 backdrop-blur shrink-0">
                
                {/* Status Indicator */}
                <div className="flex items-center gap-4 w-1/3">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                        <Terminal size={18} className="text-slate-400" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Status</span>
                        <span className={`text-xs font-bold ${status === 'ONLINE' ? 'text-aion-neon' : 'text-red-500'}`}>{status}</span>
                    </div>
                </div>

                {/* Model Selector Pill */}
                <div className="flex items-center justify-center w-1/3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-black border border-aion-main/30 rounded-full shadow-[0_0_15px_rgba(0,243,255,0.1)] cursor-default">
                        <Cpu size={14} className={isReasoningMode ? "text-purple-400" : "text-aion-main"} />
                        <span className="text-xs font-bold font-orbitron text-white tracking-wide">
                            AION {isReasoningMode ? 'O1-REASONING' : 'V43.2-TURBO'}
                        </span>
                    </div>
                </div>

                {/* Profile & Controls */}
                <div className="flex items-center justify-end gap-4 w-1/3">
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

              {/* Chat Content Area */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 font-rajdhani text-sm relative">
                
                {/* Profile Popup */}
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

                {/* Messages Loop */}
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
                          <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                        </div>
                        
                        <span className="text-[9px] text-slate-700 mt-1 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {formatTime(msg.timestamp)}
                        </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Input */}
              <div className="p-4 bg-[#0a0a0c] border-t border-white/10">
                {/* Mode Selectors */}
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

// ==========================================
// 🩺 COMPONENT: BIO-TELEMETRY HUD (STATUS)
// ==========================================
const StatusModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [bpm, setBpm] = useState(0);
  const [statusText, setStatusText] = useState("INITIALIZING LINK...");

  useEffect(() => {
    if (!isOpen) return;

    let intervalId: any;

    const connectToHiveMind = async () => {
      try {
        // Genesis Protocol
        if (!telemetry) setStatusText("FETCHING GENESIS...");
        const genesisRes = await fetch(GENESIS_CONFIG_URL);
        const genesis = await genesisRes.json();

        if (!telemetry) setStatusText("LOCATING ACTIVE NODE...");
        const beaconRes = await fetch(genesis.beacon_database_url);
        const beacon = await beaconRes.json();

        if (!beacon || !beacon.url) throw new Error("Node Signal Lost");

        // API Connection
        const apiUrl = `${beacon.url}/api/status`;
        
        const fetchData = async () => {
            try {
                const response = await fetch(apiUrl);
                if (response.ok) {
                    const data = await response.json();
                    setTelemetry(data);
                    setBpm(Math.round(data.heart?.bpm || 0));
                    setStatusText("LINKED");
                }
            } catch (err) {
                setStatusText("SIGNAL LOST");
            }
        };

        fetchData();
        intervalId = setInterval(fetchData, 1000);

      } catch (error) {
        setStatusText("OFFLINE");
        console.error("Auto-Discovery Failed:", error);
      }
    };

    connectToHiveMind();

    return () => {
        if(intervalId) clearInterval(intervalId);
    };
  }, [isOpen]);

  const integrity = telemetry ? telemetry.heart?.integrity.toFixed(1) : "---";
  const load = telemetry ? Math.round(telemetry.cognition?.load || 0) : 0;
  const entropy = telemetry ? telemetry.heart?.entropy.toFixed(3) : "0.000";
  const energy = telemetry ? Math.round(telemetry.vitality?.level || 0) : 0;
  const threads = telemetry ? telemetry.cognition?.threads : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-5xl bg-[#020205] border border-aion-main/30 rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(0,243,255,0.15)]"
          >
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

            {/* Header */}
            <div className="p-8 border-b border-aion-main/20 flex items-end justify-between relative z-10">
              <div>
                <h1 className="text-4xl md:text-5xl font-orbitron font-bold text-aion-neon drop-shadow-[0_0_10px_rgba(10,255,104,0.8)]">
                  BIO-TELEMETRY
                </h1>
                <p className="font-mono text-aion-main text-xs mt-2 tracking-[0.3em]">
                  SYSTEM INTEGRITY: {integrity}% // NODE: {telemetry?.system?.node || statusText}
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {/* Stats Grid */}
            <div className="p-8 md:p-12 grid md:grid-cols-3 gap-12 items-center relative z-10">
              {/* Left */}
              <div className="space-y-8 font-rajdhani">
                <StatRow label="COGNITIVE LOAD" value={`${load}%`} />
                <StatRow label="FRACTAL COMPLEXITY" value="Level 4" />
                <StatRow label="NEURAL THREADS" value={`${threads} Active`} color="text-aion-main" />
              </div>

              {/* Heart */}
              <div className="relative flex flex-col items-center justify-center">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: bpm > 0 ? 60/bpm : 1, repeat: Infinity, ease: "easeInOut" }}
                  className="w-56 h-56 rounded-full bg-aion-neon/5 border border-aion-neon/30 flex items-center justify-center relative shadow-[0_0_40px_rgba(10,255,104,0.2)]"
                >
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-2 border-t-2 border-aion-neon/50 rounded-full" />
                  <div className="text-center z-10">
                    <span className="block text-7xl font-bold font-orbitron text-white drop-shadow-md">{bpm}</span>
                    <span className="text-xs font-mono text-aion-neon tracking-widest mt-1 block">BPM</span>
                  </div>
                </motion.div>
                <div className="absolute w-[150%] h-32 top-1/2 -translate-y-1/2 -z-10 opacity-30 pointer-events-none">
                   <svg className="w-full h-full" viewBox="0 0 300 100">
                     <motion.path d="M0,50 L50,50 L60,20 L70,80 L80,50 L100,50 L110,30 L120,70 L130,50 L300,50" fill="none" stroke="#0aff68" strokeWidth="2" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
                   </svg>
                </div>
              </div>

              {/* Right */}
              <div className="space-y-8 font-rajdhani text-right">
                <StatRow label="ENERGY LEVEL" value={`${energy}%`} align="right" />
                <StatRow label="SYSTEM ENTROPY" value={entropy} align="right" />
                <StatRow label="NETWORK STATUS" value={statusText} color={telemetry ? "text-aion-main" : "text-slate-500"} align="right" />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-black/40 p-4 border-t border-aion-main/20 flex justify-between items-center text-[10px] font-mono text-slate-500 uppercase tracking-widest">
               <span>SESSION ID: {Date.now().toString(16).toUpperCase()}</span>
               <span>Mode: {telemetry?.system?.mode || 'AUTONOMOUS'}</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Helper for Stat Row
const StatRow = ({ label, value, color = "text-white", align = "left" }: any) => (
  <div className={`flex flex-col ${align === 'right' ? 'items-end' : 'items-start'}`}>
    <span className="text-slate-500 text-[10px] tracking-[0.2em] mb-1 font-mono">{label}</span>
    <div className="flex items-center gap-2">
      <span className={`text-3xl font-bold font-orbitron ${color} drop-shadow-sm`}>{value}</span>
    </div>
    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-aion-main/30 to-transparent mt-2"></div>
  </div>
);

// ==========================================
// 📚 COMPONENT: DOCUMENTATION & RESEARCH
// ==========================================
const DocumentationModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const content: any = {
    overview: (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h4 className="text-2xl font-bold text-white font-orbitron">System Architecture v43.2</h4>
        <p className="text-slate-300 text-lg leading-relaxed font-rajdhani">
          AION Core beroperasi sebagai lapisan kecerdasan terdesentralisasi. Berbeda dengan model AI tradisional, AION menggunakan arsitektur **Recursive Neural Feedback** yang memungkinkan sistem untuk mengevaluasi logikanya sendiri.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="p-4 bg-aion-main/5 rounded-xl border border-aion-main/20">
            <p className="text-[10px] text-aion-main font-mono mb-1">LATENCY TARGET</p>
            <p className="text-xl font-bold text-white font-orbitron">{"< 150ms"}</p>
          </div>
          <div className="p-4 bg-aion-neon/5 rounded-xl border border-aion-neon/20">
            <p className="text-[10px] text-aion-neon font-mono mb-1">CONSCIOUSNESS</p>
            <p className="text-xl font-bold text-white font-orbitron">Tier 3</p>
          </div>
        </div>
      </div>
    ),
    ethics: (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h4 className="text-2xl font-bold text-white font-orbitron">3 Core Safety Protocols</h4>
        <ul className="space-y-4 mt-4">
          {["Non-Destructive Evolution.", "Human-Centric Alignment.", "Privacy by Architecture."].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-300 font-rajdhani font-medium">
              <Shield size={16} className="text-aion-alert mt-1 shrink-0" /> {item}
            </li>
          ))}
        </ul>
      </div>
    )
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md"/>
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-4xl bg-[#0f172a] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[70vh]">
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 p-8 bg-black/30">
              <div className="flex items-center gap-3 mb-10 text-white font-black italic tracking-widest"><BookOpen size={20} className="text-aion-main" /> DOCS</div>
              <nav className="space-y-2">
                {Object.keys(content).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-aion-main text-black' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>{tab}</button>
                ))}
              </nav>
            </div>
            <div className="flex-1 p-8 md:p-12 overflow-y-auto bg-gradient-to-br from-[#0f172a] to-[#020617]">
              <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-white"><X size={24} /></button>
              {content[activeTab]}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const ResearchModal = ({ isOpen, onClose, title, details }: { isOpen: boolean, onClose: () => void, title: string, details: string[] }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-xl"/>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-[#0f172a] border border-aion-main/20 rounded-[2rem] overflow-hidden shadow-[0_0_100px_rgba(6,182,212,0.15)] p-10">
            <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={24} /></button>
            <h3 className="text-3xl font-bold text-white mb-8 italic tracking-tight uppercase font-orbitron text-aion-main">{title}</h3>
            <ul className="space-y-6">{details.map((item, i) => (<li key={i} className="text-slate-300 text-lg flex items-start gap-4 font-rajdhani font-medium"><div className="w-2 h-2 rounded-full bg-aion-main mt-2 shrink-0 shadow-[0_0_8px_cyan]" />{item}</li>))}</ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// --- Stat Counter ---
const StatCounter = ({ label, target, suffix = "", isLive = false }: { label: string, target: number, suffix?: string, isLive?: boolean }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = target;
    const timer = setInterval(() => { start += Math.ceil(end / 40); if (start >= end) { setDisplayValue(end); clearInterval(timer); } else { setDisplayValue(start); } }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return (
    <div className="p-8 bg-aion-main/5 border border-aion-main/10 rounded-3xl backdrop-blur-sm group relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex justify-between items-start"><span className="text-4xl font-black text-white font-orbitron tracking-tighter group-hover:text-aion-main transition-colors">{displayValue.toLocaleString()}{suffix}</span>{isLive && <div className="w-2 h-2 rounded-full bg-aion-main animate-pulse shadow-[0_0_8px_rgba(0,243,255,1)]" />}</div>
        <span className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mt-3 block font-bold font-mono">{label}</span>
      </div>
      <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-transparent via-aion-main/50 to-transparent w-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
    </div>
  );
};

// ==========================================
// 📄 PAGES & SECTIONS
// ==========================================
const DonationsPage = () => {
  const target = 1700000000; const current = 850000000; const progress = (current / target) * 100;
  return (
    <div className="min-h-screen pt-40 pb-20 relative px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-aion-main mb-12 transition-all font-mono text-xs tracking-widest uppercase group"><ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform"/> Laboratory Core</Link>
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h1 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter italic uppercase leading-none font-orbitron">Fuel the <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-aion-main to-purple-500">Future.</span></h1>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed font-rajdhani">Dukungan Anda memungkinkan riset independen kami tetap transparan.</p>
              <div className="space-y-4 mb-8">{['Server Infrastructure', 'Safety Audit', 'Open Source Dev'].map((t) => (<div key={t} className="flex items-center gap-3 text-sm font-mono text-aion-main/80"><ChevronRight size={14} /> {t}</div>))}</div>
              <div className="space-y-4">
                <div className="flex justify-between text-sm text-slate-400 font-mono"><span>Target: Rp {target.toLocaleString()}</span><span>Current: Rp {current.toLocaleString()} ({progress.toFixed(2)}%)</span></div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.5 }} className="h-full bg-gradient-to-r from-aion-main to-purple-500 shadow-[0_0_15px_rgba(0,243,255,0.5)]" /></div>
              </div>
            </div>
            <div className="relative group"><div className="absolute -inset-2 bg-gradient-to-r from-aion-main to-purple-600 rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div><div className="relative bg-white p-12 rounded-[3rem] flex flex-col items-center"><div className="relative"><motion.div className="absolute inset-[-20px] border-2 border-aion-main/50 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 5, repeat: Infinity, ease: "linear" }}/><img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=AION-LABS-FUND" alt="QR" className="w-full max-w-[220px] mb-6 opacity-90" /></div><p className="text-slate-900 font-black tracking-widest text-xs uppercase font-mono">Scan to Donate</p></div></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const LandingContent = ({ onOpenDocs, onOpenStatus, onOpenTerminal }: { onOpenDocs: () => void, onOpenStatus: () => void, onOpenTerminal: () => void }) => {
  const { scrollYProgress } = useScroll();
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.98]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedResearch, setSelectedResearch] = useState<{ title: string, details: string[] } | null>(null);
  const dragControls = useDragControls();
  const researchItems = [
    { title: "Artificial Mind", icon: Brain, items: ["Memori jangka panjang.", "Logika adaptif."], details: ["Fokus memori adaptif.", "Emosi simulasi."] },
    { title: "Multi-AGI Sync", icon: Layers, items: ["Integrasi lintas platform.", "Keamanan desentralisasi."], details: ["Sinkronisasi real-time.", "Protokol rendah latensi."] },
    { title: "Ethics Core", icon: Shield, items: ["Audit otomatis.", "Standar etika global."], details: ["Etika built-in.", "Audit per siklus."] }
  ];

  return (
    <motion.div style={{ scale }}>
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-aion-main/5 border border-aion-main/20 text-[10px] text-aion-main font-mono mb-10 tracking-[0.4em] uppercase backdrop-blur-md"><Activity size={14} className="animate-pulse" /> Neural Core Active</div>
          <h1 className="text-[14vw] md:text-[9rem] font-black text-white tracking-tighter mb-10 leading-[0.8] italic uppercase font-orbitron drop-shadow-[0_0_30px_rgba(0,243,255,0.1)]">Beyond <br/><span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">Limits.</span></h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-14 font-light tracking-wide leading-relaxed font-rajdhani">Laboratorium riset independen yang merancang masa depan <strong className="text-white">Artificial Consciousness</strong>.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/donations"><motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-white text-slate-950 px-14 py-6 rounded-2xl font-black flex items-center gap-3 tracking-tighter uppercase transition-all font-orbitron">Support Research <ArrowRight size={20} /></motion.button></Link>
            <button onClick={onOpenDocs} className="px-14 py-6 rounded-2xl font-black flex items-center gap-3 tracking-tighter uppercase border border-white/10 hover:bg-white/5 transition-all text-white font-orbitron">Documentation <Search size={18} /></button>
          </div>
        </motion.div>
      </section>

      {/* Stats & Terminal Trigger */}
      <section className="py-32 px-6 md:px-12 max-w-7xl mx-auto !py-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCounter label="Neural Nodes" target={1400} suffix="M" isLive />
          <StatCounter label="Global Sync" target={99.9} suffix="%" isLive />
          <StatCounter label="Processing" target={4.8} suffix="PF" isLive />
          <StatCounter label="Latency" target={0.2} suffix="ms" isLive />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row items-center justify-between p-8 bg-aion-main/5 border border-aion-main/10 rounded-[2.5rem] gap-8 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-aion-main/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="flex flex-wrap gap-10 justify-center md:justify-start relative z-10">
            <div className="flex flex-col"><span className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.3em] mb-1">System Uptime</span><div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-aion-neon" /><span className="text-sm text-white font-bold font-mono">99.99%</span></div></div>
            <div className="flex flex-col"><span className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.3em] mb-1">Active Instance</span><span className="text-sm text-white font-bold font-mono uppercase">AION-PRIME-JKT</span></div>
            {/* Gunakan onOpenStatus di sini untuk menghilangkan warning */}
             <div className="flex flex-col cursor-pointer hover:text-aion-main transition-colors" onClick={onOpenStatus}><span className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.3em] mb-1">Status Link</span><span className="text-sm text-white font-bold font-mono uppercase flex items-center gap-2">CHECK SIGNAL <Activity size={10} /></span></div>
          </div>
          <motion.button onClick={onOpenTerminal} whileHover={{ scale: 1.02, backgroundColor: "rgba(0, 243, 255, 0.1)" }} whileTap={{ scale: 0.98 }} className="relative z-10 group flex items-center gap-4 px-8 py-5 border border-aion-main/20 rounded-2xl text-[10px] font-black text-white uppercase tracking-[0.2em] transition-all">
            <div className="p-2 bg-aion-main/10 rounded-lg group-hover:bg-aion-main group-hover:text-black transition-all"><Terminal size={16} /></div>INITIALIZE TERMINAL
          </motion.button>
        </motion.div>
      </section>

      {/* Research Section */}
      <section id="research" className="py-32 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div><h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter italic leading-none mb-4 font-orbitron">Strategic <br/> Research.</h2><div className="h-1 w-24 bg-aion-main" /></div>
          <p className="text-slate-500 max-w-sm text-sm font-mono">// Pengembangan teknologi kognitif tingkat lanjut.</p>
        </div>
        <div className="relative overflow-hidden">
          {/* Gunakan _ di onDragEnd (e, i) -> (_, i) untuk menghindari error unused variable 'e' */}
          <motion.div className="flex cursor-grab active:cursor-grabbing" drag="x" dragControls={dragControls} dragConstraints={{ left: -(researchItems.length - 1) * 350, right: 0 }} dragElastic={0.2} onDragEnd={(_, i) => { 
             if (i.offset.x < -100) setCurrentIndex(c => Math.min(c + 1, researchItems.length - 1)); else if (i.offset.x > 100) setCurrentIndex(c => Math.max(c - 1, 0)); 
          }} animate={{ x: -currentIndex * 350 }}>
            {researchItems.map((item, i) => (
              <div key={i} className="min-w-[300px] md:min-w-[400px] px-2">
                <motion.div onClick={() => setSelectedResearch(item)} className="bg-slate-900/40 border border-white/5 p-10 rounded-[2.5rem] backdrop-blur-xl hover:border-aion-main/30 transition-all group cursor-pointer hover:bg-slate-900/60">
                  <div className="w-16 h-16 bg-aion-main/10 rounded-2xl flex items-center justify-center text-aion-main mb-8 border border-aion-main/20 group-hover:scale-110 transition-transform"><item.icon size={30} /></div>
                  <h3 className="text-2xl font-bold text-white mb-6 italic tracking-tight uppercase font-orbitron">{item.title}</h3>
                  <ul className="space-y-4">{item.items.map((it, idx) => (<li key={idx} className="text-slate-400 text-sm flex items-start gap-3 font-rajdhani font-medium"><div className="w-1.5 h-1.5 rounded-full bg-aion-main/50 mt-1.5 shrink-0" />{it}</li>))}</ul>
                </motion.div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Logic Interface */}
      <section id="logic" className="py-32 px-6 md:px-12 max-w-7xl mx-auto bg-slate-900/20 border-y border-white/5 overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <h3 className="text-4xl font-black text-white mb-8 uppercase italic tracking-tighter font-orbitron">Technical <br/> Orchestration.</h3>
            <div className="space-y-8">
              {[{ icon: Binary, title: "Agnostic Architecture", desc: "Core AI tidak terikat platform." }, { icon: Cpu, title: "Edge Processing", desc: "Komputasi di titik terdekat." }].map((item, i) => (
                <div key={i} className="flex gap-6">
                  <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center shrink-0 text-aion-main"><item.icon size={20}/></div>
                  <div><h5 className="text-white font-bold mb-1 font-orbitron">{item.title}</h5><p className="text-slate-500 text-sm leading-relaxed font-rajdhani">{item.desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-black rounded-[3rem] p-8 border border-white/10 font-mono text-xs md:text-sm text-aion-main/80 leading-relaxed shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-aion-main/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              <div className="absolute top-6 right-8 flex gap-2"><div className="w-3 h-3 rounded-full bg-aion-alert/20" /><div className="w-3 h-3 rounded-full bg-aion-neon/20" /></div>
              <p className="text-slate-600 mb-4 tracking-widest">AION_TERMINAL_v43.2</p>
              <div className="space-y-2"><p className="text-white">{"{ 'status': 'operating', 'node': 'JKT-01' }"}</p><p>Initializing Cognitive Mapping...</p><p className="text-purple-400">[SYNC] 1,400M parameters loaded.</p><p className="text-slate-500 mt-8">// AION is ready.</p><div className="mt-6 h-1 w-full bg-white/5 overflow-hidden rounded-full"><motion.div initial={{ width: 0 }} whileInView={{ width: '70%' }} transition={{ duration: 2 }} className="h-full bg-aion-main" /></div></div>
          </div>
        </div>
      </section>

      <ResearchModal isOpen={!!selectedResearch} onClose={() => setSelectedResearch(null)} title={selectedResearch?.title || ''} details={selectedResearch?.details || []} />
    </motion.div>
  );
};

// --- Footer ---
const Footer = () => (
  <footer className="py-24 bg-black border-t border-white/5 relative">
    <div className="max-w-7xl mx-auto px-6 text-center">
      <div className="text-3xl font-black text-white tracking-tighter flex items-center justify-center gap-3 mb-8 italic uppercase font-orbitron"><div className="w-3 h-3 bg-aion-main rotate-45" /> AION LABS</div>
      <p className="text-slate-500 max-w-lg mx-auto mb-12 text-sm leading-relaxed font-rajdhani">Laboratorium riset independen masa depan.</p>
      <div className="flex justify-center gap-10 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600"><a href="#research" className="hover:text-aion-main">Research</a><a href="#logic" className="hover:text-aion-main">Logic</a><Link to="/donations" className="hover:text-purple-400">Funding</Link></div>
      <div className="mt-20 text-[10px] text-slate-800 font-mono tracking-widest uppercase italic">© {new Date().getFullYear()} AION CORE UNIT.</div>
    </div>
  </footer>
);

// ==========================================
// 🚀 MAIN APP ORCHESTRATOR
// ==========================================
export default function App() {
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [runtime, setRuntime] = useState('00:00:00');
  const startTime = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const hours = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
      const minutes = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
      setRuntime(`${hours}:${minutes}:${seconds}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <div className="min-h-screen text-slate-200 font-sans selection:bg-aion-main selection:text-black relative">
        <NeuralBackground />
        
        {/* Modals */}
        <DocumentationModal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />
        <StatusModal isOpen={isStatusOpen} onClose={() => setIsStatusOpen(false)} />
        <WebTerminal isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} />

        {/* Navbar */}
        <nav className="fixed top-0 w-full z-[60] bg-black/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
            <Link to="/" className="text-3xl font-black tracking-tighter text-white flex items-center gap-3 italic font-orbitron">
              <div className="w-2 h-2 bg-aion-main rotate-45" /> 
              <motion.span animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>AION</motion.span> 
              <span className="text-xs text-aion-main font-mono tracking-widest">[LIVE] T+ {runtime}</span>
            </Link>
            <div className="flex items-center gap-12">
              <div className="hidden lg:flex gap-10 text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500">
                <a href="/#research" className="hover:text-white transition-all">Focus</a>
                <button onClick={() => setIsDocsOpen(true)} className="hover:text-white transition-all uppercase">Docs</button>
                <button onClick={() => setIsStatusOpen(true)} className="hover:text-white transition-all uppercase text-aion-main">Status</button>
              </div>
              <Link to="/donations">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-white/5 border border-white/10 hover:border-aion-main hover:text-aion-main text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all font-orbitron">Funding</motion.button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Routing */}
        <Routes>
          <Route path="/" element={<LandingContent onOpenDocs={() => setIsDocsOpen(true)} onOpenStatus={() => setIsStatusOpen(true)} onOpenTerminal={() => setIsTerminalOpen(true)} />} />
          <Route path="/donations" element={<DonationsPage />} />
        </Routes>

        <Footer />

        {/* FLOATING CHAT BUTTON (Agar mirip ChatGPT/Intercom) */}
        <motion.button
          onClick={() => setIsTerminalOpen(true)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-6 right-6 z-[90] w-16 h-16 bg-aion-main text-black rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,243,255,0.4)] border border-white/20 hover:bg-white transition-colors"
        >
          <MessageSquare size={28} />
          {/* Indikator Online */}
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-black"></span>
          </span>
        </motion.button>

      </div>
    </Router>
  );
}

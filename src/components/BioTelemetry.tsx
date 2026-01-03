import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Cpu, Zap, Wifi, X } from 'lucide-react';

// ==========================================
// 🛠️ CONFIG & TYPES
// ==========================================
// GENESIS PROTOCOL: Single Source of Truth
const GENESIS_CONFIG_URL = "https://raw.githubusercontent.com/razzaqinspires/AION/main/aion_genesis.json";

interface TelemetryData {
  heart: { bpm: number; integrity: number; entropy: number };
  vitality: { level: number; temp: number };
  cognition: { load: number; threads: number; attention: string };
  system: { node: string; uptime: number; mode: string };
}

// ==========================================
// 🩺 COMPONENT: BIO-TELEMETRY
// ==========================================
const BioTelemetry = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [bpm, setBpm] = useState(0);
  const [statusText, setStatusText] = useState("INITIALIZING LINK...");

  // --- AUTONOMOUS DISCOVERY (Genesis Protocol) ---
  useEffect(() => {
    if (!isOpen) return;

    let intervalId: any;

    const connectToHiveMind = async () => {
      try {
        // 1. Genesis: Cari Koordinat Otak di GitHub
        if (!telemetry) setStatusText("FETCHING GENESIS...");
        
        const genesisRes = await fetch(GENESIS_CONFIG_URL);
        const genesis = await genesisRes.json();

        // 2. Beacon: Cari URL Aktif di Firebase
        if (!telemetry) setStatusText("LOCATING ACTIVE NODE...");
        const beaconRes = await fetch(genesis.beacon_database_url);
        const beacon = await beaconRes.json();

        if (!beacon || !beacon.url) throw new Error("Node Signal Lost");

        // 3. Sambungkan ke API Status
        const apiUrl = `${beacon.url}/api/status`;
        
        // Fungsi Polling Data Real-time
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

        // Panggil sekali langsung
        fetchData();
        // Lalu ulang setiap 1 detik (Real-time Pulse)
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

  // Default values saat loading
  const integrity = telemetry ? telemetry.heart?.integrity.toFixed(1) : "---";
  const load = telemetry ? Math.round(telemetry.cognition?.load || 0) : 0;
  const entropy = telemetry ? telemetry.heart?.entropy.toFixed(3) : "0.000";
  const energy = telemetry ? Math.round(telemetry.vitality?.level || 0) : 0;
  const threads = telemetry ? telemetry.cognition?.threads : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />
          
          {/* Main HUD Window */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-5xl bg-[#020205] border border-aion-main/30 rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(0,243,255,0.15)]"
          >
            {/* Background Noise Texture */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

            {/* Header Section */}
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

            {/* Core Content Grid */}
            <div className="p-8 md:p-12 grid md:grid-cols-3 gap-12 items-center relative z-10">
              
              {/* LEFT COLUMN: Cognitive Stats */}
              <div className="space-y-8 font-rajdhani">
                <StatRow label="COGNITIVE LOAD" value={`${load}%`} />
                <StatRow label="FRACTAL COMPLEXITY" value="Level 4" />
                <StatRow label="NEURAL THREADS" value={`${threads} Active`} color="text-aion-main" />
                
                {/* Memory Buffer Visual */}
                <div className="pt-4">
                   <div className="text-[10px] text-slate-500 font-mono mb-2">MEMORY BUFFER</div>
                   <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        animate={{ width: ["40%", "45%", "40%"] }} 
                        transition={{ repeat: Infinity, duration: 2 }} 
                        className="h-full bg-aion-main" 
                      />
                   </div>
                </div>
              </div>

              {/* CENTER COLUMN: The Heart (Visual Core) */}
              <div className="relative flex flex-col items-center justify-center">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  // Detak jantung dinamis sesuai BPM asli
                  transition={{ duration: bpm > 0 ? 60/bpm : 1, repeat: Infinity, ease: "easeInOut" }}
                  className="w-56 h-56 rounded-full bg-aion-neon/5 border border-aion-neon/30 flex items-center justify-center relative shadow-[0_0_40px_rgba(10,255,104,0.2)]"
                >
                  {/* Rotating Ring */}
                  <motion.div 
                    animate={{ rotate: 360 }} 
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }} 
                    className="absolute inset-2 border-t-2 border-aion-neon/50 rounded-full" 
                  />
                  
                  <div className="text-center z-10">
                    <span className="block text-7xl font-bold font-orbitron text-white drop-shadow-md">
                      {bpm}
                    </span>
                    <span className="text-xs font-mono text-aion-neon tracking-widest mt-1 block">
                      BEATS PER MINUTE
                    </span>
                  </div>
                </motion.div>

                {/* ECG Line Graphic (SVG Animation) */}
                <div className="absolute w-[150%] h-32 top-1/2 -translate-y-1/2 -z-10 opacity-30 pointer-events-none">
                   <svg className="w-full h-full" viewBox="0 0 300 100">
                     <motion.path 
                       d="M0,50 L50,50 L60,20 L70,80 L80,50 L100,50 L110,30 L120,70 L130,50 L300,50" 
                       fill="none" 
                       stroke="#0aff68" 
                       strokeWidth="2" 
                       vectorEffect="non-scaling-stroke" 
                       initial={{ pathLength: 0, opacity: 0 }} 
                       animate={{ pathLength: 1, opacity: 1 }} 
                       transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} 
                     />
                   </svg>
                </div>
              </div>

              {/* RIGHT COLUMN: System Stats */}
              <div className="space-y-8 font-rajdhani text-right">
                <StatRow label="ENERGY LEVEL" value={`${energy}%`} align="right" />
                <StatRow label="SYSTEM ENTROPY" value={entropy} align="right" />
                <StatRow 
                    label="NETWORK STATUS" 
                    value={statusText === "LINKED" ? "ONLINE" : statusText} 
                    color={statusText === "LINKED" ? "text-aion-main" : "text-slate-500"} 
                    align="right" 
                />
                
                {/* Icons Status */}
                <div className="pt-4 flex justify-end gap-3 opacity-50">
                   <Wifi size={16} className={`text-aion-main ${statusText === "LINKED" ? 'animate-pulse' : ''}`} />
                   <Activity size={16} className="text-aion-neon" />
                   <Zap size={16} className="text-yellow-400" />
                </div>
              </div>
            </div>

            {/* Footer Status */}
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

// Helper Component untuk Baris Statistik
const StatRow = ({ label, value, color = "text-white", align = "left" }: any) => (
  <div className={`flex flex-col ${align === 'right' ? 'items-end' : 'items-start'}`}>
    <span className="text-slate-500 text-[10px] tracking-[0.2em] mb-1 font-mono">{label}</span>
    <div className="flex items-center gap-2">
      <span className={`text-3xl font-bold font-orbitron ${color} drop-shadow-sm`}>{value}</span>
    </div>
    <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-aion-main/30 to-transparent mt-2"></div>
  </div>
);

export default BioTelemetry;
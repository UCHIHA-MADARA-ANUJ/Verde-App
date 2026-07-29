'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Droplet, 
  Thermometer, 
  Wind, 
  Sun, 
  Moon, 
  Activity, 
  Cpu, 
  Sparkles, 
  AlertTriangle, 
  Camera, 
  Send, 
  RefreshCw,
  Clock,
  Wifi,
  CloudRain,
  Volume2,
  VolumeX,
  Sliders,
  Database,
  Layers,
  Heart,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Terminal,
  Shield,
  Zap,
  ChevronRight,
  Menu,
  X,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../lib/firebase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Pre-seeded moisture logs
const initialMoistureHistory = [
  { time: '09:00', moisture: 45 },
  { time: '10:00', moisture: 42 },
  { time: '11:00', moisture: 38 },
  { time: '12:00', moisture: 34 },
  { time: '13:00', moisture: 55 }, 
  { time: '14:00', moisture: 52 },
  { time: '15:00', moisture: 49 },
  { time: '16:00', moisture: 46 },
  { time: '17:00', moisture: 43 },
  { time: '18:00', moisture: 39 },
  { time: '19:00', moisture: 35 },
  { time: '20:00', moisture: 54 }, 
  { time: '21:00', moisture: 51 },
  { time: '22:00', moisture: 48 },
];

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Tabs: 'overview' (Main readings), 'controls' (Override deck), 'pathology' (Verde Leaf Consultant), 'chat' (Real-Time Verde Bot), 'terminal' (Live transaction shell)
  const [activeTab, setActiveTab] = useState<'overview' | 'controls' | 'pathology' | 'chat' | 'terminal'>('overview');

  // Cinematic Boot Loader states
  const [isLoading, setIsLoading] = useState(true);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootStatusText, setBootStatusText] = useState('BOOTING KERNEL...');
  const [bootLines, setBootLines] = useState<string[]>([]);

  // Telemetry metric cache
  const [sensors, setSensors] = useState({
    moisture: 52,
    temperature: 24.5,
    humidity: 65.0,
    lux: 720,
    tank_level: 85
  });

  // Dynamic overrides cache
  const [controls, setControls] = useState({
    manual_mode: false,
    light_manual_mode: false,
    pump_state: false,
    grow_light_state: false,
    moisture_threshold: 35,
    light_threshold: 35,
    weather_override: 0,
    capture_photo: false
  });

  const [latestScan, setLatestScan] = useState({
    imageUrl: "",
    status: "none",
    captured_at: 0
  });

  const [chartData, setChartData] = useState(initialMoistureHistory);
  const [isScanning, setIsScanning] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isConsultantLoading, setIsConsultantLoading] = useState(false);

  // Command prompt shell logs
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "VERDE SHELL V3.0 ONLINE. SECURE THREAD ACTIVE."
  ]);
  const [shellInput, setShellInput] = useState('');

  // BOT 1: Real-Time Verde Bot (chats based on live telemetry)
  const [realtimeMessages, setRealtimeMessages] = useState<Array<{ sender: string; text: string; role: 'user' | 'bot' }>>([
    {
      sender: "Real-Time Verde Bot",
      text: "Greetings, Anuj! I am your Real-Time Verde Bot co-pilot, connected directly to your physical plant's sensors.\n\nI parse your live moisture, Lux levels, and water tank levels. Ask me how I am doing, and I will read my actual sensors to reply!",
      role: 'bot'
    }
  ]);
  const [realtimeInput, setRealtimeInput] = useState('');

  // BOT 2: Verde Leaf Consultant (General pathology bot with photo upload capabilities)
  const [consultantMessages, setConsultantMessages] = useState<Array<{ sender: string; text: string; role: 'user' | 'bot' }>>([
    {
      sender: "Verde Leaf Consultant",
      text: "Welcome to the Pathology Scan Hub. I am your General Botanical AI specialist.\n\nTrigger a high-resolution wireless leaf scan using your ESP32-CAM, or upload any foliage image, and I will analyze the pathology to formulate a step-by-step treatment plan!",
      role: 'bot'
    }
  ]);
  const [consultantInput, setConsultantInput] = useState('');

  // Refs for auto scrolling
  const realtimeChatEndRef = useRef<HTMLDivElement>(null);
  const consultantChatEndRef = useRef<HTMLDivElement>(null);

  // FM Web Audio Synthesizer Engine (Highly optimized, zero local file delays)
  const playSound = (type: 'click' | 'keyboard' | 'alert' | 'init' | 'gurgle' | 'scanner') => {
    if (!sfxEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'keyboard') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450 + Math.random() * 150, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === 'alert') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === 'init') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      } else if (type === 'gurgle') {
        osc.type = 'sine';
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 25;
        lfoGain.gain.value = 150;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        lfo.start();
        osc.start();
        lfo.stop(ctx.currentTime + 0.8);
        osc.stop(ctx.currentTime + 0.8);
      } else if (type === 'scanner') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 1.0);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
        osc.start();
        osc.stop(ctx.currentTime + 1.0);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const addTerminalLog = (msg: string) => {
    setTerminalLogs(prev => {
      const next = [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`];
      if (next.length > 20) next.shift();
      return next;
    });
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // HIGH-FIDELITY CINEMATIC LOADER LOGIC
  useEffect(() => {
    if (!isMounted) return;
    playSound('init');

    const statusUpdates = [
      { pct: 10, text: 'MOUNTING FLASH PREFERENCES...', log: '[BOOT] Preferences initialized. Loading partitions...' },
      { pct: 25, text: 'CONFIGURING HARDWARE GATES...', log: '[BOOT] GPIO 23 (Soil Power) and GPIO 12 (UV LED) mapped.' },
      { pct: 40, text: 'ESTABLISHING HANDSHAKE LINK...', log: '[BOOT] Fetching RTDB WebSocket stream references...' },
      { pct: 60, text: 'RESOLVING TELEMETRY CHANNELS...', log: '[BOOT] Telemetry connected! RSSI: -42dBm.' },
      { pct: 75, text: 'DOWNLOADING THRESHOLD PROFILES...', log: '[BOOT] Calibration: light_threshold=35, moisture_threshold=35.' },
      { pct: 90, text: 'LAUNCHING SYSTEM WATCHDOG...', log: '[BOOT] WDT active. 8-second thread panics ready.' },
      { pct: 100, text: 'VERDE OS ACTIVE & SECURED!', log: '[BOOT] Handshake secure. Verde OS fully operational.' }
    ];

    let currentPct = 0;
    const interval = setInterval(() => {
      currentPct += 1;
      if (currentPct <= 100) {
        setBootProgress(currentPct);
        playSound('keyboard');
        
        const update = statusUpdates.find(u => u.pct === currentPct);
        if (update) {
          setBootStatusText(update.text);
          setBootLines(prev => [...prev, update.log]);
        }
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsLoading(false);
          playSound('alert');
        }, 500);
      }
    }, 40); // 4 seconds total cinematic loading time

    return () => clearInterval(interval);
  }, [isMounted]);

  // Sync with Firebase RTDB
  useEffect(() => {
    if (!isMounted || isLoading) return;

    const sensorsRef = ref(db, 'sensors');
    const controlsRef = ref(db, 'controls');
    const latestScanRef = ref(db, 'latest_scan');
    const historyRef = ref(db, 'historical_logs/moisture_log');

    const unsubSensors = onValue(sensorsRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        setSensors(prev => ({ ...prev, ...val }));
        setIsLive(true);
        addTerminalLog(`Cloud Read: moisture=${val.moisture}%, lux=${val.lux}Lx`);
      }
    });

    const unsubControls = onValue(controlsRef, (snap) => {
      if (snap.exists()) {
        setControls(prev => ({ ...prev, ...snap.val() }));
      }
    });

    const unsubScan = onValue(latestScanRef, (snap) => {
      if (snap.exists()) {
        setLatestScan(prev => ({ ...prev, ...snap.val() }));
      }
    });

    const unsubHistory = onValue(historyRef, (snap) => {
      if (snap.exists()) {
        const val = snap.val();
        if (Array.isArray(val)) setChartData(val);
      }
    });

    return () => {
      unsubSensors();
      unsubControls();
      unsubScan();
      unsubHistory();
    };
  }, [isMounted, isLoading]);

  useEffect(() => {
    realtimeChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [realtimeMessages]);

  useEffect(() => {
    consultantChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consultantMessages]);

  useEffect(() => {
    if (controls.pump_state) {
      playSound('gurgle');
    }
  }, [controls.pump_state]);

  // Push control values directly to Firebase
  const pushControl = (key: string, value: any) => {
    playSound('click');
    addTerminalLog(`Cloud Write: ${key} = ${value}`);
    const controlRef = ref(db, `controls/${key}`);
    set(controlRef, value).catch(err => {
      console.error(err);
    });
  };

  // Trigger camera scan
  const handleTriggerCapture = () => {
    if (isScanning) return;
    playSound('click');
    playSound('scanner');
    setIsScanning(true);
    addTerminalLog("Camera capture triggered");
    pushControl("capture_photo", true);

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (attempts > 12) {
        clearInterval(interval);
        setIsScanning(false);
        playSound('alert');
        addTerminalLog("Camera response timeout. Verify hardware power.");
        pushControl("capture_photo", false);
      }

      const capturePhotoRef = ref(db, 'controls/capture_photo');
      onValue(capturePhotoRef, (snap) => {
        if (snap.val() === false && isScanning) {
          clearInterval(interval);
          setIsScanning(false);
          triggerImageDiagnosis();
        }
      }, { onlyOnce: true });
    }, 1500);
  };

  // Run pathology diagnosis API
  const triggerImageDiagnosis = async () => {
    try {
      playSound('alert');
      addTerminalLog("Analyzing image binary payload...");
      const response = await fetch('/api/analyze-plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: latestScan.imageUrl || "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae" })
      });
      const data = await response.json();
      if (data.success) {
        addTerminalLog(`Diagnosis completed: ${data.diseaseName}`);
        setConsultantMessages(prev => [...prev, {
          sender: "Verde Leaf Consultant",
          text: `🔬 **Foliage Diagnosis Report**\n• Scientific Name: *${data.scientificName}*\n• Diagnosis: **${data.diseaseName}** (${data.probability} confidence)\n\n${data.treatmentPlan}`,
          role: 'bot'
        }]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // BOT 1 Submission Handler (Real-Time Verde Bot)
  const handleRealtimeChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!realtimeInput.trim() || isChatLoading) return;

    playSound('click');
    const userMessage = realtimeInput.trim();
    setRealtimeMessages(prev => [...prev, { sender: "User", text: userMessage, role: 'user' }]);
    setRealtimeInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sensors: sensors,
          controls: controls
        })
      });
      const data = await response.json();
      if (data.success) {
        playSound('keyboard');
        setRealtimeMessages(prev => [...prev, { sender: "Real-Time Verde Bot", text: data.response, role: 'bot' }]);
      }
    } catch (err) {
      setRealtimeMessages(prev => [...prev, { sender: "Real-Time Verde Bot", text: "Cognitive fallback: Telemetry says moisture is " + sensors.moisture + "%. How else can I assist?", role: 'bot' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // BOT 2 Submission Handler (Verde Leaf Consultant)
  const handleConsultantChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultantInput.trim() || isConsultantLoading) return;

    playSound('click');
    const userMessage = consultantInput.trim();
    setConsultantMessages(prev => [...prev, { sender: "User", text: userMessage, role: 'user' }]);
    setConsultantInput('');
    setIsConsultantLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Consultant pathology query: ${userMessage}`,
          sensors: sensors,
          controls: controls
        })
      });
      const data = await response.json();
      if (data.success) {
        playSound('keyboard');
        setConsultantMessages(prev => [...prev, { sender: "Verde Leaf Consultant", text: data.response, role: 'bot' }]);
      }
    } catch (err) {
      setConsultantMessages(prev => [...prev, { sender: "Verde Leaf Consultant", text: "Foliage advisory link is currently offline.", role: 'bot' }]);
    } finally {
      setIsConsultantLoading(false);
    }
  };

  // Interactive Live Command Shell execute handler
  const handleShellCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shellInput.trim()) return;

    playSound('click');
    const cmd = shellInput.trim().toLowerCase();
    addTerminalLog(`Shell Command: "${cmd}"`);
    setShellInput('');

    if (cmd === '/irrigate' || cmd === 'water') {
      pushControl("pump_state", true);
    } else if (cmd === '/stop' || cmd === 'stop') {
      pushControl("pump_state", false);
    } else if (cmd === '/photo' || cmd === 'scan') {
      handleTriggerCapture();
    } else if (cmd.startsWith('/threshold ')) {
      const val = parseInt(cmd.substring(11));
      if (!isNaN(val) && val >= 10 && val <= 80) {
        pushControl("moisture_threshold", val);
      } else {
        addTerminalLog("Syntax Error. Range: 10 to 80.");
      }
    } else if (cmd === 'clear') {
      setTerminalLogs(["[SYSTEM] Logs cleared."]);
    } else {
      addTerminalLog(`Unknown command "${cmd}". Type "/irrigate", "/stop", or "/photo"`);
    }
  };

  const getSoilMoistureStatus = (val: number) => {
    if (val < 30) return { label: "Critical Dry", color: "text-red-500 border-red-500/30" };
    if (val > 75) return { label: "Over-Saturated", color: "text-yellow-500 border-yellow-500/30" };
    return { label: "Optimal", color: "text-emerald-500 border-emerald-500/30" };
  };

  if (!isMounted) return null;

  return (
    <div className="bg-[#000000] min-h-screen text-slate-100 flex flex-col md:flex-row relative overflow-hidden font-mono select-none">
      
      {/* SOLID CYBER TECH GRID UNDERLAY (NO GRADIENTS) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#090c12_1px,transparent_1px),linear-gradient(to_bottom,#090c12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0"></div>

      {/* =========================================================================
           CINEMATIC MONOSPACE DIAGNOSTICS CYBER PROGRESS BAR LOADER
           ========================================================================= */}
      {isLoading && (
        <div className="fixed inset-0 bg-[#000000] z-50 flex flex-col justify-between p-6 md:p-12 text-[#10b981]">
          
          <div className="space-y-1">
            <div className="text-xl md:text-2xl font-black flex items-center gap-2 tracking-widest text-white">
              <Terminal className="w-6 h-6 animate-pulse text-[#10b981]" />
              PROJECT VERDE <span className="text-[#10b981]">OS V3.0</span>
            </div>
            <div className="text-[9px] text-slate-500 font-mono tracking-widest">WROOM-32 HARDWARE DIAGNOSTIC LOADER</div>
          </div>

          {/* Rolling live logs */}
          <div className="flex-1 my-6 overflow-y-auto space-y-1 pr-2 select-text max-h-[40vh] border-b border-emerald-950 pb-4">
            {bootLines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px]">
                <ChevronRight className="w-3 h-3 text-emerald-700 shrink-0" />
                <span>{line}</span>
              </div>
            ))}
            <span className="w-1.5 h-3 bg-[#10b981] inline-block animate-pulse"></span>
          </div>

          {/* Giant High-Tech Progress Bar */}
          <div className="space-y-4">
            <div className="flex justify-between items-baseline text-xs">
              <span className="font-bold tracking-widest text-white">{bootStatusText}</span>
              <span className="font-black text-white text-sm">{bootProgress}%</span>
            </div>
            <div className="w-full bg-[#080c12] border border-emerald-950 p-1.5 rounded-full">
              <div className="h-4 bg-[#10b981] rounded-full transition-all duration-75 shadow-[0_0_10px_#10b981]" style={{ width: `${bootProgress}%` }}></div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-emerald-900/40 text-[9px] text-slate-500">
            <span>Aarav & Anuj - DAV ACON 5 IoT Showcase</span>
            <button onClick={() => setIsLoading(false)} className="px-4 py-2 border border-[#10b981] bg-emerald-950/20 hover:bg-[#10b981] hover:text-black transition-all font-bold uppercase tracking-widest">
              Bypass Diagnostics Boot
            </button>
          </div>
        </div>
      )}


      {/* =========================================================================
           LEFT PERSISTENT SIDEBAR NAVIGATION (DESKTOP)
           ========================================================================= */}
      <aside className="w-full md:w-64 bg-[#020305] border-b md:border-b-0 md:border-r border-[#141c2c] p-6 flex flex-col justify-between shrink-0 z-20">
        
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Cpu className="w-6 h-6 text-[#10b981] animate-spin" style={{ animationDuration: '8s' }} />
            <div>
              <h1 className="text-base font-black tracking-widest leading-none text-white uppercase">
                Verde <span className="text-[#10b981]">OS</span>
              </h1>
              <span className="text-[8px] text-slate-500 block tracking-widest mt-1">BUILD V3.0.0</span>
            </div>
          </div>

          {/* Navigation link list */}
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            <button 
              onClick={() => { playSound('click'); setActiveTab('overview'); }}
              className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl border text-[11px] font-extrabold uppercase tracking-wider transition-all shrink-0 ${
                activeTab === 'overview' 
                  ? 'border-[#10b981] bg-[#10b981]/5 text-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" /> Overview
            </button>
            <button 
              onClick={() => { playSound('click'); setActiveTab('controls'); }}
              className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl border text-[11px] font-extrabold uppercase tracking-wider transition-all shrink-0 ${
                activeTab === 'controls' 
                  ? 'border-[#10b981] bg-[#10b981]/5 text-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" /> Control Deck
            </button>
            <button 
              onClick={() => { playSound('click'); setActiveTab('pathology'); }}
              className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl border text-[11px] font-extrabold uppercase tracking-wider transition-all shrink-0 ${
                activeTab === 'pathology' 
                  ? 'border-[#10b981] bg-[#10b981]/5 text-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-4 h-4 shrink-0" /> Leaf Consultant
            </button>
            <button 
              onClick={() => { playSound('click'); setActiveTab('chat'); }}
              className={`flex-1 md:w-full flex items-center justify-center md:justify-start gap-3 px-4 py-3 rounded-xl border text-[11px] font-extrabold uppercase tracking-wider transition-all shrink-0 ${
                activeTab === 'chat' 
                  ? 'border-[#10b981] bg-[#10b981]/5 text-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" /> Real-time Bot
            </button>
          </nav>
        </div>

        {/* Global Connection Health indicator */}
        <div className="hidden md:block space-y-4">
          
          {/* Active Ping Map Nodes */}
          <div className="bg-[#050608] p-4 rounded-xl border border-[#141c2c] space-y-3 text-[9px] font-mono text-slate-400">
            <span className="text-slate-500 uppercase font-black block border-b border-slate-900 pb-1">⚡ Node Ping Map</span>
            <div className="flex justify-between items-center">
              <span>WROOM-32 Main:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping"></span>
                <strong className="text-white">RSSI -42dBm</strong>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>ESP32-CAM Node:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping"></span>
                <strong className="text-white">Active SVGA</strong>
              </div>
            </div>
          </div>

          <button 
            onClick={() => { setSfxEnabled(!sfxEnabled); playSound('click'); }}
            className={`w-full py-2.5 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all ${
              sfxEnabled ? 'border-emerald-500/40 text-[#10b981] bg-[#10b981]/5' : 'border-slate-800 text-slate-500'
            }`}
          >
            {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            {sfxEnabled ? 'SFX Active' : 'SFX Muted'}
          </button>
        </div>

      </aside>

      {/* =========================================================================
           RIGHT MAIN CONTENT CANVAS (SPACIOUS SECTIONS)
           ========================================================================= */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 z-10 relative space-y-8">

        {/* 1. OVERVIEW SECTION (SPACIOUS STATS) */}
        {activeTab === 'overview' && (
          <section className="space-y-8 animate-fade-in max-w-5xl">
            
            <div className="border-b border-[#141c2c] pb-4 flex justify-between items-end">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest">Sensory Telemetry Overview</h2>
                <p className="text-xs text-slate-400">Live environmental readings from your WROOM-32 platform</p>
              </div>
              <div className="bg-[#050608] border border-emerald-950 px-3 py-1 rounded text-emerald-400 text-xs flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500 animate-pulse" />
                <span>Vitality: <strong>98.4%</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Soil Moisture Card */}
              <div className="cyber-card p-6 border-l-4 border-l-emerald-500 flex flex-col justify-between min-h-[160px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-emerald-500" /> Moisture Index
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${getSoilMoistureStatus(sensors.moisture).color}`}>
                    {getSoilMoistureStatus(sensors.moisture).label}
                  </span>
                </div>
                <div className="text-4xl md:text-5xl font-black text-white font-mono mt-2">{sensors.moisture}%</div>
                <span className="text-[10px] text-slate-500 uppercase block">GPIO 34 continuous read</span>
              </div>

              {/* Climate Card */}
              <div className="cyber-card p-6 border-l-4 border-l-cyan-500 flex flex-col justify-between min-h-[160px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-cyan-500" /> Atmosphere
                  </span>
                  <span className="px-1.5 py-0.5 bg-cyan-950/20 text-cyan-400 border border-cyan-800/30 text-[9px] rounded font-bold uppercase">DHT11 Ok</span>
                </div>
                <div className="flex justify-between items-baseline mt-2">
                  <div className="text-4xl md:text-5xl font-black text-white font-mono">{sensors.temperature.toFixed(1)}°C</div>
                  <div className="text-lg text-slate-400 font-mono">Hum: {sensors.humidity.toFixed(1)}%</div>
                </div>
                <span className="text-[10px] text-slate-500 uppercase block">GPIO 4 DHT core sensor</span>
              </div>

              {/* Water level Reservoir Card */}
              <div className="cyber-card p-6 border-l-4 border-l-sky-500 flex flex-col justify-between min-h-[160px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    ☀️ Lux Intensity
                  </span>
                  <span className="px-1.5 py-0.5 bg-purple-950/20 text-purple-400 border border-purple-800/30 text-[9px] rounded font-bold uppercase">Analog LDR</span>
                </div>
                <div className="text-4xl md:text-5xl font-black text-white font-mono mt-2">{sensors.lux} Lx</div>
                <span className="text-[10px] text-slate-500 uppercase block">GPIO 35 ADC1_CH7 reader</span>
              </div>

            </div>

            {/* Historical chart */}
            <div className="cyber-card p-6">
              <div className="flex justify-between items-center border-b border-[#141c2c] pb-3 mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#10b981]" /> 24-Hour soil hydration analytics
                </span>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>

              <div className="h-64 w-full text-xs font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <defs>
                      <linearGradient id="moistGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0d121c" />
                    <XAxis dataKey="time" stroke="#475569" />
                    <YAxis domain={[0, 100]} stroke="#475569" />
                    <Tooltip contentStyle={{ backgroundColor: '#090a0f', borderColor: '#141c2c', color: '#fff' }} />
                    <Area type="monotone" dataKey="moisture" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#moistGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </section>
        )}

        {/* 2. CONTROL DECK SECTION (SPACIOUS OVERRIDES) */}
        {activeTab === 'controls' && (
          <section className="space-y-8 animate-fade-in max-w-5xl">
            
            <div className="border-b border-[#141c2c] pb-4">
              <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest">Active Control Center</h2>
              <p className="text-xs text-slate-400">Calibrate targets and trigger remote manual overrides</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* PUMP ACTUATOR CARD */}
              <div className="cyber-card p-6 border-l-4 border-l-sky-500 flex flex-col justify-between min-h-[300px]">
                <div className="flex items-center justify-between border-b border-[#141c2c] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-sky-950 text-sky-400 rounded-lg">💦</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">Submersible Pump Override</h4>
                      <span className="text-[10px] text-slate-500 font-mono block">Relay Switch: GPIO 5</span>
                    </div>
                  </div>
                  {controls.pump_state && (
                    <span className="px-2 py-0.5 bg-sky-950 text-sky-400 border border-sky-800 text-[8px] rounded font-mono uppercase font-bold tracking-widest animate-pulse">watering active</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 my-2">
                  <div className="bg-[#050608] p-4 border border-cyber-border rounded-xl space-y-2">
                    <span className="text-[9px] text-slate-500 uppercase font-mono">Override Mode</span>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${controls.manual_mode ? 'text-yellow-500' : 'text-sky-400'}`}>
                        {controls.manual_mode ? 'MANUAL' : 'AUTO'}
                      </span>
                      <label className="switch">
                        <input type="checkbox" checked={controls.manual_mode} onChange={(e) => pushControl("manual_mode", e.target.checked)} />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-[#050608] p-4 border border-cyber-border rounded-xl flex flex-col justify-between">
                    <span className="text-[9px] text-slate-500 uppercase font-mono mb-2">Relay state</span>
                    <button 
                      disabled={!controls.manual_mode}
                      onClick={() => pushControl("pump_state", !controls.pump_state)}
                      className={`w-full py-2 rounded-xl font-bold text-[10px] uppercase transition-all ${
                        controls.manual_mode 
                          ? controls.pump_state 
                            ? 'bg-sky-600 border border-sky-400 text-white shadow-[0_0_10px_rgba(14,165,233,0.3)]' 
                            : 'bg-slate-900 border border-slate-700 text-slate-400'
                          : 'bg-[#10131d] border border-slate-900 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {controls.pump_state ? 'Pump ON' : 'Pump OFF'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 bg-[#050608] p-4 border border-cyber-border rounded-xl mt-4">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400">🎯 Irrigation Target Moisture:</span>
                    <strong className="text-sky-400 text-sm">{controls.moisture_threshold}%</strong>
                  </div>
                  <input 
                    type="range" min="10" max="80" step="5" 
                    value={controls.moisture_threshold} 
                    onChange={(e) => pushControl("moisture_threshold", parseInt(e.target.value))} 
                    className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" 
                  />
                </div>
              </div>

              {/* GROW LIGHT ACTUATOR CARD */}
              <div className="cyber-card p-6 border-l-4 border-l-purple-500 flex flex-col justify-between min-h-[300px]">
                <div className="flex items-center justify-between border-b border-[#141c2c] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-purple-950 text-purple-400 rounded-lg">🔮</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">Everlight UV Grow Light</h4>
                      <span className="text-[10px] text-slate-500 font-mono block">Actuator Direct Drive: GPIO 12</span>
                    </div>
                  </div>
                  {controls.grow_light_state && (
                    <span className="px-2 py-0.5 bg-purple-950 text-purple-400 border border-purple-800 text-[8px] rounded font-mono uppercase font-bold tracking-widest animate-pulse">uv active</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 my-2">
                  <div className="bg-[#050608] p-4 border border-cyber-border rounded-xl space-y-2">
                    <span className="text-[9px] text-slate-500 uppercase font-mono">Override Mode</span>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${controls.light_manual_mode ? 'text-yellow-500' : 'text-purple-400'}`}>
                        {controls.light_manual_mode ? 'MANUAL' : 'AUTO'}
                      </span>
                      <label className="switch">
                        <input type="checkbox" checked={controls.light_manual_mode} onChange={(e) => pushControl("light_manual_mode", e.target.checked)} />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="bg-[#050608] p-4 border border-cyber-border rounded-xl flex flex-col justify-between">
                    <span className="text-[9px] text-slate-500 uppercase font-mono mb-2">LED state</span>
                    <button 
                      disabled={!controls.light_manual_mode}
                      onClick={() => pushControl("grow_light_state", !controls.grow_light_state)}
                      className={`w-full py-2 rounded-xl font-bold text-[10px] uppercase transition-all ${
                        controls.light_manual_mode 
                          ? controls.grow_light_state 
                            ? 'bg-purple-600 border border-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                            : 'bg-slate-900 border border-slate-700 text-slate-400'
                          : 'bg-[#10131d] border border-slate-900 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {controls.grow_light_state ? 'LED ON' : 'LED OFF'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 bg-[#050608] p-4 border border-cyber-border rounded-xl mt-4">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400">☀️ LDR Activation Threshold:</span>
                    <strong className="text-purple-400 text-sm">{controls.light_threshold}%</strong>
                  </div>
                  <input 
                    type="range" min="10" max="90" step="5" 
                    value={controls.light_threshold} 
                    onChange={(e) => pushControl("light_threshold", parseInt(e.target.value))} 
                    className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" 
                  />
                </div>
              </div>

            </div>

            {/* Meteorological warnings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#050608] p-5 border border-[#141c2c] rounded-xl flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <CloudRain className="w-6 h-6 text-yellow-500 animate-bounce" />
                  <div>
                    <span className="text-slate-500 block uppercase text-[8px]">Delhi Weather Override</span>
                    <strong className="text-white text-xs">{controls.weather_override === 1 ? 'Precipitation Block Active' : 'Normal Conditions'}</strong>
                  </div>
                </div>
                <button onClick={() => pushControl("weather_override", controls.weather_override === 1 ? 0 : 1)} className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 font-bold uppercase text-[10px]">Toggle</button>
              </div>
              
              <div className="bg-[#050608] p-5 border border-[#141c2c] rounded-xl flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <Cpu className="w-6 h-6 text-emerald-400" />
                  <div>
                    <span className="text-slate-500 block uppercase text-[8px]">Gated soil VCC</span>
                    <strong className="text-white text-xs">Electrolysis Block Safe</strong>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded text-[9px] font-bold">ACTIVE</span>
              </div>
            </div>

          </section>
        )}

        {/* 3. PATHOLOGY SCANNER LAB (VERDE LEAF CONSULTANT) */}
        {activeTab === 'pathology' && (
          <section className="space-y-8 animate-fade-in max-w-5xl">
            
            <div className="border-b border-[#141c2c] pb-4">
              <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest">Verde Leaf Consultant (General AI Pathology)</h2>
              <p className="text-xs text-slate-400">Trigger captures, upload leaf photos, and chat with your botanical specialist</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              <div className="space-y-6">
                {/* Lens Frame */}
                <div className="relative bg-black border border-[#141c2c] rounded-2xl overflow-hidden flex flex-col items-center justify-center h-64 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                  {latestScan.imageUrl ? (
                    <img src={latestScan.imageUrl} alt="Foliage Scanned" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-2 select-none">
                      <ImageIcon className="w-12 h-12 text-slate-700 animate-pulse" />
                      <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">Awaiting over-the-air payload</span>
                    </div>
                  )}

                  {isScanning && (
                    <div className="absolute inset-0 bg-[#000000cc]/95 flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="w-10 h-10 text-[#10b981] animate-spin" />
                      <span className="text-xs font-mono text-[#10b981] uppercase tracking-widest animate-pulse font-bold">Triggering Wireless ESP32-CAM...</span>
                    </div>
                  )}
                </div>

                <button 
                  disabled={isScanning}
                  onClick={handleTriggerCapture}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold py-3.5 px-4 rounded-xl transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(16,185,129,0.2)]"
                >
                  <Camera className="w-4 h-4" /> Trigger Wireless Leaf Scan
                </button>
              </div>

              {/* General Pathology Consultant Chat Bot */}
              <div className="cyber-card p-5 flex flex-col justify-between min-h-[360px] border-l-4 border-l-emerald-500">
                <div className="border-b border-[#141c2c] pb-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" /> Ask Verde Leaf Consultant
                  </span>
                </div>

                <div className="bg-[#020305] p-3 rounded-xl border border-[#141c2c] flex-1 overflow-y-auto text-[11px] font-mono space-y-3 flex flex-col h-48 shadow-inner select-text">
                  {consultantMessages.map((m, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2.5 rounded-xl space-y-1 ${
                        m.role === 'user' 
                          ? 'self-end max-w-[85%] bg-blue-950/60 border border-blue-900/60 text-right' 
                          : 'self-start max-w-[85%] bg-[#080d16]/80 border border-[#141c2c]'
                      }`}
                    >
                      <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{m.sender}</div>
                      <div className="text-slate-200 leading-relaxed whitespace-pre-line">{m.text}</div>
                    </div>
                  ))}
                  {isConsultantLoading && (
                    <div className="self-start max-w-[85%] bg-emerald-950/20 border border-emerald-900/20 p-2 rounded-lg text-slate-400 animate-pulse">
                      Consultant thinking...
                    </div>
                  )}
                  <div ref={consultantChatEndRef} />
                </div>

                <form onSubmit={handleConsultantChatSubmit} className="flex gap-2 mt-3">
                  <input 
                    type="text" 
                    value={consultantInput}
                    onChange={(e) => setConsultantInput(e.target.value)}
                    placeholder="Ask about general care, NPK parameters, yellow spots..." 
                    className="flex-1 bg-[#050608] border border-cyber-border rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-all font-mono"
                  />
                  <button type="submit" className="bg-[#10b981] hover:bg-emerald-500 text-black font-mono font-black px-4 rounded-xl transition-all flex items-center justify-center">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

            </div>

          </section>
        )}

        {/* 4. CHAT BOT TERMINAL SECTION (REAL-TIME VERDE BOT) */}
        {activeTab === 'chat' && (
          <section className="space-y-8 animate-fade-in max-w-5xl">
            
            <div className="border-b border-[#141c2c] pb-4">
              <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest">Real-Time Verde Bot (Telemetry Companion)</h2>
              <p className="text-xs text-slate-400">Conversational AI fed with actual real-time physical sensor data</p>
            </div>

            <div className="cyber-card p-6 flex flex-col justify-between space-y-4 border-l-4 border-l-[#10b981] min-h-[420px]">
              
              {/* Live Telemetry Status Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#020305] p-3 rounded-xl border border-cyber-border text-[10px] font-mono">
                <div className="text-center">Moisture: <strong className="text-emerald-400">{sensors.moisture}%</strong></div>
                <div className="text-center">Light: <strong className="text-purple-400">{sensors.lux} Lx</strong></div>
                <div className="text-center">Climate: <strong className="text-cyan-400">{sensors.temperature.toFixed(1)}°C</strong></div>
                <div className="text-center">Water: <strong className="text-sky-400">{sensors.tank_level}%</strong></div>
              </div>

              {/* Monospace Chat Area */}
              <div className="bg-[#020305] p-4 rounded-xl border border-[#141c2c] flex-1 overflow-y-auto text-xs font-mono space-y-3 flex flex-col shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] select-text h-64">
                {realtimeMessages.map((m, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-xl space-y-1 ${
                      m.role === 'user' 
                        ? 'self-end max-w-[85%] bg-blue-950/60 border border-blue-900/60 text-right' 
                        : 'self-start max-w-[85%] bg-[#080d16]/80 border border-[#141c2c]'
                    }`}
                  >
                    <div className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{m.sender}</div>
                    <div className="text-slate-200 leading-relaxed whitespace-pre-line">{m.text}</div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="self-start max-w-[85%] bg-emerald-950/20 border border-emerald-900/20 p-2.5 rounded-lg text-slate-400 animate-pulse">
                    Verde Bot reading sensors...
                  </div>
                )}
                <div ref={realtimeChatEndRef} />
              </div>

              <form onSubmit={handleRealtimeChatSubmit} className="flex gap-2">
                <input 
                  type="text" 
                  value={realtimeInput}
                  onChange={(e) => setRealtimeInput(e.target.value)}
                  placeholder="Ask me 'is my plant okay?', 'why is pump idle?'..." 
                  className="flex-1 bg-[#050608] border border-cyber-border rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500 transition-all font-mono"
                />
                <button type="submit" className="bg-[#10b981] hover:bg-emerald-500 text-black font-mono font-black px-6 rounded-xl transition-all flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </button>
              </form>

            </div>

          </section>
        )}

        {/* 5. INTERACTIVE LIVE TERMINAL SHELL BLOCK */}
        <section className="max-w-5xl cyber-card p-6 border-l-4 border-l-emerald-500 space-y-4 bg-black">
          <div className="border-b border-[#141c2c] pb-2 flex justify-between items-center">
            <span className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#10b981]" /> Active Terminal Shell Commands
            </span>
            <span className="text-[9px] bg-slate-900 px-2 py-0.5 rounded text-[#10b981] border border-emerald-950 font-mono uppercase font-bold animate-pulse">Interactive</span>
          </div>

          {/* Scrolling active logs */}
          <div className="bg-[#020305] border border-slate-950 p-4 rounded-xl h-44 overflow-y-auto text-[10px] text-slate-400 font-mono space-y-1 select-text">
            {terminalLogs.map((logLine, idx) => (
              <div key={idx} className="flex items-start gap-1">
                <ChevronRight className="w-3.5 h-3.5 text-[#10b981] shrink-0 mt-0.5" />
                <span>{logLine}</span>
              </div>
            ))}
          </div>

          {/* Interactive Shell Input Form */}
          <form onSubmit={handleShellCommandSubmit} className="flex gap-2">
            <input 
              type="text" 
              value={shellInput}
              onChange={(e) => setShellInput(e.target.value)}
              placeholder="Type /irrigate, /stop, /photo, or clear..." 
              className="flex-1 bg-[#050608] border border-cyber-border rounded-xl px-4 py-3 text-xs text-emerald-400 placeholder-emerald-950 outline-none focus:border-emerald-500 transition-all font-mono shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]"
            />
            <button type="submit" className="bg-[#10b981] hover:bg-emerald-500 text-black font-mono font-black px-6 rounded-xl transition-all flex items-center justify-center">
              Execute
            </button>
          </form>
        </section>

      </main>

    </div>
  );
}

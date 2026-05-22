import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DeviceCard from './components/DeviceCard';
import SmartAssistant from './components/SmartAssistant';
import ESP32Integration from './components/ESP32Integration';
import { Device, ActivityLog, ActiveTab } from './types';
// @ts-ignore
import storeHeroBanner from './assets/images/store_hero_banner_1779440575571.png';
import { 
  CloudSun, 
  Activity, 
  ShieldCheck, 
  Tv, 
  Sun, 
  Zap, 
  ChevronRight, 
  Sparkles, 
  Play, 
  Pause, 
  Sliders, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  Lightbulb,
  Music,
  Power,
  RefreshCw,
  Compass,
  Edit2,
  Check,
  Plus,
  X,
  Settings,
  Camera,
  Video,
  Eye,
  ZoomIn,
  Maximize2,
  Volume2,
  VolumeX
} from 'lucide-react';

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [atHomeMode, setAtHomeMode] = useState<boolean>(true);
  const [sleepMode, setSleepMode] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>("Julian");
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [energyRange, setEnergyRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedEnergyBar, setSelectedEnergyBar] = useState<number | null>(null);
  
  // Inline Device Addition states
  const [newDeviceName, setNewDeviceName] = useState<string>("");
  const [newDeviceType, setNewDeviceType] = useState<string>("light");
  const [newDeviceRoom, setNewDeviceRoom] = useState<string>("Showroom Mũi Né");
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // Live Camera monitoring states
  const [selectedCamera, setSelectedCamera] = useState<string>("CAM-01");
  const [cameraNightVision, setCameraNightVision] = useState<boolean>(false);
  const [cameraZoom, setCameraZoom] = useState<boolean>(false);
  const [cameraAudio, setCameraAudio] = useState<boolean>(false);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('atrium-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('atrium-theme', theme);
    if (theme === 'light') {
      document.body.style.backgroundColor = '#f8fafc';
      document.body.style.color = '#1e293b';
    } else {
      document.body.style.backgroundColor = '#0a0b0d';
      document.body.style.color = '#e2e8f0';
    }
  }, [theme]);

  // Fetch full grid diagnostics and device configuration
  const fetchState = async () => {
    try {
      const resp = await fetch('/api/devices');
      if (resp.ok) {
        const data = await resp.json();
        setDevices(data.devices || []);
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to connect to Atrium Server. Falling back to local states.", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    // Intermittent poll to sync Gemini background commands
    const timer = setInterval(() => {
      fetchState();
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  // CCTV Live-ticking clock
  const [cameraTime, setCameraTime] = useState<string>("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const pad = (num: number) => String(num).padStart(2, '0');
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
      setCameraTime(`${dateStr} ${timeStr}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync state mutation on Express endpoints
  const updateDevice = async (id: string, update: Partial<Device>) => {
    // Optimistic state updates for zero-lag performance
    setDevices(prev => 
      prev.map(d => d.id === id ? { ...d, ...update } as Device : d)
    );

    try {
      const resp = await fetch(`/api/devices/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(update)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.device) {
          // Re-align with server's authorized parameters
          setDevices(prev => 
            prev.map(d => d.id === id ? data.device : d)
          );
          // Auto refresh diagnostics logging
          const logsResp = await fetch('/api/logs');
          if (logsResp.ok) {
            const logsData = await logsResp.json();
            setLogs(logsData.logs || []);
          }
        }
      }
    } catch (err) {
      console.error("Network error during device sync: ", err);
    }
  };

  // Delete device from system
  const deleteDevice = async (id: string) => {
    // Optimistic delete
    setDevices(prev => prev.filter(d => d.id !== id));
    try {
      const resp = await fetch(`/api/devices/${id}`, {
        method: 'DELETE'
      });
      if (resp.ok) {
        const logsResp = await fetch('/api/logs');
        if (logsResp.ok) {
          const logsData = await logsResp.json();
          setLogs(logsData.logs || []);
        }
      }
    } catch (err) {
      console.error("Failed to delete device: ", err);
    }
  };

  // Add new device to system
  const addDevice = async (name: string, type: string, room: string) => {
    try {
      const resp = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, type, room })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.device) {
          setDevices(prev => [...prev, data.device]);
          const logsResp = await fetch('/api/logs');
          if (logsResp.ok) {
            const logsData = await logsResp.json();
            setLogs(logsData.logs || []);
          }
        }
      }
    } catch (err) {
      console.error("Failed to add device: ", err);
    }
  };

  // Add new diagnostic logs to Atrium Core
  const addLog = async (message: string, type: 'info' | 'auth' | 'alert' | 'voice' = 'info') => {
    // Optimistic log layout
    const newLog: ActivityLog = {
      id: String(Date.now() + Math.random()),
      timestamp: new Date().toISOString(),
      message,
      type
    };
    setLogs(prev => [newLog, ...prev]);

    try {
      const resp = await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, type })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.logs) {
          setLogs(data.logs);
        }
      }
    } catch (err) {
      console.error("Failed to post system diagnostics log: ", err);
    }
  };

  // Reset demo structure
  const handleReset = async () => {
    try {
      const resp = await fetch('/api/devices/reset', { method: 'POST' });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          setDevices(data.devices);
          fetchState();
        }
      }
    } catch (err) {
      console.error("Failed to reset Atrium demo grid: ", err);
    }
  };

  // Assistant pipeline callback
  const onAssistantAction = async (message: string) => {
    try {
      const resp = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.updatedDevices) {
          setDevices(data.updatedDevices);
        }
        // Immediately fetch audit logs
        const logsResp = await fetch('/api/logs');
        if (logsResp.ok) {
          const logsData = await logsResp.json();
          setLogs(logsData.logs || []);
        }
        return { textResponse: data.textResponse, success: true };
      }
      return { textResponse: "Atrium hub offline. Check connectivity.", success: false };
    } catch (err: any) {
      return { textResponse: `Communications failure: ${err.message}`, success: false };
    }
  };

  // Automated Routine triggers
  const executeSleepRoutine = () => {
    const isSleeping = !sleepMode;
    setSleepMode(isSleeping);
    
    if (isSleeping) {
      // Secure everything
      devices.forEach(d => {
        if (d.type === 'light') {
          updateDevice(d.id, { status: 'off', value: 0 });
        } else if (d.type === 'lock' && d.id === 'front_door_lock') {
          updateDevice(d.id, { status: 'locked' });
        } else if (d.type === 'lock' && d.id === 'garage_door') {
          updateDevice(d.id, { status: 'closed' });
        } else if (d.type === 'media') {
          updateDevice(d.id, { status: 'paused' });
        } else if (d.type === 'climate') {
          updateDevice(d.id, { value: 68, mode: 'eco' });
        }
      });
    } else {
      // Return to daylight mode
      devices.forEach(d => {
        if (d.id === 'living_light') {
          updateDevice(d.id, { status: 'on', value: 80 });
        } else if (d.id === 'ac_unit') {
          updateDevice(d.id, { status: 'on', value: 72, mode: 'cool' });
        }
      });
    }
  };

  const triggerBulkScene = (scene: 'cozy' | 'eco_saver' | 'daylight') => {
    if (scene === 'cozy') {
      updateDevice('living_light', { status: 'on', value: 25, color: '#FBBF24' });
      updateDevice('dining_light', { status: 'off' });
      updateDevice('ac_unit', { status: 'on', value: 70, mode: 'cool' });
      updateDevice('smart_music', { status: 'playing', track: "Ambient Focus on Spotify", artist: "Monroe", value: 40 });
    } else if (scene === 'eco_saver') {
      devices.forEach(d => {
        if (d.type === 'light') updateDevice(d.id, { status: 'off' });
        if (d.type === 'switch') updateDevice(d.id, { status: 'off' });
        if (d.type === 'media') updateDevice(d.id, { status: 'paused' });
        if (d.type === 'vacuum') updateDevice(d.id, { status: 'docked' });
        if (d.type === 'climate') updateDevice(d.id, { mode: 'eco', value: 74 });
      });
    } else if (scene === 'daylight') {
      updateDevice('living_light', { status: 'on', value: 100, color: '#F1F5F9' });
      updateDevice('dining_light', { status: 'on', value: 90, color: '#F1F5F9' });
      updateDevice('kitchen_light', { status: 'on', value: 100, color: '#F1F5F9' });
      updateDevice('ac_unit', { status: 'on', value: 72, mode: 'fan' });
    }
  };

  // Dynamic statistics calculations
  const activeLightsCount = devices.filter(d => d.type === 'light' && d.status === 'on').length;
  
  const acDevice = devices.find(d => d.id === 'ac_unit');
  const indoorTemp = acDevice && acDevice.status === 'on' ? `${acDevice.value}°F` : '72°F';
  
  // Simulated home wattage usage
  const calculateTotalEnergyUsage = () => {
    let base = 120; // stand-by appliances draw
    devices.forEach(d => {
      if (d.status === 'on' || d.status === 'playing' || d.status === 'cleaning') {
        if (d.type === 'light') base += Math.round((d.value || 50) * 0.4);
        if (d.type === 'climate') base += d.mode === 'eco' ? 320 : 750;
        if (d.type === 'media') base += 80;
        if (d.type === 'vacuum') base += 120;
        if (d.type === 'switch') base += 60;
      }
    });
    return base;
  };

  const mockEnergyData = {
    daily: [
      { time: '00:00', draw: 0.3 },
      { time: '04:00', draw: 0.2 },
      { time: '08:00', draw: 1.1 },
      { time: '12:00', draw: 0.8 },
      { time: '16:00', draw: 1.5 },
      { time: '20:00', draw: 1.8 },
      { time: 'Now', draw: parseFloat((calculateTotalEnergyUsage() / 1000).toFixed(2)) }
    ],
    weekly: [
      { time: 'Mon', draw: 9.2 },
      { time: 'Tue', draw: 11.4 },
      { time: 'Wed', draw: 10.1 },
      { time: 'Thu', draw: 8.5 },
      { time: 'Fri', draw: 12.3 },
      { time: 'Sat', draw: 14.6 },
      { time: 'Sun', draw: 13.0 }
    ],
    monthly: [
      { time: 'W1', draw: 78.5 },
      { time: 'W2', draw: 82.1 },
      { time: 'W3', draw: 69.4 },
      { time: 'W4', draw: 75.0 }
    ]
  };

  const getGreeting = () => {
    const hours = new Date().getUTCHours();
    if (hours < 12) return "Chào buổi sáng";
    if (hours < 17) return "Chào buổi chiều";
    return "Chào buổi tối";
  };

  return (
    <div id="atrium-app" className="h-[100%]" style={{ height: "100%", margin: 0 }}>
      <div className={`min-h-screen flex overflow-hidden font-sans selection:bg-cyan-500/30 transition-colors duration-300 ${theme === 'light' ? 'bg-[#f8fafc] text-slate-800' : 'bg-[#0a0b0d] text-slate-200'}`}>
        
        {/* Dynamic Glowing Radial Overlay matching Immersive Theme */}
        <div className={`absolute inset-0 pointer-events-none pointer-events-none z-0 transition-opacity duration-300 ${theme === 'light' ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.08),transparent_55%)]' : 'bg-[radial-gradient(circle_at_50%_0%,rgba(16,45,60,0.44),transparent_55%)]'}`}></div>

        {/* Sidebar Nav section */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onReset={handleReset} 
          logsCount={logs.length}
          theme={theme}
        />

        {/* Main Content Board */}
        <main className="flex-1 flex flex-col p-8 lg:p-10 overflow-y-auto z-10 relative">
          
          {/* Header Bar */}
          <header id="app-header" className={`flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 border-b pb-6 transition-colors duration-300 ${theme === 'light' ? 'border-slate-200/80' : 'border-white/5'}`}>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className={`text-3xl lg:text-4xl font-light tracking-tight flex items-center gap-2 transition-colors duration-300 ${theme === 'light' ? 'text-slate-850' : 'text-white'}`}>
                  {getGreeting()}, 
                  {isEditingName ? (
                    <span className={`inline-flex items-center border border-cyan-500/30 rounded-xl px-2 py-0.5 transition-colors duration-300 ${theme === 'light' ? 'bg-slate-100' : 'bg-[#161b22]'}`}>
                      <input 
                        type="text" 
                        value={customName} 
                        onChange={(e) => setCustomName(e.target.value)}
                        className={`bg-transparent border-none font-bold max-w-[150px] text-2xl focus:outline-none ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}
                        autoFocus
                      />
                      <button 
                        onClick={() => setIsEditingName(false)}
                        className="text-cyan-400 hover:text-white ml-1 p-1"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </span>
                  ) : (
                    <span className="font-semibold flex items-center group">
                      {customName}
                      <button 
                        onClick={() => setIsEditingName(true)}
                        className="text-slate-500 hover:text-cyan-400 opacity-0 group-hover:opacity-100 ml-2 transition-all p-1"
                        title="Chỉnh sửa tên hiển thị"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                </h1>
              </div>
              <p className={`mt-1.5 text-xs lg:text-sm font-medium transition-colors duration-300 ${theme === 'light' ? 'text-slate-550' : 'text-slate-450'}`}>
                Hệ thống Grid hợp nhất đang hoạt động. Có <span className="text-cyan-400 font-bold">{activeLightsCount} thiết bị chiếu sáng</span> và {devices.filter(d => d.status === 'on' || d.status === 'playing' || d.status === 'cleaning').length} thiết bị đang bật.
              </p>
            </div>

            <div className="flex items-center gap-4 lg:gap-6 shrink-0 font-sans">
              <div className="text-right">
                <p className={`text-2xl font-bold font-mono flex items-center justify-end gap-1 transition-colors duration-300 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                  <span>72°F</span> 
                  <span className="text-xs text-slate-500 font-normal">/ 22°C</span>
                </p>
                <div className="flex items-center gap-1.5 text-[10px] justify-end uppercase tracking-widest text-cyan-500 font-bold">
                  <CloudSun className="w-3.5 h-3.5" />
                  <span>Thời tiết dễ chịu</span>
                </div>
              </div>
              <div className={`h-10 w-[1px] hidden sm:block ${theme === 'light' ? 'bg-slate-200' : 'bg-white/10'}`}></div>
              <div className="flex gap-2">
                <button 
                  id="btn-toggle-theme"
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  title="Thay đổi giao diện"
                  className={`px-3 py-2 border rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 ${
                    theme === 'light'
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-350 text-slate-700 shadow-sm'
                      : 'border-white/5 bg-black/30 text-slate-400 hover:text-white hover:border-white/10'
                  }`}
                >
                  {theme === 'light' ? '🌙 Chế độ Tối' : '☀️ Chế độ Sáng'}
                </button>
                <button 
                  id="btn-toggle-at-home"
                  onClick={() => setAtHomeMode(!atHomeMode)}
                  className={`px-3.5 py-2 border rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    atHomeMode 
                      ? (theme === 'light' ? 'bg-cyan-50 border-cyan-300 text-cyan-700 shadow-[0_2px_8px_rgba(6,182,212,0.1)]' : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]')
                      : (theme === 'light' ? 'border-slate-200 bg-slate-100 text-slate-500' : 'border-white/5 bg-black/30 text-slate-500')
                  }`}
                >
                  {atHomeMode ? '● Ở nhà' : 'Vắng nhà'}
                </button>
                <button 
                  id="btn-toggle-sleep-mode"
                  onClick={executeSleepRoutine}
                  className={`px-3.5 py-2 border rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                    sleepMode 
                      ? (theme === 'light' ? 'bg-cyan-50 border-cyan-300 text-cyan-700 shadow-[0_2px_8px_rgba(6,182,212,0.1)]' : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]')
                      : (theme === 'light' ? 'border-slate-200 bg-slate-100 text-slate-500' : 'border-white/5 bg-black/30 text-slate-500')
                  }`}
                >
                  {sleepMode ? '● Đang ngủ' : 'Chế độ ngủ'}
                </button>
              </div>
            </div>
          </header>

          {/* Tab Views rendering switcher */}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div id="tab-content-overview" className="space-y-6">
              
              {/* Top Row Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                
                {/* Main Hero Scene Card (8/12 cols) */}
                <div className={`xl:col-span-8 rounded-[2rem] relative overflow-hidden group h-96 xl:h-auto min-h-[380px] flex flex-col justify-end p-8 border transition-all duration-300 ${theme === 'light' ? 'bg-white border-slate-200/80 shadow-md shadow-slate-100' : 'bg-[#161b22] border-white/5 shadow-inner'}`}>
                  {/* Custom High Quality store_hero_banner cropped to top portion as requested */}
                  <div 
                    className="absolute inset-0 bg-cover bg-[position:center_top] opacity-75 group-hover:scale-105 transition-transform duration-1000" 
                    style={{ backgroundImage: `url(${storeHeroBanner})` }}
                  ></div>
                  <div className={`absolute inset-0 bg-gradient-to-t transition-all duration-300 z-10 ${theme === 'light' ? 'from-[#f8fafc] via-[#f8fafc]/85 to-[#f8fafc]/20' : 'from-[#0a0b0d] via-[#0a0b0d]/85 to-[#0a0b0d]/20'}`}></div>
                  
                  {/* Content inside hero scene container */}
                  <div className="relative z-20 font-sans">
                    <span className="px-3 py-1 bg-cyan-400 rounded text-[9px] font-extrabold uppercase tracking-widest text-black">TRUNG TÂM ĐIỀU HÀNH</span>
                    <h2 className={`text-3xl lg:text-4xl font-light mt-3 lg:mt-4 leading-none transition-colors ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      MÁY TÍNH MŨI NÉ <span className="font-semibold block sm:inline">Showroom</span>
                    </h2>
                    <p className={`text-xs max-w-md mt-2 font-medium transition-colors ${theme === 'light' ? 'text-slate-700 bg-white/40 p-1.5 rounded-lg' : 'text-slate-300 bg-black/40 p-1.5 rounded-lg'}`}>
                      Hệ thống quản lý thông minh giúp điều chỉnh ánh sáng LED trang trí, thiết bị trưng bày và giám sát an ninh.
                    </p>
                    
                    <div className={`flex flex-wrap gap-4 mt-6 text-xs transition-colors ${theme === 'light' ? 'text-slate-700 font-medium' : 'text-slate-350'}`}>
                      <span className="flex items-center gap-2 font-mono text-[11px] font-semibold">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_cyan]"></span> 
                        {activeLightsCount} Thiết bị chiếu sáng đang hoạt động
                      </span>
                      <span className="flex items-center gap-2 font-mono text-[11px] font-semibold">
                        <span className={`w-2 h-2 rounded-full ${devices.find(d => d.id === 'front_door_lock')?.status === 'locked' ? 'bg-[#06b6d4] shadow-[0_0_6px_#06b6d4]' : 'bg-rose-500 animate-pulse'}`}></span> 
                        Khóa vành đai đã được kích hoạt
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-6">
                      <button 
                        id="btn-macro-cozy"
                        onClick={() => triggerBulkScene('cozy')}
                        className="px-4 py-2.5 bg-cyan-500 text-black text-xs font-bold rounded-xl hover:bg-cyan-400 hover:shadow-[0_0_12px_rgba(6,182,212,0.4)] transition-all font-sans active:scale-95"
                      >
                        Kích hoạt Chế độ Ấm cúng
                      </button>
                      <button 
                        id="btn-macro-eco"
                        onClick={() => triggerBulkScene('eco_saver')}
                        className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all font-sans border ${theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10 text-white'}`}
                      >
                        Tiết kiệm Năng lượng Tối đa
                      </button>
                      <button 
                        id="btn-macro-daylight"
                        onClick={() => triggerBulkScene('daylight')}
                        className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all font-sans border ${theme === 'light' ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10 text-white'}`}
                      >
                        Ánh sáng Mặt trời Sáng
                      </button>
                    </div>
                  </div>
                </div>

                {/* Side Panels Combo (4/12 cols) */}
                <div className="xl:col-span-4 flex flex-col gap-6">
                  
                  {/* Energy Usage Widget */}
                  <div className={`rounded-[2rem] p-6 backdrop-blur-sm flex-1 flex flex-col justify-between border transition-all duration-300 ${theme === 'light' ? 'bg-white border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)]' : 'bg-[#161b22]/50 border-white/5'}`}>
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-500 flex items-center gap-1.5 font-mono">
                          <Zap className="w-4 h-4 text-cyan-500" />
                          <span>Điện năng tiêu thụ</span>
                        </h3>
                        <div className={`flex gap-1 p-0.5 rounded-lg border transition-colors ${theme === 'light' ? 'bg-slate-100 border-slate-250' : 'bg-black/40 border-white/5'}`}>
                          {(['daily', 'weekly', 'monthly'] as const).map(type => (
                            <button
                              key={type}
                              onClick={() => {
                                setEnergyRange(type);
                                setSelectedEnergyBar(null);
                              }}
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md transition-all ${
                                energyRange === type 
                                  ? (theme === 'light' ? 'bg-cyan-100 text-cyan-700 shadow-sm' : 'bg-cyan-500/10 text-cyan-400')
                                  : (theme === 'light' ? 'text-slate-500 hover:text-slate-750' : 'text-slate-500 hover:text-slate-350')
                              }`}
                            >
                              {type === 'daily' ? 'Ngày' : type === 'weekly' ? 'Tuần' : 'Tháng'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-extralight font-mono tracking-tighter transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                          {energyRange === 'daily' 
                            ? (calculateTotalEnergyUsage() / 1000).toFixed(2) 
                            : energyRange === 'weekly' ? '12.4' : '76.2'
                          }
                        </span>
                        <span className="text-sm font-semibold text-slate-500 uppercase font-mono">kWh/giờ</span>
                      </div>
                      <p className={`text-[10px] font-mono font-bold mt-1 uppercase tracking-wide transition-colors ${theme === 'light' ? 'text-cyan-600' : 'text-cyan-405'}`}>
                        Tải mạng lưới được tối ưu hóa -12.4%
                      </p>
                    </div>

                    {/* Highly-styled responsive SVG Energy draw bar logs */}
                    <div className="mt-6">
                      <div className="h-16 flex items-end gap-1.5">
                        {mockEnergyData[energyRange].map((item, idx) => {
                          const maxVal = Math.max(...mockEnergyData[energyRange].map(i => i.draw));
                          const heightPct = Math.round((item.draw / maxVal) * 100);
                          const isSelected = selectedEnergyBar === idx;
                          return (
                            <div 
                              key={idx} 
                              onClick={() => setSelectedEnergyBar(isSelected ? null : idx)}
                              className="flex-1 flex flex-col items-center cursor-pointer group"
                              title={`${item.time === 'Now' ? 'Hiện tại' : item.time}: ${item.draw} kWh`}
                            >
                              <div className="w-full relative h-16 flex items-end">
                                <div 
                                  className={`w-full rounded-t-md transition-all duration-300 ${
                                    item.time === 'Now' 
                                      ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]' 
                                      : isSelected
                                      ? 'bg-cyan-500 shadow-[0_0_6px_cyan]'
                                      : (theme === 'light' ? 'bg-slate-200 group-hover:bg-slate-300' : 'bg-white/5 group-hover:bg-white/10')
                                  }`}
                                  style={{ height: `${heightPct}%` }}
                                ></div>
                              </div>
                              <span className="text-[9px] mt-1.5 font-mono text-slate-500 tracking-wide font-medium leading-none">
                                {item.time === 'Now' ? 'Hiện tại' : item.time}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Interactive bar values output */}
                      {selectedEnergyBar !== null && (
                        <div className={`mt-2 text-center p-1.5 rounded-xl border text-[10px] font-mono transition-colors ${theme === 'light' ? 'bg-slate-50 border-slate-205 text-cyan-700 shadow-inner' : 'bg-black/35 border-white/5 text-cyan-400'}`}>
                          Thời gian đã chọn: <span className={`font-bold ${theme === 'light' ? 'text-slate-850' : 'text-white'}`}>{mockEnergyData[energyRange][selectedEnergyBar].time === 'Now' ? 'Hiện tại' : mockEnergyData[energyRange][selectedEnergyBar].time}</span> - Lượng tiêu thụ là <span className={`font-bold ${theme === 'light' ? 'text-slate-850' : 'text-white'}`}>{mockEnergyData[energyRange][selectedEnergyBar].draw} kWh</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Guard Security Widget */}
                  <div className={`rounded-[2rem] p-6 backdrop-blur-sm flex-1 flex flex-col justify-between border transition-colors duration-300 ${theme === 'light' ? 'bg-white border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)]' : 'bg-[#161b22]/50 border-white/5'}`}>
                    <div>
                      <h3 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-cyan-500 mb-4 flex items-center gap-1.5 font-mono">
                        <ShieldCheck className="w-4 h-4 text-cyan-500" />
                        <span>Tổng quan an ninh</span>
                      </h3>
                      
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${theme === 'light' ? 'border-cyan-205 bg-cyan-50/60 text-cyan-600 shadow-sm' : 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.1)]'}`}>
                          <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        <div>
                          <p className={`font-bold text-sm tracking-tight leading-none mb-1 transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Vành đai an toàn</p>
                          <span className="text-[10px] text-slate-500 font-mono tracking-wider block uppercase">Hệ thống chẩn đoán bình thường</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className={`p-3 rounded-2xl text-center transition-all border ${theme === 'light' ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-black/45 border-white/5 hover:border-[#ffffff10]'}`}>
                        <p className="text-[9px] text-slate-500 uppercase font-mono tracking-widest font-bold">Khóa cửa trước</p>
                        <p className={`text-xs font-bold font-mono mt-1 ${devices.find(d => d.id === 'front_door_lock')?.status === 'locked' ? (theme === 'light' ? 'text-cyan-600' : 'text-cyan-400') : 'text-rose-500'}`}>
                          {devices.find(d => d.id === 'front_door_lock')?.status === 'locked' ? 'ĐÃ KHÓA' : 'ĐANG MỞ'}
                        </p>
                      </div>
                      <div className={`p-3 rounded-2xl text-center transition-all border ${theme === 'light' ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-black/45 border-white/5 hover:border-[#ffffff10]'}`}>
                        <p className="text-[9px] text-slate-500 uppercase font-mono tracking-widest font-bold">Cửa nhà xe</p>
                        <p className={`text-xs font-bold font-mono mt-1 ${devices.find(d => d.id === 'garage_door')?.status === 'closed' ? (theme === 'light' ? 'text-cyan-650' : 'text-cyan-400') : 'text-rose-500 animate-pulse'}`}>
                          {devices.find(d => d.id === 'garage_door')?.status === 'closed' ? 'ĐÃ ĐÓNG' : 'ĐANG MỞ'}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Devices Grid List (General filtering) */}
              <div id="devices-overview-grid" className="pt-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                  <h3 className={`text-md font-bold tracking-tight flex items-center gap-2 transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                    <span>Các thiết bị cốt lõi quan trọng</span>
                    <span className={`text-xs p-1 py-0.5 rounded-lg font-mono border transition-colors ${theme === 'light' ? 'bg-cyan-100 border-cyan-200 text-cyan-700' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'}`}>TẢI HỆ ĐIỀU HÀNH GRID OS</span>
                  </h3>
                  <p className="text-slate-500 text-xs font-medium font-mono">CHỌN DANH MỤC TRÊN SIDEBAR ĐỂ XEM THÊM THIẾT BỊ</p>
                </div>

                {loading ? (
                  <div className="p-12 text-center text-slate-500 font-mono text-xs">
                    Đang thiết lập cơ sở dữ liệu hệ thống...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {/* Render primary devices row */}
                    {devices.slice(0, 8).map(device => (
                      <DeviceCard 
                        key={device.id} 
                        device={device} 
                        onUpdate={updateDevice}
                        onDelete={deleteDevice}
                        theme={theme}
                      />
                    ))}

                    {/* Interactive Add Device Card */}
                    {!isAddingNew ? (
                      <div 
                        id="card-trigger-add-device"
                        onClick={() => {
                          setNewDeviceName("");
                          setNewDeviceRoom("Showroom Mũi Né");
                          setNewDeviceType("light");
                          setIsAddingNew(true);
                        }}
                        className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center min-h-[180px] cursor-pointer transition-all duration-300 group hover:scale-[1.02] shadow-sm ${
                          theme === 'light'
                            ? 'border-slate-300 hover:border-cyan-500 bg-slate-50/50 hover:bg-cyan-50/10 text-slate-500 hover:text-cyan-600'
                            : 'border-white/10 hover:border-cyan-500/40 bg-white/[0.01] hover:bg-cyan-500/[0.02] text-slate-400 hover:text-cyan-400'
                        }`}
                      >
                        <Plus className="w-8 h-8 mb-2 stroke-[1.5] group-hover:scale-110 transition-transform text-cyan-500" />
                        <span className="text-xs font-bold uppercase tracking-wider font-mono">Thêm thiết bị mới</span>
                      </div>
                    ) : (
                      <div 
                        id="card-form-add-device"
                        className={`border rounded-[2rem] p-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] shadow-md ${
                          theme === 'light'
                            ? 'bg-white border-cyan-300 text-slate-805'
                            : 'bg-[#161b22] border-cyan-500/30 text-white'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-mono font-extrabold uppercase text-cyan-400">Tạo thiết bị mới</span>
                            <button 
                              type="button" 
                              onClick={() => { setIsAddingNew(false); }}
                              className={`p-1 rounded-lg border transition-all ${
                                theme === 'light' ? 'hover:bg-slate-100 border-slate-205 text-slate-500' : 'hover:bg-white/5 border-white/5 text-slate-400'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="space-y-2.5 font-sans">
                            <div>
                              <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-0.5">Tên thiết bị</label>
                              <input 
                                type="text" 
                                placeholder="Ví dụ: Đèn Led Viền" 
                                value={newDeviceName}
                                onChange={(e) => setNewDeviceName(e.target.value)}
                                className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all ${
                                  theme === 'light' ? 'bg-white border-slate-200 text-slate-850' : 'bg-black/30 border-white/5 text-white'
                                }`}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-0.5">Khu vực</label>
                                <input 
                                  type="text" 
                                  placeholder="Khu viền LED" 
                                  value={newDeviceRoom}
                                  onChange={(e) => setNewDeviceRoom(e.target.value)}
                                  className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all ${
                                    theme === 'light' ? 'bg-white border-slate-200 text-slate-850' : 'bg-black/30 border-white/5 text-white'
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500 mb-0.5">Loại</label>
                                <select 
                                  value={newDeviceType}
                                  onChange={(e) => setNewDeviceType(e.target.value)}
                                  className={`w-full px-1 py-1.5 rounded-xl text-xs border focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all ${
                                    theme === 'light' ? 'bg-white border-slate-205 text-slate-805' : 'bg-[#1c2128] border-white/5 text-slate-300'
                                  }`}
                                >
                                  <option value="light">💡 Đèn chiếu sáng</option>
                                  <option value="climate">🌡️ Khí hậu</option>
                                  <option value="lock">🔒 Cửa an ninh</option>
                                  <option value="media">🎵 Loa giải trí</option>
                                  <option value="vacuum">🧹 Robot hút bụi</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button 
                            disabled={!newDeviceName.trim()}
                            onClick={() => {
                              if (!newDeviceName.trim()) return;
                              addDevice(newDeviceName, newDeviceType, newDeviceRoom);
                              setNewDeviceName("");
                              setIsAddingNew(false);
                            }}
                            className="w-full py-2 bg-cyan-500 text-black rounded-xl text-[10px] font-extrabold uppercase tracking-wider hover:bg-cyan-400 transition-all hover:shadow-[0_2px_8px_rgba(6,182,212,0.3)] disabled:opacity-50"
                          >
                            Tạo thiết bị
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Activity Logs Console Ticker at bottom */}
              <div className={`rounded-[2rem] p-6 backdrop-blur-sm border transition-colors duration-300 ${theme === 'light' ? 'bg-white border-slate-205 shadow-[0_4px_20px_rgba(0,0,0,0.03)]' : 'bg-black/40 border-white/5'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h4 className={`text-[10px] font-extrabold uppercase tracking-[0.2em] flex items-center gap-2 font-mono transition-colors ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Nhật ký Hoạt động Hệ thống</span>
                  </h4>
                  <span className={`text-[9px] font-mono px-2 py-1 rounded border uppercase transition-colors ${theme === 'light' ? 'text-slate-500 bg-slate-100 border-slate-200' : 'text-slate-500 bg-[#161b22] border-white/5'}`}>Kiểm toán Bình thường</span>
                </div>
                
                <div className="space-y-2.5 max-h-40 overflow-y-auto pr-2 font-mono text-[10px] leading-relaxed scrollbar-thin">
                  {logs.map((log) => (
                    <div 
                      key={log.id} 
                      className={`flex justify-between items-start p-2.5 rounded-xl border transition-all ${
                        log.type === 'voice' 
                          ? (theme === 'light' ? 'bg-cyan-50 border-cyan-200 text-cyan-800' : 'bg-cyan-500/5 border-cyan-500/15 text-cyan-300')
                          : log.type === 'alert'
                          ? (theme === 'light' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-500/5 border-rose-500/15 text-rose-350')
                          : (theme === 'light' ? 'bg-slate-50 border-slate-100/80 text-slate-650 hover:border-slate-300' : 'bg-[#161b22]/40 border-white/5 text-slate-455 hover:border-white/10')
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                          log.type === 'voice' ? 'bg-cyan-400 shadow-[0_0_4px_cyan]' : log.type === 'alert' ? 'bg-rose-500 animate-ping' : 'bg-slate-500'
                        }`}></span>
                        <span>{log.message}</span>
                      </div>
                      <span className={`text-[9px] shrink-0 select-none ml-4 font-mono transition-colors ${theme === 'light' ? 'text-slate-400' : 'text-slate-550'}`}>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CLIMATE TAB */}
          {activeTab === 'climate' && (
            <div id="tab-content-climate" className="space-y-6">
              <div className={`p-6 rounded-[2rem] border backdrop-blur-sm mb-6 transition-all duration-300 ${theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'}`}>
                <h3 className={`text-md font-bold mb-1.5 uppercase tracking-wide transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Thông số Hệ thống khí hậu</h3>
                <p className={`text-xs leading-relaxed transition-colors ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-404'}`}>
                  Hệ thống bơm nhiệt kép chạy các thuật toán làm mát trong nhà. Bật/tắt các bộ phận làm mát, điều chỉnh nhiệt độ mục tiêu và chuyển đổi linh hoạt các chế độ tiết kiệm năng lượng.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.filter(d => d.type === 'climate').map(d => (
                  <DeviceCard key={d.id} device={d} onUpdate={updateDevice} onDelete={deleteDevice} theme={theme} />
                ))}
              </div>

              {/* Climate Stats Graph Simulator */}
              <div className={`p-6 rounded-[2rem] border backdrop-blur-sm transition-colors duration-300 ${theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'}`}>
                <h4 className={`text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 font-mono transition-colors ${theme === 'light' ? 'text-slate-700' : 'text-cyan-400'}`}>Biểu đồ Hiệu suất HVAC</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className={`p-4 rounded-2xl border transition-colors ${theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-black/30 border-white/5'}`}>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Tải trọng Máy nén</span>
                    <p className={`text-2xl font-bold font-mono mt-1 transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>42%</p>
                    <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">NĂNG LƯỢNG KHỚP CAO</span>
                  </div>
                  <div className={`p-4 rounded-2xl border transition-colors ${theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-black/30 border-white/5'}`}>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Tốc độ dòng khí</span>
                    <p className={`text-2xl font-bold font-mono mt-1 transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>11.4 L/s</p>
                    <span className="text-[9px] text-cyan-600 font-bold block mt-0.5">LƯU LƯỢNG ĐẠT CHUẨN</span>
                  </div>
                  <div className={`p-4 rounded-2xl border transition-colors ${theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-black/30 border-white/5'}`}>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Chỉ số Độ ẩm</span>
                    <p className={`text-2xl font-bold font-mono mt-1 transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>48% RH</p>
                    <span className="text-[9px] text-cyan-600 font-bold block mt-0.5">ĐỘ ẨM TỐI ƯU</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LIGHTING TAB */}
          {activeTab === 'lighting' && (
            <div id="tab-content-lighting" className="space-y-6">
              <div className={`p-6 rounded-[2rem] border backdrop-blur-sm mb-6 transition-all duration-300 ${theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'}`}>
                <h3 className={`text-md font-bold mb-1.5 uppercase tracking-wide transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Bảng Điều khiển Hệ thống Chiếu sáng</h3>
                <p className={`text-xs leading-relaxed transition-colors ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-404'}`}>
                  Hiệu chỉnh phạm vi không gian ánh sáng. Bật/tắt các bộ điều chỉnh độ sáng, thay đổi độ sáng của từng bóng đèn và chọn các dải sắc màu phát sáng động.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.filter(d => d.type === 'light').map(d => (
                  <DeviceCard key={d.id} device={d} onUpdate={updateDevice} onDelete={deleteDevice} theme={theme} />
                ))}
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div id="tab-content-security" className="space-y-6">
              <div className={`p-6 rounded-[2rem] border backdrop-blur-sm mb-6 transition-all duration-300 ${theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'}`}>
                <h3 className={`text-md font-bold mb-1.5 uppercase tracking-wide transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Bảng Điều khiển An ninh Vành đai</h3>
                <p className={`text-xs leading-relaxed transition-colors ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-404'}`}>
                  Giám sát khóa lối ra vào, cổng chính và trạng thái an toàn. Khóa hoặc mở khóa trực tiếp các cổng, quản lý luồng CCTV trực tiếp 24/7 và thiết lập giao thức an ninh khép kín.
                </p>
              </div>

              {/* CCTV Live Monitoring Center */}
              <div className={`p-6 rounded-[2rem] border overflow-hidden backdrop-blur-sm transition-all duration-300 ${theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
                  <div>
                    <h3 className={`text-sm font-extrabold uppercase tracking-widest flex items-center gap-2 font-mono ${theme === 'light' ? 'text-slate-850' : 'text-cyan-400'}`}>
                      <Video className="w-4 h-4 animate-pulse text-rose-500" />
                      <span>Hệ Thống Giám Sát Camera AI Trực Tuyến</span>
                    </h3>
                    <p className={`text-[11px] mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                      Truy cập trực tiếp luồng camera an ninh bảo vệ showroom 24/7. Tự động nhận dạng thông minh chu kỳ AI Core.
                    </p>
                  </div>

                  {/* Quick stats on camera feed */}
                  <div className="flex items-center gap-3 font-mono text-[9px] shrink-0">
                    <span className="px-2 py-1 rounded bg-rose-500/10 text-rose-500 font-bold border border-rose-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                      TRỰC TIẾP
                    </span>
                    <span className={`px-2 py-1 rounded border ${theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-black/30 border-white/5 text-slate-400'}`}>
                      FPS: 60Hz
                    </span>
                    <span className={`px-2 py-1 rounded border ${theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-black/30 border-white/5 text-slate-400'}`}>
                      MẠNG: RẤT TỐT
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Huge Live Monitor Screen feeds (8/12 cols) */}
                  <div className="lg:col-span-8 flex flex-col space-y-4">
                    <div className="relative aspect-video rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col justify-between p-6 shadow-2xl group">
                      {/* Lens Shutter Flash overlay */}
                      {shutterFlash && (
                        <div className="absolute inset-0 bg-white z-50 animate-pulse pointer-events-none" />
                      )}

                      {/* CCTV Static / Glitch scanline background simulation */}
                      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none select-none overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#06b6d4]/10 to-transparent" style={{ backgroundSize: '100% 4px' }}></div>
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.8)_100%)]"></div>
                      </div>

                      {/* Video source backdrop illustration based on selected camera zone */}
                      <div className="absolute inset-0 z-[-1] select-none pointer-events-none">
                        {selectedCamera === "CAM-01" && (
                          <div className={`w-full h-full bg-gradient-to-br flex items-center justify-center transition-all ${cameraNightVision ? 'from-green-950/40 via-emerald-950/30 to-green-950/20' : 'from-slate-900 via-slate-850 to-slate-900'}`}>
                            {/* SVG mockup of high-tech doorway */}
                            <svg className="w-1/2 h-1/2 opacity-30 stroke-cyan-500 fill-none stroke-[1.2]" viewBox="0 0 100 100">
                              <rect x="25" y="10" width="50" height="80" rx="3" />
                              <line x1="10" y1="90" x2="90" y2="90" />
                              <circle cx="65" cy="50" r="2" />
                              <path d="M 15 20 L 35 20 M 15 30 L 35 30 M 65 20 L 85 20" />
                              <text x="30" y="5" className="text-[4px] font-mono fill-cyan-500 font-bold uppercase tracking-wider">CỔNG VÀO CHÍNH</text>
                            </svg>
                          </div>
                        )}
                        {selectedCamera === "CAM-02" && (
                          <div className={`w-full h-full bg-gradient-to-br flex items-center justify-center transition-all ${cameraNightVision ? 'from-green-950/40 via-emerald-950/30 to-green-950/20' : 'from-slate-900 via-slate-850 to-slate-900'}`}>
                            {/* Computer showroom tables */}
                            <svg className="w-1/2 h-1/2 opacity-30 stroke-cyan-500 fill-none stroke-[1.2]" viewBox="0 0 100 100">
                              <ellipse cx="50" cy="65" rx="35" ry="15" />
                              <rect x="20" y="30" width="16" height="12" rx="1" />
                              <line x1="28" y1="42" x2="28" y2="48" />
                              <line x1="20" y1="48" x2="36" y2="48" />
                              <rect x="42" y="27" width="16" height="12" rx="1" />
                              <line x1="50" y1="39" x2="50" y2="45" />
                              <line x1="42" y1="45" x2="58" y2="45" />
                              <rect x="64" y="30" width="16" height="12" rx="1" />
                              <line x1="72" y1="42" x2="72" y2="48" />
                              <line x1="64" y1="48" x2="80" y2="48" />
                              <text x="30" y="5" className="text-[4px] font-mono fill-cyan-500 font-bold uppercase tracking-wider">SHOWROOM KHU A</text>
                            </svg>
                          </div>
                        )}
                        {selectedCamera === "CAM-03" && (
                          <div className={`w-full h-full bg-gradient-to-br flex items-center justify-center transition-all ${cameraNightVision ? 'from-green-950/40 via-emerald-950/30 to-green-950/20' : 'from-slate-900 via-slate-850 to-slate-900'}`}>
                            {/* Garage Parking gate */}
                            <svg className="w-1/2 h-1/2 opacity-30 stroke-cyan-500 fill-none stroke-[1.2]" viewBox="0 0 100 100">
                              <rect x="15" y="20" width="70" height="50" rx="4" />
                              <line x1="15" y1="30" x2="85" y2="30" />
                              <line x1="15" y1="40" x2="85" y2="40" />
                              <line x1="15" y1="50" x2="85" y2="50" />
                              <line x1="15" y1="60" x2="85" y2="60" />
                              <rect x="35" y="70" width="30" height="20" rx="1" />
                              <text x="30" y="5" className="text-[4px] font-mono fill-cyan-500 font-bold uppercase tracking-wider">BÃI HẠ CẤNH XE</text>
                            </svg>
                          </div>
                        )}
                        {selectedCamera === "CAM-04" && (
                          <div className={`w-full h-full bg-gradient-to-br flex items-center justify-center transition-all ${cameraNightVision ? 'from-green-950/40 via-emerald-950/30 to-green-950/20' : 'from-slate-900 via-slate-850 to-slate-900'}`}>
                            {/* Shelving with computer boxes */}
                            <svg className="w-1/2 h-1/2 opacity-30 stroke-cyan-500 fill-none stroke-[1.2]" viewBox="0 0 100 100">
                              <line x1="15" y1="15" x2="15" y2="85" />
                              <line x1="50" y1="15" x2="50" y2="85" />
                              <line x1="85" y1="15" x2="85" y2="85" />
                              <line x1="15" y1="30" x2="85" y2="30" />
                              <line x1="15" y1="55" x2="85" y2="55" />
                              <line x1="15" y1="80" x2="85" y2="80" />
                              <rect x="20" y="20" width="25" height="8" rx="1" />
                              <rect x="55" y="20" width="25" height="8" rx="1" />
                              <rect x="20" y="40" width="25" height="12" rx="1" />
                              <rect x="55" y="42" width="25" height="10" rx="1" />
                              <text x="30" y="5" className="text-[4px] font-mono fill-cyan-500 font-bold uppercase tracking-wider">KHO HÀNG LINH KIỆN</text>
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Green Night-Vision thermal filter overlay */}
                      {cameraNightVision && (
                        <div className="absolute inset-0 z-5 bg-emerald-500/20 mix-blend-color hover:mix-blend-hue pointer-events-none backdrop-saturate-[180%] backdrop-contrast-[150%]" />
                      )}

                      {/* ZOOM 2x scaler override */}
                      {cameraZoom && (
                        <div className="absolute inset-0 z-2 border-2 border-dashed border-cyan-500/30 scale-125 transition-transform duration-500 pointer-events-none" />
                      )}

                      {/* TOP BAR OVERLAYS inside camera feed */}
                      <div className="relative z-10 flex justify-between items-start font-mono text-[9px] text-[#06b6d4] uppercase font-bold tracking-wider">
                        <div className="flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-md border border-white/5">
                          <Eye className={`w-3 h-3 text-cyan-400 ${cameraNightVision ? 'animate-bounce' : ''}`} />
                          <span className={cameraNightVision ? "text-emerald-400" : "text-cyan-400"}>
                            {selectedCamera} • {selectedCamera === "CAM-01" ? "LỐI VÀO SẢNH" : selectedCamera === "CAM-02" ? "KHO SHOWROOM" : selectedCamera === "CAM-03" ? "BÃI ĐỖ XE" : "KỆ PHỤ KIỆN"}
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end bg-black/60 px-2 py-1 rounded-md border border-white/5">
                          <span>{cameraTime}</span>
                          <span className="text-[8px] opacity-75 mt-0.5">DEV-ID: AI_CCTV_G3</span>
                        </div>
                      </div>

                      {/* LARGE CENTER CROSSHAIR FOR MILITARY LOOK */}
                      <div className="absolute inset-0 z-5 flex items-center justify-center opacity-25 pointer-events-none">
                        <div className="w-16 h-16 border border-dashed border-cyan-500 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                        </div>
                        <div className="w-32 h-[1px] bg-cyan-500 absolute"></div>
                        <div className="h-32 w-[1px] bg-cyan-500 absolute"></div>
                      </div>

                      {/* BOTTOM BAR CONTROLS / OVERLAYS */}
                      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3.5 mt-auto bg-black/75 p-3 rounded-2xl backdrop-blur-md border border-white/10 font-sans">
                        <div className="flex items-center gap-3">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                          </span>
                          <span className="text-[10px] text-white font-mono font-bold tracking-wider">● ĐANG GHI AI_PRO</span>
                        </div>

                        {/* Interactive utilities */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Infrared Mode */}
                          <button
                            onClick={() => {
                              setCameraNightVision(!cameraNightVision);
                              addLog(`Giám sát CCTV: Đã ${!cameraNightVision ? 'Bật' : 'Tắt'} chế độ bộ lọc hồng ngoại IR.`, "info");
                            }}
                            className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider font-mono transition-all duration-250 ${
                              cameraNightVision 
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 font-extrabold shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/5'
                            }`}
                          >
                            HỒNG NGOẠI {cameraNightVision ? "ON" : "OFF"}
                          </button>

                          {/* Digital Zoom toggle */}
                          <button
                            onClick={() => {
                              setCameraZoom(!cameraZoom);
                              addLog(`Giám sát CCTV: Độ thu phóng kỹ thuật số đạt ${!cameraZoom ? 'ZOOM 2.0x' : 'ZOOM 1.0x'}.`, "info");
                            }}
                            className={`px-2.5 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider font-mono transition-all duration-250 flex items-center gap-1 ${
                              cameraZoom 
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 font-extrabold shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                                : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/5'
                            }`}
                          >
                            <ZoomIn className="w-3 h-3" />
                            <span>{cameraZoom ? "ZOOM 2X" : "ZOOM 1X"}</span>
                          </button>

                          {/* Snapshot screenshot button */}
                          <button
                            onClick={() => {
                              setShutterFlash(true);
                              setTimeout(() => setShutterFlash(false), 200);
                              addLog(`Đã chụp ảnh nhanh từ luồng ${selectedCamera} lưu trữ thành công vào phân vùng đĩa an toàn.`, "info");
                            }}
                            className="px-3 py-1.5 bg-cyan-500 rounded-lg text-black text-[9px] font-extrabold uppercase tracking-widest font-mono flex items-center gap-1.5 hover:bg-cyan-400 transition-all hover:shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                            title="Chụp ảnh màn hình lưu trữ"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>CHỤP ẢNH</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Zone SELECTORS (4/12 cols) */}
                  <div className="lg:col-span-4 flex flex-col gap-3">
                    <span className={`block text-[10px] uppercase font-mono tracking-wider font-bold mb-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Các Điểm Giám Sát Chi Nhánh</span>
                    
                    {/* Zone item 1 */}
                    <button
                      onClick={() => setSelectedCamera("CAM-01")}
                      className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all group ${
                        selectedCamera === "CAM-01" 
                          ? (theme === 'light' ? 'bg-cyan-50/50 border-cyan-400/80 shadow-sm text-slate-800' : 'bg-cyan-500/10 border-cyan-500/30 text-white')
                          : (theme === 'light' ? 'bg-slate-50 border-slate-205 text-slate-700 hover:bg-slate-100' : 'bg-[#161b22] border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/[0.02]')
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl transition-colors ${selectedCamera === "CAM-01" ? "bg-cyan-500 text-black shadow-sm" : "bg-black/40 text-slate-500 group-hover:text-cyan-400"}`}>
                          <Video className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={`text-xs font-bold transition-colors ${selectedCamera === "CAM-01" ? "text-[#06b6d4]" : (theme === 'light' ? 'text-slate-800' : 'text-white')}`}>CAM-01: Cổng Chính</p>
                          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-mono">Bảo vệ lối ra vào</span>
                        </div>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
                    </button>

                    {/* Zone item 2 */}
                    <button
                      onClick={() => setSelectedCamera("CAM-02")}
                      className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all group ${
                        selectedCamera === "CAM-02" 
                          ? (theme === 'light' ? 'bg-cyan-50/50 border-cyan-400/80 shadow-sm text-slate-800' : 'bg-cyan-500/10 border-cyan-500/30 text-white')
                          : (theme === 'light' ? 'bg-slate-50 border-slate-205 text-slate-700 hover:bg-slate-100' : 'bg-[#161b22] border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/[0.02]')
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl transition-colors ${selectedCamera === "CAM-02" ? "bg-cyan-500 text-black shadow-sm" : "bg-black/40 text-slate-500 group-hover:text-cyan-400"}`}>
                          <Video className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={`text-xs font-bold transition-colors ${selectedCamera === "CAM-02" ? "text-[#06b6d4]" : (theme === 'light' ? 'text-slate-800' : 'text-white')}`}>CAM-02: Showroom Central</p>
                          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-mono">Khu trưng bày chính</span>
                        </div>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
                    </button>

                    {/* Zone item 3 */}
                    <button
                      onClick={() => setSelectedCamera("CAM-03")}
                      className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all group ${
                        selectedCamera === "CAM-03" 
                          ? (theme === 'light' ? 'bg-cyan-50/50 border-cyan-400/80 shadow-sm text-slate-800' : 'bg-cyan-500/10 border-cyan-500/30 text-white')
                          : (theme === 'light' ? 'bg-slate-50 border-slate-205 text-slate-700 hover:bg-slate-100' : 'bg-[#161b22] border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/[0.02]')
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl transition-colors ${selectedCamera === "CAM-03" ? "bg-cyan-500 text-black shadow-sm" : "bg-black/40 text-slate-500 group-hover:text-cyan-400"}`}>
                          <Video className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={`text-xs font-bold transition-colors ${selectedCamera === "CAM-03" ? "text-[#06b6d4]" : (theme === 'light' ? 'text-slate-800' : 'text-white')}`}>CAM-03: Khu Đỗ Xe</p>
                          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-mono">Bãi đậu xe mặt trước</span>
                        </div>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
                    </button>

                    {/* Zone item 4 */}
                    <button
                      onClick={() => setSelectedCamera("CAM-04")}
                      className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all group ${
                        selectedCamera === "CAM-04" 
                          ? (theme === 'light' ? 'bg-cyan-50/50 border-cyan-400/80 shadow-sm text-slate-800' : 'bg-cyan-500/10 border-cyan-500/30 text-white')
                          : (theme === 'light' ? 'bg-slate-50 border-slate-205 text-slate-700 hover:bg-slate-100' : 'bg-[#161b22] border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/[0.02]')
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl transition-colors ${selectedCamera === "CAM-04" ? "bg-cyan-500 text-black shadow-sm" : "bg-black/40 text-slate-500 group-hover:text-cyan-400"}`}>
                          <Video className="w-4 h-4" />
                        </div>
                        <div>
                          <p className={`text-xs font-bold transition-colors ${selectedCamera === "CAM-04" ? "text-[#06b6d4]" : (theme === 'light' ? 'text-slate-800' : 'text-white')}`}>CAM-04: Quầy Linh Kiện</p>
                          <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-mono">Kệ hàng phụ kiện</span>
                        </div>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.filter(d => d.type === 'lock').map(d => (
                  <DeviceCard key={d.id} device={d} onUpdate={updateDevice} onDelete={deleteDevice} theme={theme} />
                ))}
              </div>

              {/* Lockdown controller */}
              <div className={`p-6 rounded-[2rem] border transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${theme === 'light' ? 'bg-rose-50 border-rose-200/50 text-slate-800' : 'bg-rose-950/20 border-rose-500/25'}`}>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1 font-mono">
                    <AlertCircle className="w-4 h-4 text-rose-600 animate-pulse" />
                    <span>ĐƠN VỊ ỨNG PHÓ KHẨN CẤP</span>
                  </h4>
                  <p className={`text-xs mt-1 ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                    Việc kích hoạt phong tỏa khẩn cấp sẽ kích hoạt toàn bộ an ninh: cưỡng bức khóa mọi lối thoát hiểm, bật còi báo động và đèn cảnh báo nhấp nháy.
                  </p>
                </div>
                <button
                  id="btn-lockdown-trigger"
                  onClick={() => {
                    devices.forEach(d => {
                      if (d.type === 'lock') {
                        updateDevice(d.id, { status: d.id === 'garage_door' ? 'closed' : 'locked' });
                      }
                      if (d.type === 'light') {
                        updateDevice(d.id, { status: 'on', value: 100, color: '#f43f5e' }); // Red alarm hue!
                      }
                    });
                  }}
                  className="px-6 py-2.5 bg-rose-600 text-white text-xs font-bold tracking-widest uppercase rounded-2xl hover:bg-rose-500 shadow-md transition-all active:scale-95 shrink-0"
                >
                  Bắt đầu Phong tỏa
                </button>
              </div>
            </div>
          )}

          {/* MEDIA TAB */}
          {activeTab === 'media' && (
            <div id="tab-content-media" className="space-y-6">
              <div className={`p-6 rounded-[2rem] border backdrop-blur-sm mb-6 transition-all duration-300 ${theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'}`}>
                <h3 className={`text-md font-bold mb-1.5 uppercase tracking-wide transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Trung tâm Giải trí Đa vùng</h3>
                <p className={`text-xs leading-relaxed transition-colors ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-403'}`}>
                  Phát âm thanh liền mạch tới các loa thanh Sonos đang hoạt động. Cài đặt âm lượng, chọn ngẫu nhiên bài hát và kiểm tra thông tin bản nhạc đang phát.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.filter(d => d.type === 'media').map(d => (
                  <DeviceCard key={d.id} device={d} onUpdate={updateDevice} onDelete={deleteDevice} theme={theme} />
                ))}
              </div>
            </div>
          )}

          {/* ENERGY GRID TAB */}
          {activeTab === 'energy' && (
            <div id="tab-content-energy" className="space-y-6">
              <div className={`p-6 rounded-[2rem] border backdrop-blur-sm mb-6 transition-all duration-300 ${theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'}`}>
                <h3 className={`text-md font-bold mb-1.5 uppercase tracking-wide transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Lưới điện Mặt trời & Dòng công suất</h3>
                <p className={`text-xs leading-relaxed transition-colors ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-403'}`}>
                  Biểu đồ trực quan hóa thời gian thực hiển thị sản lượng điện mặt trời bù đắp cho lượng điện tiêu nạp từ lưới điện quốc gia.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Solar yielding card */}
                <div className={`p-6 border rounded-3xl backdrop-blur-sm text-center transition-all duration-300 ${theme === 'light' ? 'bg-white border-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.03)]' : 'bg-[#161b22]/70 border-white/5'}`}>
                  <span className="text-slate-500 text-[10px] uppercase font-mono tracking-widest block font-bold">SẢN LƯỢNG ĐIỆN MẶT TRỜI</span>
                  <div className={`text-3xl font-bold font-mono mt-2 tracking-tight transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>2.41 kW</div>
                  <span className={`text-[10px] font-mono font-bold mt-1 uppercase tracking-wide block transition-colors ${theme === 'light' ? 'text-cyan-600' : 'text-cyan-400'}`}>Dải quang điện mặt trời đang hoạt động</span>
                </div>
                {/* Grid draw card */}
                <div className={`p-6 border rounded-3xl backdrop-blur-sm text-center transition-all duration-300 ${theme === 'light' ? 'bg-white border-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.03)]' : 'bg-[#161b22]/70 border-white/5'}`}>
                  <span className="text-slate-500 text-[10px] uppercase font-mono tracking-widest block font-bold">LƯỢNG TIÊU THỤ LƯỚI ĐIỆN</span>
                  <div className={`text-3xl font-bold font-mono mt-2 tracking-tight transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                    {((calculateTotalEnergyUsage()) / 1000).toFixed(2)} kW
                  </div>
                  <span className={`text-[10px] font-mono font-bold mt-1 uppercase tracking-wide block transition-colors ${theme === 'light' ? 'text-cyan-600' : 'text-cyan-400'}`}>Lượng tiêu thụ thực tế của hộ gia đình</span>
                </div>
                {/* Net generation offset card */}
                <div className={`p-6 border rounded-3xl backdrop-blur-sm text-center transition-all duration-300 ${theme === 'light' ? 'bg-white border-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.03)]' : 'bg-[#161b22]/70 border-white/5'}`}>
                  <span className="text-slate-500 text-[10px] uppercase font-mono tracking-widest block font-bold">CÂN BẰNG NĂNG LƯỢNG THỰC</span>
                  <div className={`text-3xl font-bold font-mono mt-2 tracking-tight transition-colors ${theme === 'light' ? 'text-emerald-600 font-bold' : 'text-emerald-400'}`}>
                    {+(2.41 - calculateTotalEnergyUsage() / 1000).toFixed(2) >= 0 ? '+' : ''}{(2.41 - calculateTotalEnergyUsage() / 1000).toFixed(2)} kW
                  </div>
                  <span className={`text-[10px] font-mono font-bold mt-1 uppercase tracking-wide block transition-colors ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-300'}`}>
                    {2.41 - (calculateTotalEnergyUsage() / 1000) >= 0 ? 'ĐANG CUNG CẤP CHO LƯỚI ĐIỆN' : 'ĐANG TIÊU THỤ ĐIỆN LƯỚI'}
                  </span>
                </div>
              </div>

              {/* Energy Distribution Visual Flow graph bar */}
              <div className={`p-6 rounded-[2rem] border backdrop-blur-sm transition-all duration-300 ${theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'}`}>
                <h4 className={`text-[10px] font-extrabold uppercase tracking-[0.2em] mb-4 font-mono transition-colors ${theme === 'light' ? 'text-cyan-600' : 'text-[#06b6d4]'}`}>Phân bổ lượng điện tiêu thụ tương đối theo tham số thiết bị</h4>
                <div className="space-y-4">
                  {[
                    { type: 'Hệ thống Điều hòa & Khí hậu', loadPct: 62, count: devices.filter(d => d.type === 'climate').length },
                    { type: 'Hệ thống Chiếu sáng Thông minh', loadPct: 18, count: devices.filter(d => d.type === 'light').length },
                    { type: 'Hệ thống Loa Hi-Fi & Màn hình', loadPct: 12, count: devices.filter(d => d.type === 'media').length },
                    { type: 'Robot Hút bụi & Thiết bị Đốc sạc', loadPct: 8, count: devices.filter(d => d.type === 'vacuum' || d.type === 'switch').length }
                  ].map((cat, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className={`font-medium font-sans transition-colors ${theme === 'light' ? 'text-slate-700' : 'text-slate-250'}`}>{cat.type} ({cat.count} thiết bị)</span>
                        <span className={`font-mono font-bold transition-colors ${theme === 'light' ? 'text-cyan-700' : 'text-cyan-400'}`}>{cat.loadPct}% hoạt động</span>
                      </div>
                      <div className={`w-full rounded-full h-2 overflow-hidden border p-0.5 transition-colors ${theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-[#0a0b0d] border-white/5'}`}>
                        <div 
                          className="bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full h-1 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                          style={{ width: `${cat.loadPct}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Assistant Voice & Chat Tab */}
          {activeTab === 'ai-assistant' && (
            <div id="tab-content-assistant" className="space-y-6">
              <div className={`p-6 rounded-[2rem] border backdrop-blur-sm transition-all duration-300 ${theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'}`}>
                <h3 className={`text-md font-bold mb-1.5 uppercase tracking-wide flex items-center gap-2 transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                  <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                  <span>Hệ thống Trung tâm CoPilot AI</span>
                </h3>
                <p className={`text-xs leading-relaxed transition-colors ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-405'}`}>
                  Tương tác trực tiếp với Trợ lý ảo AI Gemini. CoPilot có toàn bộ ngữ cảnh về các phòng trong nhà, cho phép điều chỉnh độ sáng đèn, nhiệt độ điều hòa và kích hoạt hệ thống an ninh bằng giọng nói hoặc văn bản tự nhiên.
                </p>
              </div>

              <SmartAssistant onAssistantAction={onAssistantAction} theme={theme} />
            </div>
          )}

          {/* ESP32 Integration Tab */}
          {activeTab === 'esp32' && (
            <ESP32Integration 
              devices={devices} 
              onDeviceUpdate={updateDevice} 
              theme={theme} 
            />
          )}

        </main>
      </div>
    </div>
  );
}

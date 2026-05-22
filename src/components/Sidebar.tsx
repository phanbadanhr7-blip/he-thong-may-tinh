import React from 'react';
import { 
  LayoutDashboard, 
  Thermometer, 
  Lightbulb, 
  ShieldCheck, 
  Music, 
  Zap, 
  Sparkles, 
  RefreshCw, 
  Plus, 
  Home, 
  Activity,
  Cpu
} from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onReset: () => void;
  logsCount: number;
  theme?: 'light' | 'dark';
}

export default function Sidebar({ activeTab, setActiveTab, onReset, logsCount, theme = 'dark' }: SidebarProps) {
  const menuItems = [
    { id: 'overview' as ActiveTab, label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'climate' as ActiveTab, label: 'Điều khiển Khí hậu', icon: Thermometer },
    { id: 'lighting' as ActiveTab, label: 'Hệ thống Chiếu sáng', icon: Lightbulb },
    { id: 'security' as ActiveTab, label: 'An ninh & Cửa', icon: ShieldCheck },
    { id: 'media' as ActiveTab, label: 'Trung tâm Giải trí', icon: Music },
    { id: 'energy' as ActiveTab, label: 'Lưới Điện năng', icon: Zap },
    { id: 'ai-assistant' as ActiveTab, label: 'Giọng nói AI CoPilot', icon: Sparkles },
    { id: 'esp32' as ActiveTab, label: 'Tích hợp ESP32', icon: Cpu, badge: 'Đồng bộ' },
  ];

  return (
    <aside id="sidebar-panel" className={`w-80 flex flex-col transition-all duration-300 ${
      theme === 'light' 
        ? 'bg-slate-50 text-slate-700 border-r border-slate-200 shadow-sm' 
        : 'bg-black/40 backdrop-blur-md text-slate-300 border-r border-white/5'
    }`}>
      {/* Brand Header */}
      <div id="sidebar-header" className={`p-6 border-b flex items-center justify-between transition-colors duration-300 ${theme === 'light' ? 'border-slate-200' : 'border-white/5'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-cyan-500 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.5)] flex items-center justify-center text-black">
            <Home className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className={`text-base font-bold tracking-tight font-sans transition-colors duration-300 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>MÁY TÍNH MŨI NÉ</h1>
            <p className="text-[10px] uppercase tracking-widest text-[#06b6d4] font-semibold">Hệ thống t.tâm</p>
          </div>
        </div>
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border transition-colors duration-300 ${
          theme === 'light' ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
        }`}>
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
          <span className="text-[9px] uppercase font-mono tracking-wider font-bold">Lưới Online</span>
        </div>
      </div>

      {/* Navigation */}
      <nav id="sidebar-nav" className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-3.5 mb-3">Mạng lưới nhà thông minh</div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group text-left ${
                isActive 
                  ? 'bg-cyan-500 text-black font-semibold shadow-[0_4px_12px_rgba(6,182,212,0.25)]' 
                  : (theme === 'light' ? 'text-slate-655 hover:bg-slate-200/50 hover:text-slate-900' : 'text-slate-400 hover:bg-white/5 hover:text-white')
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4.5 h-4.5 transition-transform duration-300 ${isActive ? 'scale-110 text-black' : 'text-slate-400 group-hover:text-cyan-400'}`} />
                <span className="text-xs font-medium tracking-wide">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide ${
                  isActive ? 'bg-black text-cyan-400' : 'bg-cyan-500/10 text-cyan-550 border border-cyan-500/20'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Diagnostics / Extra Info widget */}
      <div id="diagnostics-widget" className={`p-4 mx-4 rounded-2xl border mb-4 text-xs backdrop-blur-sm transition-all duration-300 ${
        theme === 'light' ? 'bg-slate-100/60 border-slate-200 text-slate-600' : 'bg-white/5 border-white/5 text-slate-300'
      }`}>
        <div className="flex items-center justify-between text-slate-500 mb-2 font-mono">
          <div className="flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-500" />
            <span className="text-[10px] uppercase font-sans tracking-wide">Băng thông Mạng</span>
          </div>
          <span className="text-[9px] text-[#06b6d4] font-bold">100% OK</span>
        </div>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[9px] text-slate-500 mb-1 font-mono">
              <span>NÚT MESH</span>
              <span>42 Hoạt động</span>
            </div>
            <div className={`w-full h-1 rounded-full overflow-hidden transition-colors ${theme === 'light' ? 'bg-slate-200' : 'bg-white/5'}`}>
              <div className="bg-cyan-500 h-full rounded-full shadow-[0_0_6px_cyan]" style={{ width: '92%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[9px] text-slate-550 mb-1 font-mono">
              <span>TÍN HIỆU HỆ THỐNG</span>
              <span>Rất Khỏe (-48dB)</span>
            </div>
            <div className={`w-full h-1 rounded-full overflow-hidden transition-colors ${theme === 'light' ? 'bg-slate-200' : 'bg-white/5'}`}>
              <div className="bg-emerald-400 h-full rounded-full shadow-[0_0_6px_#34d399]" style={{ width: '85%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Footer Controls */}
      <div id="sidebar-footer" className={`p-4 border-t flex items-center justify-between transition-colors duration-300 ${theme === 'light' ? 'border-slate-200' : 'border-white/5'}`}>
        <button
          id="btn-system-reset"
          onClick={onReset}
          className={`flex items-center space-x-2 text-xs transition-all py-1.5 px-3 rounded-xl border ${
            theme === 'light' 
              ? 'text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 border-transparent' 
              : 'text-slate-400 hover:text-red-400 hover:bg-white/5 hover:border-white/5 border-transparent'
          }`}
          title="Đặt lại tất cả thiết bị nhà thông minh về mặc định"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold">Đặt lại</span>
        </button>
        <span className="text-[10px] font-mono text-slate-500">HĐH v2.1</span>
      </div>
    </aside>
  );
}

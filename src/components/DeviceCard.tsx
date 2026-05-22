import React, { useState } from 'react';
import { 
  Lightbulb, 
  Thermometer, 
  Lock, 
  Unlock, 
  Music, 
  Volume2, 
  Compass, 
  Power, 
  Sparkles, 
  RefreshCw,
  Sun,
  Snowflake,
  Flame,
  Wind,
  Shuffle,
  Settings,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { Device } from '../types';

interface DeviceCardProps {
  key?: any;
  device: Device;
  onUpdate: (id: string, update: Partial<Device>) => void | Promise<void> | Promise<any>;
  onDelete?: (id: string) => void;
  theme?: 'light' | 'dark';
}

export default function DeviceCard({ device, onUpdate, onDelete, theme = 'dark' }: DeviceCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(device.name);
  const [editRoom, setEditRoom] = useState(device.room);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Dynamic Icon selector based on category
  const getIcon = () => {
    switch (device.type) {
      case 'light':
        return <Lightbulb className={`w-6 h-6 transition-all duration-300 ${device.status === 'on' ? (theme === 'light' ? 'text-cyan-600 drop-shadow-[0_2px_4px_rgba(6,182,212,0.2)]' : 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.73)]') : 'text-slate-600'}`} />;
      case 'climate':
        return <Thermometer className={`w-6 h-6 transition-all duration-300 ${device.status === 'on' ? (theme === 'light' ? 'text-cyan-600 drop-shadow-[0_2px_4px_rgba(6,182,212,0.2)]' : 'text-[#06b6d4] drop-shadow-[0_0_8px_rgba(6,182,212,0.73)]') : 'text-slate-600'}`} />;
      case 'lock':
        return device.status === 'locked' 
          ? <Lock className={`w-6 h-6 transition-all ${theme === 'light' ? 'text-cyan-600' : 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.7)]'}`} /> 
          : <Unlock className="w-6 h-6 text-rose-550 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)] animate-pulse" />;
      case 'media':
        return <Music className={`w-6 h-6 transition-all duration-300 ${device.status === 'playing' ? (theme === 'light' ? 'text-cyan-600 animate-pulse' : 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.73)] animate-pulse') : 'text-slate-600'}`} />;
      case 'vacuum':
        return <Compass className={`w-6 h-6 transition-all duration-300 ${device.status === 'cleaning' ? (theme === 'light' ? 'text-cyan-600 animate-spin-slow' : 'text-cyan-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-spin-slow') : 'text-slate-600'}`} />;
      case 'switch':
        return <Power className={`w-6 h-6 transition-all duration-300 ${device.status === 'on' ? 'text-cyan-500' : 'text-slate-600'}`} />;
      default:
        return <Power className="w-6 h-6 text-slate-600" />;
    }
  };

  const handleToggle = async () => {
    setIsUpdating(true);
    let nextStatus = device.status;
    if (device.type === 'light' || device.type === 'climate' || device.type === 'switch') {
      nextStatus = device.status === 'on' ? 'off' : 'on';
    } else if (device.type === 'lock') {
      nextStatus = device.status === 'locked' ? 'unlocked' : 'locked';
    } else if (device.type === 'media') {
      nextStatus = device.status === 'playing' ? 'paused' : 'playing';
    } else if (device.type === 'vacuum') {
      nextStatus = device.status === 'cleaning' ? 'docked' : 'cleaning';
    }

    // Small mock tactile delay
    setTimeout(() => {
      onUpdate(device.id, { status: nextStatus });
      setIsUpdating(false);
    }, 250);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onUpdate(device.id, { value: val });
  };

  if (isEditing) {
    return (
      <div 
        id={`device-card-${device.id}`}
        className={`relative border overflow-hidden p-5 rounded-3xl transition-all duration-300 backdrop-blur-sm ${
          theme === 'light'
            ? 'bg-white border-cyan-300 shadow-md shadow-slate-100 text-slate-800'
            : 'bg-[#161b22]/90 border-[#06b6d4]/40 shadow-[0_0_20px_rgba(6,182,212,0.1)] text-slate-300'
        }`}
      >
        <div className="flex items-center justify-between mb-3.5">
          <span className={`text-[10px] uppercase font-mono tracking-wider font-extrabold ${theme === 'light' ? 'text-slate-500' : 'text-cyan-400'}`}>Cấu hình thiết bị</span>
          <button 
            onClick={() => { setIsEditing(false); setShowConfirmDelete(false); }}
            className={`p-1 rounded-lg border transition-all ${
              theme === 'light' ? 'hover:bg-slate-100 border-slate-200 text-slate-500' : 'hover:bg-white/5 border-white/5 text-slate-400'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3 font-sans">
          <div>
            <label className={`block text-[9px] uppercase tracking-wider font-bold mb-1 font-mono ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Tên Thiết bị</label>
            <input 
              type="text" 
              value={editName} 
              onChange={(e) => setEditName(e.target.value)}
              className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all ${
                theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-black/40 border-white/5 text-white'
              }`}
            />
          </div>

          <div>
            <label className={`block text-[9px] uppercase tracking-wider font-bold mb-1 font-mono ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Khu vực / Phòng</label>
            <input 
              type="text" 
              value={editRoom} 
              onChange={(e) => setEditRoom(e.target.value)}
              className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all ${
                theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-black/40 border-white/5 text-white'
              }`}
            />
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-200/50 transition-colors">
            {showConfirmDelete ? (
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-rose-500 font-semibold uppercase animate-pulse">Xác nhận?</span>
                <button 
                  onClick={() => onDelete && onDelete(device.id)}
                  className="px-2 py-1 bg-rose-600 text-[10px] text-white font-bold rounded-lg hover:bg-rose-500 transition-all uppercase tracking-wider"
                >
                  Xóa
                </button>
                <button 
                  onClick={() => setShowConfirmDelete(false)}
                  className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider border ${
                    theme === 'light' ? 'border-slate-200 text-slate-500 hover:bg-slate-100' : 'border-white/5 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  Hủy
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                onClick={() => setShowConfirmDelete(true)}
                className={`flex items-center space-x-1 px-2 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-rose-500 border border-transparent transition-all ${
                  theme === 'light' ? 'hover:bg-rose-50 hover:border-rose-100' : 'hover:bg-rose-500/15 hover:border-rose-500/20'
                }`}
              >
                <Trash2 className="w-3 h-3 shrink-0" />
                <span>Xóa</span>
              </button>
            )}

            <button 
              onClick={() => {
                onUpdate(device.id, { name: editName, room: editRoom });
                setIsEditing(false);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-cyan-500 text-black text-[10px] font-extrabold uppercase tracking-wider rounded-xl hover:bg-cyan-400 transition-all hover:shadow-[0_2px_8px_rgba(6,182,212,0.3)]"
            >
              <Check className="w-3 h-3" />
              <span>Lưu</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      id={`device-card-${device.id}`}
      className={`relative border overflow-hidden p-5 rounded-3xl transition-all duration-500 backdrop-blur-sm ${
        theme === 'light'
          ? (
              device.status === 'on' || device.status === 'playing' || device.status === 'unlocked' || device.status === 'cleaning'
                ? 'bg-white border-cyan-200/60 shadow-[0_8px_24px_rgba(6,182,212,0.06)]'
                : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
            )
          : (
              device.status === 'on' || device.status === 'playing' || device.status === 'unlocked' || device.status === 'cleaning'
                ? 'bg-[#161b22]/70 border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.06)]'
                : 'bg-[#161b22]/70 border-white/5 opacity-80 hover:opacity-100 hover:border-white/10'
            )
      }`}
    >
      {/* Decorative colored glow for active devices */}
      {theme === 'dark' && (device.status === 'on' || device.status === 'playing' || device.status === 'unlocked' || device.status === 'cleaning') && (
        <div 
          className="absolute -top-12 -right-12 w-28 h-28 blur-[48px] pointer-events-none opacity-20 rounded-full bg-cyan-500"
        />
      )}

      {/* Card Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-2xl transition-all duration-300 ${
            device.status === 'on' || device.status === 'playing' || device.status === 'unlocked' || device.status === 'cleaning'
              ? (theme === 'light' ? 'bg-cyan-50 border border-cyan-200' : 'bg-cyan-500/10 border border-cyan-500/20') 
              : (theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-black/40 border border-white/5')
          }`}>
            {getIcon()}
          </div>
          <div>
            <h3 className={`font-semibold text-sm tracking-tight mb-0.5 transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{device.name}</h3>
            <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase block">{device.room}</span>
          </div>
        </div>

        {/* Actions Flex */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Settings cog wheel */}
          <button
            onClick={() => {
              setEditName(device.name);
              setEditRoom(device.room);
              setIsEditing(true);
            }}
            className={`p-1.5 rounded-xl border transition-all ${
              theme === 'light'
                ? 'bg-slate-50 border-slate-200 text-slate-400 hover:text-cyan-600 hover:border-cyan-200 hover:bg-cyan-50/30'
                : 'bg-black/30 border-white/5 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/20 hover:bg-cyan-500/5'
            }`}
            title="Đổi tên / Chỉnh sửa"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* Master Switch */}
          <button
            id={`toggle-${device.id}`}
            onClick={handleToggle}
            disabled={isUpdating}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-300 ease-in-out focus:outline-none ${
              device.status === 'on' || device.status === 'playing' || device.status === 'unlocked' || device.status === 'cleaning'
                ? 'bg-[#06b6d4] border-cyan-400/25 shadow-[0_0_12px_rgba(6,182,212,0.5)]' 
                : (theme === 'light' ? 'bg-slate-100 border-slate-205' : 'bg-[#161b22] border-white/10')
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow-md ring-0 transition duration-300 ease-in-out ${
                theme === 'light' ? 'bg-white' : 'bg-[#0a0b0d]'
              } ${
                device.status === 'on' || device.status === 'playing' || device.status === 'unlocked' || device.status === 'cleaning'
                  ? 'translate-x-5' 
                  : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dynamic Controllers Based on Device Type */}
      <div id={`controls-${device.id}`} className="mt-3 space-y-3.5">
        
        {/* Lights Brightness Controller */}
        {device.type === 'light' && device.status === 'on' && (
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="flex items-center space-x-1 text-slate-505">
                <Sun className="w-3.5 h-3.5 text-[#06b6d4]" />
                <span>Mức độ sáng</span>
              </span>
              <span className={`${theme === 'light' ? 'text-cyan-705 font-extrabold' : 'text-cyan-400 font-bold'}`}>{device.value}%</span>
            </div>
            <input 
              id={`slider-light-${device.id}`}
              type="range" 
              min="10" 
              max="100" 
              value={device.value}
              onChange={handleSliderChange}
              className={`w-full accent-[#06b6d4] cursor-pointer rounded-lg appearance-none h-1.5 ${theme === 'light' ? 'bg-slate-150' : 'bg-black/45'}`}
            />
            {/* Quick Presets Hues */}
            <div className="flex items-center space-x-1.5 pt-1">
              {[
                { label: 'Ấm áp', color: '#FBBF24' },
                { label: 'Ánh trăng', color: '#06b6d4' },
                { label: 'Neon Hồng', color: '#F472B6' },
                { label: 'Sáng mát', color: '#F1F5F9' }
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => onUpdate(device.id, { color: preset.color })}
                  className={`text-[9px] font-bold border px-2 py-0.5 rounded-lg transition-all ${
                    device.color === preset.color 
                      ? (theme === 'light' ? 'border-cyan-400 bg-cyan-100/50 text-cyan-800' : 'border-cyan-500/40 bg-cyan-400/15 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.2)]') 
                      : (theme === 'light' ? 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-700' : 'border-white/5 bg-black/30 text-slate-500 hover:text-slate-300 hover:border-white/10')
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Climate Temperature Target & Mode Steppers */}
        {device.type === 'climate' && (
          <div className="space-y-3">
            <div className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5'}`}>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Nhiệt độ mục tiêu</span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onUpdate(device.id, { value: Math.max(60, device.value - 1) })}
                  className={`w-8 h-8 rounded-xl transition-all font-mono text-sm flex items-center justify-center border ${
                    theme === 'light' 
                      ? 'bg-white border-slate-250 hover:bg-slate-100 text-slate-700 hover:text-cyan-600' 
                      : 'bg-white/5 border-white/5 hover:border-cyan-500/20 hover:text-cyan-400 text-slate-202'
                  }`}
                >
                  -
                </button>
                <span className={`text-xs font-bold font-mono tracking-tight px-3 py-1.5 rounded-lg border transition-all ${
                  theme === 'light' ? 'bg-white border-slate-250 text-slate-800' : 'bg-white/5 border-white/5 text-white'
                }`}>{device.value}°F</span>
                <button
                  onClick={() => onUpdate(device.id, { value: Math.min(84, device.value + 1) })}
                  className={`w-8 h-8 rounded-xl transition-all font-mono text-sm flex items-center justify-center border ${
                    theme === 'light'
                      ? 'bg-white border-slate-250 hover:bg-slate-100 text-slate-700 hover:text-cyan-600'
                      : 'bg-white/5 border-white/5 hover:border-cyan-500/20 hover:text-cyan-400 text-slate-202'
                  }`}
                >
                  +
                </button>
              </div>
            </div>
            {/* Mode Selectors */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { mode: 'cool', name: 'Làm mát', icon: Snowflake },
                { mode: 'heat', name: 'Sưởi ấm', icon: Flame },
                { mode: 'fan', name: 'Gió mạnh', icon: Wind },
                { mode: 'eco', name: 'Tiết kiệm', icon: Sparkles }
              ].map(item => {
                const ModeIcon = item.icon;
                const active = device.mode === item.mode;
                return (
                  <button
                    key={item.mode}
                    onClick={() => onUpdate(device.id, { mode: item.mode, status: 'on' })}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all text-[9px] font-bold tracking-wide space-y-1.5 border ${
                      active 
                        ? (theme === 'light' ? 'bg-cyan-50 border-cyan-300 text-cyan-700 shadow-sm' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]') 
                        : (theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100/50 hover:text-slate-700' : 'bg-black/35 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10')
                    }`}
                  >
                    <ModeIcon className="w-3.5 h-3.5" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Home Lock Indicators */}
        {device.type === 'lock' && (
          <div className={`flex items-center justify-between p-3 rounded-2xl border text-[11px] transition-all duration-300 ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5'}`}>
            <span className="text-slate-500 font-mono text-[10px] tracking-wide uppercase">Hàng rào Bảo vệ</span>
            <div className="flex items-center space-x-1.5 font-bold font-mono text-[9px] tracking-wider">
              <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'locked' || device.status === 'closed' ? 'bg-[#06b6d4] shadow-[0_0_6px_#06b6d4]' : 'bg-rose-500 animate-ping'}`}></span>
              <span className={device.status === 'locked' || device.status === 'closed' ? (theme === 'light' ? 'text-cyan-650 font-extrabold' : 'text-cyan-400') : 'text-rose-600 font-extrabold'}>
                {device.status === 'locked' || device.status === 'closed' ? 'HỆ THỐNG AN TOÀN' : 'ĐANG MỞ KHÓA'}
              </span>
            </div>
          </div>
        )}

        {/* Media Entertainment Sonos Controller */}
        {device.type === 'media' && (
          <div className="space-y-3 pt-1">
            <div className={`p-3 rounded-2xl border transition-all ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/45 border-white/5'}`}>
              <div className="flex justify-between items-start mb-1 text-[9px] font-mono">
                <span className="text-slate-500 uppercase tracking-widest">LUỒNG PHÁT HIFI</span>
                <span className={`font-bold transition-colors ${theme === 'light' ? 'text-cyan-700' : 'text-cyan-400'}`}>ÂM LƯỢNG {device.value}%</span>
              </div>
              <p className={`text-xs font-bold truncate leading-tight mb-1 transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-slate-250'}`}>{device.track}</p>
              <p className={`text-[10px] font-medium font-mono leading-none transition-colors ${theme === 'light' ? 'text-cyan-800' : 'text-cyan-400'}`}>{device.artist}</p>
            </div>
            {/* Level Slider & Tracks Shuffler */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <Volume2 className="w-4 h-4 text-slate-500 shrink-0" />
                <input 
                  id={`slider-media-${device.id}`}
                  type="range" 
                  min="0" 
                  max="100" 
                  value={device.value}
                  onChange={handleSliderChange}
                  className={`w-full cursor-pointer rounded-lg appearance-none h-1 ${theme === 'light' ? 'accent-cyan-600 bg-slate-150' : 'accent-cyan-400 bg-black/45'}`}
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    const tracks = [
                      { track: "Nhịp điệu học tập Lofi", artist: "Kênh Lofi Chill" },
                      { track: "Cafe Jazz Piano Nhẹ nhàng", artist: "Ban nhạc Blue Cafe" },
                      { track: "Đường chạy hoàng hôn Synthwave", artist: "Nhóm Retrowave" },
                      { track: "Không khí chiều mưa", artist: "Âm thanh thư giãn" }
                    ];
                    const random = tracks[Math.floor(Math.random() * tracks.length)];
                    onUpdate(device.id, random);
                  }}
                  className={`flex items-center space-x-1.5 text-[9px] font-bold font-sans px-3 py-1.5 rounded-xl transition-all active:scale-95 border ${
                    theme === 'light'
                      ? 'bg-cyan-50/50 hover:bg-cyan-50 border-cyan-200 text-cyan-800'
                      : 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400 hover:text-cyan-300'
                  }`}
                >
                  <Shuffle className="w-3 h-3" />
                  <span>Bài tiếp theo</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sweeper Vacuum Battery & Status info */}
        {device.type === 'vacuum' && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`p-3 rounded-xl border text-center transition-all ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5'}`}>
              <span className="text-slate-500 block mb-1 text-[9px] uppercase tracking-wider font-mono font-bold">MỨC PIN</span>
              <span className={`font-semibold font-mono text-xs transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{device.value}% pin</span>
            </div>
            <div className={`p-3 rounded-xl border text-center transition-all ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5'}`}>
              <span className="text-slate-500 block mb-1 text-[9px] uppercase tracking-wider font-mono font-bold">TRẠNG THÁI</span>
              <span className={`font-bold text-[10px] uppercase font-mono tracking-wider truncate block ${
                device.status === 'docked' ? 'text-slate-550' : (theme === 'light' ? 'text-cyan-700' : 'text-cyan-400')
              }`}>
                {device.status === 'docked' ? 'ĐANG SẠC/CHỜ' : 'ĐANG DỌN DẸP'}
              </span>
            </div>
          </div>
        )}

        {/* Default standard Switch (e.g. Garden Sprinkler) info */}
        {device.type === 'switch' && (
          <div className={`p-3 rounded-2xl border text-xs flex justify-between items-center font-mono transition-all ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5'}`}>
            <span className="text-slate-500 uppercase text-[9px] tracking-wider font-bold">Bộ phận Tưới nước</span>
            <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
              device.status === 'on' 
                ? (theme === 'light' ? 'bg-cyan-100 border-cyan-200 text-cyan-705' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400')
                : (theme === 'light' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-[#161b22]/40 border-white/5 text-slate-500')
            }`}>
              {device.status === 'on' ? 'ĐANG TƯỚI NƯỚC' : 'HỆ THỐNG CHỜ'}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}

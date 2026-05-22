import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Mic, ShieldAlert, BadgeInfo, Bot, User, CheckCircle } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

interface SmartAssistantProps {
  onAssistantAction: (message: string) => Promise<{ textResponse: string; success: boolean }>;
  theme?: 'light' | 'dark';
}

export default function SmartAssistant({ onAssistantAction, theme = 'dark' }: SmartAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hệ thống hỗ trợ trung tâm Atrium Grid đã kích hoạt. Bạn có thể yêu cầu tôi điều chỉnh nhiệt độ phòng, tăng giảm độ sáng đèn, đổi nhạc, khởi động robot hút bụi hoặc khóa các cửa ra vào. Ví dụ hãy thử: 'Khóa toàn bộ cửa nhà và tắt đèn' hoặc 'Đặt nhiệt độ điều hòa phòng khách thành 70 độ'.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const presetCommands = [
    { label: "🌙 Khóa Vành đai & Chế độ Ngủ", text: "Khóa cửa chính, đóng cửa nhà xe và tắt toàn bộ đèn chính" },
    { label: "🎵 Kịch bản Xem phim Đêm", text: "Bật đèn phòng khách và đặt nhiệt độ điều hòa" },
    { label: "💡 Tắt Toàn bộ Đèn", text: "Tắt toàn bộ đèn trong nhà" },
    { label: "🧹 Khởi động Robot Hút bụi", text: "Bật robot hút bụi" }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await onAssistantAction(textToSend);
      
      const botMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'bot',
        text: response.textResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'bot',
        text: "Đã xảy ra sự cố cấu hình khi kết nối với bộ não điều khiển trung tâm. Vui lòng kiểm tra cấu hình Gemini hoặc cài đặt mạng của bạn.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="smart-assistant-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-14rem)]">
      {/* Messages Feed panel */}
      <div id="chat-feed-panel" className={`lg:col-span-2 border rounded-3xl flex flex-col overflow-hidden backdrop-blur-sm transition-all duration-300 ${
        theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'
      }`}>
        {/* Chat Header */}
        <div className={`p-4 border-b flex items-center justify-between transition-colors duration-300 ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
              theme === 'light' ? 'bg-cyan-50 border-cyan-200 text-cyan-600' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
            }`}>
              <Sparkles className="w-5 h-5 text-cyan-500 animate-pulse" />
            </div>
            <div>
              <h3 className={`font-bold text-xs uppercase tracking-wider transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Trợ lý ảo CoPilot AI</h3>
              <p className="text-[9px] text-cyan-600 font-mono tracking-widest uppercase">Cổng Kết nối An ninh đang Kích hoạt</p>
            </div>
          </div>
          <span className={`text-[9px] font-mono border px-2.5 py-1 rounded-md transition-colors ${
            theme === 'light' ? 'text-slate-500 bg-slate-100 border-slate-200' : 'text-slate-500 bg-[#0a0b0d] border-white/5'
          }`}>LLM: gemini-3.5-flash</span>
        </div>

        {/* Conversation flow */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m) => {
            const isBot = m.sender === 'bot';
            return (
              <div 
                key={m.id} 
                id={`chat-message-${m.id}`}
                className={`flex items-start space-x-3 ${isBot ? '' : 'flex-row-reverse space-x-reverse'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 border transition-all ${
                  isBot 
                    ? (theme === 'light' ? 'bg-slate-50 text-[#06b6d4] border-slate-200' : 'bg-black/40 text-[#06b6d4] border-cyan-500/20 shadow-[0_0_6px_rgba(6,182,212,0.1)]') 
                    : 'bg-cyan-500 text-black border-transparent font-sans'
                }`}>
                  {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className={`max-w-[75%] p-4 rounded-3xl text-xs leading-relaxed transition-all ${
                  isBot 
                    ? (theme === 'light' ? 'bg-slate-50 border border-slate-200 text-slate-705 rounded-tl-none' : 'bg-[#161b22]/90 border border-white/5 text-slate-250 rounded-tl-none') 
                    : 'bg-cyan-500 text-black font-semibold rounded-tr-none shadow-lg shadow-cyan-500/10'
                }`}>
                   <p>{m.text}</p>
                  <span className={`block text-[9px] mt-1.5 font-mono ${isBot ? 'text-slate-505 font-medium' : 'text-black/60 font-medium'}`}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Glowing Animated Loading Indicator */}
          {isLoading && (
            <div id="ai-loading-indicator" className="flex items-start space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 border ${
                theme === 'light' ? 'bg-slate-50 text-cyan-600 border-slate-200' : 'bg-black/40 text-cyan-400 border-cyan-500/20'
              }`}>
                <Bot className="w-4 h-4 text-cyan-500 animate-bounce" />
              </div>
              <div className={`p-4 rounded-3xl rounded-tl-none text-xs flex flex-col space-y-2 border transition-all ${
                theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#161b22]/90 border-white/5 text-slate-405'
              }`}>
                <span className="flex items-center space-x-1.5 font-mono text-[9px] text-cyan-605 font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
                  <span>CoPilot đang kết nối với hệ thống Grid...</span>
                </span>
                {/* Visual Audio Wave simulation */}
                <div className="flex items-end space-x-1 h-4 px-1">
                  {[0.4, 0.8, 0.5, 0.9, 0.3, 0.7, 0.4, 0.8, 0.6, 0.2].map((height, i) => (
                    <div 
                      key={i} 
                      className="bg-cyan-550 w-1 rounded-full animate-wave" 
                      style={{ 
                        height: `${height * 100}%`,
                        animationDelay: `${i * 120}ms`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar form */}
        <div className={`p-4 border-t transition-colors duration-300 ${
          theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/45 border-white/5'
        }`}>
          <form 
            id="chat-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputValue);
            }} 
            className="flex items-center space-x-2"
          >
            <input
              id="assistant-chat-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Nhập lệnh của bạn (VD: 'Khóa cửa nhà và làm mát điều hòa')"
              className={`flex-1 border rounded-2xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/10 placeholder-slate-450 transition-colors ${
                theme === 'light' 
                  ? 'bg-white border-slate-305 text-slate-800 focus:border-cyan-500' 
                  : 'bg-[#0a0b0d] border-white/5 text-white focus:border-cyan-555/40'
              }`}
              disabled={isLoading}
            />
            <button
              id="btn-voice-sim"
              type="button"
              onClick={() => {
                const voicePhrases = [
                  "Khóa cửa chính, đóng cửa nhà xe và tắt toàn bộ đèn chính",
                  "Bật đèn phòng khách và đặt nhiệt độ điều hòa",
                  "Tắt toàn bộ đèn trong nhà",
                  "Bật robot hút bụi"
                ];
                const selected = voicePhrases[Math.floor(Math.random() * voicePhrases.length)];
                setInputValue(selected);
              }}
              title="Chọn mẫu câu lệnh giọng nói ngẫu nhiên"
              className={`p-3 rounded-2xl transition-all border active:scale-95 shrink-0 ${
                theme === 'light'
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-250 text-slate-700'
                  : 'bg-white/5 hover:bg-white/10 hover:text-cyan-400 text-slate-300 border-white/5'
              }`}
              disabled={isLoading}
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              id="btn-chat-send"
              type="submit"
              className="bg-cyan-500 hover:bg-cyan-600 hover:shadow-[0_0_12px_rgba(6,182,212,0.4)] text-black p-3 rounded-2xl font-bold transition-all active:scale-95 shrink-0"
              disabled={isLoading || !inputValue.trim()}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Preset Command Deck & Knowledge Deck */}
      <div id="assistant-presets-deck" className="space-y-6">
        {/* Preset Cards */}
        <div className={`border p-5 rounded-3xl backdrop-blur-sm transition-all duration-300 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'
        }`}>
          <div className="flex items-center space-x-2 mb-4">
            <Bot className="w-5 h-5 text-cyan-500" />
            <h4 className={`text-xs font-bold uppercase tracking-wider transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>Phím tắt Kịch bản Nhanh</h4>
          </div>
          <p className="text-[11px] text-slate-500 mb-4 leading-relaxed font-semibold">
            Kịch hoạt trực tiếp các kịch bản điều khiển phức tạp cho toàn bộ ngôi nhà:
          </p>
          <div className="space-y-2">
            {presetCommands.map((p, idx) => (
              <button
                key={idx}
                id={`assistant-preset-item-${idx}`}
                type="button"
                onClick={() => handleSend(p.text)}
                disabled={isLoading}
                className={`w-full text-left border p-3 rounded-2xl transition-all text-xs block group ${
                  theme === 'light'
                    ? 'bg-slate-50 hover:bg-cyan-50/50 border-slate-200 hover:border-cyan-200 text-slate-700'
                    : 'bg-black/40 hover:bg-cyan-500/5 border border-white/5 hover:border-cyan-500/20 text-slate-300'
                }`}
              >
                <div className="font-bold text-cyan-600 group-hover:text-cyan-500 mb-0.5">{p.label}</div>
                <div className="text-[10px] text-slate-500 line-clamp-1 group-hover:text-slate-400">"{p.text}"</div>
              </button>
            ))}
          </div>
        </div>

        {/* Advisory / Status Checklist Card */}
        <div className={`border p-5 rounded-3xl backdrop-blur-sm transition-all duration-300 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'
        }`}>
          <div className="flex items-center space-x-2 text-slate-400 mb-3">
            <BadgeInfo className="w-4 h-4 text-cyan-500" />
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] font-mono text-slate-450">Thành phần Hệ thống</h4>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-505 font-medium">
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
              <span>Cập nhật trạng thái thời gian thực</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
              <span>Thiết lập thông số chính xác</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
              <span>Phản hồi điều khiển tức thì không độ trễ</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

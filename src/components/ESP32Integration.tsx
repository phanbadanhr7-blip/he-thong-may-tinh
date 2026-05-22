import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Wifi, 
  Copy, 
  Check, 
  Terminal, 
  Sliders, 
  Zap, 
  Play, 
  RefreshCw, 
  Radio, 
  ArrowRight, 
  CheckCircle2, 
  Info, 
  AlertTriangle 
} from 'lucide-react';
import { Device } from '../types';

interface ESP32IntegrationProps {
  devices: Device[];
  onDeviceUpdate: (id: string, update: Partial<Device>) => Promise<void>;
  theme: 'light' | 'dark';
}

interface PinMapping {
  gpio: number;
  deviceId: string;
  mode: 'OUTPUT' | 'INPUT_PULLUP';
}

export default function ESP32Integration({ devices, onDeviceUpdate, theme }: ESP32IntegrationProps) {
  // Configured mappings state
  const [mappings, setMappings] = useState<PinMapping[]>([
    { gpio: 2, deviceId: 'living_light', mode: 'OUTPUT' },
    { gpio: 4, deviceId: 'front_door_lock', mode: 'OUTPUT' },
    { gpio: 5, deviceId: 'sprinklers', mode: 'INPUT_PULLUP' },
  ]);

  const [copysuccess, setCopySuccess] = useState<boolean>(false);
  const [wifiSsid, setWifiSsid] = useState<string>("My_Showroom_WiFi");
  const [wifiPass, setWifiPass] = useState<string>("12345678");
  const [pollInterval, setPollInterval] = useState<number>(3); // seconds

  const [simulationLogs, setSimulationLogs] = useState<Array<{ time: string; msg: string; type: 'in' | 'out' | 'info' }>>([
    { time: new Date().toLocaleTimeString(), msg: "Khởi tạo môi trường mô phỏng ESP32 thành công.", type: "info" },
    { time: new Date().toLocaleTimeString(), msg: "Tìm thấy địa chỉ Cloud Server ở chế độ Live Node.", type: "info" }
  ]);

  // Handle live URL detection
  const serverOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-6w5qk55ugmwmtlc2hhvxbe-876098673256.asia-southeast1.run.app';

  // Add pin mappings helper
  const handleAddMapping = () => {
    const nextGpio = [12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23].find(p => !mappings.some(m => m.gpio === p));
    const availableDevice = devices.find(d => !mappings.some(m => m.deviceId === d.id));
    
    if (nextGpio && availableDevice) {
      setMappings(prev => [...prev, {
        gpio: nextGpio,
        deviceId: availableDevice.id,
        mode: availableDevice.type === 'switch' ? 'INPUT_PULLUP' : 'OUTPUT'
      }]);
      addSimLog(`Đã gán chân GPIO ${nextGpio} cho thiết bị "${availableDevice.name}"`, 'info');
    }
  };

  const handleRemoveMapping = (gpio: number) => {
    setMappings(prev => prev.filter(m => m.gpio !== gpio));
    addSimLog(`Đã xóa cấu hình chân GPIO ${gpio}`, 'info');
  };

  const handleUpdateMapping = (gpio: number, fields: Partial<PinMapping>) => {
    setMappings(prev => prev.map(m => m.gpio === gpio ? { ...m, ...fields } as PinMapping : m));
  };

  const addSimLog = (msg: string, type: 'in' | 'out' | 'info') => {
    setSimulationLogs(prev => [
      { time: new Date().toLocaleTimeString(), msg, type },
      ...prev.slice(0, 19)
    ]);
  };

  // Trigger simulated ESP32 inputs (like physical button toggles)
  const triggerSimButtonPress = async (mapping: PinMapping) => {
    const targetDevice = devices.find(d => d.id === mapping.deviceId);
    if (!targetDevice) return;

    addSimLog(`[GPIO ${mapping.gpio}] Nút bấm kích hoạt! Đang gửi tín hiệu REST API...`, 'out');

    let currentStatus = targetDevice.status;
    let nextStatus = "off";

    // Toggle logic based on device type
    if (targetDevice.type === 'light' || targetDevice.type === 'switch') {
      nextStatus = currentStatus === 'on' ? 'off' : 'on';
    } else if (targetDevice.type === 'lock') {
      nextStatus = currentStatus === 'locked' ? 'unlocked' : 'locked';
    } else if (targetDevice.type === 'media') {
      nextStatus = currentStatus === 'playing' ? 'paused' : 'playing';
    }

    try {
      const url = `/api/esp32/update?id=${targetDevice.id}&status=${nextStatus}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.device) {
          // Sync state to the app context
          await onDeviceUpdate(targetDevice.id, { status: nextStatus });
          addSimLog(`[API SUCCESS] Cập nhật thiết bị ${targetDevice.name} thành [${nextStatus.toUpperCase()}] thành công!`, 'in');
        }
      }
    } catch (err) {
      addSimLog(`[ERR] Không gửi được yêu cầu: ${err}`, 'info');
    }
  };

  // Visual LED tracking
  const getSimulatedLEDState = (mapping: PinMapping) => {
    const d = devices.find(dev => dev.id === mapping.deviceId);
    if (!d) return false;
    return d.status === 'on' || d.status === 'unlocked' || d.status === 'playing' || d.status === 'cleaning';
  };

  // Generate Arduino Code dynamically
  const generateArduinoCode = () => {
    const pinDefinitions = mappings.map(m => {
      return `const int PIN_GPIO_${m.gpio} = ${m.gpio}; // Đã map với: ${devices.find(d => d.id === m.deviceId)?.name || m.deviceId} (${m.mode})`;
    }).join('\n');

    const pinSetup = mappings.map(m => {
      return `  pinMode(PIN_GPIO_${m.gpio}, ${m.mode});
  if (PIN_GPIO_${m.gpio} == 4 || PIN_GPIO_${m.gpio} == 2) {
    digitalWrite(PIN_GPIO_${m.gpio}, LOW); // Mặc định tắt đầu ra
  }`;
    }).join('\n');

    const statusParsingLoop = mappings.filter(m => m.mode === 'OUTPUT').map(m => {
      const dev = devices.find(d => d.id === m.deviceId);
      const onState = dev?.type === 'lock' ? '"unlocked"' : '"on"';
      return `      if (doc["id"] == "${m.deviceId}" || doc.containsKey("${m.deviceId}")) {
        String statusVal = doc["${m.deviceId}"]["status"] | doc["status"] | "off";
        if (statusVal == ${onState}) {
          digitalWrite(PIN_GPIO_${m.gpio}, HIGH); // Kích hoạt Relay/LED sáng
        } else {
          digitalWrite(PIN_GPIO_${m.gpio}, LOW); // Ngắt Relay/LED
        }
      }`;
    }).join('\n\n');

    // Individual poll for each OUTPUT device
    const outputPollers = mappings.filter(m => m.mode === 'OUTPUT').map(m => {
      const dev = devices.find(d => d.id === m.deviceId);
      return `    // Kiểm tra trạng thái thiết bị ${dev?.name}
    doc.clear();
    if (getDeviceStatus("${m.deviceId}", doc)) {
      String currentStatus = doc["status"] | "off";
      Serial.println("[ESP32] Luồng ${m.deviceId}: " + currentStatus);
      if (currentStatus == "on" || currentStatus == "unlocked" || currentStatus == "playing") {
        digitalWrite(PIN_GPIO_${m.gpio}, HIGH); // Bật thiết bị vật lý
      } else {
        digitalWrite(PIN_GPIO_${m.gpio}, LOW); // Tắt thiết bị vật lý
      }
    }
    delay(500); // Tránh nghẽn kênh truyền`;
    }).join('\n\n');

    const inputButtonWatchers = mappings.filter(m => m.mode === 'INPUT_PULLUP').map(m => {
      const dev = devices.find(d => d.id === m.deviceId);
      const nextToggleValue = dev?.type === 'lock' 
        ? ' (status == "locked" ? "unlocked" : "locked") ' 
        : ' (status == "on" ? "off" : "on") ';
      return `  // Giám sát nút vật lý trên PIN GPIO ${m.gpio} (${dev?.name || m.deviceId})
  int btnState_${m.gpio} = digitalRead(PIN_GPIO_${m.gpio});
  static int lastBtnState_${m.gpio} = HIGH;
  if (btnState_${m.gpio} == LOW && lastBtnState_${m.gpio} == HIGH) {
    // Phát hiện nút được nhấn xuống GND
    Serial.println("[ESP32] Phát hiện thao tác điều khiển vật lý tại GPIO ${m.gpio}!");
    
    // Lấy trạng thái hiện tại từ Cloud để đảo ngược
    DynamicJsonDocument btnDoc(1024);
    if (getDeviceStatus("${m.deviceId}", btnDoc)) {
      String status = btnDoc["status"] | "off";
      String nextStatus;
      if (status == "on" || status == "unlocked") {
        nextStatus = "off";
        if ("${dev?.type}" == "lock") nextStatus = "locked";
      } else {
        nextStatus = "on";
        if ("${dev?.type}" == "lock") nextStatus = "unlocked";
      }
      
      // Đồng bộ hóa trạng thái mới ngược lại đám mây
      updateDeviceStatus("${m.deviceId}", nextStatus);
    }
    delay(250); // Chống dội phím (Debounce)
  }
  lastBtnState_${m.gpio} = btnState_${m.gpio};`;
    }).join('\n\n');

    return `/**
 * @file ESP32_Atrium_Controller.ino
 * @brief Code Arduino C++ điều khiển nhà thông minh "Máy tính Mũi Né"
 * @description Tự động tạo bởi Hệ thống Grid đám mây Atrium Core
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- THÔNG TIN WIFI CỦA BẠN ---
const char* ssid = "${wifiSsid}";
const char* password = "${wifiPass}";

// --- URL MÁY CHỦ CLOUD (TỰ ĐỘNG ĐỊNH CẤU HÌNH LIVE NODE) ---
const String serverUrl = "${serverOrigin}";

// --- CẤU HÌNH CÁC CHÂN CỦA ESP32 ---
${pinDefinitions}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Thiết lập chân I/O
${pinSetup}

  // Kết nối WiFi
  Serial.print("[WiFi] Đang kết nối mạng: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("[WiFi] Kết nối thành công!");
  Serial.print("[WiFi] Địa chỉ IP nội bộ ESP32: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    DynamicJsonDocument doc(2048);
    
${outputPollers}

${inputButtonWatchers}

  } else {
    Serial.println("[LỖI] Mất kết nối WiFi. Đang nỗ lực kết nối lại...");
    WiFi.begin(ssid, password);
    delay(3000);
  }
  
  // Tần suất định kỳ của chu kỳ quét
  delay(${pollInterval} * 1000);
}

// --- HÀM GIÚP LẤY TRẠNG THÁI THIẾT BỊ TỪ CLOUD ---
bool getDeviceStatus(String deviceId, DynamicJsonDocument& outDoc) {
  HTTPClient http;
  String url = serverUrl + "/api/esp32/status?id=" + deviceId;
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    DeserializationError error = deserializeJson(outDoc, payload);
    if (!error) {
      http.end();
      return true;
    } else {
      Serial.println("[JSON] Không thể phân tích cấu trúc phản hồi!");
    }
  } else {
    Serial.printf("[HTTP] Lỗi GET trạng thái thiết bị %s, Mã code: %d\\n", deviceId.c_str(), httpCode);
  }
  
  http.end();
  return false;
}

// --- HÀM GIÚP GỬI TRẠNG THÁI ĐO ĐƯỢC TỪ NÚT BẤM LÊN MÁY CHỦ ---
void updateDeviceStatus(String deviceId, String newStatus) {
  HTTPClient http;
  // Gửi thông tin cập nhật qua chuỗi truy vấn GET an toàn
  String url = serverUrl + "/api/esp32/update?id=" + deviceId + "&status=" + newStatus;
  
  Serial.print("[HTTP] Đang gửi đồng bộ: ");
  Serial.println(url);
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    Serial.println("[HTTP] Đồng bộ trạng thái vật lý hoạt động OK.");
  } else {
    Serial.printf("[HTTP] Thất bại, mã phản hồi: %d\\n", httpCode);
  }
  http.end();
}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateArduinoCode());
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div id="esp32-integration-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-sans">
      {/* Intro and Info Card */}
      <div className={`lg:col-span-12 p-6 rounded-[2rem] border backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-[background,border] duration-300 ${
        theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400">
              <Cpu className="w-5 h-5 stroke-[2]" />
            </span>
            <h3 className={`text-lg font-bold transition-colors ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>TÍCH HỢP QUY TRÌNH PHẦN CỨNG ESP32 VÀO HỆ THỐNG</h3>
          </div>
          <p className={`text-xs max-w-3xl transition-colors ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            Bằng cách ghép nối chân GPIO của vi điều khiển ESP32 với các thiết bị ảo trong cơ sở dữ liệu Firestore, bạn có thể tạo mô hình điều khiển thực tế. Sử dụng bộ nguồn rơ-le hoặc nút bấm vật lý ngoài đời thực để đồng bộ hoàn toàn với "Máy tính Mũi Né".
          </p>
        </div>
        <div className={`p-2 py-1 flex items-center space-x-1.5 rounded-full border text-[9px] font-mono tracking-widest uppercase font-bold ${
          theme === 'light' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Sẵn sàng kết nối Arduino</span>
        </div>
      </div>

      {/* Grid mappings and Board UI */}
      <div className="lg:col-span-5 space-y-8">
        {/* Board pin configuration Card */}
        <div className={`p-6 rounded-[2rem] border transition-[background,border] duration-300 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'
        }`}>
          <div className="flex justify-between items-center mb-6">
            <h4 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Sơ đồ chân GPIO</span>
            </h4>
            <button
              onClick={handleAddMapping}
              disabled={mappings.length >= 10 || mappings.length >= devices.length}
              className="text-[11px] font-bold px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-black rounded-xl transition-all disabled:opacity-50 inline-flex items-center gap-1 shadow-sm"
            >
              + Thêm Pin
            </button>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {mappings.map((mapping, idx) => {
              const matchedDevice = devices.find(d => d.id === mapping.deviceId);
              return (
                <div 
                  key={mapping.gpio} 
                  className={`p-4 rounded-2xl border flex flex-col space-y-3 transition-colors ${
                    theme === 'light' 
                      ? 'bg-slate-50 border-slate-250 hover:border-slate-300' 
                      : 'bg-black/20 border-white/5 hover:bg-black/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      GPIO {mapping.gpio}
                    </span>
                    <button
                      onClick={() => handleRemoveMapping(mapping.gpio)}
                      className="text-[10px] uppercase font-bold text-slate-500 hover:text-red-400 transition-colors"
                    >
                      Hủy Map
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Device Selector */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Thiết bị ảo</label>
                      <select
                        value={mapping.deviceId}
                        onChange={(e) => handleUpdateMapping(mapping.gpio, { deviceId: e.target.value })}
                        className={`w-full text-xs p-2 rounded-xl border focus:outline-none focus:border-cyan-500 font-sans transition-all ${
                          theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-black/30 border-white/10 text-white'
                        }`}
                      >
                        {devices.map(d => (
                          <option key={d.id} value={d.id} disabled={mappings.some(m => m.deviceId === d.id && m.gpio !== mapping.gpio)}>
                            {d.name} ({d.room})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Mode Selector */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Chế độ chân</label>
                      <select
                        value={mapping.mode}
                        onChange={(e) => handleUpdateMapping(mapping.gpio, { mode: e.target.value as 'OUTPUT' | 'INPUT_PULLUP' })}
                        className={`w-full text-xs p-2 rounded-xl border focus:outline-none focus:border-cyan-500 font-sans transition-all ${
                          theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-black/30 border-white/10 text-white'
                        }`}
                      >
                        <option value="OUTPUT">Đầu ra: Relay/LED</option>
                        <option value="INPUT_PULLUP">Đầu vào: Nút nhấn vật lý</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}

            {mappings.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500">
                Chưa có chân GPIO nào được gán. Hãy bấm nút phía trên để thêm cấu hình mẫu.
              </div>
            )}
          </div>
        </div>

        {/* Real-time Hardware Sandbox Card */}
        <div className={`p-6 rounded-[2rem] border transition-[background,border] duration-300 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'
        }`}>
          <h4 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-6 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>Sa bàn Giả lập ESP32 trực tiếp</span>
          </h4>

          {/* LED Outputs Display */}
          <div className="space-y-4 mb-6">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trạng thái rơ-le / đèn led xuất từ ESP32</div>
            <div className="grid grid-cols-2 gap-3">
              {mappings.filter(m => m.mode === 'OUTPUT').map(m => {
                const dev = devices.find(d => d.id === m.deviceId);
                const isLit = getSimulatedLEDState(m);
                return (
                  <div 
                    key={m.gpio}
                    className={`p-3.5 rounded-2xl border flex items-center space-x-3 transition-all ${
                      isLit
                        ? 'bg-cyan-500/10 border-cyan-500/30' 
                        : (theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-black/10 border-white/5')
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 transition-all ${
                      isLit 
                        ? 'bg-cyan-400 shadow-[0_0_12px_#22d3ee] scale-110' 
                        : (theme === 'light' ? 'bg-slate-350' : 'bg-slate-700')
                    }`}></span>
                    <div className="overflow-hidden">
                      <div className={`text-xs font-bold truncate ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>GPIO {m.gpio}</div>
                      <div className="text-[9px] text-slate-500 truncate">{dev?.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Button Inputs Trigger */}
          <div className="space-y-4 mb-6">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mô phỏng nút nhấn vật lý và cảm biến</div>
            <div className="space-y-2">
              {mappings.filter(m => m.mode === 'INPUT_PULLUP').map(m => {
                const dev = devices.find(d => d.id === m.deviceId);
                return (
                  <button
                    key={m.gpio}
                    onClick={() => triggerSimButtonPress(m)}
                    className={`w-full p-3.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                      theme === 'light' 
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' 
                        : 'bg-black/20 hover:bg-black/40 border-white/5'
                    }`}
                  >
                    <div>
                      <div className={`text-xs font-bold ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>GPIO {m.gpio} (Nút nhấn chập GND)</div>
                      <div className="text-[9px] text-slate-550">Tác động trạng thái: {dev?.name}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-450 rounded font-mono">Nhấn phím</span>
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Simulation Console Screen */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-550 uppercase tracking-wider">
              <span>Màn hình Log Debug vi điều khiển</span>
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="bg-[#05070a]/90 border border-white/5 rounded-2xl p-4 font-mono text-[10px] text-slate-350 leading-relaxed max-h-[140px] overflow-y-auto space-y-1">
              {simulationLogs.map((log, idx) => (
                <div key={idx} className="flex space-x-1.5">
                  <span className="text-slate-500 flex-shrink-0">[{log.time}]</span>
                  <span className={
                    log.type === 'in' ? 'text-emerald-450' : (log.type === 'out' ? 'text-cyan-400' : 'text-slate-400')
                  }>
                    {log.type === 'in' ? '<<' : (log.type === 'out' ? '>>' : ' *')} {log.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Arduino Code Generator */}
      <div className="lg:col-span-7 space-y-8">
        <div className={`p-6 rounded-[2rem] border flex flex-col h-full transition-[background,border] duration-300 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#161b22]/50 border-white/5'
        }`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h4 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>Mã nguồn ESP32 Arduino Sketch (.ino)</span>
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={copyToClipboard}
                className="text-[11px] font-bold px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-black rounded-xl transition-all inline-flex items-center gap-1 shadow-sm"
              >
                {copysuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã Sao chép!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Sao chép Code
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Wi-Fi Parameters Panel */}
          <div className={`grid grid-cols-3 gap-2 p-4 rounded-2xl mb-4 text-xs ${
            theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-black/30 border border-white/5'
          }`}>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Wi-Fi SSID</label>
              <input 
                type="text" 
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                placeholder="Tên Wi-Fi"
                className={`w-full p-2 py-1.5 rounded-lg border focus:outline-none transition-all ${
                  theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-black/30 border-white/10 text-white'
                }`}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Wi-Fi Mật khẩu</label>
              <input 
                type="password" 
                value={wifiPass}
                onChange={(e) => setWifiPass(e.target.value)}
                placeholder="Mật khẩu"
                className={`w-full p-2 py-1.5 rounded-lg border focus:outline-none transition-all ${
                  theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-black/30 border-white/10 text-white'
                }`}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tần suất Quét (Giây)</label>
              <input 
                type="number" 
                value={pollInterval}
                min={2}
                max={60}
                onChange={(e) => setPollInterval(Math.max(2, parseInt(e.target.value, 10)))}
                className={`w-full p-2 py-1.5 rounded-lg border focus:outline-none transition-all ${
                  theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-black/30 border-white/10 text-white'
                }`}
              />
            </div>
          </div>

          {/* Actual Source Code Editor/Viewer Block */}
          <div className="flex-1 min-h-[350px] flex flex-col">
            <div className="bg-[#05070a] border border-white/5 rounded-2xl flex-1 flex flex-col overflow-hidden max-h-[500px]">
              {/* Header block tab */}
              <div className="border-b border-white/5 bg-black/40 px-4 py-2.5 flex items-center justify-between text-slate-450 font-mono text-[10px]">
                <span>ESP32_Atrium_Controller.ino</span>
                <span className="text-[#06b6d4] font-bold">C++ / Arduino IDE</span>
              </div>
              <pre className="p-4 overflow-auto flex-1 font-mono text-[11px] text-zinc-300 leading-relaxed select-all">
                <code>{generateArduinoCode()}</code>
              </pre>
            </div>
          </div>

          {/* Troubleshooting and Help Tips details */}
          <div className={`mt-4 p-4 rounded-2xl border flex items-start space-x-3 text-xs ${
            theme === 'light' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-500/5 border-amber-500/10 text-amber-200'
          }`}>
            <Info className="w-5 h-5 flex-shrink-0 text-amber-500" />
            <div className="space-y-1">
              <div className="font-bold uppercase tracking-wider text-[10px]">Lưu ý khi biên dịch mã nguồn trên Arduino IDE:</div>
              <p className="leading-relaxed text-[11px]">
                Đảm bảo bạn đã cài đặt các thư viện cần thiết như <b className="underline">ArduinoJson</b> (khuyên dùng v6) từ Trình quản lý thư viện (Library Manager). Chọn bo mạch chính xác <b className="underline">ESP32 Dev Module</b> hoặc tương đương trước khi bấm nút Compile.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

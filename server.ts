import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Device Types and default state
interface Device {
  id: string;
  name: string;
  type: 'light' | 'climate' | 'lock' | 'media' | 'vacuum' | 'switch';
  status: string;
  value: number;
  unit?: string;
  room: string;
  color?: string;
  mode?: string;
  track?: string;
  artist?: string;
}

// In-Memory Device Database
let devices: Record<string, Device> = {
  living_light: { id: "living_light", name: "Đèn Trang trí Phòng khách", type: "light", status: "on", value: 80, room: "Phòng khách", color: "#FBBF24" },
  dining_light: { id: "dining_light", name: "Đèn Chùm Phòng ăn", type: "light", status: "off", value: 0, room: "Phòng ăn", color: "#F1F5F9" },
  bedroom_light: { id: "bedroom_light", name: "Đèn Ngủ Phòng ngủ chính", type: "light", status: "on", value: 30, room: "Phòng ngủ", color: "#FBBF24" },
  kitchen_light: { id: "kitchen_light", name: "Đèn Rọi Phòng bếp", type: "light", status: "on", value: 90, room: "Phòng bếp", color: "#FBBF24" },
  ac_unit: { id: "ac_unit", name: "Điều hòa Trung tâm", type: "climate", status: "on", value: 72, unit: "°F", mode: "cool", room: "Phòng khách" },
  bedroom_heater: { id: "bedroom_heater", name: "Máy sưởi Phòng ngủ", type: "climate", status: "off", value: 68, unit: "°F", mode: "heat", room: "Phòng ngủ" },
  front_door_lock: { id: "front_door_lock", name: "Khóa Cửa chính", type: "lock", status: "locked", value: 0, room: "Lối vào" },
  garage_door: { id: "garage_door", name: "Cửa Nhà xe (Garage)", type: "lock", status: "closed", value: 0, room: "Nhà xe" },
  smart_music: { id: "smart_music", name: "Loa Sonos Soundbar", type: "media", status: "playing", value: 45, track: "Nhạc tập trung Lofi thư giãn", artist: "Hệ thống phát nhạc", room: "Phòng khách" },
  vacuum: { id: "vacuum", name: "Robot hút bụi RoboVac 9000", type: "vacuum", status: "docked", value: 100, unit: "%", room: "Hành lang" },
  sprinklers: { id: "sprinklers", name: "Hệ thống tưới Sân vườn", type: "switch", status: "off", value: 0, room: "Sân vườn" }
};

const initialDevices = { ...devices };

// Keep some activity logs
interface ActivityLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'auth' | 'alert' | 'voice';
}

let activityLogs: ActivityLog[] = [
  { id: "1", timestamp: new Date(Date.now() - 3600000).toISOString(), message: "Cửa chính đã được khóa tự động (Kịch bản: Chế độ Ban đêm)", type: "info" },
  { id: "2", timestamp: new Date(Date.now() - 1800000).toISOString(), message: "Robot hút bụi RoboVac 9000 đã hoàn thành dọn dẹp Hành lang và tự động quay về đốc sạc.", type: "info" },
  { id: "3", timestamp: new Date(Date.now() - 900000).toISOString(), message: "Điều Hòa Trung tâm chuyển sang chế độ Làm mát ở 72°F do nhiệt độ phòng tăng.", type: "info" }
];

// Server-Side Lazy-Loaded Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI functionality will run in fallback mock mode.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Log formatting helper
function addLog(message: string, type: 'info' | 'auth' | 'alert' | 'voice' = 'info') {
  const newLog: ActivityLog = {
    id: String(Date.now() + Math.random()),
    timestamp: new Date().toISOString(),
    message,
    type
  };
  activityLogs.unshift(newLog);
  if (activityLogs.length > 50) {
    activityLogs.pop();
  }
}

// --- API ROUTES ---

// GET /api/devices
app.get("/api/devices", (req, res) => {
  res.json({ devices: Object.values(devices), logs: activityLogs });
});

// GET /api/logs
app.get("/api/logs", (req, res) => {
  res.json({ logs: activityLogs });
});

// PUT /api/devices/:id
app.put("/api/devices/:id", (req, res) => {
  const { id } = req.params;
  const update = req.body;
  if (!devices[id]) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  devices[id] = { ...devices[id], ...update };
  
  // Format meaningful log
  let logStr = `Thiết bị ${devices[id].name} thay đổi trạng thái: hiện đang [${devices[id].status.toUpperCase()}]`;
  if (update.value !== undefined) logStr += `, giá trị đặt là ${update.value}${devices[id].unit || ''}`;
  if (update.mode !== undefined) logStr += `, chế độ đặt là ${update.mode}`;
  if (update.name !== undefined) logStr = `Thiết bị đã đổi tên thành: ${update.name}`;
  if (update.room !== undefined) logStr = `Thiết bị ${devices[id].name} chuyển sang khu vực: ${update.room}`;
  
  addLog(logStr);
  res.json({ success: true, device: devices[id] });
});

// POST /api/devices
app.post("/api/devices", (req, res) => {
  const { name, type, room } = req.body;
  if (!name || !type || !room) {
    res.status(400).json({ error: "Thiếu thông tin thiết bị (name, type, room)" });
    return;
  }
  
  const id = `device_${Date.now()}`;
  let status = "off";
  if (type === "lock") status = "locked";
  if (type === "media") status = "paused";
  if (type === "vacuum") status = "docked";

  const newDevice: Device = {
    id,
    name,
    type,
    room,
    status,
    value: type === "climate" ? 72 : (type === "light" ? 100 : (type === "media" ? 50 : (type === "vacuum" ? 100 : 0))),
    unit: type === "climate" ? "°F" : (type === "vacuum" ? "%" : undefined),
    color: type === "light" ? "#FBBF24" : undefined,
    mode: type === "climate" ? "cool" : undefined,
    track: type === "media" ? "Nhạc tập trung Lofi thư giãn" : undefined,
    artist: type === "media" ? "Hệ thống phát nhạc" : undefined
  };

  devices[id] = newDevice;
  addLog(`Đã thêm thiết bị mới: ${name} (${room})`, "info");
  res.json({ success: true, device: newDevice });
});

// DELETE /api/devices/:id
app.delete("/api/devices/:id", (req, res) => {
  const { id } = req.params;
  if (!devices[id]) {
    res.status(404).json({ error: "Device not found" });
    return;
  }
  const name = devices[id].name;
  delete devices[id];
  addLog(`Đã xóa thiết bị: ${name}`, "info");
  res.json({ success: true });
});

// POST /api/devices/reset
app.post("/api/devices/reset", (req, res) => {
  devices = JSON.parse(JSON.stringify(initialDevices));
  addLog("Hệ thống Nhà thông minh đã được đặt lại về trạng thái mặc định.", "info");
  res.json({ success: true, devices: Object.values(devices) });
});

// POST /api/assistant
app.post("/api/assistant", async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    res.status(400).json({ error: "Không tìm thấy nội dung lệnh" });
    return;
  }

  addLog(`Trợ lý AI nhận được yêu cầu giọng nói/văn bản: "${message}"`, "voice");

  // Fallback if no API key is specified (simulated helper so users get immediate satisfaction)
  const isMocked = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY";

  if (isMocked) {
    // Elegant standard response simulation
    let reply = "";
    const updates: any[] = [];
    const textLower = message.toLowerCase();

    if (textLower.includes("turn off") || textLower.includes("tắt") || textLower.includes("disable")) {
      if (textLower.includes("light") || textLower.includes("lights") || textLower.includes("đèn")) {
        let roomsFound = ["living_light", "dining_light", "bedroom_light", "kitchen_light"];
        roomsFound.forEach(id => {
          devices[id].status = "off";
          updates.push({ id, status: "off" });
        });
        reply = "Tôi đã tắt toàn bộ đèn trong nhà giúp bạn rồi.";
      } else if (textLower.includes("ac") || textLower.includes("điều hòa") || textLower.includes("air conditioner")) {
        devices["ac_unit"].status = "off";
        updates.push({ id: "ac_unit", status: "off" });
        reply = "Tôi đã tắt máy điều hòa trung tâm ở phòng khách.";
      } else if (textLower.includes("music") || textLower.includes("nhạc") || textLower.includes("loa") || textLower.includes("soundbar")) {
        devices["smart_music"].status = "paused";
        updates.push({ id: "smart_music", status: "paused" });
        reply = "Tôi đã tạm dừng phát nhạc trên loa Sonos Soundbar phòng khách.";
      } else {
        reply = "Bạn vui lòng chỉ rõ thiết bị hoặc phòng nào bạn muốn tắt nhé?";
      }
    } else if (textLower.includes("turn on") || textLower.includes("bật") || textLower.includes("mở") || textLower.includes("kích hoạt") || textLower.includes("chạy")) {
      if (textLower.includes("light") || textLower.includes("lights") || textLower.includes("đèn")) {
        devices["living_light"].status = "on";
        devices["living_light"].value = 80;
        devices["bedroom_light"].status = "on";
        devices["bedroom_light"].value = 50;
        updates.push({ id: "living_light", status: "on", value: 80 }, { id: "bedroom_light", status: "on", value: 50 });
        reply = "Dạ được chứ! Tôi đã bật đèn phòng khách và đèn phòng ngủ cho bạn.";
      } else if (textLower.includes("ac") || textLower.includes("điều hòa") || textLower.includes("air conditioner")) {
        devices["ac_unit"].status = "on";
        updates.push({ id: "ac_unit", status: "on" });
        reply = "Tôi đã bật máy điều hòa trung tâm phòng khách cho bạn.";
      } else if (textLower.includes("sprinkler") || textLower.includes("tưới") || textLower.includes("bơm")) {
        devices["sprinklers"].status = "on";
        updates.push({ id: "sprinklers", status: "on" });
        reply = "Hệ thống tưới nước sân vườn đã được khởi động và đang hoạt động.";
      } else if (textLower.includes("vacuum") || textLower.includes("hút bụi") || textLower.includes("dọn dẹp")) {
        devices["vacuum"].status = "cleaning";
        updates.push({ id: "vacuum", status: "cleaning" });
        reply = "Tuyệt vời. Robot hút bụi RoboVac 9000 đã rời bến sạc và đang dọn dẹp sàn nhà.";
      } else {
        reply = "Tôi đã nghe rõ. Bạn vui lòng chỉ rõ thiết bị nào bạn muốn bật nhé.";
      }
    } else if (textLower.includes("lock") || textLower.includes("khóa") || textLower.includes("an ninh") || textLower.includes("sleep")) {
      devices["front_door_lock"].status = "locked";
      devices["garage_door"].status = "closed";
      devices["bedroom_light"].status = "off";
      devices["living_light"].status = "off";
      updates.push(
        { id: "front_door_lock", status: "locked" },
        { id: "garage_door", status: "closed" },
        { id: "bedroom_light", status: "off" },
        { id: "living_light", status: "off" }
      );
      reply = "Chúc bạn ngủ ngon! Hệ thống an ninh đã được kích hoạt hoàn toàn: đã khóa cửa chính, đóng cửa nhà xe và tắt toàn bộ đèn chính.";
    } else if (textLower.includes("set thermostat") || textLower.includes("nhiệt độ") || textLower.includes("làm mát") || textLower.includes("temp")) {
      let degree = 70;
      const match = textLower.match(/\d+/);
      if (match) degree = parseInt(match[0], 10);
      devices["ac_unit"].status = "on";
      devices["ac_unit"].value = degree;
      devices["ac_unit"].mode = "cool";
      updates.push({ id: "ac_unit", status: "on", value: degree, mode: "cool" });
      reply = `Tôi đã đặt nhiệt độ mục tiêu của điều hòa trung tâm thành ${degree}°F ở chế độ làm mát.`;
    } else {
      reply = `Tôi đã nhận lệnh của bạn: "${message}". Hãy kết nối khóa GEMINI_API_KEY chính thức của bạn tại Settings > Secrets để trải nghiệm toàn bộ sức mạnh tư duy AI, nhận thức phòng ốc và tự động cấu hình thiết bị của hệ thống nhé!`;
    }

    // Apply updates on server
    updates.forEach(u => {
      if (devices[u.id]) {
        devices[u.id] = { ...devices[u.id], ...u };
        addLog(`Hành động AI Giả lập: Đã đặt trạng thái ${devices[u.id].name} thành ${u.status}${u.value !== undefined ? ' ở mức ' + u.value : ''}`, 'info');
      }
    });

    res.json({
      textResponse: reply,
      deviceUpdates: updates,
      updatedDevices: Object.values(devices)
    });
    return;
  }

  try {
    const ai = getGenAI();

    // Prepare current states for Gemini context
    const currentDeviceStateString = Object.values(devices).map(d => {
      let state = `- ID: ${d.id}, Name: ${d.name}, Type: ${d.type}, Status: ${d.status}, Room: ${d.room}`;
      if (d.value !== undefined) state += `, current level/temp/value is ${d.value}${d.unit || ''}`;
      if (d.mode) state += `, current climate mode: ${d.mode}`;
      return state;
    }).join("\n");

    const systemInstruction = `You are a helpful and intelligent smart home AI assistant.
Your job is to read user commands, interpret which simulated smart devices in their home they want to control, and resolve a plan to update them.

Here is the current listing of live home devices:
${currentDeviceStateString}

Instructions:
1. Identify the user's intent. They can control dimmers, thermostat climate targets, locks, sprinklers, or multimedia.
2. Formulate device updates using their IDs accurately. Use proper states relative to type (e.g., lights: "on"/"off", climate: "on"/"off", locks: "locked"/"unlocked", vacuum: "docked"/"cleaning", switches: "on"/"off").
3. Set numeric 'value' targets when brightness, temperature thresholds, or volumes are requested or implied (e.g., "dim the bedroom lamp" -> status on, value 20; "make the living room cool" -> status on, climate mode "cool", value 68).
4. Provide a super polite conversational summary about what you have done.
5. You MUST return your output in JSON format adhering strictly to the provided responseSchema schema. Do not output markdown code blocks formatting unless specified.
6. CRITICAL: You MUST write your conversational textResponse in Vietnamese. Always talk to the user in Vietnamese.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: message,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            textResponse: {
              type: Type.STRING,
              description: "A friendly conversational response outlining what actions you took step-by-step written in Vietnamese."
            },
            deviceUpdates: {
              type: Type.ARRAY,
              description: "A list of structural updates to apply to the home device state database.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "The precise ID of the device to update from the list." },
                  status: { type: Type.STRING, description: "Optional. 'on', 'off', 'locked', 'unlocked', 'open', 'closed', 'playing', 'paused', 'docked', 'cleaning' depending on device." },
                  value: { type: Type.INTEGER, description: "Optional. New numerical level (temperature target, brightness percentage, etc. e.g. 72 or 45)." },
                  mode: { type: Type.STRING, description: "Optional. Climate modes: 'cool', 'heat', 'fan', 'eco'." }
                },
                required: ["id"]
              }
            }
          },
          required: ["textResponse", "deviceUpdates"]
        }
      }
    });

    const outputText = response.text ? response.text.trim() : "{}";
    const decision = JSON.parse(outputText);

    const executedUpdates: any[] = [];
    if (decision.deviceUpdates && Array.isArray(decision.deviceUpdates)) {
      decision.deviceUpdates.forEach((u: any) => {
        if (devices[u.id]) {
          // Merge
          devices[u.id] = { ...devices[u.id], ...u };
          executedUpdates.push(devices[u.id]);
          const displayVal = u.value !== undefined ? ` thành ${u.value}${devices[u.id].unit || ''}` : '';
          const displayMode = u.mode ? ` (chế độ: ${u.mode})` : '';
          addLog(`Lệnh máy AI: Đặt thông số ${devices[u.id].name} thành Trạng thái [${u.status?.toUpperCase() || ''}]${displayVal}${displayMode}`, 'voice');
        }
      });
    }

    res.json({
      textResponse: decision.textResponse,
      deviceUpdates: decision.deviceUpdates,
      updatedDevices: Object.values(devices)
    });

  } catch (error: any) {
    console.error("Gemini assistant error: ", error);
    addLog(`AI assistant encountered error: ${error.message}`, "alert");
    res.status(500).json({ error: "Failed to query Gemini assistant", detail: error.message });
  }
});


// --- INTEGRATE VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Home Express backend running at http://localhost:${PORT}`);
    console.log(`Bound to host 0.0.0.0 for Cloud Run routing.`);
  });
}

startServer();

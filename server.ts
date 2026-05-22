import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection 
} from "firebase/firestore";

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

interface ActivityLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'auth' | 'alert' | 'voice';
}

// Load configurations safely
const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// In-Memory Device Database (Fallback/Defaults)
const initialDevices: Record<string, Device> = {
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

// Database CRUD operations for devices
async function getDevicesFromFirestore(): Promise<Record<string, Device>> {
  try {
    const devicesCol = collection(db, "devices");
    const snapshot = await getDocs(devicesCol);
    if (snapshot.empty) {
      console.log("Firestore devices collection is empty. Populating default devices...");
      for (const [id, device] of Object.entries(initialDevices)) {
        await setDoc(doc(db, "devices", id), device);
      }
      return { ...initialDevices };
    }
    
    const fetched: Record<string, Device> = {};
    snapshot.forEach((docSnap) => {
      fetched[docSnap.id] = docSnap.data() as Device;
    });
    return fetched;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, "devices");
    return { ...initialDevices };
  }
}

async function saveDeviceToFirestore(device: Device): Promise<void> {
  try {
    await setDoc(doc(db, "devices", device.id), device);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `devices/${device.id}`);
  }
}

async function updateDeviceInFirestore(id: string, update: Partial<Device>): Promise<void> {
  try {
    const deviceRef = doc(db, "devices", id);
    await updateDoc(deviceRef, update as Record<string, any>);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `devices/${id}`);
  }
}

async function deleteDeviceFromFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "devices", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `devices/${id}`);
  }
}

async function resetDevicesInFirestore(): Promise<void> {
  try {
    const devicesCol = collection(db, "devices");
    const snapshot = await getDocs(devicesCol);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, "devices", docSnap.id));
    }
    for (const [id, device] of Object.entries(initialDevices)) {
      await setDoc(doc(db, "devices", id), device);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "devices/reset");
  }
}

// Database CRUD operations for logs
async function getActivityLogsFromFirestore(): Promise<ActivityLog[]> {
  try {
    const logsCol = collection(db, "logs");
    const snapshot = await getDocs(logsCol);
    if (snapshot.empty) {
      const initialLogs: ActivityLog[] = [
        { id: "log_1_init", timestamp: new Date(Date.now() - 3600000).toISOString(), message: "Cửa chính đã được khóa tự động (Kịch bản: Chế độ Ban đêm)", type: "info" },
        { id: "log_2_init", timestamp: new Date(Date.now() - 1800000).toISOString(), message: "Robot hút bụi RoboVac 9000 đã hoàn thành dọn dẹp Hành lang và tự động quay về đốc sạc.", type: "info" },
        { id: "log_3_init", timestamp: new Date(Date.now() - 900000).toISOString(), message: "Điều Hòa Trung tâm chuyển sang chế độ Làm mát ở 72°F do nhiệt độ phòng tăng.", type: "info" }
      ];
      for (const log of initialLogs) {
        await setDoc(doc(db, "logs", log.id), log);
      }
      return initialLogs;
    }
    const fetched: ActivityLog[] = [];
    snapshot.forEach((docSnap) => {
      fetched.push(docSnap.data() as ActivityLog);
    });
    fetched.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return fetched.slice(0, 50);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, "logs");
    return [];
  }
}

async function addLogToFirestore(message: string, type: 'info' | 'auth' | 'alert' | 'voice' = 'info'): Promise<void> {
  try {
    const id = String(Date.now() + Math.random()).replace(".", "-");
    const newLog: ActivityLog = {
      id,
      timestamp: new Date().toISOString(),
      message,
      type
    };
    await setDoc(doc(db, "logs", id), newLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `logs`);
  }
}

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

// --- API ROUTES ---

// GET /api/devices
app.get("/api/devices", async (req, res) => {
  try {
    const devicesMap = await getDevicesFromFirestore();
    const logsList = await getActivityLogsFromFirestore();
    res.json({ devices: Object.values(devicesMap), logs: logsList });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load state from Firestore", detail: error.message });
  }
});

// GET /api/logs
app.get("/api/logs", async (req, res) => {
  try {
    const logsList = await getActivityLogsFromFirestore();
    res.json({ logs: logsList });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load logs from Firestore", detail: error.message });
  }
});

// POST /api/logs
app.post("/api/logs", async (req, res) => {
  const { message, type } = req.body;
  if (!message) {
    res.status(400).json({ error: "Thiếu nội dung message" });
    return;
  }
  try {
    await addLogToFirestore(message, type || "info");
    const logsList = await getActivityLogsFromFirestore();
    res.json({ success: true, logs: logsList });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save log to Firestore", detail: error.message });
  }
});

// PUT /api/devices/:id
app.put("/api/devices/:id", async (req, res) => {
  const { id } = req.params;
  const update = req.body;
  try {
    const devicesMap = await getDevicesFromFirestore();
    if (!devicesMap[id]) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    const currentDevice = { ...devicesMap[id], ...update };
    await saveDeviceToFirestore(currentDevice);
    
    // Format meaningful log
    let logStr = `Thiết bị ${currentDevice.name} thay đổi trạng thái: hiện đang [${currentDevice.status.toUpperCase()}]`;
    if (update.value !== undefined) logStr += `, giá trị đặt là ${update.value}${currentDevice.unit || ''}`;
    if (update.mode !== undefined) logStr += `, chế độ đặt là ${update.mode}`;
    if (update.name !== undefined) logStr = `Thiết bị đã đổi tên thành: ${update.name}`;
    if (update.room !== undefined) logStr = `Thiết bị ${currentDevice.name} chuyển sang khu vực: ${update.room}`;
    
    await addLogToFirestore(logStr);
    res.json({ success: true, device: currentDevice });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update device in Firestore", detail: error.message });
  }
});

// POST /api/devices
app.post("/api/devices", async (req, res) => {
  const { name, type, room } = req.body;
  if (!name || !type || !room) {
    res.status(400).json({ error: "Thiếu thông tin thiết bị (name, type, room)" });
    return;
  }
  
  try {
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

    await saveDeviceToFirestore(newDevice);
    await addLogToFirestore(`Đã thêm thiết bị mới: ${name} (${room})`, "info");
    res.json({ success: true, device: newDevice });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to create device in Firestore", detail: error.message });
  }
});

// DELETE /api/devices/:id
app.delete("/api/devices/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const devicesMap = await getDevicesFromFirestore();
    if (!devicesMap[id]) {
      res.status(404).json({ error: "Device not found" });
      return;
    }
    const name = devicesMap[id].name;
    await deleteDeviceFromFirestore(id);
    await addLogToFirestore(`Đã xóa thiết bị: ${name}`, "info");
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to delete device from Firestore", detail: error.message });
  }
});

// POST /api/devices/reset
app.post("/api/devices/reset", async (req, res) => {
  try {
    await resetDevicesInFirestore();
    await addLogToFirestore("Hệ thống Nhà thông minh đã được đặt lại về trạng thái mặc định.", "info");
    const updatedDevices = await getDevicesFromFirestore();
    res.json({ success: true, devices: Object.values(updatedDevices) });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to reset devices in Firestore", detail: error.message });
  }
});

// GET /api/esp32/status
app.get("/api/esp32/status", async (req, res) => {
  const { id } = req.query;
  try {
    const devicesMap = await getDevicesFromFirestore();
    if (id && typeof id === "string") {
      const device = devicesMap[id];
      if (!device) {
        res.status(404).json({ error: "Device not found" });
        return;
      }
      res.json({
        id: device.id,
        name: device.name,
        status: device.status,
        value: device.value,
        room: device.room
      });
      return;
    }
    const values = Object.values(devicesMap).map(d => ({
      id: d.id,
      name: d.name,
      status: d.status,
      value: d.value,
      room: d.room
    }));
    res.json({ devices: values });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load state from Firestore for ESP32", detail: error.message });
  }
});

// GET /api/esp32/update (allows easy updates from ESP32 via query strings)
app.get("/api/esp32/update", async (req, res) => {
  const { id, status, value } = req.query;
  if (!id || typeof id !== "string") {
    res.status(400).json({ error: "Thiếu id thiết bị" });
    return;
  }
  try {
    const devicesMap = await getDevicesFromFirestore();
    const device = devicesMap[id];
    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    const update: Partial<Device> = {};
    if (status && typeof status === "string") {
      update.status = status;
    }
    if (value && typeof value === "string") {
      update.value = parseInt(value, 10);
    }

    const currentDevice = { ...device, ...update };
    await saveDeviceToFirestore(currentDevice);

    let logStr = `[Mạch ESP32] ${currentDevice.name} được điều khiển vật lý: hiện đang [${currentDevice.status.toUpperCase()}]`;
    if (update.value !== undefined) logStr += `, giá trị là ${update.value}${currentDevice.unit || ''}`;
    
    await addLogToFirestore(logStr, "info");
    res.json({ success: true, device: currentDevice });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to update device from ESP32", detail: error.message });
  }
});

// POST /api/assistant
app.post("/api/assistant", async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    res.status(400).json({ error: "Không tìm thấy nội dung lệnh" });
    return;
  }

  try {
    await addLogToFirestore(`Trợ lý AI nhận được yêu cầu giọng nói/văn bản: "${message}"`, "voice");

    const devicesMap = await getDevicesFromFirestore();

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
            if (devicesMap[id]) {
              devicesMap[id].status = "off";
              updates.push({ id, status: "off" });
            }
          });
          reply = "Tôi đã tắt toàn bộ đèn trong nhà giúp bạn rồi.";
        } else if (textLower.includes("ac") || textLower.includes("điều hòa") || textLower.includes("air conditioner")) {
          if (devicesMap["ac_unit"]) {
            devicesMap["ac_unit"].status = "off";
            updates.push({ id: "ac_unit", status: "off" });
          }
          reply = "Tôi đã tắt máy điều hòa trung tâm ở phòng khách.";
        } else if (textLower.includes("music") || textLower.includes("nhạc") || textLower.includes("loa") || textLower.includes("soundbar")) {
          if (devicesMap["smart_music"]) {
            devicesMap["smart_music"].status = "paused";
            updates.push({ id: "smart_music", status: "paused" });
          }
          reply = "Tôi đã tạm dừng phát nhạc trên loa Sonos Soundbar phòng khách.";
        } else {
          reply = "Bạn vui lòng chỉ rõ thiết bị hoặc phòng nào bạn muốn tắt nhé?";
        }
      } else if (textLower.includes("turn on") || textLower.includes("bật") || textLower.includes("mở") || textLower.includes("kích hoạt") || textLower.includes("chạy")) {
        if (textLower.includes("light") || textLower.includes("lights") || textLower.includes("đèn")) {
          if (devicesMap["living_light"]) {
            devicesMap["living_light"].status = "on";
            devicesMap["living_light"].value = 80;
            updates.push({ id: "living_light", status: "on", value: 80 });
          }
          if (devicesMap["bedroom_light"]) {
            devicesMap["bedroom_light"].status = "on";
            devicesMap["bedroom_light"].value = 50;
            updates.push({ id: "bedroom_light", status: "on", value: 50 });
          }
          reply = "Dạ được chứ! Tôi đã bật đèn phòng khách và đèn phòng ngủ cho bạn.";
        } else if (textLower.includes("ac") || textLower.includes("điều hòa") || textLower.includes("air conditioner")) {
          if (devicesMap["ac_unit"]) {
            devicesMap["ac_unit"].status = "on";
            updates.push({ id: "ac_unit", status: "on" });
          }
          reply = "Tôi đã bật máy điều hòa trung tâm phòng khách cho bạn.";
        } else if (textLower.includes("sprinkler") || textLower.includes("tưới") || textLower.includes("bơm")) {
          if (devicesMap["sprinklers"]) {
            devicesMap["sprinklers"].status = "on";
            updates.push({ id: "sprinklers", status: "on" });
          }
          reply = "Hệ thống tưới nước sân vườn đã được khởi động và đang hoạt động.";
        } else if (textLower.includes("vacuum") || textLower.includes("hút bụi") || textLower.includes("dọn dẹp")) {
          if (devicesMap["vacuum"]) {
            devicesMap["vacuum"].status = "cleaning";
            updates.push({ id: "vacuum", status: "cleaning" });
          }
          reply = "Tuyệt vời. Robot hút bụi RoboVac 9000 đã rời bến sạc và đang dọn dẹp sàn nhà.";
        } else {
          reply = "Tôi đã nghe rõ. Bạn vui lòng chỉ rõ thiết bị nào bạn muốn bật nhé.";
        }
      } else if (textLower.includes("lock") || textLower.includes("khóa") || textLower.includes("an ninh") || textLower.includes("sleep")) {
        if (devicesMap["front_door_lock"]) {
          devicesMap["front_door_lock"].status = "locked";
          updates.push({ id: "front_door_lock", status: "locked" });
        }
        if (devicesMap["garage_door"]) {
          devicesMap["garage_door"].status = "closed";
          updates.push({ id: "garage_door", status: "closed" });
        }
        if (devicesMap["bedroom_light"]) {
          devicesMap["bedroom_light"].status = "off";
          updates.push({ id: "bedroom_light", status: "off" });
        }
        if (devicesMap["living_light"]) {
          devicesMap["living_light"].status = "off";
          updates.push({ id: "living_light", status: "off" });
        }
        reply = "Chúc bạn ngủ ngon! Hệ thống an ninh đã được kích hoạt hoàn toàn: đã khóa cửa chính, đóng cửa nhà xe và tắt toàn bộ đèn chính.";
      } else if (textLower.includes("set thermostat") || textLower.includes("nhiệt độ") || textLower.includes("làm mát") || textLower.includes("temp")) {
        let degree = 70;
        const match = textLower.match(/\d+/);
        if (match) degree = parseInt(match[0], 10);
        if (devicesMap["ac_unit"]) {
          devicesMap["ac_unit"].status = "on";
          devicesMap["ac_unit"].value = degree;
          devicesMap["ac_unit"].mode = "cool";
          updates.push({ id: "ac_unit", status: "on", value: degree, mode: "cool" });
        }
        reply = `Tôi đã đặt nhiệt độ mục tiêu của điều hòa trung tâm thành ${degree}°F ở chế độ làm mát.`;
      } else {
        reply = `Tôi đã nhận lệnh của bạn: "${message}". Hãy kết nối khóa GEMINI_API_KEY chính thức của bạn tại Settings > Secrets để trải nghiệm toàn bộ sức mạnh tư duy AI, nhận thức phòng ốc và tự động cấu hình thiết bị của hệ thống nhé!`;
      }

      // Apply updates to Firestore
      for (const u of updates) {
        if (devicesMap[u.id]) {
          devicesMap[u.id] = { ...devicesMap[u.id], ...u };
          await saveDeviceToFirestore(devicesMap[u.id]);
          await addLogToFirestore(`Hành động AI Giả lập: Đã đặt trạng thái ${devicesMap[u.id].name} thành ${u.status}${u.value !== undefined ? ' ở mức ' + u.value : ''}`, 'info');
        }
      }

      res.json({
        textResponse: reply,
        deviceUpdates: updates,
        updatedDevices: Object.values(devicesMap)
      });
      return;
    }

    const ai = getGenAI();

    // Prepare current states for Gemini context
    const currentDeviceStateString = Object.values(devicesMap).map(d => {
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

    if (decision.deviceUpdates && Array.isArray(decision.deviceUpdates)) {
      for (const u of decision.deviceUpdates) {
        if (devicesMap[u.id]) {
          devicesMap[u.id] = { ...devicesMap[u.id], ...u };
          await saveDeviceToFirestore(devicesMap[u.id]);
          const displayVal = u.value !== undefined ? ` thành ${u.value}${devicesMap[u.id].unit || ''}` : '';
          const displayMode = u.mode ? ` (chế độ: ${u.mode})` : '';
          await addLogToFirestore(`Lệnh máy AI: Đặt thông số ${devicesMap[u.id].name} thành Trạng thái [${u.status?.toUpperCase() || ''}]${displayVal}${displayMode}`, 'voice');
        }
      }
    }

    res.json({
      textResponse: decision.textResponse,
      deviceUpdates: decision.deviceUpdates,
      updatedDevices: Object.values(devicesMap)
    });

  } catch (error: any) {
    console.error("Gemini assistant error: ", error);
    await addLogToFirestore(`AI assistant encountered error: ${error.message}`, "alert");
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

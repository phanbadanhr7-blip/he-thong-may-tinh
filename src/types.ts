export interface Device {
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

export interface ActivityLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'auth' | 'alert' | 'voice';
}

export type ActiveTab = 'overview' | 'climate' | 'lighting' | 'security' | 'media' | 'energy' | 'ai-assistant';

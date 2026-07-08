export interface AppSetting {
  key: string;
  value: string;
}

export interface CaptureSettings {
  intervalMinutes: number;
  storageDirectory: string;
  retentionDays: number;
  uploadToAIEnabled: boolean;
  blacklist: string[];
}

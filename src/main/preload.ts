import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("dailyAssistant", {
  app: {
    ping: () => "pong"
  }
});

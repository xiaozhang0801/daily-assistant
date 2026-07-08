import type {
  AIProviderProfile,
  AIProviderType,
  AppSetting,
  CaptureRecord,
  CaptureStatus,
  DailyReport,
  PromptPurpose,
  PromptTemplate,
  RecordingSession,
  ReportType,
  WorkEvent,
  WorkEventSource
} from "../../../shared/types";
import type { AppDatabase } from "./database";

interface DateRangeParams {
  start: string;
  end: string;
}

interface CaptureRow {
  id: string;
  capturedAt: string;
  imagePath: string;
  activeApp: string | null;
  windowTitle: string | null;
  status: CaptureStatus;
  skipReason: string | null;
}

interface WorkEventRow {
  id: string;
  captureId: string;
  startedAt: string;
  endedAt: string;
  title: string;
  summary: string;
  category: string;
  confidence: number;
  source: WorkEventSource;
}

interface RecordingSessionRow {
  id: string;
  startedAt: string;
  endedAt: string | null;
}

interface DailyReportRow {
  id: string;
  date: string;
  type: ReportType;
  content: string;
  generatedAt: string;
  updatedAt: string;
  providerId: string;
  modelName: string;
}

interface AIProviderProfileRow {
  id: string;
  name: string;
  type: AIProviderType;
  baseUrl: string | null;
  apiKeyRef: string;
  modelName: string;
  customHeaders: string;
  enabled: number;
}

interface AIProviderProfileSaveParams {
  id: string;
  name: string;
  type: AIProviderType;
  baseUrl: string | null;
  apiKeyRef: string;
  modelName: string;
  customHeaders: string;
  enabled: number;
}

interface PromptTemplateRow {
  id: string;
  name: string;
  purpose: PromptPurpose;
  content: string;
  isDefault: number;
}

interface PromptTemplateSaveParams {
  id: string;
  name: string;
  purpose: PromptPurpose;
  content: string;
  isDefault: number;
}

interface SettingRow {
  key: string;
  value: string;
}

function dateRange(date: string): DateRangeParams {
  return {
    start: `${date}T00:00:00.000Z`,
    end: `${date}T23:59:59.999Z`
  };
}

function toStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function toAIProviderProfile(row: AIProviderProfileRow): AIProviderProfile {
  const parsedHeaders: unknown = JSON.parse(row.customHeaders);

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    baseUrl: row.baseUrl,
    apiKeyRef: row.apiKeyRef,
    modelName: row.modelName,
    customHeaders: toStringRecord(parsedHeaders),
    enabled: row.enabled === 1
  };
}

function toAIProviderProfileSaveParams(profile: AIProviderProfile): AIProviderProfileSaveParams {
  return {
    id: profile.id,
    name: profile.name,
    type: profile.type,
    baseUrl: profile.baseUrl,
    apiKeyRef: profile.apiKeyRef,
    modelName: profile.modelName,
    customHeaders: JSON.stringify(profile.customHeaders),
    enabled: profile.enabled ? 1 : 0
  };
}

function toPromptTemplate(row: PromptTemplateRow): PromptTemplate {
  return {
    id: row.id,
    name: row.name,
    purpose: row.purpose,
    content: row.content,
    isDefault: row.isDefault === 1
  };
}

function toPromptTemplateSaveParams(template: PromptTemplate): PromptTemplateSaveParams {
  return {
    ...template,
    isDefault: template.isDefault ? 1 : 0
  };
}

export function createRepositories(db: AppDatabase) {
  return {
    captures: {
      save(record: CaptureRecord): void {
        db.prepare<CaptureRecord>(`
          INSERT OR REPLACE INTO captures
          (id, captured_at, image_path, active_app, window_title, status, skip_reason)
          VALUES (@id, @capturedAt, @imagePath, @activeApp, @windowTitle, @status, @skipReason)
        `).run(record);
      },
      listByDate(date: string): CaptureRecord[] {
        return db.prepare<DateRangeParams, CaptureRow>(`
          SELECT
            id,
            captured_at AS capturedAt,
            image_path AS imagePath,
            active_app AS activeApp,
            window_title AS windowTitle,
            status,
            skip_reason AS skipReason
          FROM captures
          WHERE captured_at BETWEEN @start AND @end
          ORDER BY captured_at ASC
        `).all(dateRange(date));
      }
    },
    recordingSessions: {
      save(session: RecordingSession): void {
        db.prepare<RecordingSession>(`
          INSERT OR REPLACE INTO recording_sessions
          (id, started_at, ended_at)
          VALUES (@id, @startedAt, @endedAt)
        `).run(session);
      },
      end(id: string, endedAt: string): void {
        db.prepare<{ id: string; endedAt: string }>(`
          UPDATE recording_sessions
          SET ended_at = @endedAt
          WHERE id = @id
        `).run({ id, endedAt });
      },
      listByDate(date: string): RecordingSession[] {
        return db.prepare<DateRangeParams, RecordingSessionRow>(`
          SELECT
            id,
            started_at AS startedAt,
            ended_at AS endedAt
          FROM recording_sessions
          WHERE started_at <= @end
            AND COALESCE(ended_at, @end) >= @start
          ORDER BY started_at ASC
        `).all(dateRange(date));
      }
    },
    workEvents: {
      save(event: WorkEvent): void {
        db.prepare<WorkEvent>(`
          INSERT OR REPLACE INTO work_events
          (id, capture_id, started_at, ended_at, title, summary, category, confidence, source)
          VALUES (@id, @captureId, @startedAt, @endedAt, @title, @summary, @category, @confidence, @source)
        `).run(event);
      },
      listByDate(date: string): WorkEvent[] {
        return db.prepare<DateRangeParams, WorkEventRow>(`
          SELECT
            id,
            capture_id AS captureId,
            started_at AS startedAt,
            ended_at AS endedAt,
            title,
            summary,
            category,
            confidence,
            source
          FROM work_events
          WHERE started_at BETWEEN @start AND @end
          ORDER BY started_at ASC
        `).all(dateRange(date));
      }
    },
    reports: {
      save(report: DailyReport): void {
        db.prepare<DailyReport>(`
          INSERT OR REPLACE INTO reports
          (id, date, type, content, generated_at, updated_at, provider_id, model_name)
          VALUES (@id, @date, @type, @content, @generatedAt, @updatedAt, @providerId, @modelName)
        `).run(report);
      },
      getByDate(date: string): DailyReport | null {
        const row = db.prepare<[string], DailyReportRow>(`
          SELECT
            id,
            date,
            type,
            content,
            generated_at AS generatedAt,
            updated_at AS updatedAt,
            provider_id AS providerId,
            model_name AS modelName
          FROM reports
          WHERE date = ?
        `).get(date);

        return row ?? null;
      }
    },
    aiProviders: {
      save(profile: AIProviderProfile): void {
        db.prepare<AIProviderProfileSaveParams>(`
          INSERT OR REPLACE INTO ai_provider_profiles
          (id, name, type, base_url, api_key_ref, model_name, custom_headers, enabled)
          VALUES (@id, @name, @type, @baseUrl, @apiKeyRef, @modelName, @customHeaders, @enabled)
        `).run(toAIProviderProfileSaveParams(profile));
      },
      listEnabled(): AIProviderProfile[] {
        return db.prepare<[], AIProviderProfileRow>(`
          SELECT
            id,
            name,
            type,
            base_url AS baseUrl,
            api_key_ref AS apiKeyRef,
            model_name AS modelName,
            custom_headers AS customHeaders,
            enabled
          FROM ai_provider_profiles
          WHERE enabled = 1
          ORDER BY name ASC
        `).all().map(toAIProviderProfile);
      }
    },
    promptTemplates: {
      save(template: PromptTemplate): void {
        db.prepare<PromptTemplateSaveParams>(`
          INSERT OR REPLACE INTO prompt_templates
          (id, name, purpose, content, is_default)
          VALUES (@id, @name, @purpose, @content, @isDefault)
        `).run(toPromptTemplateSaveParams(template));
      },
      listByPurpose(purpose: PromptPurpose): PromptTemplate[] {
        return db.prepare<[PromptPurpose], PromptTemplateRow>(`
          SELECT
            id,
            name,
            purpose,
            content,
            is_default AS isDefault
          FROM prompt_templates
          WHERE purpose = ?
          ORDER BY is_default DESC, name ASC
        `).all(purpose).map(toPromptTemplate);
      }
    },
    settings: {
      set(key: string, value: string): void {
        db.prepare<AppSetting>(`
          INSERT OR REPLACE INTO settings
          (key, value)
          VALUES (@key, @value)
        `).run({ key, value });
      },
      get(key: string): string | null {
        const row = db.prepare<[string], SettingRow>(`
          SELECT key, value
          FROM settings
          WHERE key = ?
        `).get(key);

        return row?.value ?? null;
      }
    }
  };
}

export type AppRepositories = ReturnType<typeof createRepositories>;

# Daily Assistant Design

## Goal

Build a personal desktop daily-report assistant for Windows. The app runs as a desktop shell with a polished local Web UI, records work activity through periodic screenshots, converts screenshots into structured work events with MiniMax AI, and helps the user generate editable daily reports.

## Product Scope

### In Scope For MVP

- Desktop app with tray behavior.
- Start, pause, and resume local activity recording.
- Periodic screenshot capture with configurable interval.
- Local screenshot index and event storage.
- Customizable AI provider adapter for screenshot understanding and report drafting, with MiniMax as the default preset.
- Today dashboard with status, timeline, activity summary, and report draft.
- Report editor for daily reports.
- Copy or export generated report as Markdown text.
- Settings for AI provider, API key, model, prompt templates, capture interval, screenshot storage, and privacy controls.

### Out Of Scope For MVP

- Enterprise employee management.
- Department, leave, ranking, and attendance dashboards.
- Cloud account system.
- Multi-device sync.
- Monthly report analytics.
- Automatic submission to third-party office systems.
- Full competitor UI cloning.

## Experience Principles

- The first screen is the actual workbench, not a landing page.
- The UI should feel like a refined productivity dashboard: clean, dense, calm, and operational.
- Use restrained light surfaces, strong readable typography, and limited accent colors for state.
- Avoid purple-blue gradient-heavy layouts, decorative cards, oversized hero sections, and marketing composition.
- Prioritize fast scanning: users should instantly see recording state, analyzed work segments, and the current report draft.
- Privacy controls must be visible and reachable from the main screen.

## Primary Screens

### Today Workbench

The default screen shows:

- Top status bar: recording state, today's captured duration, analyzed event count, AI provider connection state, pause/resume action.
- Left navigation: Today, Timeline, Reports, History, Settings.
- Main timeline: chronological work events grouped by time range.
- Activity summary: app/window usage summaries where available.
- Report draft panel: generated daily-report text with edit and copy actions.
- Privacy panel: latest screenshot state, skipped apps, local-only reminder, and AI upload state.

### Timeline

Shows a full-day chronological view:

- Raw screenshot capture points.
- AI-recognized work events.
- Confidence or review state for events.
- Manual edit for event title, category, and summary.

### Reports

Supports:

- Daily report generation from selected date.
- Editable Markdown-style report body.
- Regenerate with user instruction.
- Copy to clipboard.
- Export as `.md`.

### History

Shows previous dates with:

- Capture count.
- AI analysis count.
- Generated report state.
- Quick open for date detail.

### Settings

Includes:

- AI provider configuration.
- MiniMax preset configuration.
- Custom OpenAI-compatible provider configuration: base URL, API key, model name, and optional headers.
- Prompt templates for screenshot analysis and daily report generation.
- Capture interval.
- Screenshot storage directory.
- Local retention days.
- Pause hotkey.
- App/window blacklist.
- Whether screenshots can be sent to AI.

## Architecture

Use a desktop shell plus local Web UI:

- Electron main process handles desktop capabilities.
- Vue 3 + Vite + TypeScript handles UI.
- SQLite stores captures, events, reports, settings, AI provider profiles, prompt templates, and AI job state.
- A service layer separates capture, storage, AI provider access, AI analysis, and report generation.
- Renderer communicates with main process through a narrow IPC bridge.

This keeps privileged desktop operations outside the UI while allowing the interface to be built like a modern Web app.

## Data Model

### Capture

- `id`
- `capturedAt`
- `imagePath`
- `activeApp`
- `windowTitle`
- `status`: `captured | skipped | analyzed | failed`
- `skipReason`

### WorkEvent

- `id`
- `captureId`
- `startedAt`
- `endedAt`
- `title`
- `summary`
- `category`
- `confidence`
- `source`: `ai | manual`

### Report

- `id`
- `date`
- `type`: `daily`
- `content`
- `generatedAt`
- `updatedAt`
- `providerId`
- `modelName`

### AIProviderProfile

- `id`
- `name`
- `type`: `minimax | openai_compatible`
- `baseUrl`
- `apiKeyRef`
- `modelName`
- `customHeaders`
- `enabled`

### PromptTemplate

- `id`
- `name`
- `purpose`: `screenshot_analysis | daily_report`
- `content`
- `isDefault`

### Setting

- `key`
- `value`

## AI Provider Integration

MiniMax is the intended default AI provider, but the AI layer must be customizable.

The MVP should implement a provider interface instead of spreading provider-specific calls through UI code:

- `analyzeScreenshot(capture): WorkEventDraft`
- `generateDailyReport(events, userInstruction): ReportDraft`
- `checkConnection(): ProviderStatus`

Implementation must verify MiniMax's current official API documentation before coding endpoint names, model names, image input format, authentication headers, and rate-limit handling.

The provider system should support:

- MiniMax preset as the default provider.
- OpenAI-compatible custom provider profile for users who want their own endpoint.
- Configurable base URL where the provider type allows it.
- Configurable API key.
- Configurable model name.
- Configurable screenshot-analysis prompt template.
- Configurable daily-report prompt template.
- Explicit upload permission.
- Request timeout and retry.
- Clear error messages for missing key, network failure, quota/rate limit, and unsupported image input.

The MVP does not need a fully arbitrary request-mapping designer. If a provider does not follow MiniMax or OpenAI-compatible request semantics, it should be handled as a post-MVP provider plugin.

## Privacy And Safety

- Screenshots are stored locally by default.
- AI upload is disabled until the user configures an AI provider and enables analysis.
- Pause/resume is available from the main UI and tray.
- The app supports an app/window blacklist.
- Failed AI analysis never deletes the original capture.
- User can delete captures for a date.
- Report text is editable before copying or exporting.

## Error Handling

- Capture failure: keep app running, show state in timeline, and retry at next interval.
- AI provider missing key: show setup prompt in status bar and settings.
- AI provider request failure: mark related analysis job failed and allow retry.
- Database failure: surface blocking error and prevent silent data loss.
- Export failure: keep report content and show retryable error.

## Testing Strategy

- Unit tests for report generation prompt assembly, provider selection, MiniMax adapter request construction, and OpenAI-compatible adapter request construction.
- Unit tests for capture scheduling logic.
- Integration tests for SQLite repositories.
- Renderer component tests for dashboard states.
- Manual QA for desktop capture permissions, tray pause/resume, and export flow.

## Implementation Notes

- Do not implement enterprise features in the MVP.
- Do not duplicate competitor branding or visual identity.
- Prefer small files with clear boundaries: capture service, AI provider, report service, settings service, and UI pages should remain separate.
- The development app should start locally with a development command. Windows packaging is a separate post-MVP milestone.

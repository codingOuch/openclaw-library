export type LanguageCode = "zh" | "en";

export interface AppSettings {
  allowGitRecords: boolean;
  language: LanguageCode;
  coverGeneration: {
    autoGenerate: boolean;
    endpoint: string;
    apiKey: string;
    model: string;
    prompt: string;
  };
}

export const SETTINGS_KEY = "openclaw-settings";

export const DEFAULT_COVER_PROMPT =
  "Create a refined iOS 7 inspired flat book cover with subtle real-book depth and soft studio lighting. Use the document title, summary, and emotional tone to design a distinctive symbolic cover. Avoid clutter, avoid photorealistic people, keep typography clean, and leave safe space for the title.";

export const DEFAULT_SETTINGS: AppSettings = {
  allowGitRecords: true,
  language: "zh",
  coverGeneration: {
    autoGenerate: false,
    endpoint: "",
    apiKey: "",
    model: "gpt-image-2",
    prompt: DEFAULT_COVER_PROMPT,
  },
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      coverGeneration: {
        ...DEFAULT_SETTINGS.coverGeneration,
        ...(parsed.coverGeneration || {}),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

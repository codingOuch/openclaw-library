import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DEFAULT_COVER_PROMPT, AppSettings, LanguageCode } from "../lib/settings";
import Icon from "./Icon";

interface SettingsSheetProps {
  open: boolean;
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
}

const copy = {
  zh: {
    title: "设置",
    done: "完成",
    back: "设置",
    git: "允许读取 Git 记录",
    gitHint: "默认开启。打开书本后，左页显示本地提交记录。",
    cover: "封面生成",
    coverHint: "配置生图 API，按内容自动生成封面。",
    language: "语言",
    auto: "自动生成封面",
    endpoint: "API 地址",
    key: "API Key",
    model: "模型",
    prompt: "默认 Prompt",
    reset: "恢复默认 Prompt",
  },
  en: {
    title: "Settings",
    done: "Done",
    back: "Settings",
    git: "Allow Git Records",
    gitHint: "Enabled by default. The left page shows local commit history after a book opens.",
    cover: "Cover Generation",
    coverHint: "Configure an image API and auto-generate covers from content.",
    language: "Language",
    auto: "Auto-generate Covers",
    endpoint: "API Endpoint",
    key: "API Key",
    model: "Model",
    prompt: "Default Prompt",
    reset: "Reset Prompt",
  },
};

export default function SettingsSheet({ open, settings, onChange, onClose }: SettingsSheetProps) {
  const [page, setPage] = useState<"root" | "cover">("root");
  const t = copy[settings.language];

  useEffect(() => {
    if (open) setPage("root");
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  const update = (patch: Partial<AppSettings>) => onChange({ ...settings, ...patch });
  const updateCover = (patch: Partial<AppSettings["coverGeneration"]>) =>
    onChange({
      ...settings,
      coverGeneration: { ...settings.coverGeneration, ...patch },
    });
  const setLanguage = (language: LanguageCode) => update({ language });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="settings-veil"
          role="dialog"
          aria-modal="true"
          aria-label={t.title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.section
            className="settings-card"
            initial={{ opacity: 0, y: 20, scale: 1.08 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          >
        <header className="settings-nav">
          {page === "cover" ? (
            <button type="button" className="settings-back" onClick={() => setPage("root")}>
              <Icon name="chevron-left" />
              <span>{t.back}</span>
            </button>
          ) : (
            <span />
          )}
          <strong>{page === "cover" ? t.cover : t.title}</strong>
          <button type="button" onClick={onClose}>
            {t.done}
          </button>
        </header>

        {page === "root" ? (
          <main className="settings-body">
            <section className="settings-group">
              <label className="settings-row">
                <span className="settings-icon settings-icon-orange">
                  <Icon name="git" />
                </span>
                <span>
                  <strong>{t.git}</strong>
                  <em>{t.gitHint}</em>
                </span>
                <input
                  type="checkbox"
                  className="ios-switch"
                  checked={settings.allowGitRecords}
                  onChange={(event) => update({ allowGitRecords: event.target.checked })}
                />
              </label>
              <button type="button" className="settings-row settings-link-row" onClick={() => setPage("cover")}>
                <span className="settings-icon settings-icon-purple">
                  <Icon name="image" />
                </span>
                <span>
                  <strong>{t.cover}</strong>
                  <em>{t.coverHint}</em>
                </span>
                <Icon name="chevron-right" />
              </button>
            </section>

            <section className="settings-group">
              <div className="settings-row">
                <span className="settings-icon settings-icon-blue">
                  <Icon name="translate" />
                </span>
                <span>
                  <strong>{t.language}</strong>
                </span>
                <div className="language-segment">
                  <button type="button" className={settings.language === "zh" ? "active" : ""} onClick={() => setLanguage("zh")}>
                    中文
                  </button>
                  <button type="button" className={settings.language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>
                    EN
                  </button>
                </div>
              </div>
            </section>
          </main>
        ) : (
          <main className="settings-body">
            <section className="settings-group">
              <label className="settings-row">
                <span className="settings-icon settings-icon-green">
                  <Icon name="stars" />
                </span>
                <span>
                  <strong>{t.auto}</strong>
                </span>
                <input
                  type="checkbox"
                  className="ios-switch"
                  checked={settings.coverGeneration.autoGenerate}
                  onChange={(event) => updateCover({ autoGenerate: event.target.checked })}
                />
              </label>
            </section>

            <section className="settings-form">
              <label>
                <span>{t.endpoint}</span>
                <input
                  value={settings.coverGeneration.endpoint}
                  placeholder="https://api.example.com/v1/images"
                  onChange={(event) => updateCover({ endpoint: event.target.value })}
                />
              </label>
              <label>
                <span>{t.key}</span>
                <input
                  value={settings.coverGeneration.apiKey}
                  type="password"
                  placeholder="sk-..."
                  onChange={(event) => updateCover({ apiKey: event.target.value })}
                />
              </label>
              <label>
                <span>{t.model}</span>
                <input value={settings.coverGeneration.model} onChange={(event) => updateCover({ model: event.target.value })} />
              </label>
              <label>
                <span>{t.prompt}</span>
                <textarea value={settings.coverGeneration.prompt} onChange={(event) => updateCover({ prompt: event.target.value })} />
              </label>
              <button type="button" className="prompt-reset" onClick={() => updateCover({ prompt: DEFAULT_COVER_PROMPT })}>
                {t.reset}
              </button>
            </section>
          </main>
        )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

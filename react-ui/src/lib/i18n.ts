import type { LanguageCode } from "./settings";

const dict: Record<string, { zh: string; en: string }> = {
  // App.tsx
  "search.placeholder": { zh: "搜索书名或正文内容", en: "Search titles or book contents" },
  "cover.quota": { zh: "封面图片过大，存储空间不足。请使用较小的图片。", en: "Cover image too large. Storage quota exceeded. Please use a smaller image." },
  "cover.reset": { zh: "已恢复默认封面", en: "Default cover restored" },
  "cover.selectImage": { zh: "请选择图片文件", en: "Please select an image file" },
  "cover.updated": { zh: "封面已更新", en: "Cover updated" },
  "cover.readFailed": { zh: "图片读取失败", en: "Failed to read image" },
  "search.failed": { zh: "搜索失败", en: "Search failed" },
  "shelf.count": { zh: "书架", en: "shelves" },
  "book.count": { zh: "本", en: "books" },
  "library.empty": { zh: "没有可展示的书架。试试", en: "No shelves to show. Try" },
  "menu.editCover": { zh: "编辑封面", en: "Edit Cover" },
  "menu.uploadImage": { zh: "上传自定义图片", en: "Upload Custom Image" },
  "menu.resetCover": { zh: "恢复默认封面", en: "Reset Default Cover" },
  "coverEditor.cancel": { zh: "取消", en: "Cancel" },
  "coverEditor.title": { zh: "编辑封面", en: "Edit Cover" },
  "coverEditor.done": { zh: "完成", en: "Done" },
  "coverEditor.upload": { zh: "上传图片", en: "Upload Image" },
  "coverEditor.reset": { zh: "恢复默认", en: "Reset Default" },
  "login.hint": { zh: "输入面板 token，或使用启动日志里的 LAN 链接。", en: "Enter your panel token, or use the LAN link from the startup log." },
  "login.enter": { zh: "进入书架", en: "Enter Library" },
  "login.demo": { zh: "打开 Demo", en: "Open Demo" },

  // Reader.tsx
  "reader.loadFailed": { zh: "读取失败", en: "Read failed" },
  "reader.gitFailed": { zh: "Git 记录读取失败", en: "Git record read failed" },
  "reader.saveOrDiscard": { zh: "请先保存或放弃当前修改", en: "Please save or discard current changes first" },
  "reader.revisionFailed": { zh: "历史版本读取失败", en: "Failed to read history version" },
  "reader.unlocked": { zh: "已解锁编辑", en: "Editing unlocked" },
  "reader.saved": { zh: "已保存", en: "Saved" },
  "reader.savedBackup": { zh: "已保存，并写入快照", en: "Saved with backup" },
  "reader.saveFailed": { zh: "保存失败", en: "Save failed" },
  "reader.loading": { zh: "读取中…", en: "Loading…" },
  "reader.lines": { zh: "行", en: "lines" },
  "reader.history": { zh: "历史", en: "History" },
  "reader.content": { zh: "正文", en: "Content" },
  "reader.unlockEdit": { zh: "解锁编辑", en: "Unlock Editing" },
  "reader.lockEdit": { zh: "锁定编辑", en: "Lock Editing" },
  "reader.discardChanges": { zh: "放弃修改", en: "Discard Changes" },
  "reader.saveChanges": { zh: "保存修改", en: "Save Changes" },
  "reader.unlockTitle": { zh: "解锁编辑", en: "Unlock Editing" },
  "reader.unlockBody": { zh: "保存会先写入 .openclaw-panel-backups/ 快照，然后覆盖原文件。", en: "A backup will be written to .openclaw-panel-backups/ before overwriting the file." },
  "reader.unlock": { zh: "解锁", en: "Unlock" },
  "reader.stayReadonly": { zh: "继续只读", en: "Stay Read-only" },
  "reader.saveTitle": { zh: "保存", en: "Save" },
  "reader.saving": { zh: "保存中", en: "Saving…" },
  "reader.confirmSave": { zh: "确认保存", en: "Confirm Save" },
  "reader.keepEditing": { zh: "再改改", en: "Keep Editing" },
  "reader.discardTitle": { zh: "放弃未保存的修改？", en: "Discard unsaved changes?" },
  "reader.discardBody": { zh: "当前编辑内容会被丢弃，原文件不会改变。", en: "Current edits will be discarded. The original file will not be changed." },
  "reader.discard": { zh: "放弃", en: "Discard" },
  "reader.thinkAgain": { zh: "再想想", en: "Think Again" },
  "reader.closeBook": { zh: "关闭书本", en: "Close book" },
  "reader.ledgerHint": { zh: "本地提交记录会显示在这里。", en: "Local commit history will appear here." },
  "reader.gitDisabled": { zh: "Git 记录读取已关闭。", en: "Git record reading is disabled." },
  "reader.noGitRecords": { zh: "没有找到本地 Git 记录", en: "No local Git records found" },
  "reader.loadingGit": { zh: "读取 Git 记录…", en: "Loading Git records…" },
  "reader.loadingRevision": { zh: "读取历史版本…", en: "Loading history version…" },
  "reader.selectRecord": { zh: "请选择一条 Git 记录", en: "Please select a Git record" },
  "reader.library": { zh: "书架", en: "Library" },

  // Sidebar.tsx
  "sidebar.name": { zh: "名称", en: "Name" },
  "sidebar.mtime": { zh: "修改日期", en: "Modified" },
  "sidebar.size": { zh: "大小", en: "Size" },
  "sidebar.type": { zh: "类别", en: "Type" },
  "sidebar.asc": { zh: "升序", en: "Asc" },
  "sidebar.desc": { zh: "降序", en: "Desc" },

  // SearchDrawer.tsx
  "search.noHits": { zh: "没有命中", en: "No results" },

  // DiffPanel.tsx
  "diff.truncated": { zh: "仅显示前 40 行变更", en: "Only showing first 40 changed lines" },

  // Shelf.tsx
  "shelf.books": { zh: "本", en: "books" },

  // Shelf hints
  "shelf.scroll": { zh: "核心人格与灵魂档案", en: "Core personality and soul profile" },
  "shelf.memory": { zh: "散落的记忆片段、观察与偏好", en: "Scattered memories, observations, and preferences" },
  "shelf.skill": { zh: "定义了 openclaw 会做的每一件事", en: "Defines everything openclaw can do" },
};

export function T(key: string, language: LanguageCode): string {
  const entry = dict[key];
  if (!entry) return key;
  return entry[language] || entry.en || key;
}

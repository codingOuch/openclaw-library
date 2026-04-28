import { FileDoc, GitRecord, SavedFile, SearchHit, StatusPayload, TreeNode } from "./utils";

const TOKEN_KEY = "openclaw-token";

export function getInitialAuth() {
  const params = new URLSearchParams(window.location.search);
  const queryToken = params.get("token");
  const demo = params.get("demo") === "1";
  if (queryToken) localStorage.setItem(TOKEN_KEY, queryToken);
  return {
    token: queryToken || localStorage.getItem(TOKEN_KEY) || "",
    demo,
  };
}

export function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

async function requestJson<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (token) headers.set("x-openclaw-token", token);
  if (options.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const api = {
  status(token: string) {
    return requestJson<StatusPayload>("/api/status", token);
  },
  tree(token: string) {
    return requestJson<TreeNode>("/api/tree", token);
  },
  file(token: string, path: string) {
    return requestJson<FileDoc>(`/api/file?path=${encodeURIComponent(path)}`, token);
  },
  saveFile(token: string, path: string, content: string) {
    return requestJson<SavedFile>("/api/file", token, {
      method: "POST",
      body: JSON.stringify({ path, content }),
    });
  },
  search(token: string, q: string) {
    return requestJson<SearchHit[]>(`/api/search?q=${encodeURIComponent(q)}`, token);
  },
  gitHistory(token: string, path: string) {
    return requestJson<GitRecord[]>(`/api/git-history?path=${encodeURIComponent(path)}`, token);
  },
  gitFile(token: string, path: string, hash: string) {
    return requestJson<FileDoc>(
      `/api/git-file?path=${encodeURIComponent(path)}&hash=${encodeURIComponent(hash)}`,
      token,
    );
  },
  covers(token: string) {
    return requestJson<Record<string, string>>("/api/covers", token);
  },
  saveCover(token: string, path: string, dataUrl: string) {
    return requestJson<{ ok: boolean }>("/api/covers", token, {
      method: "PUT",
      body: JSON.stringify({ path, dataUrl }),
    });
  },
  deleteCover(token: string, path: string) {
    return requestJson<{ ok: boolean }>(`/api/covers?path=${encodeURIComponent(path)}`, token, { method: "DELETE" });
  },
};

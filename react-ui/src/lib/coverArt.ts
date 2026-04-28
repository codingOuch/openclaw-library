import { labelFromPath } from "./utils";

export interface RootCoverArt {
  key: string;
  icon: string;
  sigil: string;
}

const ROOT_ART: Record<string, RootCoverArt> = {
  SOUL: { key: "soul", icon: "stars", sigil: "inner light" },
  IDENTITY: { key: "identity", icon: "fingerprint", sigil: "true name" },
  USER: { key: "user", icon: "person-circle", sigil: "known human" },
  AGENTS: { key: "agents", icon: "cpu", sigil: "many hands" },
  MEMORY: { key: "memory", icon: "layers", sigil: "kept echoes" },
  HEARTBEAT: { key: "heartbeat", icon: "activity", sigil: "still here" },
  TOOLS: { key: "tools", icon: "tools", sigil: "ready work" },
};

export function getRootCoverArt(label: string) {
  const clean = labelFromPath(label);
  const match = clean.match(/^workspace\/([^/]+)\.md$/i);
  if (!match) return undefined;
  return ROOT_ART[match[1].toUpperCase()];
}

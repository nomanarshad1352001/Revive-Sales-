import type { Priority, Stage } from "./types";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
}

export function fmtMoney(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${v}`;
}

export function fmtDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function relTime(ts: number | null | undefined) {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86_400_000);
  if (diff < 0) {
    const fdays = Math.ceil(-diff / 86_400_000);
    if (fdays === 0) return "Today";
    return `in ${fdays}d`;
  }
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function daysAgo(n: number) {
  return Date.now() - n * 86_400_000;
}

export function inDays(n: number) {
  return Date.now() + n * 86_400_000;
}

export const STAGES: { id: Stage; label: string; short: string; color: string; bg: string; text: string; bar: string }[] = [
  { id: "prospect", label: "Prospect", short: "Prospect", color: "#647A6E", bg: "bg-slate-100", text: "text-slate-700", bar: "#8DA398" },
  { id: "contacted", label: "Contacted", short: "Contacted", color: "#27698F", bg: "bg-sky-50", text: "text-sky-700", bar: "#4D8FB5" },
  { id: "meeting", label: "Meeting Set", short: "Meeting", color: "#B97A1A", bg: "bg-amber-50", text: "text-amber-700", bar: "#D69A35" },
  { id: "demo", label: "Demo Scheduled", short: "Demo", color: "#6B4FA1", bg: "bg-violet-50", text: "text-violet-700", bar: "#8C6FC0" },
  { id: "proposal", label: "Proposal Sent", short: "Proposal", color: "#0C6B4F", bg: "bg-emerald-50", text: "text-emerald-700", bar: "#2E8A6A" },
  { id: "negotiation", label: "Negotiation", short: "Negotiation", color: "#B4541E", bg: "bg-orange-50", text: "text-orange-700", bar: "#D77A45" },
  { id: "won", label: "Closed Won", short: "Won", color: "#0F7A36", bg: "bg-green-50", text: "text-green-700", bar: "#2E9E55" },
  { id: "lost", label: "Closed Lost", short: "Lost", color: "#9E3B2B", bg: "bg-red-50", text: "text-red-700", bar: "#B95A48" },
];

export const ACTIVE_STAGES: Stage[] = ["prospect", "contacted", "meeting", "demo", "proposal", "negotiation"];

export function stageMeta(stage: Stage) {
  return STAGES.find((s) => s.id === stage)!;
}

export const PRIORITIES: { id: Priority; label: string; desc: string; cls: string; dot: string }[] = [
  { id: "A", label: "A · Hot", desc: "Pursue aggressively", cls: "bg-red-50 text-red-700 ring-red-200", dot: "#C0392B" },
  { id: "B", label: "B · Warm", desc: "Active development", cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "#D69A35" },
  { id: "C", label: "C · Develop", desc: "Nurture & research", cls: "bg-slate-100 text-slate-600 ring-slate-200", dot: "#7C8BA1" },
];

export function priorityMeta(p: Priority) {
  return PRIORITIES.find((x) => x.id === p)!;
}

export function avatarColor(seed: string) {
  const palette = ["#0C6B4F", "#27698F", "#B97A1A", "#6B4FA1", "#B4541E", "#0F7A36", "#8A2E5F", "#146C60"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

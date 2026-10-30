"use client";

import { motion } from "framer-motion";
import { Bot, CalendarPlus, Check, CornerDownLeft, Mail, MapPin, ShieldAlert, Sparkles, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Chip, PriorityBadge } from "@/components/ui";
import { greet, QUICK_PROMPTS, respond, type AssistantReply } from "@/lib/assistant";
import { useAppStore } from "@/lib/store";
import { cn, fmtDate, fmtMoney, relTime, stageMeta, uid } from "@/lib/utils";
import type { ActivityType } from "@/lib/types";
import { extractVisitNote } from "@/lib/extract";

interface Msg {
  id: string;
  role: "user" | "assistant";
  ts: number;
  reply: AssistantReply | null;
  text: string;
}

export default function AssistantPage() {
  const router = useRouter();
  const accounts = useAppStore((s) => s.accounts);
  const activities = useAppStore((s) => s.activities);
  const tasks = useAppStore((s) => s.tasks);
  const users = useAppStore((s) => s.users);
  const products = useAppStore((s) => s.products);
  const settings = useAppStore((s) => s.settings);
  const me = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const saveRoute = useAppStore((s) => s.saveRoute);
  const setPendingDraft = useAppStore((s) => s.setPendingDraft);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const confirmedRoutes = useRef(new Set<string>());

  useEffect(() => {
    setMsgs([
      {
        id: uid("m"),
        role: "assistant",
        ts: Date.now(),
        text: "",
        reply: greet({ accounts, activities, tasks, users, products, me: me ?? null, targets: settings.targets }),
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  function ask(q: string) {
    const query = q.trim();
    if (!query || thinking) return;
    setInput("");
    setMsgs((m) => [...m, { id: uid("m"), role: "user", ts: Date.now(), text: query, reply: null }]);
    setThinking(true);
    setTimeout(() => {
      const reply = respond(query, { accounts, activities, tasks, users, products, me: me ?? null, targets: settings.targets });
      setMsgs((m) => [...m, { id: uid("m"), role: "assistant", ts: Date.now(), text: "", reply }]);
      setThinking(false);
    }, 550 + Math.random() * 500);
  }

  function confirmRoute(rows: Record<string, unknown>[]) {
    const first = rows[0] as Record<string, unknown>;
    const key = `${first.date}-${rows.map((r) => r.accountId as string).join("|")}`;
    if (confirmedRoutes.current.has(key)) return;
    confirmedRoutes.current.add(key);
    const id = saveRoute({
      userId: me?.id ?? "u_elena",
      name: `${first.startLabel} field day`,
      date: String(first.date),
      startLabel: String(first.startLabel),
      startLat: Number(first.startLat),
      startLng: Number(first.startLng),
      stops: rows.map((r) => ({ id: uid("st"), accountId: String(r.accountId), status: "planned" })),
      mileage: Number(first.mileage),
    });
    void id;
    setMsgs((m) => [
      ...m,
      {
        id: uid("m"),
        role: "assistant",
        ts: Date.now(),
        text: "",
        reply: {
          text: `Route saved as a plan in Smart Routes. Stops are suggestions — visits only count once you complete and log them. Open it on the Route Planner to start the day.`,
          cards: [],
        },
      },
    ]);
    router.push("/routes");
  }

  function startEmailDraft(accountId: string) {
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return;
    const ex = extractVisitNote(`Thank-you follow-up for ${acc.name}`, accounts, products);
    setPendingDraft({
      accountId: acc.id,
      contactName: acc.decisionMakers[0]?.name ?? "",
      subject: `Thank you — ${acc.name}`,
      body: ex.suggestedBody.replace("[Your name]", me?.name ?? "your Revive rep"),
      materialIds: [],
    });
    router.push(`/email?account=${acc.id}`);
  }

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[520px] flex-col">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">
            <Sparkles size={12} /> AI Sales Assistant
          </p>
          <h1 className="font-display mt-1 text-[clamp(1.5rem,2.4vw,2.1rem)] font-semibold">Workspace Copilot</h1>
        </div>
        <p className="flex items-center gap-2 rounded-full bg-[var(--gold-soft)] px-3.5 py-2 text-[0.72rem] font-bold text-[#7d6030] ring-1 ring-inset ring-[#e6d5b5]">
          <ShieldAlert size={13} /> Rule-based demo engine · LLM-ready · never sends emails or edits records alone
        </p>
      </div>

      {/* Chat area */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          {msgs.map((m) => (
            <MessageBubble
              key={m.id}
              msg={m}
              meName={me?.name ?? "You"}
              onConfirmRoute={confirmRoute}
              onEmailDraft={startEmailDraft}
              onOpenAccount={(id) => router.push(`/accounts/${id}`)}
            />
          ))}
          {thinking && (
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--brand)] text-white"><Bot size={15} /></span>
              <div className="flex gap-1.5 rounded-2xl rounded-bl-md bg-[var(--surface-2)] px-4 py-3 ring-1 ring-inset ring-[var(--line)]">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--ink-3)]" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick prompts */}
        {msgs.length <= 1 && (
          <div className="grid grid-cols-1 gap-2 border-t border-[var(--line-2)] bg-[var(--surface-2)] px-4 py-3 sm:grid-cols-2">
            {QUICK_PROMPTS.map((q) => (
              <button key={q} onClick={() => ask(q)} className="rounded-xl bg-white px-3.5 py-2.5 text-left text-[0.74rem] font-semibold text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line)] transition-all hover:ring-[var(--brand)] hover:text-[var(--brand-deep)]">
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2 border-t border-[var(--line)] bg-[var(--surface)] p-3"
        >
          <input
            className="field flex-1"
            placeholder="Ask about accounts, coverage, routes, reps, or deals…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Ask the assistant"
          />
          <Button type="submit" disabled={!input.trim() || thinking} className="!px-3.5">
            <CornerDownLeft size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  meName,
  onConfirmRoute,
  onEmailDraft,
  onOpenAccount,
}: {
  msg: Msg;
  meName: string;
  onConfirmRoute: (rows: Record<string, unknown>[]) => void;
  onEmailDraft: (accountId: string) => void;
  onOpenAccount: (id: string) => void;
}) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}
    >
      <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-white", isUser ? "bg-[var(--ink)]" : "bg-[var(--brand)]")}>
        {isUser ? <User size={14} /> : <Bot size={15} />}
      </span>
      <div className={cn("max-w-[85%] min-w-0", isUser && "text-right")}>
        <p className="mb-1 text-[0.62rem] font-bold uppercase tracking-wide text-[var(--ink-3)]">{isUser ? meName : "Revive Assistant"} · {relTime(msg.ts)}</p>
        <div className={cn("rounded-2xl px-4 py-3 text-left text-[0.86rem] leading-relaxed", isUser ? "rounded-tr-md bg-[var(--ink)] text-white" : "rounded-tl-md bg-[var(--surface-2)] ring-1 ring-inset ring-[var(--line)]")}>
          <p>{isUser ? msg.text : msg.reply?.text}</p>
          {!isUser && msg.reply && msg.reply.cards.length > 0 && (
            <div className="mt-3 space-y-3">
              {msg.reply.cards.map((card, i) => (
                <AssistantCardView key={i} card={card} onConfirmRoute={onConfirmRoute} onEmailDraft={onEmailDraft} onOpenAccount={onOpenAccount} />
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AssistantCardView({
  card,
  onConfirmRoute,
  onEmailDraft,
  onOpenAccount,
}: {
  card: ReturnType<typeof respond>["cards"][number];
  onConfirmRoute: (rows: Record<string, unknown>[]) => void;
  onEmailDraft: (accountId: string) => void;
  onOpenAccount: (id: string) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-inset ring-[var(--line)]">
      <div className="border-b border-[var(--line-2)] bg-[var(--surface-2)] px-3.5 py-2.5">
        <p className="text-[0.78rem] font-extrabold">{card.title}</p>
        {card.sub && <p className="text-[0.66rem] font-semibold text-[var(--ink-2)]">{card.sub}</p>}
      </div>
      <div className="max-h-[260px] divide-y divide-[var(--line-2)] overflow-y-auto">
        {card.kind === "accounts" &&
          card.rows.map((r) => (
            <button key={String(r.accountId)} onClick={() => onOpenAccount(String(r.accountId))} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--brand-softer)]">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.82rem] font-bold">{r.name as string}</span>
                <span className="block text-[0.68rem] font-semibold text-[var(--ink-2)]">
                  {r.city as string} · {r.specialty as string}{(r.services as string[] | undefined)?.length ? ` · ${(r.services as string[]).join(", ")}` : ""}
                </span>
              </span>
              {r.priority != null && <PriorityBadge priority={String(r.priority) as "A" | "B" | "C"} size="sm" />}
              <span className="text-[0.76rem] font-extrabold tabular-nums">{fmtMoney(Number(r.opportunity ?? 0))}</span>
              {r.stage != null && (
                <span className="rounded-md px-1.5 py-0.5 text-[0.62rem] font-bold" style={{ background: `${stageMeta(r.stage as never).color}14`, color: stageMeta(r.stage as never).color }}>
                  {stageMeta(r.stage as never).short}
                </span>
              )}
            </button>
          ))}

        {card.kind === "markets" &&
          card.rows.map((r) => (
            <div key={String(r.market)} className="flex items-center gap-3 px-3.5 py-2.5">
              <MapPin size={13} className="shrink-0 text-[var(--danger)]" />
              <span className="flex-1 text-[0.82rem] font-bold">{r.market as string}</span>
              <span className="text-[0.72rem] font-semibold text-[var(--ink-2)]">{r.days === null ? "never visited" : `${r.days}d`} · {r.accounts as number} accts</span>
              <span className="text-[0.76rem] font-extrabold tabular-nums">{fmtMoney(Number(r.pipeline))}</span>
            </div>
          ))}

        {card.kind === "reps" &&
          card.rows.map((r) => (
            <div key={String(r.name)} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", r.behind ? "bg-[var(--danger)]" : "bg-[var(--brand)]")} />
              <span className="flex-1 text-[0.82rem] font-bold">{r.name as string} <span className="font-semibold text-[var(--ink-3)]">· {r.role as string}</span></span>
              <span className="text-[0.74rem] font-semibold text-[var(--ink-2)]">{r.meetings as number}/{r.target as number} meetings · {r.calls as number} calls · {r.visits as number} visits</span>
              {r.behind ? <Chip tone="gold">Behind</Chip> : <Chip tone="brand">On pace</Chip>}
            </div>
          ))}

        {card.kind === "deals" &&
          card.rows.map((r) => (
            <button key={String(r.accountId)} onClick={() => onOpenAccount(String(r.accountId))} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--brand-softer)]">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.82rem] font-bold">{r.name as string}</span>
                <span className="block text-[0.68rem] font-semibold text-[var(--ink-2)]">{stageMeta(r.stage as never).label} · closes {fmtDate(Number(r.close))}</span>
              </span>
              <span className="text-[0.72rem] font-bold text-[var(--ink-3)]">{r.prob as number}%</span>
              <span className="text-[0.76rem] font-extrabold tabular-nums">{fmtMoney(Number(r.value))}</span>
            </button>
          ))}

        {card.kind === "route-preview" && (
          <>
            {card.rows.map((r) => (
              <div key={`${r.accountId}-${r.n}`} className="flex items-center gap-3 px-3.5 py-2">
                <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.64rem] font-extrabold text-white", r.anchor ? "bg-[var(--brand)]" : "bg-[var(--gold)]")}>{r.n as number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8rem] font-bold">{r.name as string}</span>
                  <span className="text-[0.66rem] font-semibold text-[var(--ink-2)]">{r.city as string}</span>
                </span>
                {Boolean(r.anchor) && <Chip tone="brand"><CalendarPlus size={10} /> Scheduled</Chip>}
                <PriorityBadge priority={r.priority as "A" | "B" | "C"} size="sm" />
              </div>
            ))}
            <div className="border-t border-[var(--line-2)] bg-[var(--surface-2)] px-3.5 py-3">
              <Button
                className="w-full"
                disabled={confirmed}
                onClick={() => {
                  setConfirmed(true);
                  onConfirmRoute(card.rows);
                }}
              >
                {confirmed ? <><Check size={14} /> Saved — opening Route Planner</> : <><CalendarPlus size={14} /> Confirm &amp; save this route plan</>}
              </Button>
              <p className="mt-1.5 text-center text-[0.62rem] font-semibold text-[var(--ink-3)]">Nothing is saved until you confirm.</p>
            </div>
          </>
        )}

        {card.kind === "email-candidates" && (
          <>
            {card.rows.map((r) => (
              <button key={String(r.accountId)} onClick={() => onEmailDraft(String(r.accountId))} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--brand-softer)]">
                <Mail size={14} className="shrink-0 text-[var(--brand)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.82rem] font-bold">{r.name as string}</span>
                  <span className="block text-[0.68rem] font-semibold text-[var(--ink-2)]">To: {r.contact as string} · {r.city as string}</span>
                </span>
                <span className="text-[0.68rem] font-extrabold text-[var(--brand)]">Draft →</span>
              </button>
            ))}
            <p className="px-3.5 py-2 text-[0.62rem] font-semibold text-[var(--ink-3)]">Drafts open in Email Concierge for your review — I can't send anything myself.</p>
          </>
        )}
      </div>
    </div>
  );
}

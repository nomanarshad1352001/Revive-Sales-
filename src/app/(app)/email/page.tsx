"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  Ban,
  CalendarClock,
  Eye,
  FileText,
  ListChecks,
  Mail,
  Pause,
  Play,
  Reply,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Button, Card, CardHeader, Field } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import { cn, fmtDate, relTime, uid } from "@/lib/utils";
import type { EmailSequence } from "@/lib/types";

type Intent = "thank-you" | "materials-followup" | "demo-invite";

const INTENTS: { id: Intent; label: string; desc: string }[] = [
  { id: "thank-you", label: "Thank-you + product info", desc: "Post-visit thank-you with approved product materials" },
  { id: "materials-followup", label: "Materials follow-up", desc: "Send approved before/afters or clinical packets" },
  { id: "demo-invite", label: "Demo invitation", desc: "Invite the practice to an on-site demonstration" },
];

function firstOf(name: string) {
  return name.replace(/^Dr\.\s*/i, "").split(" ")[0] || "there";
}

function EmailConciergeInner() {
  const params = useSearchParams();
  const accounts = useAppStore((s) => s.accounts);
  const contacts = useAppStore((s) => s.contacts);
  const products = useAppStore((s) => s.products);
  const materials = useAppStore((s) => s.materials);
  const sequences = useAppStore((s) => s.sequences);
  const emailAudit = useAppStore((s) => s.emailAudit);
  const pendingDraft = useAppStore((s) => s.pendingDraft);
  const me = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const setPendingDraft = useAppStore((s) => s.setPendingDraft);
  const addSequence = useAppStore((s) => s.addSequence);
  const updateSequence = useAppStore((s) => s.updateSequence);
  const updateSequenceStep = useAppStore((s) => s.updateSequenceStep);
  const addAudit = useAppStore((s) => s.addAudit);
  const logActivity = useAppStore((s) => s.logActivity);

  const [accountId, setAccountId] = useState(params.get("account") ?? "");
  const [contactId, setContactId] = useState("");
  const [intent, setIntent] = useState<Intent>("thank-you");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [drafted, setDrafted] = useState(false);
  const [sequenceDays, setSequenceDays] = useState(14);
  const [banner, setBanner] = useState<string | null>(null);

  const account = accounts.find((a) => a.id === accountId) ?? null;
  const accountContacts = contacts.filter((c) => c.accountId === accountId);
  const contact = accountContacts.find((c) => c.id === contactId) ?? accountContacts[0] ?? null;
  const contactProducts = products.filter((p) => contact?.interests.includes(p.id) && p.status === "active");
  const isLeader = me && (me.role === "RSM" || me.role === "ADMIN");
  void isLeader;

  // Consume pending draft from the voice logger
  useEffect(() => {
    if (pendingDraft) {
      setAccountId(pendingDraft.accountId);
      setSubject(pendingDraft.subject);
      setBody(pendingDraft.body);
      setPicked(pendingDraft.materialIds);
      setDrafted(true);
      setBanner(resultBanner("Voice-note follow-up draft loaded for your review — nothing sends without explicit approval."));
      setPendingDraft(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDraft]);

  const suggestedMaterials = useMemo(() => {
    const forContact = contactProducts.map((p) => p.id);
    const scored = materials.map((m) => ({
      m,
      s: m.productIds.filter((p) => forContact.includes(p)).length,
    }));
    scored.sort((a, b) => b.s - a.s);
    return scored;
  }, [materials, contactProducts]);

  function generate() {
    if (!account || !me) return;
    const name = firstOf(contact?.name ?? "");
    const head = `Hi ${name},`;
    const sign = [`Best,`, me.name, me.title, `Revive Regenerative`, me.phone].join("\n");
    let subject = "";
    let mid: string[] = [];

    if (intent === "thank-you") {
      subject = `Thank you — ${contactProducts[0]?.name ?? "Revive"} information as promised`;
      mid = [
        `Thank you for the time at ${account.name} today — I appreciated seeing how your team runs the practice.`,
        contactProducts.length
          ? `As discussed, I've attached the approved material for ${contactProducts.map((p) => p.name).join(" and ")} so your team can review the details together.`
          : `As discussed, here's the approved overview material for the options we talked through.`,
        `If any questions come up — clinical, service, or business case — I'm a quick reply away.`,
      ];
    } else if (intent === "materials-followup") {
      subject = `Follow-up materials for ${account.name}`;
      mid = [
        `Following up on our conversation — attached are the approved materials we discussed for ${account.name}.`,
        contactProducts.length ? `They cover ${contactProducts.map((p) => p.name).join(" and ")}, including the clinical and practice-economics sections your team asked about.` : ``,
        `Happy to walk through any of it on a short call whenever useful.`,
      ];
    } else {
      subject = `On-site demonstration at ${account.name}?`;
      mid = [
        `The next logical step from our conversation would be a hands-on demonstration at ${account.name} with your clinical team.`,
        `We typically bring the device in for a half day — your staff treats real case scenarios, and we leave a utilization and revenue model with you.`,
        `What does your schedule look like over the next two weeks?`,
      ];
    }

    setSubject(subject);
    setBody([head, "", ...mid.filter(Boolean), "", sign].join("\n"));
    setDrafted(true);
    addAudit({ actorId: me.id, action: "draft-created", accountId: account.id, detail: `Draft created: "${subject}" (${intent})` });
    setBanner("Draft generated — review and edit before approving. No real email is sent in this prototype.");
  }

  function sendSimulated(extraNote?: string) {
    if (!account || !me) return;
    logActivity({
      accountId: account.id,
      userId: me.id,
      type: "email",
      summary: `[Simulated send via Outlook] "${subject}" to ${contact?.name ?? "primary contact"}. Materials: ${picked.map((id) => materials.find((m) => m.id === id)?.name).filter(Boolean).join("; ") || "none"}. ${extraNote ?? ""}`,
      outcome: "Follow-up sent (simulated)",
    });
    addAudit({ actorId: me.id, action: "sent-simulated", accountId: account.id, detail: `Simulated send: "${subject}" (${picked.length} material(s))` });
    setBanner(resultBanner("Recorded as simulated send — appears in the account timeline, activity log and audit trail. No real email left this app."));
  }

  function startSequence() {
    if (!account || !me || !drafted) return;
    const step1 = { id: uid("step"), subject, body, materialIds: picked, sendAt: Date.now(), status: "scheduled" as const, intent };
    const step2Intent: Intent = intent === "demo-invite" ? "materials-followup" : "demo-invite";
    const step2Body = [
      `Hi ${firstOf(contact?.name ?? "")},`,
      ``,
      `Circling back from ${account.name} — attaching the approved before-and-after set and clinical summary we discussed.`,
      `Would a short on-site demonstration make sense for your team in the coming weeks? I can bring the device and handle all logistics.`,
      ``,
      `Best,`,
      me.name,
    ].join("\n");
    const seqId = addSequence({
      accountId: account.id,
      contactName: contact?.name ?? account.decisionMakers[0]?.name ?? "Primary contact",
      userId: me.id,
      status: "active" as const,
      steps: [
        step1,
        {
          id: uid("step"),
          subject: `Approved materials + demo invite — ${account.name}`,
          body: step2Body,
          materialIds: suggestedMaterials.filter((x) => x.m.type === "before-after" || x.m.type === "clinical").slice(0, 2).map((x) => x.m.id),
          sendAt: Date.now() + sequenceDays * 86_400_000,
          status: "scheduled" as const,
          intent: step2Intent,
        },
      ],
    });
    addAudit({ actorId: me.id, action: "sequence-started", accountId: account.id, detail: `2-step follow-up sequence started (step 2 in ${sequenceDays}d)` });
    setBanner(resultBanner("Sequence created. Step 1 is due now — approve it below to record the simulated send."));
    return seqId;
  }

  function sendStep(seq: EmailSequence, stepId: string) {
    const step = seq.steps.find((s) => s.id === stepId);
    if (!step || !me) return;
    updateSequenceStep(seq.id, stepId, { status: "sent" });
    const allOthersSent = seq.steps.every((s) => s.id === stepId || s.status === "sent");
    updateSequence(seq.id, { status: allOthersSent ? "completed" : "active" });
    const acc = accounts.find((a) => a.id === seq.accountId);
    if (acc) {
      logActivity({
        accountId: acc.id,
        userId: seq.userId,
        type: "email",
        summary: `[Simulated sequence send] "${step.subject}" to ${seq.contactName}.`,
        outcome: "Sequence step sent (simulated)",
      });
    }
    addAudit({ actorId: me.id, action: "step-sent", accountId: seq.accountId, detail: `Sequence step sent (simulated): "${step.subject}"` });
  }

  function stopSequence(seq: EmailSequence, reason: string) {
    if (!me) return;
    updateSequence(seq.id, { status: "stopped", stopReason: reason });
    addAudit({ actorId: me.id, action: reason === "Opt-out" ? "opt-out" : "sequence-stopped", accountId: seq.accountId, detail: `Sequence stopped — ${reason}` });
    setBanner(resultBanner(`Sequence stopped (${reason}). Stop conditions are permanent for the opt-out path.`));
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">Email Concierge</p>
        <h1 className="font-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold">Outlook AI Email Concierge</h1>
        <p className="mt-1 max-w-3xl text-[0.88rem] text-[var(--ink-2)]">
          Drafts personalized follow-ups from approved materials, sequences follow-ups, and records everything. <span className="font-bold">Simulated mode — no real emails are sent.</span> Production sending requires an IT-approved Microsoft Graph app registration.
        </p>
      </div>

      {banner && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5 rounded-xl border border-[#c8dfd4] bg-[var(--brand-softer)] px-4 py-3 text-[0.8rem] font-semibold text-[var(--brand-deep)]">
          <BadgeCheck size={15} className="mt-0.5 shrink-0" /> {banner}
          <button className="ml-auto text-[var(--ink-3)]" onClick={() => setBanner(null)}>×</button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Composer */}
        <Card className="xl:col-span-2">
          <CardHeader title="Compose Follow-up" sub="Pick account & contact → generate → review → approve" action={<Sparkles size={16} className="text-[var(--gold)]" />} />
          <div className="space-y-4 px-5 pb-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Account">
                <select className="field" value={accountId} onChange={(e) => { setAccountId(e.target.value); setContactId(""); setDrafted(false); }}>
                  <option value="">Select account…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} — {a.city}, {a.state}</option>
                  ))}
                </select>
              </Field>
              <Field label="Contact">
                <select className="field" value={contactId} onChange={(e) => setContactId(e.target.value)} disabled={!account}>
                  <option value="">{accountContacts.length ? `Primary: ${accountContacts[0].name}` : "No contacts — primary decision-maker"}</option>
                  {accountContacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.title})</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {INTENTS.map((i) => (
                <button
                  key={i.id}
                  onClick={() => { setIntent(i.id); setDrafted(false); }}
                  className={cn("rounded-xl border p-3 text-left transition-all", intent === i.id ? "border-[var(--brand)] bg-[var(--brand-softer)] ring-1 ring-[var(--brand)]" : "border-[var(--line)] bg-[var(--surface-2)] hover:border-[#cfc9b8]")}
                >
                  <p className="text-[0.8rem] font-bold">{i.label}</p>
                  <p className="mt-0.5 text-[0.66rem] leading-snug text-[var(--ink-3)]">{i.desc}</p>
                </button>
              ))}
            </div>

            {!drafted ? (
              <Button onClick={generate} disabled={!account} className="w-full">
                <Sparkles size={15} /> Generate draft
              </Button>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3.5">
                <Field label="Subject">
                  <input className="field font-semibold" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </Field>
                <Field label="Body" hint="Edit freely — the review step is a required gate before any send">
                  <textarea className="field min-h-[220px] resize-y font-[var(--font-sans)] text-[0.85rem] leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} />
                </Field>

                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[0.72rem] font-extrabold uppercase tracking-wide text-[var(--ink-3)]">
                    <ShieldCheck size={12} className="text-[var(--brand)]" /> Approved materials library — attach only approved items
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {suggestedMaterials.map(({ m, s }) => {
                      const on = picked.includes(m.id);
                      return (
                        <label key={m.id} className={cn("flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition-all", on ? "border-[var(--brand)] bg-[var(--brand-softer)]" : "border-[var(--line)] bg-white hover:bg-[var(--surface-2)]")}>
                          <input type="checkbox" checked={on} onChange={() => setPicked((p) => (on ? p.filter((x) => x !== m.id) : [...p, m.id]))} className="mt-0.5 accent-[var(--brand)]" />
                          <span>
                            <span className="block text-[0.76rem] font-bold leading-tight">{m.name}</span>
                            <span className="mt-0.5 block text-[0.64rem] text-[var(--ink-3)]">{m.type} · approved {fmtDate(m.approvedOn)}{s > 0 ? " · matches contact interests" : ""}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl bg-[var(--surface-2)] p-3.5 ring-1 ring-inset ring-[var(--line)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <Field label="Second step follows in">
                      <select className="field !w-auto !py-1.5" value={sequenceDays} onChange={(e) => setSequenceDays(Number(e.target.value))}>
                        {[7, 10, 14, 21].map((d) => (
                          <option key={d} value={d}>{d} days</option>
                        ))}
                      </select>
                    </Field>
                    <span className="mt-5 text-[0.72rem] font-semibold text-[var(--ink-3)]">with after-photos + demo invite</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] pt-4">
                  <span className="mr-auto flex items-center gap-1.5 text-[0.7rem] font-bold text-[var(--ink-3)]"><Eye size={12} /> Explicit approval required — no auto-send</span>
                  <Button variant="secondary" onClick={() => setDrafted(false)}>Reconfigure</Button>
                  <Button variant="gold" onClick={() => startSequence()}><CalendarClock size={14} /> Approve + start 2-step sequence</Button>
                  <Button onClick={() => sendSimulated()}><Send size={14} /> Approve + send now (simulated)</Button>
                </div>
              </motion.div>
            )}
          </div>
        </Card>

        {/* Sequences + integration status */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Microsoft 365 Connection" sub="Outlook integration via Microsoft Graph" action={<Mail size={16} className="text-[var(--ink-3)]" />} />
            <div className="space-y-2.5 px-5 pb-5">
              <div className="rounded-xl bg-[var(--gold-soft)] p-3.5 ring-1 ring-inset ring-[#e6d5b5]">
                <p className="text-[0.78rem] font-extrabold text-[#8a6a33]">Simulated mode — not connected</p>
                <p className="mt-1 text-[0.72rem] leading-relaxed text-[#7d6030]">
                  Production sending needs: Azure app registration, <code className="rounded bg-white/70 px-1 font-mono text-[0.66rem]">Mail.Send</code> delegated scope, company IT consent, and per-user OAuth. The request shall route through IT — see Integrations.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[0.74rem] font-semibold text-[var(--ink-2)]">
                <Link href="/integrations" className="font-bold text-[var(--brand)] hover:underline">Open integration status →</Link>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Active Sequences" sub={`${sequences.filter((s) => s.status === "active" || s.status === "paused").length} running`} />
            <div className="space-y-3 px-4 pb-4">
              {sequences.length === 0 && <p className="px-4 pb-3 text-[0.82rem] text-[var(--ink-2)]">No follow-up sequences yet — approve a draft as a 2-step sequence to start one.</p>}
              {sequences.slice(0, 6).map((seq) => {
                const acc = accounts.find((a) => a.id === seq.accountId);
                const due = seq.steps.find((s) => s.status === "scheduled" && s.sendAt <= Date.now());
                return (
                  <div key={seq.id} className={cn("rounded-xl border p-3.5", seq.status === "stopped" ? "border-[#ecc9c2] bg-[var(--danger-soft)]" : seq.status === "completed" ? "border-[#c8dfd4] bg-[var(--brand-softer)]" : "border-[var(--line)] bg-[var(--surface-2)]")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[0.84rem] font-bold">{acc?.name ?? "—"}</p>
                        <p className="text-[0.7rem] font-semibold text-[var(--ink-2)]">To: {seq.contactName} · started {relTime(seq.createdAt)}</p>
                      </div>
                      <span className={cn("rounded-full px-2 py-0.5 text-[0.6rem] font-extrabold uppercase",
                        seq.status === "active" && "bg-[var(--brand-soft)] text-[var(--brand-deep)]",
                        seq.status === "paused" && "bg-[var(--gold-soft)] text-[#8a6a33]",
                        seq.status === "stopped" && "bg-white/70 text-[var(--danger)]",
                        seq.status === "completed" && "bg-white/70 text-[var(--brand-deep)]",
                      )}>
                        {seq.status === "stopped" ? seq.stopReason : seq.status}
                      </span>
                    </div>
                    <div className="mt-2.5 space-y-1.5">
                      {seq.steps.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-2 text-[0.72rem]">
                          <span className={cn("grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full text-[0.55rem] font-extrabold text-white", s.status === "sent" ? "bg-[#0F7A36]" : "bg-[var(--gold)]")}>
                            {s.status === "sent" ? "✓" : i + 1}
                          </span>
                          <span className={cn("flex-1 truncate font-semibold", s.status === "sent" ? "text-[var(--ink-3)] line-through" : "text-[var(--ink)]")}>{s.subject}</span>
                          <span className="shrink-0 text-[0.64rem] font-bold text-[var(--ink-3)]">{s.status === "sent" ? "sent" : fmtDate(s.sendAt)}</span>
                        </div>
                      ))}
                    </div>
                    {seq.status === "active" && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {due && (
                          <button onClick={() => sendStep(seq, due.id)} className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand)] px-2.5 py-1.5 text-[0.68rem] font-bold text-white hover:bg-[var(--brand-deep)]">
                            <Send size={10} /> Send due step (simulated)
                          </button>
                        )}
                        <button onClick={() => stopSequence(seq, "Reply received")} className="seq-stop"><Reply size={10} /> Reply received</button>
                        <button onClick={() => stopSequence(seq, "Meeting booked")} className="seq-stop"><CalendarClock size={10} /> Meeting booked</button>
                        <button onClick={() => stopSequence(seq, "Opt-out")} className="seq-stop text-[var(--danger)]"><Ban size={10} /> Opt-out</button>
                        <button onClick={() => updateSequence(seq.id, { status: "paused" })} className="seq-stop"><Pause size={10} /> Pause</button>
                      </div>
                    )}
                    {seq.status === "paused" && (
                      <button onClick={() => updateSequence(seq.id, { status: "active" })} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[0.68rem] font-bold text-[var(--brand-deep)] ring-1 ring-inset ring-[var(--line)]">
                        <Play size={10} /> Resume sequence
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Audit trail */}
      <Card>
        <CardHeader title="Compliance Audit Trail" sub="Immutable record of drafts, approvals, simulated sends and stop conditions" action={<ListChecks size={16} className="text-[var(--ink-3)]" />} />
        <div className="max-h-[280px] overflow-y-auto px-5 pb-4">
          {emailAudit.length === 0 && <p className="pb-2 text-[0.82rem] text-[var(--ink-2)]">No concierge events yet.</p>}
          {emailAudit.slice(0, 25).map((a) => (
            <div key={a.id} className="flex items-start gap-3 border-b border-[var(--line-2)] py-2 last:border-none">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[var(--surface-2)] text-[var(--ink-3)]">
                <FileText size={11} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.8rem] font-semibold">{a.detail}</p>
                <p className="text-[0.66rem] font-bold uppercase tracking-wide text-[var(--ink-3)]">
                  {a.action} · {relTime(a.at)} · {usersName(a.actorId)}
                </p>
              </div>
              {a.accountId && (
                <Link href={`/accounts/${a.accountId}`} className="shrink-0 text-[0.72rem] font-bold text-[var(--brand)] hover:underline">Account →</Link>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function usersName(id: string) {
  // non-hook safe helper
  const u = useAppStore.getState().users.find((x) => x.id === id);
  return u?.name ?? "Unknown";
}

function resultBanner(msg: string) {
  return msg;
}

export default function EmailPage() {
  return (
    <Suspense>
      <EmailConciergeInner />
    </Suspense>
  );
}

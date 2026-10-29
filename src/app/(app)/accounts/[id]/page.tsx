"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  CalendarPlus,
  Circle,
  ClipboardList,
  CloudCog,
  Globe,
  HeartHandshake,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Radar,
  RefreshCw,
  Sparkles,
  Trash2,
  UserPlus,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AccountModal, ContactModal, LogActivityModal, TaskModal } from "@/components/forms";
import { PortfolioGapSection, PreCallBrief } from "@/components/intel";
import { Avatar, Button, Card, CardHeader, Chip, EmptyState, Modal, PriorityBadge } from "@/components/ui";
import { StageStepper } from "@/components/viz";
import { useAppStore } from "@/lib/store";
import { cn, fmtDate, fmtMoney, relTime } from "@/lib/utils";
import type { Activity, Contact } from "@/lib/types";

const ACT_META: Record<Activity["type"], { icon: typeof Phone; color: string; label: string }> = {
  call: { icon: Phone, color: "#27698F", label: "Phone call" },
  visit: { icon: MapPin, color: "#0C6B4F", label: "Field visit" },
  email: { icon: Mail, color: "#B97A1A", label: "Email" },
  demo: { icon: Video, color: "#6B4FA1", label: "Equipment demo" },
  meeting: { icon: CalendarPlus, color: "#B4541E", label: "Meeting" },
  note: { icon: ClipboardList, color: "#647A6E", label: "Note" },
};

const CRM_META: Record<string, { label: string; cls: string; icon: typeof CloudCog }> = {
  synced: { label: "Synced to Nuvue", cls: "bg-[var(--brand-soft)] text-[var(--brand-deep)] ring-[#bcd4c8]", icon: CloudCog },
  pending: { label: "Sync pending", cls: "bg-[var(--gold-soft)] text-[#8a6a33] ring-[#e6d5b5]", icon: CloudCog },
  local: { label: "Local only — not in Nuvue", cls: "bg-slate-100 text-slate-600 ring-slate-200", icon: CloudCog },
};

const CONTACT_ROLE_META: Record<Contact["role"], { label: string; cls: string }> = {
  "decision-maker": { label: "Decision maker", cls: "bg-[var(--brand-soft)] text-[var(--brand-deep)] ring-[#bcd4c8]" },
  influencer: { label: "Influencer", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  champion: { label: "Champion", cls: "bg-[var(--gold-soft)] text-[#8a6a33] ring-[#e6d5b5]" },
  user: { label: "Daily user", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const account = useAppStore((s) => s.accounts.find((a) => a.id === id));
  const users = useAppStore((s) => s.users);
  const products = useAppStore((s) => s.products);
  const contacts = useAppStore((s) => s.contacts.filter((c) => c.accountId === id));
  const activities = useAppStore((s) => s.activities.filter((a) => a.accountId === id));
  const tasks = useAppStore((s) => s.tasks.filter((t) => t.accountId === id && !t.done));
  const routes = useAppStore((s) => s.routes.filter((r) => r.stops.some((st) => st.accountId === id && st.status !== "skipped")));
  const setStage = useAppStore((s) => s.setStage);
  const setPriority = useAppStore((s) => s.setPriority);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const deleteAccount = useAppStore((s) => s.deleteAccount);
  const setCrmStatus = useAppStore((s) => s.setCrmStatus);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const deleteContact = useAppStore((s) => s.deleteContact);

  const [logOpen, setLogOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const timeline = useMemo(() => [...activities].sort((a, b) => b.at - a.at), [activities]);

  if (!account) {
    return (
      <EmptyState icon={<Radar size={20} />} title="Account not found" sub="It may have been removed, or the demo dataset was reset." />
    );
  }

  const owner = users.find((u) => u.id === account.ownerId);
  const open = account.stage !== "won" && account.stage !== "lost";
  const crm = CRM_META[account.crmStatus];
  const nextFollowUp = tasks.length > 0 ? tasks.sort((a, b) => a.dueAt - b.dueAt)[0] : null;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/accounts" className="inline-flex items-center gap-1.5 text-[0.82rem] font-bold text-[var(--ink-2)] hover:text-[var(--brand)]">
          <ArrowLeft size={15} /> Accounts CRM
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => router.push(`/email?account=${account.id}`)}>
            <Mail size={14} /> Email
          </Button>
          <Button variant="gold" onClick={() => setBriefOpen(true)}>
            <Sparkles size={14} /> 30‑Sec Brief
          </Button>
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            <Pencil size={14} /> Edit
          </Button>
          <Button onClick={() => setLogOpen(true)}>
            <ClipboardList size={15} /> Log Activity
          </Button>
        </div>
      </div>

      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <Card className="overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[var(--brand)] via-[var(--gold)] to-[var(--brand-soft)]" />
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Avatar name={account.name} size={54} color={owner?.color} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-[1.6rem] font-semibold leading-tight">{account.name}</h1>
                    <PriorityBadge priority={account.priority} />
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold ring-1 ring-inset", crm.cls)}>
                      <crm.icon size={11} /> {crm.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.88rem] font-semibold text-[var(--ink-2)]">
                    {account.specialty} · {account.city}, {account.state} {account.zip}
                    {account.locations > 1 && <span className="text-[var(--brand)]"> · {account.locations} locations</span>}
                  </p>
                  <div className="mt-3">
                    <StageStepper stage={account.stage} onPick={open ? (s) => setStage(account.id, s) : undefined} />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--ink-3)]">Opportunity value</p>
                <p className="font-display text-[2rem] font-semibold leading-none text-[var(--brand)]">{fmtMoney(account.opportunity)}</p>
                <div className="mt-2 flex items-center justify-end gap-2">
                  {(["A", "B", "C"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(account.id, p)}
                      className={cn(
                        "h-7 w-7 rounded-lg text-[0.72rem] font-extrabold transition-all",
                        account.priority === p ? "bg-[var(--ink)] text-white" : "bg-[var(--surface-2)] text-[var(--ink-3)] hover:bg-[var(--line-2)]"
                      )}
                      title={`Set priority ${p}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Key facts grid */}
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Fact label="Last contact" value={relTime(account.lastContactAt)}/>
              <Fact label="Last in-person visit" value={relTime(account.lastVisitAt)} />
              <Fact label="Next follow-up" value={nextFollowUp ? fmtDate(nextFollowUp.dueAt) : "None scheduled"} alert={!nextFollowUp && open} />
              <Fact label="Assigned to" value={owner?.name ?? "Unassigned"} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {open ? (
                <>
                  <Button variant="gold" className="!py-2 text-[0.78rem]" onClick={() => setStage(account.id, "won")}>Mark Won</Button>
                  <Button variant="danger" className="!py-2 text-[0.78rem]" onClick={() => setStage(account.id, "lost")}>Mark Lost</Button>
                </>
              ) : (
                <Button variant="secondary" className="!py-2 text-[0.78rem]" onClick={() => setStage(account.id, "prospect")}>Reopen as Prospect</Button>
              )}
              <span className="mx-1 h-5 w-px bg-[var(--line)]" />
              <Button
                variant="ghost"
                className="!py-2 text-[0.78rem]"
                onClick={() => setCrmStatus(account.id, account.crmStatus === "synced" ? "pending" : "synced")}
                title="Simulate Nuvue CRM sync"
              >
                <RefreshCw size={13} /> {account.crmStatus === "synced" ? "Queue re-sync" : "Push to Nuvue"}
              </Button>
              {routes.length > 0 && (
                <Chip tone="brand">
                  <MapPin size={11} /> On route: {routes[0].name}
                </Chip>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Left column — intelligence */}
        <div className="space-y-5 xl:col-span-2">
          {/* Contacts */}
          <Card>
            <CardHeader
              title="Contacts"
              sub={`${contacts.length} known people · decision roles & preferences`}
              action={<Button variant="secondary" className="!py-2 !text-[0.78rem]" onClick={() => { setEditContact(null); setContactOpen(true); }}><UserPlus size={13} /> Add contact</Button>}
            />
            <div className="grid grid-cols-1 gap-2.5 px-5 pb-5 md:grid-cols-2">
              {contacts.length === 0 && (
                <p className="md:col-span-2 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[0.82rem] text-[var(--ink-2)]">
                  No contacts recorded. Research the practice website or ask at the front desk on your next visit.
                </p>
              )}
              {contacts.map((c) => {
                const rm = CONTACT_ROLE_META[c.role];
                const interestNames = products.filter((p) => c.interests.includes(p.id)).map((p) => p.name);
                return (
                  <div key={c.id} className="group rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3.5">
                    <div className="flex items-start gap-3">
                      <Avatar name={c.name} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[0.9rem] font-bold">{c.name}</p>
                          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button onClick={() => { setEditContact(c); setContactOpen(true); }} className="rounded-md p-1 text-[var(--ink-3)] hover:bg-white hover:text-[var(--brand)]" title="Edit contact">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => deleteContact(c.id)} className="rounded-md p-1 text-[var(--ink-3)] hover:bg-white hover:text-[var(--danger)]" title="Delete contact">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <p className="text-[0.72rem] font-semibold text-[var(--ink-2)]">{c.title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wide ring-1 ring-inset", rm.cls)}>{rm.label}</span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wide text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line)]">
                            Prefers {c.preference}
                          </span>
                        </div>
                        <div className="mt-2 space-y-0.5 text-[0.72rem] font-semibold text-[var(--ink-2)]">
                          {c.email && <p className="flex items-center gap-1.5 truncate"><Mail size={10} /> {c.email}</p>}
                          {c.phone && <p className="flex items-center gap-1.5"><Phone size={10} /> {c.phone}</p>}
                          {interestNames.length > 0 && <p className="flex items-center gap-1.5"><HeartHandshake size={10} /> Interested in: {interestNames.join(", ")}</p>}
                          <p className="text-[var(--ink-3)]">Last touch: {relTime(c.lastContactAt)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Portfolio gap intelligence */}
          <PortfolioGapSection account={account} />

          {/* Timeline */}
          <Card>
            <CardHeader
              title="Activity & Meeting History"
              sub={`${timeline.length} logged touchpoints`}
              action={<Button variant="secondary" className="!py-2 !text-[0.78rem]" onClick={() => setLogOpen(true)}><ClipboardList size={13} /> Log</Button>}
            />
            <div className="px-5 pb-5">
              {timeline.length === 0 && (
                <EmptyState icon={<ClipboardList size={18} />} title="No activity yet" sub="Log your first call, visit or note to start the account timeline." />
              )}
              <div className="relative space-y-0 border-l-2 border-[var(--line-2)] pl-5">
                {timeline.map((act, i) => {
                  const meta = ACT_META[act.type];
                  const Icon = meta.icon;
                  const who = users.find((u) => u.id === act.userId);
                  return (
                    <motion.div key={act.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.05, 0.5) }} className="relative pb-5 last:pb-0">
                      <span className="absolute -left-[31px] grid h-7 w-7 place-items-center rounded-full border-2 border-[var(--surface)] text-white" style={{ background: meta.color }}>
                        <Icon size={12} strokeWidth={2.4} />
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[0.72rem] font-extrabold uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
                        <span className="text-[0.68rem] font-semibold text-[var(--ink-3)]">{fmtDate(act.at)} · {relTime(act.at)}</span>
                        {who && <span className="text-[0.68rem] font-semibold text-[var(--ink-2)]">by {who.name}</span>}
                      </div>
                      <p className="mt-1 text-[0.85rem] leading-relaxed text-[var(--ink)]">{act.summary}</p>
                      {act.outcome && <div className="mt-1.5"><Chip tone="brand">{act.outcome}</Chip></div>}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Practice record */}
          <Card>
            <CardHeader title="Practice Record" sub="Core account profile" />
            <div className="space-y-3 px-5 pb-5">
              <InfoRow icon={Building2} label="Address" value={`${account.address}, ${account.city}, ${account.state} ${account.zip}`} />
              <InfoRow icon={Phone} label="Main line" value={account.phone} />
              <InfoRow icon={Globe} label="Website" value={account.website || "—"} href={account.website ? `https://${account.website}` : undefined} />
              <InfoRow icon={Link2} label="Research source" value={account.source} />
              <div className="flex items-center justify-between border-t border-[var(--line-2)] pt-3">
                <span className="text-[0.72rem] font-bold uppercase tracking-wide text-[var(--ink-3)]">Confidence</span>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[0.68rem] font-bold",
                  account.confidence === "high" && "bg-[var(--brand-soft)] text-[var(--brand-deep)]",
                  account.confidence === "medium" && "bg-[var(--gold-soft)] text-[#8a6a33]",
                  account.confidence === "low" && "bg-[var(--surface-2)] text-[var(--ink-2)]"
                )}>
                  {account.confidence.toUpperCase()}
                </span>
              </div>
              {account.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t border-[var(--line-2)] pt-3">
                  {account.tags.map((t) => (
                    <Chip key={t} tone="gold">#{t}</Chip>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Follow-ups */}
          <Card>
            <CardHeader title="Open Follow-ups" sub={`${tasks.length} scheduled`} action={<Button variant="secondary" className="!py-2 !text-[0.78rem]" onClick={() => setTaskOpen(true)}><CalendarPlus size={13} /> Add</Button>} />
            <div className="space-y-1.5 px-3 pb-4">
              {tasks.length === 0 && <p className="px-2 pb-3 text-[0.82rem] text-[var(--ink-2)]">Nothing scheduled — set the next move.</p>}
              {tasks.sort((a, b) => a.dueAt - b.dueAt).map((t) => {
                const overdue = t.dueAt < Date.now();
                return (
                  <button key={t.id} onClick={() => toggleTask(t.id)} className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-[var(--surface-2)]" title="Click to complete">
                    <span className={cn("mt-0.5 shrink-0", overdue ? "text-[var(--danger)]" : "text-[var(--ink-3)]")}>
                      <Circle size={15} strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.8rem] font-bold leading-snug">{t.title}</span>
                      <span className={cn("text-[0.68rem] font-bold", overdue ? "text-[var(--danger)]" : "text-[var(--ink-3)]")}>
                        {overdue ? "Overdue · " : "Due "}{fmtDate(t.dueAt)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader title="Field Notes" sub="Private working notes for this account" />
            <div className="px-5 pb-5">
              <textarea
                className="field min-h-[110px] resize-y text-[0.85rem]"
                value={notesDraft ?? account.notes}
                onChange={(e) => setNotesDraft(e.target.value)}
                onBlur={() => {
                  if (notesDraft !== null && notesDraft !== account.notes) updateAccount(account.id, { notes: notesDraft });
                  setNotesDraft(null);
                }}
                placeholder="Capture observations, politics, buying signals…"
              />
              <p className="mt-2 text-[0.68rem] text-[var(--ink-3)]">
                Record added {fmtDate(account.createdAt)} · ID {account.id}
              </p>
            </div>
          </Card>

          {/* Danger zone */}
          <Card className="border-[#ecc9c2]">
            <div className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-[0.84rem] font-bold text-[var(--danger)]">Remove account</p>
                <p className="text-[0.72rem] text-[var(--ink-2)]">Deletes timeline, contacts &amp; follow-ups too.</p>
              </div>
              {confirmDelete ? (
                <div className="flex gap-2">
                  <Button variant="ghost" className="!px-3 !py-2 text-[0.75rem]" onClick={() => setConfirmDelete(false)}>Keep</Button>
                  <Button variant="danger" className="!px-3 !py-2 text-[0.75rem]" onClick={() => { deleteAccount(account.id); router.push("/accounts"); }}>
                    <Trash2 size={13} /> Confirm delete
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" className="!px-3 !py-2 text-[0.75rem] text-[var(--danger)]" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={13} /> Delete
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <LogActivityModal open={logOpen} onClose={() => setLogOpen(false)} accountId={account.id} />
      <TaskModal open={taskOpen} onClose={() => setTaskOpen(false)} accountId={account.id} />
      <AccountModal open={editOpen} onClose={() => setEditOpen(false)} edit={account} />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} accountId={account.id} edit={editContact} />
      <Modal open={briefOpen} onClose={() => setBriefOpen(false)} title="" wide>
        <PreCallBrief account={account} onClose={() => setBriefOpen(false)} />
      </Modal>
    </div>
  );
}

function Fact({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={cn("rounded-xl px-3.5 py-3 ring-1 ring-inset", alert ? "bg-[var(--gold-soft)] ring-[#e6d5b5]" : "bg-[var(--surface-2)] ring-[var(--line-2)]")}>
      <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">{label}</p>
      <p className={cn("mt-0.5 text-[0.9rem] font-extrabold", alert ? "text-[#8a6a33]" : "text-[var(--ink)]")}>{value}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, href }: { icon: typeof Phone; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--surface-2)] text-[var(--ink-2)]">
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <p className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--ink-3)]">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="block truncate text-[0.85rem] font-bold text-[var(--brand)] hover:underline">
            {value}
          </a>
        ) : (
          <p className="text-[0.85rem] font-bold text-[var(--ink)]">{value}</p>
        )}
      </div>
    </div>
  );
}

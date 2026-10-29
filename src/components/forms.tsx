"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Field, Modal } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import type { Account, ActivityType, Priority, Stage } from "@/lib/types";
import { PRIORITIES, STAGES } from "@/lib/utils";

const SPECIALTIES = [
  "Medical Spa",
  "Plastic Surgery",
  "Dermatology",
  "Cosmetic Dermatology",
  "Facial Plastic Surgery",
  "Oculoplastic Surgery",
  "Laser Clinic",
  "GLP-1 Clinic",
  "Medical Weight Loss",
  "Bariatric Surgery",
  "Hair Restoration",
  "Men's Health",
  "Women's Wellness",
  "OB-GYN & Wellness",
  "Anti-Aging Clinic",
  "Longevity & Functional Medicine",
  "Hormone Replacement Clinic",
];

/* ─── Log Activity ──────────────────────────────────────────────────── */
export function LogActivityModal({
  open,
  onClose,
  accountId,
  onSaved,
  defaultType = "call",
}: {
  open: boolean;
  onClose: () => void;
  accountId?: string;
  onSaved?: () => void;
  defaultType?: ActivityType;
}) {
  const accounts = useAppStore((s) => s.accounts);
  const logActivity = useAppStore((s) => s.logActivity);
  const addTask = useAppStore((s) => s.addTask);
  const user = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));

  const [accId, setAccId] = useState(accountId ?? "");
  const [type, setType] = useState<ActivityType>("call");
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [followUpTitle, setFollowUpTitle] = useState("");

  useEffect(() => {
    if (open) {
      setAccId(accountId ?? "");
      setType(defaultType);
      setSummary("");
      setOutcome("");
      setFollowUp("");
      setFollowUpTitle("");
    }
  }, [open, accountId, defaultType]);

  function save() {
    if (!accId || !summary.trim() || !user) return;
    logActivity({ accountId: accId, userId: user.id, type, summary: summary.trim(), outcome: outcome.trim() || undefined });
    if (followUp) {
      addTask({
        accountId: accId,
        userId: user.id,
        title: followUpTitle.trim() || `Follow up — ${accounts.find((a) => a.id === accId)?.name ?? "account"}`,
        type: "follow-up",
        dueAt: new Date(followUp + "T17:00:00").getTime(),
      });
    }
    onSaved?.();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Activity">
      <div className="space-y-4">
        {!accountId && (
          <Field label="Account">
            <select className="field" value={accId} onChange={(e) => setAccId(e.target.value)}>
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.city}, {a.state}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Activity type">
            <select className="field" value={type} onChange={(e) => setType(e.target.value as ActivityType)}>
              <option value="call">Phone call</option>
              <option value="visit">Field visit / walk-in</option>
              <option value="email">Email</option>
              <option value="demo">Equipment demo</option>
              <option value="meeting">Meeting</option>
              <option value="note">Note / research</option>
            </select>
          </Field>
          <Field label="Outcome">
            <input className="field" placeholder="e.g. Demo requested" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
          </Field>
        </div>
        <Field label="Summary" hint="Dictate or type what happened — this posts to the account timeline and counts toward your activity metrics.">
          <textarea className="field min-h-[96px] resize-y" placeholder="What happened? Who did you speak with? What stalls or signals did you pick up?" value={summary} onChange={(e) => setSummary(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Schedule follow-up (optional)">
            <input className="field" type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </Field>
          {followUp && (
            <Field label="Follow-up task">
              <input className="field" placeholder="Follow-up task title" value={followUpTitle} onChange={(e) => setFollowUpTitle(e.target.value)} />
            </Field>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!accId || !summary.trim()}>Save activity</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Add / Edit Account ────────────────────────────────────────────── */
export function AccountModal({
  open,
  onClose,
  edit,
  preset,
}: {
  open: boolean;
  onClose: () => void;
  edit?: Account | null;
  preset?: { city?: string; state?: "TX" | "OK" };
}) {
  const router = useRouter();
  const users = useAppStore((s) => s.users.filter((u) => u.active));
  const addAccount = useAppStore((s) => s.addAccount);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const currentUser = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));

  const [form, setForm] = useState({
    name: "",
    specialty: "Medical Spa",
    category: "Aesthetics",
    address: "",
    city: "",
    state: "TX" as "TX" | "OK",
    zip: "",
    phone: "",
    website: "",
    priority: "B" as Priority,
    stage: "prospect" as Stage,
    ownerId: "",
    opportunity: 75000,
    dmName: "",
    dmTitle: "",
    services: "",
    equipment: "",
    notes: "",
    source: "Manual entry — field research",
    lat: 32.78,
    lng: -96.8,
  });

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setForm({
        name: edit.name,
        specialty: edit.specialty,
        category: edit.category,
        address: edit.address,
        city: edit.city,
        state: edit.state,
        zip: edit.zip,
        phone: edit.phone,
        website: edit.website,
        priority: edit.priority,
        stage: edit.stage,
        ownerId: edit.ownerId,
        opportunity: edit.opportunity,
        dmName: edit.decisionMakers[0]?.name ?? "",
        dmTitle: edit.decisionMakers[0]?.title ?? "",
        services: edit.services.join(", "),
        equipment: edit.equipment.join(", "),
        notes: edit.notes,
        source: edit.source,
        lat: edit.lat,
        lng: edit.lng,
      });
    } else {
      setForm((f) => ({ ...f, ownerId: f.ownerId || currentUser?.id || "", name: "", address: "", city: preset?.city ?? "", state: preset?.state ?? "TX", zip: "", phone: "", website: "", dmName: "", dmTitle: "", services: "", equipment: "", notes: "", stage: "prospect", priority: "B" }));
    }
  }, [open, edit, currentUser?.id, preset]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  function save() {
    if (!form.name.trim() || !form.city.trim()) return;
    const payload = {
      name: form.name.trim(),
      specialty: form.specialty,
      category: form.category,
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state,
      zip: form.zip.trim(),
      phone: form.phone.trim(),
      website: form.website.trim(),
      email: form.website ? `hello@${form.website.trim()}` : undefined,
      decisionMakers: form.dmName ? [{ name: form.dmName, title: form.dmTitle || "Decision Maker" }] : [],
      services: form.services.split(",").map((x) => x.trim()).filter(Boolean),
      equipment: form.equipment.split(",").map((x) => x.trim()).filter(Boolean),
      locations: 1,
      lat: form.lat,
      lng: form.lng,
      priority: form.priority,
      stage: form.stage,
      ownerId: form.ownerId || currentUser?.id || "u_elena",
      lastContactAt: edit?.lastContactAt ?? null,
      lastVisitAt: edit?.lastVisitAt ?? null,
      opportunity: Number(form.opportunity) || 0,
      source: form.source,
      confidence: "medium" as const,
      notes: form.notes.trim(),
      tags: edit?.tags ?? [],
    };
    if (edit) {
      updateAccount(edit.id, payload);
      onClose();
    } else {
      const id = addAccount(payload);
      onClose();
      router.push(`/accounts/${id}`);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={edit ? "Edit Account" : "Add Account / Prospect"} wide>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Practice name">
          <input className="field" placeholder="e.g. Ladera Park Aesthetics" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Specialty">
          <select className="field" value={form.specialty} onChange={(e) => set("specialty", e.target.value)}>
            {SPECIALTIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Street address">
          <input className="field" placeholder="123 Main St, Ste 100" value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="City">
            <input className="field" placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="State">
            <select className="field" value={form.state} onChange={(e) => set("state", e.target.value as "TX" | "OK")}>
              <option value="TX">TX</option>
              <option value="OK">OK</option>
            </select>
          </Field>
          <Field label="ZIP">
            <input className="field" placeholder="Zip" value={form.zip} onChange={(e) => set("zip", e.target.value)} />
          </Field>
        </div>
        <Field label="Main phone">
          <input className="field" placeholder="(512) 555-0100" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Website">
          <input className="field" placeholder="practice-website.com" value={form.website} onChange={(e) => set("website", e.target.value)} />
        </Field>
        <Field label="Decision maker — name">
          <input className="field" placeholder="Dr. Jane Smith" value={form.dmName} onChange={(e) => set("dmName", e.target.value)} />
        </Field>
        <Field label="Decision maker — title">
          <input className="field" placeholder="Medical Director" value={form.dmTitle} onChange={(e) => set("dmTitle", e.target.value)} />
        </Field>
        <Field label="Pipeline stage">
          <select className="field" value={form.stage} onChange={(e) => set("stage", e.target.value as Stage)}>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Priority">
            <select className="field" value={form.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Opportunity ($)">
            <input className="field" type="number" value={form.opportunity} onChange={(e) => set("opportunity", Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Assigned to">
          <select className="field" value={form.ownerId} onChange={(e) => set("ownerId", e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name} — {u.title}</option>
            ))}
          </select>
        </Field>
        <Field label="Advertised services" hint="Comma-separated">
          <input className="field" placeholder="Injectables, CoolSculpting, Laser Hair Removal" value={form.services} onChange={(e) => set("services", e.target.value)} />
        </Field>
        <Field label="Known equipment" hint="Comma-separated — competitive intelligence">
          <input className="field" placeholder="Morpheus8, HydraFacial" value={form.equipment} onChange={(e) => set("equipment", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude" hint="For the territory map">
            <input className="field" type="number" step="0.01" value={form.lat} onChange={(e) => set("lat", Number(e.target.value))} />
          </Field>
          <Field label="Longitude">
            <input className="field" type="number" step="0.01" value={form.lng} onChange={(e) => set("lng", Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Research source">
          <input className="field" value={form.source} onChange={(e) => set("source", e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Field notes">
            <textarea className="field min-h-[72px] resize-y" placeholder="Context, buying signals, competitive situation…" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={!form.name.trim() || !form.city.trim()}>{edit ? "Save changes" : "Add account"}</Button>
      </div>
    </Modal>
  );
}

/* ─── Add Task ──────────────────────────────────────────────────────── */
export function TaskModal({
  open,
  onClose,
  accountId,
}: {
  open: boolean;
  onClose: () => void;
  accountId?: string;
}) {
  const accounts = useAppStore((s) => s.accounts);
  const addTask = useAppStore((s) => s.addTask);
  const user = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const [accId, setAccId] = useState(accountId ?? "");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  useEffect(() => {
    if (open) {
      setAccId(accountId ?? "");
      setTitle("");
      setDue("");
    }
  }, [open, accountId]);

  function save() {
    if (!accId || !title.trim() || !due || !user) return;
    addTask({ accountId: accId, userId: user.id, title: title.trim(), type: "follow-up", dueAt: new Date(due + "T17:00:00").getTime() });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Schedule Follow-up">
      <div className="space-y-4">
        {!accountId && (
          <Field label="Account">
            <select className="field" value={accId} onChange={(e) => setAccId(e.target.value)}>
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {a.city}, {a.state}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Task">
          <input className="field" placeholder="e.g. Send pricing sheet to practice manager" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Due date">
          <input className="field" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!accId || !title.trim() || !due}>Schedule</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Add / Edit Contact ────────────────────────────────────────────── */
export function ContactModal({
  open,
  onClose,
  accountId,
  edit,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
  edit?: import("@/lib/types").Contact | null;
}) {
  const products = useAppStore((s) => s.products.filter((p) => p.status === "active"));
  const addContact = useAppStore((s) => s.addContact);
  const updateContact = useAppStore((s) => s.updateContact);

  const [form, setForm] = useState({
    name: "",
    title: "",
    role: "decision-maker" as import("@/lib/types").ContactRole,
    email: "",
    phone: "",
    preference: "call" as import("@/lib/types").ContactPreference,
    interests: [] as string[],
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setForm({
        name: edit.name,
        title: edit.title,
        role: edit.role,
        email: edit.email ?? "",
        phone: edit.phone ?? "",
        preference: edit.preference,
        interests: edit.interests,
        notes: edit.notes,
      });
    } else {
      setForm({ name: "", title: "", role: "decision-maker", email: "", phone: "", preference: "call", interests: [], notes: "" });
    }
  }, [open, edit]);

  function save() {
    if (!form.name.trim()) return;
    const payload = {
      accountId,
      name: form.name.trim(),
      title: form.title.trim() || "Staff",
      role: form.role,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      preference: form.preference,
      interests: form.interests,
      notes: form.notes.trim(),
      lastContactAt: edit?.lastContactAt ?? null,
    };
    if (edit) updateContact(edit.id, payload);
    else addContact(payload);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={edit ? "Edit Contact" : "Add Contact"}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full name">
            <input className="field" placeholder="Dr. Jane Smith" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Title">
            <input className="field" placeholder="Medical Director" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Decision-making role">
            <select className="field" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as typeof form.role }))}>
              <option value="decision-maker">Decision maker — signs the deal</option>
              <option value="influencer">Influencer — shapes the decision</option>
              <option value="champion">Champion — advocates internally</option>
              <option value="user">Daily user — equipment operator</option>
            </select>
          </Field>
          <Field label="Contact preference">
            <select className="field" value={form.preference} onChange={(e) => setForm((f) => ({ ...f, preference: e.target.value as typeof form.preference }))}>
              <option value="call">Phone call</option>
              <option value="email">Email</option>
              <option value="text">Text message</option>
              <option value="in-person">In-person</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Business email" hint="Only where publicly listed or directly provided">
            <input className="field" type="email" placeholder="jane@practice.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Business phone">
            <input className="field" placeholder="(512) 555-0100" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
        </div>
        <Field label="Product interests" hint="Multi-select from the active portfolio">
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5">
            {products.map((p) => {
              const on = form.interests.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      interests: on ? f.interests.filter((x) => x !== p.id) : [...f.interests, p.id],
                    }))
                  }
                  className={
                    on
                      ? "rounded-lg bg-[var(--brand)] px-2.5 py-1.5 text-[0.7rem] font-bold text-white"
                      : "rounded-lg bg-white px-2.5 py-1.5 text-[0.7rem] font-bold text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line)] hover:bg-[var(--brand-softer)]"
                  }
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Notes">
          <textarea className="field min-h-[64px] resize-y" placeholder="Communication style, gatekeeper tips, objections heard…" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!form.name.trim()}>{edit ? "Save contact" : "Add contact"}</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── Contact modal variant usable from the global Contacts page ────── */
export function ContactModalGlobal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const accounts = useAppStore((s) => s.accounts);
  const [accId, setAccId] = useState("");
  const [inner, setInner] = useState<import("@/lib/types").Contact | null>(null);
  const [step2, setStep2] = useState(false);

  useEffect(() => {
    if (open) {
      setAccId("");
      setStep2(false);
    }
  }, [open]);

  if (!step2) {
    return (
      <Modal open={open && !step2} onClose={onClose} title="Add Contact">
        <div className="space-y-4">
          <p className="text-[0.82rem] text-[var(--ink-2)]">Contacts live under an account — pick the practice first.</p>
          <Field label="Account">
            <select className="field" value={accId} onChange={(e) => setAccId(e.target.value)}>
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — {a.city}, {a.state}</option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button disabled={!accId} onClick={() => setStep2(true)}>Next</Button>
          </div>
        </div>
      </Modal>
    );
  }
  return <ContactModal open={step2} onClose={() => setStep2(false)} accountId={accId} edit={inner} />;
}

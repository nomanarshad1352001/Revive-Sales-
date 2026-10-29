"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, CircleAlert, Mic, MicOff, RotateCcw, Sparkles, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Button, Field, Modal } from "@/components/ui";
import { extractVisitNote, type Extraction } from "@/lib/extract";
import { useAppStore } from "@/lib/store";
import { cn, fmtDate } from "@/lib/utils";
import type { ActivityType } from "@/lib/types";

const SAMPLE = "Just met with Sally at Sugar Land Skin Center. She has an older RF microneedling device, is interested in Avira, and wants information on skin tightening. Her owner makes the final purchasing decision. Follow up next Tuesday and see if we can schedule a demo. She mentioned the budget is tight this quarter.";

/* Web Speech API types (browser only) */
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

export default function VoiceVisitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const accounts = useAppStore((s) => s.accounts);
  const products = useAppStore((s) => s.products);
  const logActivity = useAppStore((s) => s.logActivity);
  const addTask = useAppStore((s) => s.addTask);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const setPendingDraft = useAppStore((s) => s.setPendingDraft);
  const me = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));

  const [phase, setPhase] = useState<"capture" | "review">("capture");
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const [ex, setEx] = useState<Extraction | null>(null);
  const [selAccount, setSelAccount] = useState("");
  const [selType, setSelType] = useState<ActivityType>("visit");
  const [selInterest, setSelInterest] = useState<Extraction["interest"]>("unknown");
  const [selNext, setSelNext] = useState("");
  const [selDate, setSelDate] = useState("");
  const [selProducts, setSelProducts] = useState<string[]>([]);
  const [selEquipment, setSelEquipment] = useState<string[]>([]);
  const [draftToConcierge, setDraftToConcierge] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setPhase("capture");
      setText("");
      setEx(null);
      setSaved(false);
      setMicSupported(!!(typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)));
    }
  }, [open]);

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finals = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finals += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      if (finals) setText((t) => (t ? t + " " : "") + finals.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  function stopListening() {
    recRef.current?.stop();
    setListening(false);
  }

  function runExtraction() {
    if (!text.trim()) return;
    const result = extractVisitNote(text, accounts, products);
    setEx(result);
    setSelAccount(result.accountId ?? accounts.find((a) => a.name === result.accountGuess)?.id ?? "");
    setSelType(result.visitType);
    setSelInterest(result.interest);
    setSelNext(result.nextAction ?? "");
    setSelDate(result.followUpAt ? new Date(result.followUpAt).toISOString().slice(0, 10) : "");
    setSelProducts(result.productIds);
    setSelEquipment(result.equipment);
    setPhase("review");
  }

  const selAccountObj = useMemo(() => accounts.find((a) => a.id === selAccount), [accounts, selAccount]);

  function save() {
    if (!selAccountObj || !me || !ex) return;
    const productNames = products.filter((p) => selProducts.includes(p.id)).map((p) => p.name);
    const summaryBits = [`Field log (voice note): ${text.trim()}`];
    if (productNames.length) summaryBits.push(`Products discussed: ${productNames.join(", ")}.`);
    if (selEquipment.length) summaryBits.push(`Equipment identified: ${selEquipment.join(", ")}.`);
    if (ex.contactName) summaryBits.push(`Contact: ${ex.contactName}.`);
    if (ex.decisionMakerNote) summaryBits.push(`Decision: ${ex.decisionMakerNote}.`);
    if (ex.objections.length) summaryBits.push(`Objections: ${ex.objections.join("; ")}.`);
    logActivity({
      accountId: selAccountObj.id,
      userId: me.id,
      type: selType,
      summary: summaryBits.join(" "),
      outcome: selNext || undefined,
      at: Date.now(),
    });
    // merge newly identified equipment verbatim (user-reviewed)
    if (selEquipment.length) {
      const merged = [...new Set([...selAccountObj.equipment, ...selEquipment])];
      updateAccount(selAccountObj.id, { equipment: merged });
    }
    if (selDate) {
      addTask({
        accountId: selAccountObj.id,
        userId: me.id,
        title: selNext || `Follow up — ${selAccountObj.name}`,
        type: "follow-up",
        dueAt: new Date(selDate + "T17:00:00").getTime(),
      });
    }
    if (draftToConcierge && ex.suggestedBody) {
      setPendingDraft({
        accountId: selAccountObj.id,
        contactName: ex.contactName ?? selAccountObj.decisionMakers[0]?.name ?? "",
        subject: ex.suggestedSubject,
        body: ex.suggestedBody,
        materialIds: [],
      });
    }
    setSaved(true);
  }

  return (
    <Modal open={open} onClose={onClose} title={phase === "capture" ? "Voice Visit Logger" : "Review Extracted Details"} wide>
      <AnimatePresence mode="wait">
        {phase === "capture" && (
          <motion.div key="capture" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <p className="text-[0.84rem] leading-relaxed text-[var(--ink-2)]">
              Dictate or type your visit summary. The extraction engine will pull out the account, contacts, products, equipment, interest level, objections, next action and follow-up — you approve everything before it's saved.
            </p>

            <div className="mt-4 flex items-center gap-3">
              {micSupported ? (
                <button
                  onClick={listening ? stopListening : startListening}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-3 text-[0.85rem] font-bold transition-all",
                    listening ? "bg-[var(--danger)] text-white shadow-[0_8px_20px_-6px_rgba(192,57,43,0.6)]" : "bg-[var(--brand)] text-white shadow-[0_8px_20px_-6px_rgba(12,107,79,0.55)] hover:bg-[var(--brand-deep)]"
                  )}
                >
                  {listening ? <Square size={15} /> : <Mic size={16} />}
                  {listening ? "Stop dictating" : "Start dictation"}
                </button>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[0.8rem] font-semibold text-[var(--ink-2)]">
                  <MicOff size={15} /> Live dictation not available in this browser — type instead (Chrome/Edge support mic input)
                </span>
              )}
              {listening && (
                <span className="flex items-center gap-1.5 text-[0.75rem] font-bold text-[var(--danger)]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--danger)]" /> Listening…
                </span>
              )}
              <button onClick={() => setText(SAMPLE)} className="ml-auto text-[0.72rem] font-semibold text-[var(--ink-3)] underline decoration-dotted hover:text-[var(--brand)]">
                Use example note
              </button>
            </div>

            <textarea
              className="field mt-4 min-h-[130px] resize-y text-[0.9rem] leading-relaxed"
              placeholder='e.g. "Just met with Sally at ABC Aesthetics in Georgetown. She has an older RF microneedling device, is interested in Avira, and wants info on skin tightening. Her owner makes the final purchasing decision. Follow up next Tuesday and see if we can schedule a demo."'
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <div className="mt-4 flex items-center justify-between">
              <p className="text-[0.68rem] font-semibold text-[var(--ink-3)]">Runs fully on-device in this demo build — an LLM parser can replace the engine behind the same review step.</p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button onClick={runExtraction} disabled={!text.trim()}>
                  <Sparkles size={14} /> Extract details
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {phase === "review" && ex && (
          <motion.div key="review" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="max-h-[70vh] overflow-y-auto pr-1">
            {!saved ? (
              <>
                <div className="rounded-xl bg-[var(--gold-soft)] px-4 py-2.5 text-[0.76rem] font-bold text-[#7d6030]">
                  Review everything below — nothing is saved until you approve. Correct any mis-extraction directly.
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <Field label={`Account ${ex.accountGuess ? `(guessed: ${ex.accountGuess})` : ""}`}>
                    <select className="field" value={selAccount} onChange={(e) => setSelAccount(e.target.value)}>
                      <option value="">— Select account —</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name} — {a.city}, {a.state}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Visit type">
                    <select className="field" value={selType} onChange={(e) => setSelType(e.target.value as ActivityType)}>
                      <option value="visit">Field visit / walk-in</option>
                      <option value="meeting">Meeting</option>
                      <option value="demo">Equipment demo</option>
                      <option value="call">Phone call</option>
                      <option value="email">Email</option>
                    </select>
                  </Field>
                  <Field label="Contact mentioned">
                    <input className="field" value={ex.contactName ?? ""} onChange={(e) => setEx({ ...ex, contactName: e.target.value })} placeholder="—" />
                  </Field>
                  <Field label="Interest level">
                    <select className="field" value={selInterest} onChange={(e) => setSelInterest(e.target.value as Extraction["interest"])}>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="unknown">Unknown / unstated</option>
                    </select>
                  </Field>
                  <Field label="Decision-maker note">
                    <input className="field" value={ex.decisionMakerNote ?? ""} onChange={(e) => setEx({ ...ex, decisionMakerNote: e.target.value })} placeholder="—" />
                  </Field>
                  <Field label="Next action">
                    <select className="field" value={selNext} onChange={(e) => setSelNext(e.target.value)}>
                      <option value="">— none captured —</option>
                      <option>Schedule a demo</option>
                      <option>Send information / materials</option>
                      <option>Follow up</option>
                      <option>Call back</option>
                      <option>Send proposal</option>
                    </select>
                  </Field>
                  <Field label={`Follow-up date ${ex.followUpLabel ? `(parsed: ${ex.followUpLabel})` : ""}`}>
                    <input type="date" className="field" value={selDate} onChange={(e) => setSelDate(e.target.value)} />
                  </Field>
                  <Field label="Objections detected">
                    <div className="flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-2">
                      {ex.objections.length === 0 && <span className="text-[0.72rem] font-semibold text-[var(--ink-3)]">None detected</span>}
                      {ex.objections.map((o) => (
                        <span key={o} className="inline-flex items-center gap-1 rounded-lg bg-[#fdf0e8] px-2 py-1 text-[0.68rem] font-bold text-[#a04a20]">
                          <CircleAlert size={10} /> {o}
                        </span>
                      ))}
                    </div>
                  </Field>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <Field label="Products discussed">
                    <div className="flex flex-wrap gap-1.5">
                      {products.filter((p) => p.status === "active").map((p) => {
                        const on = selProducts.includes(p.id);
                        return (
                          <button key={p.id} type="button" onClick={() => setSelProducts((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id]))}
                            className={cn("rounded-lg px-2.5 py-1.5 text-[0.7rem] font-bold ring-1 ring-inset", on ? "bg-[var(--brand)] text-white ring-[var(--brand)]" : "bg-white text-[var(--ink-2)] ring-[var(--line)]")}>
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="Equipment identified (merges into account)">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {selEquipment.length === 0 && <span className="text-[0.72rem] font-semibold text-[var(--ink-3)]">None captured</span>}
                      {selEquipment.map((e2) => (
                        <button key={e2} type="button" onClick={() => setSelEquipment((s) => s.filter((x) => x !== e2))} className="rounded-lg bg-[var(--brand-soft)] px-2.5 py-1.5 text-[0.7rem] font-bold text-[var(--brand-deep)] hover:line-through" title="Remove">
                          {e2} ×
                        </button>
                      ))}
                      <input
                        className="field !w-44 !py-1.5 !text-[0.72rem]"
                        placeholder="+ add (enter)"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const v = (e.target as HTMLInputElement).value.trim();
                            if (v) setSelEquipment((s) => [...new Set([...s, v])]);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }}
                      />
                    </div>
                  </Field>
                </div>

                <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
                  <p className="flex items-center justify-between text-[0.72rem] font-extrabold uppercase tracking-wide text-[var(--ink-3)]">
                    Suggested follow-up email
                    <label className="flex items-center gap-1.5 text-[0.7rem] normal-case text-[var(--ink-2)]">
                      <input type="checkbox" checked={draftToConcierge} onChange={(e) => setDraftToConcierge(e.target.checked)} className="accent-[var(--brand)]" />
                      Open in Email Concierge after saving
                    </label>
                  </p>
                  <p className="mt-2 text-[0.8rem] font-bold">{ex.suggestedSubject}</p>
                  <pre className="mt-1.5 max-h-[130px] overflow-y-auto whitespace-pre-wrap font-[var(--font-sans)] text-[0.76rem] leading-relaxed text-[var(--ink-2)]">{ex.suggestedBody}</pre>
                </div>

                <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--surface)] py-3">
                  <Button variant="ghost" onClick={() => setPhase("capture")}><RotateCcw size={13} /> Edit note</Button>
                  <Button onClick={save} disabled={!selAccount}><Check size={15} /> Approve &amp; save</Button>
                </div>
              </>
            ) : (
              <div className="py-6 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                  <Check size={26} strokeWidth={2.5} />
                </span>
                <h3 className="font-display mt-4 text-xl font-semibold">Visit logged{selAccountObj ? ` — ${selAccountObj.name}` : ""}</h3>
                <div className="mt-2 space-y-1 text-[0.8rem] font-semibold text-[var(--ink-2)]">
                  <p>Activity timeline updated{selDate ? ` · follow-up scheduled for ${fmtDate(new Date(selDate + "T17:00:00").getTime())}` : ""}</p>
                  {selAccountObj && (
                    <p className="flex items-center justify-center gap-1.5 text-[var(--brand)]">
                      <Avatar name={selAccountObj.name} size={18} /> {selAccountObj.city}, {selAccountObj.state}
                    </p>
                  )}
                </div>
                <div className="mt-5 flex justify-center gap-2">
                  {draftToConcierge && (
                    <Button onClick={() => router.push("/email")}>
                      Draft follow-up email <ArrowRight size={14} />
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => router.push(selAccountObj ? `/accounts/${selAccountObj.id}` : "/activities")}>
                    Open account
                  </Button>
                  <Button variant="ghost" onClick={onClose}>Close</Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

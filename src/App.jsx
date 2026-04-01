import { useState, useEffect, useCallback, useRef } from "react";

// ═══ PERSISTENCE ═══
const STORAGE_KEY = "dsl-tracker-data";
const SCRATCH_KEY = "dsl-scratch-notes";
const DAY_SNAP_KEY = "dsl-day-snapshot";
function saveData(clients) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 3, ts: Date.now(), clients })); } catch {} }
function loadData() { try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const d = JSON.parse(raw); if (d?.clients) return d.clients; } } catch {} return null; }
function saveScratch(n) { try { localStorage.setItem(SCRATCH_KEY, JSON.stringify(n)); } catch {} }
function loadScratch() { try { const r = localStorage.getItem(SCRATCH_KEY); if (r) return JSON.parse(r); } catch {} return {}; }
function saveDaySnap(s) { try { localStorage.setItem(DAY_SNAP_KEY, JSON.stringify(s)); } catch {} }
function loadDaySnap() { try { const r = localStorage.getItem(DAY_SNAP_KEY); if (r) return JSON.parse(r); } catch {} return null; }

// ═══ CLIPBOARD ═══
function copyText(text) { if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).catch(() => fbCopy(text)); return fbCopy(text); }
function fbCopy(text) { const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;left:-9999px"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} document.body.removeChild(ta); return Promise.resolve(); }

// ═══ DATA ═══
let uid = 1;
const tk = (text, pri, tag, subs = []) => ({ id: uid++, text, priority: pri, tag, status: "Pending", outcome: "", subtasks: subs.map(t => ({ id: uid++, text: t, done: false })) });

const DEFAULT_CLIENTS = [
  { name: "Timothy Boyle", priority: "urgent", tags: ["Budget Alert","Action Item"], note: "Plan 10% overspending (51% elapsed, 61% spent). Prioritise essential tasks only.", tasks: [
    tk("Disability Pension & SIL/SDA options — review and progress planning","urgent","Action Item",["Review disability pension eligibility","Research SIL & SDA options and document findings","Follow up care team meeting outcomes from 13/03 with Paige Ngawati (Healthscope)","Progress BSP budget allocation with Pooja Saini (Mind Recovery)","Schedule next face-to-face session with Timothy"]),
    tk("Budget OVERSPENDING — review pace with Trinity Plan Management","urgent","Budget Alert",["51% plan elapsed, 61% funds spent — 10% variance","Do NOT create new billable tasks until resolved"]),
  ], aiNotes: [] },
  { name: "Bronya Worsley", priority: "urgent", tags: ["Action Item","Overdue"], note: "Multiple overdue items. SDA transition with Vera Living ongoing.", tasks: [
    tk("Call BrightSky — follow up on supports/referral","high","Action Item"),
    tk("Keep attempting to contact Talbo by phone","normal","Action Item",["Log each call attempt with time and outcome"]),
    tk("Follow up IRS physiotherapy — first appointment scheduling (URGENT, due 21/03)","urgent","Overdue",["Client has flagged this as urgent — escalate if no response"]),
    tk("Confirm Performance Health payment remittance — resting splint (due 21/03)","urgent","Overdue"),
    tk("Liaise with support worker Freshta — recliner assessment and urgent equipment needs (due 22/03)","high","Overdue"),
    tk("Confirm OT appointment 13/04 (Kingston Community Rehabilitation Centre)","medium","Monitoring"),
  ], aiNotes: [] },
  { name: "Angelo Pezzimenti", priority: "high", tags: ["Overdue","Due This Week"], note: "Decision to remain with DSL after health deterioration. Kerry returning home.", tasks: [
    tk("Follow up Harley and Cindy — formalise re-engagement arrangements (due 22/03)","high","Overdue",["Monitor health status following decision to remain with DSL"]),
    tk("Schedule next review meeting with client and Kerry (due 27/03)","medium","Due This Week",["Discuss alternative therapeutic support options if client reconsiders Natasha"]),
  ], aiNotes: [] },
  { name: "Brenda Tracey", priority: "high", tags: ["Overdue","Check-in Due"], note: "NDIA review #29915760 in progress. 4-wheel walker invoice pending.", tasks: [
    tk("Follow up Instacare — 4-wheel walker invoice payment (due 21/03)","urgent","Overdue",["Confirm payment processed","Update budget notes"]),
    tk("Confirm NDIA review #29915760 outcome and any funding adjustment (due 24/03)","high","Overdue"),
    tk("Schedule next support coordination review with client (due 27/03)","medium","Due This Week"),
    tk("Check-in due in 5 days","high","Check-in Due"),
  ], aiNotes: [] },
  { name: "Catriona Savage", priority: "medium", tags: ["Budget Alert","Monitoring"], note: "PRC at 52% utilised. Clean and Personal recently commenced.", tasks: [
    tk("Monitor home support commencement (Clean and Personal) and client satisfaction (due 22/03)","medium","Monitoring"),
    tk("Schedule next PRC monitoring review for April 2026 (due 25/03)","medium","Monitoring"),
    tk("Budget monitor — PRC at 52% utilised","medium","Budget Alert"),
  ], aiNotes: [] },
  { name: "Christopher McLaughlin", priority: "normal", tags: ["Monitoring"], note: "Case closed. Handover to Melinda Minerve complete.", tasks: [
    tk("Ensure all archived files securely stored; obtain Melinda Minerve formal closure acknowledgement","normal","Monitoring"),
  ], aiNotes: [] },
  { name: "Con Karoglidis", priority: "normal", tags: ["Action Item","Due This Week"], note: "Ambition Health Group physio SA executed. First session was due 22/03.", tasks: [
    tk("Call Con Karoglidis — PRC check-in & confirm first physio session completed","normal","Action Item",["Confirm first Ambition Health physio session occurred (was due 22/03)","Schedule next PRC check-in for April 2026 (due 30/03)"]),
    tk("PRC monitoring and goal progress review (due 27/03)","normal","Due This Week"),
  ], aiNotes: [] },
  { name: "Dean Edwards", priority: "high", tags: ["Overdue","Due This Week"], note: "SDA COC variation ref 31507360 lodged with NDIA.", tasks: [
    tk("Arrange first dietician appointment with Alissa Larrescy / HLA (due 23/03)","high","Overdue"),
    tk("Follow up NDIA on SDA variation ref 31507360 — contact Ellen (NPST) if no response by 27/03","high","Due This Week"),
    tk("Schedule quarterly review meeting with Anna Hooker (Connect2Care, speech pathology) — end March","medium","Due This Week"),
  ], aiNotes: [] },
  { name: "Deborah Dean", priority: "medium", tags: ["Overdue"], note: "Service closing. Final budget statement confirmed zero balance.", tasks: [
    tk("Confirm case closure completion with management (due 24/03)","medium","Overdue"),
    tk("File case closure in Astalty by 30/03","medium","Due This Week"),
  ], aiNotes: [] },
  { name: "Duncan Phillips", priority: "urgent", tags: ["Overdue","Check-in Due"], note: "Currently in hospital. Reinstatement plan with all providers needs coordinating.", tasks: [
    tk("Pre-discharge coordination meeting with hospital discharge planner (due 25/03)","urgent","Overdue",["Confirm reinstatement plan with all active providers upon discharge notification"]),
    tk("Check-in due in 5 days — currently in hospital","high","Check-in Due"),
    tk("Monitor recovery progress; confirm providers reinstated on discharge","high","Monitoring"),
  ], aiNotes: [] },
  { name: "Edmund Dichosa", priority: "high", tags: ["Overdue","Budget Alert","Due This Week"], note: "COC ref 31355744 requesting 1:1 support (currently 1:3). New OT: Ivy Man Hang Chan.", tasks: [
    tk("Confirm capacity building fund allocation with Ivy and OT provider (due 25/03)","high","Overdue"),
    tk("Schedule coordination meeting with Happy Health Home Care / Denis Riabov (due 24/03)","high","Overdue"),
    tk("Pursue NDIA response to COC ref 31355744 — 1:1 support (due 28/03)","high","Due This Week"),
    tk("Budget review — L2 SC at 75% utilised. 12 weeks to plan end","high","Budget Alert",["Confirm plan review preparation underway"]),
  ], aiNotes: [] },
  { name: "Eva Marie Kjellberg", priority: "high", tags: ["Overdue","Due This Week"], note: "New SW Nicki Abebe (9D Care) replacing Ayse.", tasks: [
    tk("Confirm new support worker Nicki Abebe commencement date with 9D Care (due 20/03)","high","Overdue"),
    tk("Transition meeting — Nicki Abebe, Salt Foundation, Kunan case worker (due 27/03)","high","Due This Week"),
    tk("Monitor support continuity in initial weeks of new worker appointment","medium","Monitoring"),
  ], aiNotes: [] },
  { name: "Ian Faulds", priority: "urgent", tags: ["Overdue","Budget Alert","Action Item"], note: "OT at 92% utilised. Extra funds allocated for Ivy OT — SA needs redrawing. Plan ends June 2026.", tasks: [
    tk("Push OT — follow up again (escalate if no response)","high","Action Item"),
    tk("Respond to Admin re: SP OT","normal","Action Item"),
    tk("Obtain remaining executed SA copies from all signatories (due 25/03)","urgent","Overdue",["Arrange final SA sign-off meeting before plan end June 2026"]),
    tk("Schedule next PRC coaching session (was due week of 23/03)","high","Overdue"),
    tk("Budget review URGENT — OT at 92%. Redraw SA for extra Ivy OT funds","urgent","Budget Alert",["Liaise with Admin (Shirley) to redraw SA","Complete budget review in Astalty","Check if additional funding needed"]),
  ], aiNotes: [] },
  { name: "Jeanette Jovanoski", priority: "high", tags: ["Overdue","Due This Week"], note: "Onboarding complete. Clean and Personal first visit done. Boomaroo plan manager.", tasks: [
    tk("File signed support plan and Emergency & Disaster Plan in Astalty (due 21/03)","high","Overdue"),
    tk("Schedule plan review meeting (week of 30/03) + establish contact schedule with Wendy Kohn","medium","Due This Week"),
  ], aiNotes: [] },
  { name: "Keith Linklater", priority: "high", tags: ["Overdue"], note: "DJCS CCO program formally closed. Post-CCO support framework now active.", tasks: [
    tk("File DJCS closure documentation in Astalty (due 21/03)","high","Overdue"),
    tk("Schedule next PRC coaching session (was due week of 23/03)","high","Overdue"),
    tk("Liaise with plan manager re adjusted funding allocation post-CCO (due 22/03)","high","Overdue"),
  ], aiNotes: [] },
  { name: "Kylie Brewer", priority: "medium", tags: ["Action Item","Budget Alert"], note: "PRC at 51% utilised.", tasks: [
    tk("Call Kylie Brewer — PRC check-in","medium","Action Item",["PRC budget at 51% — discuss if pace is appropriate"]),
    tk("Budget monitor — PRC at 51% utilised","medium","Budget Alert"),
  ], aiNotes: [] },
  { name: "Matthew Dixon", priority: "high", tags: ["Check-in Due","Budget Alert"], note: "Physio showing strong improvement. Angliss Hospital appointments.", tasks: [
    tk("Check-in due in 5 days — L2 SC at 52% budget","high","Check-in Due",["Confirm physio has resumed (was due week of 16/03)","Continue researching community participation options","Goals tab update in Astalty still in progress"]),
    tk("Budget monitor — L2 SC at 52% utilised","medium","Budget Alert"),
  ], aiNotes: [] },
  { name: "Mischa Siemenesma", priority: "medium", tags: ["Overdue"], note: "Mable sessions with Harley Willmott. Plan end Jan 2027, $5,526.71 remaining.", tasks: [
    tk("Confirm Instacare processed all approved Mable sessions for Harley Willmott","medium","Overdue"),
    tk("Respond to Harley Willmott's revised Mable agreement request — confirm with Mischa","medium","Overdue"),
    tk("Routine monitoring check-in","normal","Monitoring"),
  ], aiNotes: [] },
  { name: "Rohan Van Prooyen", priority: "urgent", tags: ["Budget Alert","Monitoring"], note: "Plan ends April 2026. BSP report overdue. AT budget $1,430 remaining.", tasks: [
    tk("Budget review URGENT — L2 SC at 77%. Plan ends April 2026","urgent","Budget Alert",["Complete budget review in Astalty urgently","Review and reallocate supports as needed","Confirm plan review preparation is in progress"]),
    tk("OT Ivy meet and greet at Cadenza — with Alisa & Shane Van Prooyen and Nikita Brockmuller (OnPsych)","high","Monitoring",["Confirm Ivy is available (was on leave ~15 days)","Visual schedule finalisation pending staff input from Prakash (Cadenza House Manager)","Nintendo Switch AT purchase — awaiting family confirmation ($1,430 remaining)","BSP end-of-plan progress report was due 20/03 — complete ASAP"]),
  ], aiNotes: [] },
  { name: "Sean Kenyon", priority: "high", tags: ["New Client"], note: "Plan started ~1 week ago. All SAs expiring 19/03 — confirm renewals.", tasks: [
    tk("New client onboarding — complete initial checklist","high","New Client",["Initial Assessment","Consent Form","Bank Form (if applicable)","Plan Manager Setup — liaise with Plan Assure","Physio with Denis Riabov (DSL) — confirmed","Relevant Service Referrals","Track funds in Astalty budget tool","Add NDIS goals in Astalty goals tool","Confirm all SAs renewed (expiry was 19/03)"]),
  ], aiNotes: [] },
  { name: "Stuart Nolte", priority: "high", tags: ["Check-in Due"], note: "PRC monitoring. Plan end Aug 2026, $9,171.48 remaining.", tasks: [
    tk("Check-in due in 5 days — PRC session also overdue (was due week of 16/03)","high","Check-in Due",["Send updated PRC progress summary for review and acknowledgement","Confirm updated PRC schedule Mar-May 2026"]),
  ], aiNotes: [] },
  { name: "Terry Biviano", priority: "high", tags: ["Overdue"], note: "Plan extended to 17 Feb 2027, SC funding $2,414.62. Duplicate payment credit resolved.", tasks: [
    tk("Arrange appointment with Invictus Health (Hannes) — use duplicate payment credit (due 25/03)","high","Overdue"),
    tk("Follow up with Elizabeth Biviano (sister/carer) re community support needs (due 24/03)","medium","Overdue"),
    tk("Monitor new NDIS plan implementation and provider transition","medium","Monitoring"),
  ], aiNotes: [] },
  { name: "KAch / Ivy — Admin", priority: "normal", tags: ["Action Item"], note: "Email from Ivy to respond to.", tasks: [
    tk("Respond to email from Ivy re: KAch service agreement","normal","Action Item"),
  ], aiNotes: [] },
];

uid = 500;

const COLS = [
  { id: "Pending", label: "Backlog", c: "#6b7189" },
  { id: "In Progress", label: "In Progress", c: "#5b8def" },
  { id: "Follow-Up Required", label: "Follow-Up", c: "#fb923c" },
  { id: "No Answer", label: "No Answer", c: "#fbbf24" },
  { id: "Done", label: "Done", c: "#34d399" },
];
const STATUSES = ["Pending","In Progress","Done","No Answer","Follow-Up Required"];
// Priority colours: red = urgent, blue = normal, green = non‑urgent (high/medium)
const PRI = {
  urgent: "#ef4444",   // red
  normal: "#60a5fa",   // blue
  high:   "#22c55e",   // green
  medium: "#22c55e",   // green
};
const TAG_C = {
  "Overdue":["rgba(248,113,113,0.1)","#fb7185"], "Budget Alert":["rgba(248,113,113,0.08)","#f87171"],
  "Check-in Due":["rgba(167,139,250,0.1)","#a78bfa"], "New Client":["rgba(52,211,153,0.1)","#34d399"],
  "Action Item":["rgba(251,146,60,0.1)","#fb923c"], "Monitoring":["rgba(45,212,191,0.1)","#2dd4bf"],
  "Due This Week":["rgba(251,191,36,0.1)","#fbbf24"],
};

// ═══ HELPERS ═══
function exportJSON(clients) {
  const data = { lastUpdated: new Date().toISOString(), coordinator: "Nico", organisation: "Disability Support Link", clients };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "tracker-data.json"; a.click(); URL.revokeObjectURL(url);
}
function importJSON(file, cb) {
  const r = new FileReader();
  r.onload = e => { try { const d = JSON.parse(e.target.result); if (d.clients) cb(d.clients); } catch { alert("Invalid JSON"); } };
  r.readAsText(file);
}
function genWeeklySummary(clients) {
  const now = new Date(), ws = new Date(now); ws.setDate(now.getDate() - now.getDay() + 1);
  const fmt = d => d.toLocaleDateString("en-AU",{day:"2-digit",month:"2-digit",year:"numeric"});
  const L = [`WEEKLY SUMMARY — ${fmt(ws)} to ${fmt(now)}`, "Support Coordinator: Nico | Disability Support Link", ""];
  const secs = [
    { t:"COMPLETED",i:"✓",f:t=>t.status==="Done" }, { t:"IN PROGRESS",i:"…",f:t=>t.status==="In Progress" },
    { t:"FOLLOW-UP / NO ANSWER",i:"⚑",f:t=>t.status==="Follow-Up Required"||t.status==="No Answer" },
    { t:"OVERDUE / URGENT",i:"⚠",f:t=>(t.tag==="Overdue"||t.priority==="urgent")&&t.status!=="Done" },
    { t:"PENDING",i:"○",f:t=>t.status==="Pending" },
  ];
  secs.forEach(s => { const m = []; clients.forEach(c => { const ts = c.tasks.filter(s.f); if (ts.length) m.push({n:c.name,ts}); }); if (m.length) { L.push(`═══ ${s.t} ═══`); m.forEach(x => { L.push(`  ${x.n}`); x.ts.forEach(t => { L.push(`    ${s.i} ${t.text}`); if(t.outcome) L.push(`      → ${t.outcome}`); }); }); L.push(""); } });
  const a = clients.flatMap(c=>c.tasks);
  L.push("───────────────────", `Total: ${a.length} tasks across ${clients.length} clients`, `Done: ${a.filter(t=>t.status==="Done").length} | In Progress: ${a.filter(t=>t.status==="In Progress").length} | Overdue: ${a.filter(t=>t.tag==="Overdue"&&t.status!=="Done").length} | Urgent: ${a.filter(t=>t.priority==="urgent"&&t.status!=="Done").length}`);
  return L.join("\n");
}
function genCaseNotes(clients) {
  const fmt = d => d.toLocaleDateString("en-AU",{day:"2-digit",month:"2-digit",year:"numeric"});
  const now = new Date(), L = [];
  clients.forEach(c => {
    const active = c.tasks.filter(t=>t.status==="Done"||t.status==="In Progress"||t.status==="Follow-Up Required");
    if (!active.length) return;
    const mins = active.length<=2?15:active.length<=4?30:active.length<=6?45:60;
    L.push("═".repeat(50), `DATE: ${fmt(now)}`, `CLIENT: ${c.name}`, "SERVICE TYPE: Support Coordination", "", "CONTACT/ACTION:");
    active.forEach(t => L.push(`  - [${t.status}] ${t.text}`));
    L.push("","OUTCOME:");
    const wo = active.filter(t=>t.outcome); if (wo.length) wo.forEach(t => L.push(`  - ${t.outcome}`)); else L.push("  - [To be recorded]");
    L.push("","FOLLOW-UP:");
    const fu = c.tasks.filter(t=>t.status!=="Done"); if (fu.length) fu.forEach(t => L.push(`  - ${t.text}`)); else L.push("  - Nil");
    L.push("",`TIME: ${mins} minutes`,`PREPARED BY: Nico — Disability Support Link`,"");
  });
  return L.join("\n");
}

// ═══ DAY SNAPSHOT ═══
function createDaySnapshot(clients) {
  const snap = { timestamp: new Date().toISOString(), tasks: {} };
  clients.forEach(c => c.tasks.forEach(t => { snap.tasks[t.id] = { status: t.status, text: t.text, client: c.name, outcome: t.outcome || "", subDone: t.subtasks.filter(s=>s.done).length, subTotal: t.subtasks.length }; }));
  return snap;
}
function computeDayDiff(snapshot, clients) {
  if (!snapshot) return [];
  const changes = [], now = {};
  clients.forEach(c => c.tasks.forEach(t => { now[t.id] = { status: t.status, text: t.text, client: c.name, outcome: t.outcome || "", subDone: t.subtasks.filter(s=>s.done).length }; }));
  Object.keys(snapshot.tasks).forEach(id => {
    const old = snapshot.tasks[id], cur = now[id];
    if (!cur) { changes.push({ type:"removed", client:old.client, text:old.text }); return; }
    if (old.status !== cur.status) changes.push({ type:"status", client:cur.client, text:cur.text, from:old.status, to:cur.status });
    if (cur.outcome && cur.outcome !== old.outcome) changes.push({ type:"outcome", client:cur.client, text:cur.text, outcome:cur.outcome });
    if (cur.subDone > old.subDone) changes.push({ type:"subtasks", client:cur.client, text:cur.text, completed:cur.subDone - old.subDone });
  });
  Object.keys(now).forEach(id => { if (!snapshot.tasks[id]) changes.push({ type:"added", client:now[id].client, text:now[id].text }); });
  return changes;
}
function formatDiffText(changes) {
  if (!changes.length) return "";
  const L = ["TASK EVOLUTION TODAY:", ""], byC = {};
  changes.forEach(c => { if (!byC[c.client]) byC[c.client] = []; byC[c.client].push(c); });
  Object.entries(byC).forEach(([client, cs]) => {
    L.push(`  ${client}:`);
    cs.forEach(c => {
      if (c.type==="status") L.push(`    → ${c.text}: ${c.from} → ${c.to}`);
      else if (c.type==="outcome") L.push(`    → Outcome recorded: ${c.text}`);
      else if (c.type==="subtasks") L.push(`    → ${c.completed} subtask(s) completed: ${c.text}`);
      else if (c.type==="added") L.push(`    + New task: ${c.text}`);
      else if (c.type==="removed") L.push(`    ✕ Removed: ${c.text}`);
    });
  });
  return L.join("\n");
}

// ═══ APP ═══
export default function App() {
  const [clients, setClientsRaw] = useState(() => loadData() || DEFAULT_CLIENTS);
  const [sel, setSel] = useState(() => (loadData() || DEFAULT_CLIENTS)[0]?.name);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [tab, setTab] = useState("kanban");
  const [collapsed, setCollapsed] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [toast, setToast] = useState(null);
  const [daySnap, setDaySnap] = useState(() => loadDaySnap());
  const [scratchNotes, setScratchNotesRaw] = useState(() => loadScratch());
  const [recentClients, setRecentClients] = useState([]);

  const setScratchNotes = useCallback((u) => { setScratchNotesRaw(p => { const n = typeof u === "function" ? u(p) : u; saveScratch(n); return n; }); }, []);
  const setClients = useCallback((u) => { setClientsRaw(p => { const n = typeof u === "function" ? u(p) : u; saveData(n); return n; }); }, []);

  const client = clients.find(c => c.name === sel);
  const upd = u => setClients(cs => cs.map(c => c.name === u.name ? u : c));
  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const startDay = () => { const s = createDaySnapshot(clients); setDaySnap(s); saveDaySnap(s); showToast("Day started — snapshot saved"); };
  const endDay = () => { setDaySnap(null); localStorage.removeItem(DAY_SNAP_KEY); showToast("Day ended — snapshot cleared"); };

  // Track recent clients (last 5)
  useEffect(() => {
    if (!sel) return;
    setRecentClients(prev => {
      const next = [sel, ...prev.filter(n => n !== sel)];
      return next.slice(0, 5);
    });
  }, [sel]);

  // Keyboard client switcher: Ctrl+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const q = window.prompt("Jump to client (type part of name):", "");
        if (!q) return;
        const match = clients.find(c => c.name.toLowerCase().includes(q.toLowerCase()));
        if (match) {
          setSel(match.name);
          setTab("kanban");
        } else {
          showToast("No client found for that search");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clients, showToast, setSel, setTab]);

  const filtered = [...clients]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .filter(c => {
      if (filter==="Urgent") return c.tasks.some(t=>t.priority==="urgent"&&t.status!=="Done");
      if (filter==="Overdue") return c.tasks.some(t=>t.tag==="Overdue"&&t.status!=="Done");
      if (filter==="Active") return c.tasks.some(t=>t.status!=="Done");
      return true;
    });
  const all = clients.flatMap(c=>c.tasks);
  const doneN = all.filter(t=>t.status==="Done").length, urgN = all.filter(t=>t.priority==="urgent"&&t.status!=="Done").length;

  const handleImport = useCallback(e => { const f = e.target.files?.[0]; if (f) importJSON(f, d => { setClients(d); showToast("Imported!"); }); e.target.value = ""; }, [setClients]);
  const resetData = () => { if (window.confirm("Reset all data to defaults?")) { setClients(DEFAULT_CLIENTS); setSel(DEFAULT_CLIENTS[0].name); showToast("Data reset"); } };

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:"#0b0f19", fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif", color:"#f9fafb" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *{margin:0;padding:0;box-sizing:border-box} ::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#2a2d3e;border-radius:10px}
        button{font-family:inherit;cursor:pointer} select,input,textarea{font-family:inherit} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      {toast && <div style={{ position:"fixed", top:20, right:20, zIndex:99, padding:"14px 24px", borderRadius:12, fontSize:15, fontWeight:600, background:"rgba(15,23,42,0.95)", color:"#22c55e", border:"1px solid rgba(34,197,94,0.6)", boxShadow:"0 10px 30px rgba(15,23,42,0.6)" }}>{toast}</div>}

      {/* SIDEBAR */}
      <div style={{ display:"flex", flexDirection:"column", width:collapsed?80:340, background:"#050816", borderRight:"1px solid #111827", flexShrink:0, transition:"width 0.25s ease" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, padding:"20px", borderBottom:"1px solid #111827" }}>
          {!collapsed && <><div style={{ width:44, height:44, borderRadius:12, background:"#111827", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, color:"#3b82f6", border:"1px solid #1f2937" }}>◈</div>
            <div style={{ flex:1 }}><div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.02em" }}>DSL Tracker</div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}><span style={{ fontSize:14, color:"#6b7189" }}>Support Coordination</span>
                <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:99, background:"rgba(34,197,94,0.16)", color:"#22c55e" }}><span style={{ width:7, height:7, borderRadius:4, background:"#22c55e", display:"inline-block" }}/>Saved</span></div></div></>}
          <button onClick={() => setCollapsed(!collapsed)} style={{ background:"none", border:"none", color:"#6b7189", padding:8, fontSize:18 }}>{collapsed?"▸":"◂"}</button>
        </div>

        {!collapsed && <>
          {/* DAY TRACKER */}
          <div style={{ padding:"12px 20px", borderBottom:"1px solid #111827" }}>
            {!daySnap ? (
              <button onClick={startDay} style={{ width:"100%", padding:"12px 0", borderRadius:12, fontSize:15, fontWeight:700, background:"#22c55e", color:"#020617", border:"none", boxShadow:"0 6px 20px rgba(34,197,94,0.35)" }}>▶ Start Day</button>
            ) : (
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ width:8, height:8, borderRadius:4, background:"#22c55e", animation:"pulse 2s infinite" }}/><span style={{ fontSize:13, fontWeight:600, color:"#22c55e" }}>Day Active</span></div>
                  <span style={{ fontSize:12, color:"#4a4f65" }}>{new Date(daySnap.timestamp).toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"})}</span>
                </div>
                <button onClick={endDay} style={{ width:"100%", padding:"10px 0", borderRadius:10, fontSize:14, fontWeight:600, background:"rgba(248,113,113,0.12)", color:"#fca5a5", border:"1px solid rgba(248,113,113,0.35)" }}>■ End Day</button>
              </div>
            )}
          </div>

          <div style={{ padding:"12px 20px", borderBottom:"1px solid #111827", display:"flex", gap:10, flexWrap:"wrap" }}>
            <span style={{ fontSize:15, fontWeight:700, padding:"6px 14px", borderRadius:10, background:"rgba(34,197,94,0.18)", color:"#22c55e" }}>✓ {doneN}/{all.length}</span>
            {urgN>0 && <span style={{ fontSize:15, fontWeight:700, padding:"6px 14px", borderRadius:10, background:"rgba(248,113,113,0.20)", color:"#ef4444" }}>⚠ {urgN}</span>}
          </div>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #111827" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients..." style={{ width:"100%", fontSize:16, padding:"14px 18px", borderRadius:12, background:"#020617", border:"1px solid #1e293b", color:"#f9fafb", outline:"none" }}/>
            <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
              {["All","Urgent","Overdue","Active"].map(f => (<button key={f} onClick={() => setFilter(f)} style={{ fontSize:14, fontWeight:600, padding:"8px 16px", borderRadius:10, background:filter===f?"rgba(91,141,239,0.15)":"transparent", color:filter===f?"#5b8def":"#6b7189", border:filter===f?"1px solid rgba(91,141,239,0.3)":"1px solid transparent" }}>{f}</button>))}
            </div>
            {recentClients.length > 0 && (
              <div style={{ marginTop:10, display:"flex", flexWrap:"wrap", gap:6 }}>
                {recentClients.map(name => (
                  <button
                    key={name}
                    onClick={() => { setSel(name); setTab("kanban"); }}
                    style={{ fontSize:12, padding:"4px 10px", borderRadius:999, border:"none", background:"rgba(30,64,175,0.4)", color:"#bfdbfe", fontWeight:500 }}
                  >
                    {name.split(" ").slice(0,2).join(" ")}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"4px 12px" }}>
            {filtered.map(c => {
              const isSel = c.name===sel, hasUrg = c.tasks.some(t=>t.priority==="urgent"&&t.status!=="Done");
              const dn = c.tasks.filter(t=>t.status==="Done").length, tot = c.tasks.length, pct = tot>0?Math.round((dn/tot)*100):0;
              const overdueN = c.tasks.filter(t=>t.tag==="Overdue" && t.status!=="Done").length;
              const followN = c.tasks.filter(t=>t.status==="Follow-Up Required").length;
              return (
                <div key={c.name} onClick={() => setSel(c.name)} style={{ padding:"14px 16px", borderRadius:14, marginBottom:4, cursor:"pointer", background:isSel?"rgba(15,23,42,0.95)":"transparent", borderLeft:isSel?"3px solid #3b82f6":"3px solid transparent", transition:"all 0.15s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:44, height:44, borderRadius:22, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, flexShrink:0, background:hasUrg?"rgba(248,113,113,0.22)":"rgba(37,99,235,0.18)", color:hasUrg?"#ef4444":"#60a5fa" }}>{c.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:16, fontWeight:600, color:isSel?"#f9fafb":"#e5e7eb", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</span>
                        {hasUrg && <span style={{ fontSize:14, color:"#ef4444" }}>⚠</span>}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:8 }}>
                        <div style={{ flex:1, height:6, borderRadius:3, background:"#020617", overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:3, width:`${pct}%`, background:pct===100?"#22c55e":"#3b82f6", transition:"width 0.3s" }}/>
                        </div>
                        <span style={{ fontSize:14, color:"#6b7280" }}>{dn}/{tot}</span>
                      </div>
                      <div style={{ display:"flex", gap:10, marginTop:6, fontSize:12 }}>
                        {overdueN>0 && <span style={{ color:"#ef4444" }}>⚠ {overdueN} overdue</span>}
                        {dn>0 && <span style={{ color:"#22c55e" }}>✓ {dn} done</span>}
                        {followN>0 && <span style={{ color:"#3b82f6" }}>⏱ {followN} follow‑up</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding:"12px 20px", borderTop:"1px solid #111827", display:"flex", flexDirection:"column", gap:8 }}>
            <button onClick={() => setShowAdd(true)} style={{ width:"100%", padding:"14px 0", borderRadius:12, fontSize:16, fontWeight:600, background:"#1d4ed8", color:"#e5edff", border:"none", boxShadow:"0 8px 24px rgba(37,99,235,0.45)" }}>+ Add Client</button>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => { exportJSON(clients); showToast("Exported"); }} style={{ flex:1, padding:"10px 0", borderRadius:10, fontSize:13, fontWeight:600, background:"rgba(34,197,94,0.14)", color:"#22c55e", border:"none" }}>↓ Export</button>
              <label style={{ flex:1, padding:"10px 0", borderRadius:10, fontSize:13, fontWeight:600, background:"rgba(59,130,246,0.14)", color:"#60a5fa", textAlign:"center", cursor:"pointer" }}>↑ Import<input type="file" accept=".json" onChange={handleImport} style={{ display:"none" }}/></label>
              <button onClick={resetData} style={{ flex:1, padding:"10px 0", borderRadius:10, fontSize:13, fontWeight:600, background:"rgba(248,113,113,0.12)", color:"#fca5a5", border:"none" }}>↺ Reset</button>
            </div>
          </div>
        </>}
        {collapsed && <div style={{ flex:1, overflowY:"auto", padding:"12px 0" }}>{filtered.map(c => <div key={c.name} onClick={() => setSel(c.name)} title={c.name} style={{ display:"flex", justifyContent:"center", padding:"8px 0", cursor:"pointer" }}><div style={{ width:48, height:48, borderRadius:24, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, background:c.name===sel?"rgba(37,99,235,0.32)":"rgba(15,23,42,0.9)", color:c.name===sel?"#bfdbfe":"#6b7280", border:c.name===sel?"3px solid #3b82f6":"1px solid #1f2937" }}>{c.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div></div>)}</div>}
      </div>

      {/* MAIN */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {client ? <>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 32px", background:"#020617", borderBottom:"1px solid #111827", flexWrap:"wrap", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ width:52, height:52, borderRadius:26, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, background:client.priority==="urgent"?"rgba(251,146,60,0.18)":"rgba(37,99,235,0.22)", color:client.priority==="urgent"?"#fb923c":"#60a5fa" }}>{client.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</div>
              <div><div style={{ fontSize:22, fontWeight:700 }}>{client.name}</div><div style={{ fontSize:15, color:"#6b7280", marginTop:4, maxWidth:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{client.note}</div></div>
            </div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
              {client.tags.map(t => { const [bg,clr]=TAG_C[t]||["rgba(31,41,55,0.9)","#9ca3af"]; return <span key={t} style={{ fontSize:13, fontWeight:600, padding:"5px 14px", borderRadius:999, background:bg, color:clr }}>{t}</span>; })}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, padding:"14px 32px", borderBottom:"1px solid #111827", background:"#020617", flexWrap:"wrap" }}>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[{id:"today",l:"☀ My Day"},{id:"kanban",l:"◫ Board"},{id:"notes",l:"✎ Notes"},{id:"weekly",l:"📋 Weekly Summary"},{id:"summary",l:"⊞ Client Summary"}].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ fontSize:15, fontWeight:600, padding:"9px 18px", borderRadius:999, background:tab===t.id?"rgba(37,99,235,0.24)":"transparent", color:tab===t.id?"#bfdbfe":"#6b7280", border:"none", transition:"all 0.15s" }}>{t.l}</button>
              ))}
            </div>
            {tab==="kanban" && (
              <button
                onClick={() => setAddingTask(true)}
                style={{ fontSize:14, fontWeight:600, padding:"9px 18px", borderRadius:999, background:"#2563eb", color:"#e5edff", border:"none", boxShadow:"0 4px 16px rgba(37,99,235,0.55)" }}
              >
                + New Task
              </button>
            )}
          </div>
          <div style={{ flex:1, overflow:"hidden", background:"#0b0f19" }}>
            {tab==="today" && <TodayPanel clients={clients} onJumpClient={name => { setSel(name); setTab("kanban"); }}/>}
            {tab==="kanban" && <Kanban client={client} onUpdate={upd} adding={addingTask} setAdding={setAddingTask}/>}
            {tab==="notes" && <NotesPanel client={client} onUpdate={upd} scratchNotes={scratchNotes} setScratchNotes={setScratchNotes} daySnap={daySnap} allClients={clients}/>}
            {tab==="weekly" && <WeeklyPanel clients={clients}/>}
            {tab==="summary" && <SummaryPanel client={client}/>}
          </div>
        </> : <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#4b5563", fontSize:20 }}>Select a client</div>}
      </div>

      {showAdd && <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 }}>
        <div style={{ background:"#020617", border:"1px solid #1e293b", borderRadius:20, padding:36, width:"100%", maxWidth:480 }}>
          <div style={{ fontSize:22, fontWeight:700, marginBottom:24 }}>Add Client</div>
          <AddForm onAdd={nc => { setClients(cs => [...cs, nc]); setSel(nc.name); setShowAdd(false); }} onClose={() => setShowAdd(false)}/>
        </div>
      </div>}
    </div>
  );
}

// ═══ KANBAN ═══
function Kanban({ client, onUpdate, adding, setAdding }) {
  const [dragged, setDragged] = useState(null), [overCol, setOverCol] = useState(null), [expanded, setExpanded] = useState(null), [newTxt, setNewTxt] = useState("");
  const drop = colId => { if(dragged) onUpdate({...client, tasks:client.tasks.map(t=>t.id===dragged.id?{...t,status:colId}:t)}); setDragged(null); setOverCol(null); };
  const updT = u => onUpdate({...client, tasks:client.tasks.map(t=>t.id===u.id?u:t)});
  const delT = id => onUpdate({...client, tasks:client.tasks.filter(t=>t.id!==id)});
  const addT = () => { if(!newTxt.trim()) return; onUpdate({...client, tasks:[...client.tasks,{id:uid++,text:newTxt.trim(),priority:"normal",tag:"Action Item",status:"Pending",outcome:"",subtasks:[]}]}); setNewTxt(""); setAdding(false); };
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 20px" }}>
        <span style={{ fontSize:16, fontWeight:600, color:"#6b7189" }}>{client.tasks.length} tasks · {client.tasks.filter(t=>t.status==="Done").length} done</span>
        <span style={{ fontSize:14, color:"#4a4f65" }}>Drag tasks between columns</span>
      </div>
      {adding && <div style={{ padding:"0 32px 14px", display:"flex", gap:12 }}>
        <input autoFocus value={newTxt} onChange={e=>setNewTxt(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addT();if(e.key==="Escape")setAdding(false)}} placeholder="Describe the task..." style={{ flex:1, fontSize:16, padding:"12px 18px", borderRadius:12, background:"#1a1d2e", border:"1px solid #252839", color:"#e8eaf0", outline:"none" }}/>
        <button onClick={addT} style={{ padding:"12px 24px", borderRadius:12, fontSize:16, fontWeight:600, background:"#5b8def", color:"white", border:"none" }}>Add</button>
        <button onClick={()=>setAdding(false)} style={{ padding:"12px 24px", borderRadius:12, fontSize:16, background:"#1a1d2e", color:"#6b7189", border:"none" }}>Cancel</button>
      </div>}
      <div style={{ flex:1, overflowX:"auto", overflowY:"hidden", padding:"0 16px 16px" }}>
        <div style={{ display:"flex", gap:12, height:"100%", minWidth:"max-content" }}>
          {COLS.map(col => {
            const tasks = client.tasks.filter(t=>t.status===col.id), isOver = overCol===col.id;
            return (
              <div key={col.id} style={{ width:340, display:"flex", flexDirection:"column", borderRadius:16, background:isOver?"rgba(37,99,235,0.16)":"#020617", border:`1px solid ${isOver?"rgba(37,99,235,0.6)":"#111827"}`, transition:"all 0.2s" }}
                onDragOver={e=>{e.preventDefault();setOverCol(col.id)}} onDragLeave={()=>setOverCol(null)} onDrop={()=>drop(col.id)}>
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px", borderBottom:"1px solid #1e2030" }}>
                  <div style={{ width:12, height:12, borderRadius:6, background:col.c }}/><span style={{ fontSize:17, fontWeight:700 }}>{col.label}</span>
                  <span style={{ fontSize:14, fontWeight:600, padding:"4px 12px", borderRadius:99, background:"rgba(107,113,137,0.15)", color:"#6b7189", marginLeft:"auto" }}>{tasks.length}</span>
                </div>
                <div style={{ flex:1, overflowY:"auto", padding:12 }}>
                  {tasks.map(task => <Card key={task.id} task={task} onDrag={()=>setDragged(task)} onUpd={updT} onDel={delT} isExp={expanded===task.id} onTog={()=>setExpanded(expanded===task.id?null:task.id)}/>)}
                  {tasks.length===0 && <div style={{ padding:"48px 0", textAlign:"center", fontSize:15, color:"#353849" }}>Drop tasks here</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Card({ task, onDrag, onUpd, onDel, isExp, onTog }) {
  const pc = PRI[task.priority]||PRI.normal, [tBg,tClr] = TAG_C[task.tag]||["rgba(107,113,137,0.1)","#6b7189"];
  const pS = task.subtasks.filter(s=>!s.done).length;
  const [addingSub, setAddingSub] = useState(false), [newSub, setNewSub] = useState("");
  const addSubtask = () => { if (!newSub.trim()) return; onUpd({ ...task, subtasks: [...task.subtasks, { id: uid++, text: newSub.trim(), done: false }] }); setNewSub(""); setAddingSub(false); };
  const delSub = (sid) => onUpd({ ...task, subtasks: task.subtasks.filter(s => s.id !== sid) });
  return (
    <div draggable onDragStart={onDrag} style={{ borderRadius:14, padding:18, marginBottom:12, cursor:"grab", background:"#1c1f2e", border:`1px solid ${isExp?"rgba(91,141,239,0.3)":"#252839"}` }}>
      <div onClick={onTog} style={{ display:"flex", gap:12, cursor:"pointer" }}>
        <div style={{ width:10, height:10, borderRadius:5, marginTop:8, flexShrink:0, background:pc }}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:16, lineHeight:1.5, fontWeight:500, color:task.status==="Done"?"#4a4f65":"#e8eaf0", textDecoration:task.status==="Done"?"line-through":"none" }}>{task.text}</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:10 }}>
            <span style={{ fontSize:13, fontWeight:600, padding:"4px 12px", borderRadius:99, background:tBg, color:tClr }}>{task.tag}</span>
            {task.priority!=="normal" && <span style={{ fontSize:13, fontWeight:600, padding:"4px 12px", borderRadius:99, background:`${pc}20`, color:pc, textTransform:"capitalize" }}>{task.priority}</span>}
            {pS>0 && <span style={{ fontSize:13, color:"#fb923c", marginLeft:"auto" }}>{pS} pending</span>}
            {task.subtasks.length>0 && pS===0 && <span style={{ fontSize:13, color:"#34d399", marginLeft:"auto" }}>✓ all done</span>}
          </div>
        </div>
        <span onClick={e=>{e.stopPropagation();onDel(task.id)}} style={{ color:"#4a4f65", cursor:"pointer", fontSize:18, padding:4 }}>✕</span>
      </div>
      {isExp && <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid #252839" }}>
        <div style={{ display:"flex", gap:12, marginBottom:14 }}>
          <div style={{ flex:1 }}><div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"#4a4f65", marginBottom:8 }}>Status</div>
            <select value={task.status} onChange={e=>onUpd({...task,status:e.target.value})} style={{ width:"100%", fontSize:15, padding:"10px 14px", borderRadius:10, background:"#161822", border:"1px solid #252839", color:"#e8eaf0", outline:"none" }}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
          <div style={{ flex:1 }}><div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"#4a4f65", marginBottom:8 }}>Priority</div>
            <select value={task.priority} onChange={e=>onUpd({...task,priority:e.target.value})} style={{ width:"100%", fontSize:15, padding:"10px 14px", borderRadius:10, background:"#161822", border:"1px solid #252839", color:"#e8eaf0", outline:"none" }}>{["urgent","high","medium","normal"].map(p=><option key={p} value={p}>{p[0].toUpperCase()+p.slice(1)}</option>)}</select></div>
        </div>
        <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"#4a4f65", marginBottom:8 }}>Outcome</div>
        <textarea value={task.outcome} onChange={e=>onUpd({...task,outcome:e.target.value})} placeholder="Record outcome..." rows={3} style={{ width:"100%", fontSize:15, padding:"10px 14px", borderRadius:10, background:"#161822", border:"1px solid #252839", color:"#e8eaf0", outline:"none", resize:"none", lineHeight:1.5 }}/>
        <div style={{ marginTop:14 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"#4a4f65" }}>Sub-tasks {task.subtasks.length > 0 && `(${task.subtasks.filter(s=>s.done).length}/${task.subtasks.length})`}</div>
            {!addingSub && <button onClick={()=>setAddingSub(true)} style={{ fontSize:13, fontWeight:600, padding:"4px 14px", borderRadius:8, background:"rgba(91,141,239,0.1)", color:"#5b8def", border:"none" }}>+ Add</button>}
          </div>
          {task.subtasks.map(sub => (
            <div key={sub.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:10, marginBottom:6, background:sub.done?"rgba(52,211,153,0.06)":"rgba(251,146,60,0.06)" }}>
              <input type="checkbox" checked={sub.done} onChange={()=>onUpd({...task,subtasks:task.subtasks.map(x=>x.id===sub.id?{...x,done:!x.done}:x)})} style={{ width:20, height:20, accentColor:"#34d399", flexShrink:0 }}/>
              <span style={{ flex:1, fontSize:15, color:sub.done?"#4a4f65":"#9ca3b8", textDecoration:sub.done?"line-through":"none" }}>{sub.text}</span>
              <span onClick={()=>delSub(sub.id)} style={{ color:"#353849", cursor:"pointer", fontSize:16, padding:"0 4px" }}>✕</span>
            </div>
          ))}
          {addingSub && <div style={{ display:"flex", gap:8, marginTop:6 }}>
            <input autoFocus value={newSub} onChange={e=>setNewSub(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addSubtask();if(e.key==="Escape"){setAddingSub(false);setNewSub("");}}} placeholder="Subtask description..." style={{ flex:1, fontSize:14, padding:"10px 14px", borderRadius:10, background:"#161822", border:"1px solid #252839", color:"#e8eaf0", outline:"none" }}/>
            <button onClick={addSubtask} style={{ fontSize:14, fontWeight:600, padding:"10px 16px", borderRadius:10, background:"#5b8def", color:"white", border:"none" }}>Add</button>
            <button onClick={()=>{setAddingSub(false);setNewSub("");}} style={{ fontSize:14, padding:"10px 12px", borderRadius:10, background:"#1a1d2e", color:"#6b7189", border:"none" }}>✕</button>
          </div>}
          {task.subtasks.length===0 && !addingSub && <div style={{ padding:"12px 14px", borderRadius:10, background:"rgba(107,113,137,0.04)", color:"#353849", fontSize:14, textAlign:"center" }}>No sub-tasks yet</div>}
        </div>
      </div>}
    </div>
  );
}

// ═══ NOTES (SCRATCHPAD + AI) ═══
function NotesPanel({ client, onUpdate, scratchNotes, setScratchNotes, daySnap, allClients }) {
  const [loading, setLoading] = useState(false), [copiedId, setCopiedId] = useState(null), [subTab, setSubTab] = useState("scratch");
  const scratch = scratchNotes[client.name] || "";
  const updateScratch = (val) => setScratchNotes(prev => ({ ...prev, [client.name]: val }));

  const dayDiff = daySnap ? computeDayDiff(daySnap, allClients) : [];
  const clientDiff = dayDiff.filter(c => c.client === client.name);
  const diffText = formatDiffText(clientDiff);

  const localFormat = (raw) => {
    const fmt = new Date().toLocaleDateString("en-AU",{day:"2-digit",month:"2-digit",year:"numeric"});
    const lines = raw.split(/\n/).filter(l=>l.trim());
    const actions = [], followups = [];
    lines.forEach(l => {
      const lo = l.toLowerCase();
      if (lo.includes("follow up")||lo.includes("follow-up")||lo.includes("next step")||lo.includes("to do")) followups.push(l.trim());
      else actions.push(l.trim());
    });
    const est = lines.length <= 3 ? 15 : lines.length <= 6 ? 30 : 45;
    const parts = [
      `DATE: ${fmt}`,
      `CLIENT: ${client.name}`,
      `SERVICE TYPE: Support Coordination`,
      "",
      "ACTION COMPLETED:",
      ...(actions.length ? actions.map(a=>`- ${a}`) : [`- ${raw.trim()}`]),
      "",
      "FOLLOW UP:",
      ...(followups.length ? followups.map(f=>`- ${f}`) : ["- Nil"]),
      "",
      "TIME ESTIMATION:",
      `- Approximately ${est} minutes (estimated based on activity described)`
    ];
    if (diffText) parts.push("", diffText);
    parts.push("", `PREPARED BY: Nico — Disability Support Link`);
    return parts.join("\n");
  };

  const formatWithAI = async () => {
    if (!scratch.trim()) return; setLoading(true); let formatted;
    const diffCtx = diffText ? `\n\nTASK EVOLUTION TODAY:\n${diffText}` : "";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", { method:"POST", headers:{"Content-Type":"application/json","x-api-key":import.meta.env.VITE_ANTHROPIC_KEY||"","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:1500,messages:[{role:"user",content:`You are an NDIS Support Coordinator case note formatter. Format these raw notes into a professional NDIS case note.\n\nDATE: ${new Date().toLocaleDateString("en-AU",{day:"2-digit",month:"2-digit",year:"numeric"})}\nCLIENT: ${client.name}\nSERVICE TYPE: Support Coordination\nCLIENT CONTEXT: ${client.note || "N/A"}\n\nUse EXACTLY these section headings and bullet structure:\n\nACTION COMPLETED:\n- bullet points describing what has been done today.\n\nFOLLOW UP:\n- bullet points listing clear follow up actions / next steps.\n\nTIME ESTIMATION:\n- a single bullet like \"- Approximately 30 minutes\" based on your best estimate of time spent from the notes.\n\nIf task evolution data is provided, weave it naturally into ACTION COMPLETED and FOLLOW UP.\nKeep the tone professional, concise, and NDIS audit-ready.\n\nRaw notes:\n${scratch.trim()}${diffCtx}\n\nReturn ONLY the formatted note using these sections.`}]})});
      if (!res.ok) throw new Error("API error");
      const data = await res.json(); formatted = data.content?.map(i=>i.text||"").join("\n") || localFormat(scratch.trim());
    } catch { formatted = localFormat(scratch.trim()); }
    setLoading(false);
    onUpdate({...client, aiNotes:[...(client.aiNotes||[]),{id:uid++, raw:scratch.trim(), formatted, timestamp:new Date().toISOString(), hasDiff:clientDiff.length>0}]});
    updateScratch(""); setSubTab("formatted");
  };

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 32px", borderBottom:"1px solid #1e2030", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={()=>setSubTab("scratch")} style={{ fontSize:15, fontWeight:600, padding:"8px 20px", borderRadius:10, background:subTab==="scratch"?"rgba(251,146,60,0.12)":"transparent", color:subTab==="scratch"?"#fb923c":"#6b7189", border:"none" }}>✎ Scratchpad</button>
          <button onClick={()=>setSubTab("formatted")} style={{ fontSize:15, fontWeight:600, padding:"8px 20px", borderRadius:10, background:subTab==="formatted"?"rgba(167,139,250,0.12)":"transparent", color:subTab==="formatted"?"#a78bfa":"#6b7189", border:"none" }}>✦ Formatted ({(client.aiNotes||[]).length})</button>
        </div>
        {subTab==="scratch" && scratch.trim() && <button onClick={formatWithAI} disabled={loading} style={{ fontSize:15, fontWeight:700, padding:"10px 24px", borderRadius:12, background:"linear-gradient(135deg,#a78bfa,#5b8def)", color:"white", border:"none", opacity:loading?0.5:1, boxShadow:"0 2px 12px rgba(167,139,250,0.3)" }}>{loading?"Formatting...":"✦ AI Format & Save"}</button>}
      </div>
      <div style={{ flex:1, overflowY:"auto" }}>
        {subTab==="scratch" && <div style={{ padding:"24px 32px", height:"100%", display:"flex", flexDirection:"column" }}>
          {daySnap && clientDiff.length > 0 && <div style={{ marginBottom:16, padding:"14px 18px", borderRadius:12, background:"rgba(52,211,153,0.06)", border:"1px solid rgba(52,211,153,0.15)" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#34d399", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>Task changes today — included in AI format</div>
            <div style={{ fontSize:14, color:"#9ca3b8", lineHeight:1.6 }}>{clientDiff.map((c,i) => <div key={i} style={{ marginBottom:4 }}>
              {c.type==="status" && <span>→ <span style={{color:"#e8eaf0"}}>{c.text.substring(0,60)}</span>: {c.from} → <span style={{color:"#34d399"}}>{c.to}</span></span>}
              {c.type==="outcome" && <span>→ Outcome recorded for <span style={{color:"#e8eaf0"}}>{c.text.substring(0,40)}</span></span>}
              {c.type==="subtasks" && <span>→ {c.completed} subtask(s) done on <span style={{color:"#e8eaf0"}}>{c.text.substring(0,40)}</span></span>}
              {c.type==="added" && <span>+ New task: <span style={{color:"#e8eaf0"}}>{c.text.substring(0,60)}</span></span>}
              {c.type==="removed" && <span>✕ Removed: <span style={{color:"#e8eaf0"}}>{c.text.substring(0,60)}</span></span>}
            </div>)}</div>
          </div>}
          {daySnap && clientDiff.length===0 && <div style={{ marginBottom:16, padding:"12px 18px", borderRadius:12, background:"rgba(107,113,137,0.06)", border:"1px solid rgba(107,113,137,0.1)" }}><span style={{ fontSize:13, color:"#6b7189" }}>Day active — no task changes for {client.name.split(" ")[0]} yet</span></div>}
          <textarea value={scratch} onChange={e=>updateScratch(e.target.value)} placeholder={`Dump your notes for ${client.name.split(" ")[0]} here...\n\nAnything goes — rough notes, call logs, thoughts.\nWhen ready, hit "AI Format & Save".`} style={{ flex:1, width:"100%", fontSize:16, padding:"20px 22px", borderRadius:16, background:"#161822", border:"1px solid #1e2030", color:"#e8eaf0", outline:"none", resize:"none", lineHeight:1.7, fontFamily:"inherit", minHeight:200 }}/>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12 }}>
            <span style={{ fontSize:13, color:"#353849" }}>{scratch.trim() ? `${scratch.trim().split(/\n/).filter(l=>l.trim()).length} lines · auto-saved` : "Start typing — notes save automatically"}</span>
            {scratch.trim() && <button onClick={()=>updateScratch("")} style={{ fontSize:13, fontWeight:600, padding:"6px 16px", borderRadius:8, background:"rgba(248,113,113,0.08)", color:"#f87171", border:"none" }}>Clear</button>}
          </div>
        </div>}
        {subTab==="formatted" && <div style={{ padding:"24px 32px" }}>
          {(!client.aiNotes?.length) ? <div style={{ textAlign:"center", padding:"64px 0", color:"#4a4f65" }}><div style={{ fontSize:48, marginBottom:16, opacity:0.3 }}>✦</div><div style={{ fontSize:18, fontWeight:500 }}>No formatted notes yet</div><div style={{ fontSize:15, color:"#353849", marginTop:8 }}>Write notes in Scratchpad, then hit AI Format</div></div>
          : [...(client.aiNotes||[])].reverse().map(n => (
            <div key={n.id} style={{ borderRadius:16, padding:24, marginBottom:16, background:"#161822", border:"1px solid #1e2030" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:14, fontWeight:600, color:"#6b7189" }}>{new Date(n.timestamp).toLocaleString("en-AU",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                  {n.hasDiff && <span style={{ fontSize:12, fontWeight:600, padding:"3px 10px", borderRadius:99, background:"rgba(52,211,153,0.1)", color:"#34d399" }}>incl. task changes</span>}
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <span onClick={()=>{copyText(n.formatted);setCopiedId(n.id);setTimeout(()=>setCopiedId(null),1500)}} style={{ cursor:"pointer", color:copiedId===n.id?"#34d399":"#6b7189", fontSize:15, fontWeight:600 }}>{copiedId===n.id?"✓ Copied":"⎘ Copy"}</span>
                  <span onClick={()=>onUpdate({...client,aiNotes:client.aiNotes.filter(x=>x.id!==n.id)})} style={{ cursor:"pointer", color:"#353849", fontSize:16 }}>✕</span>
                </div>
              </div>
              <pre style={{ fontSize:15, lineHeight:1.65, whiteSpace:"pre-wrap", color:"#9ca3b8", fontFamily:"inherit", margin:0 }}>{n.formatted}</pre>
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}


// ═══ WEEKLY ═══
function WeeklyPanel({ clients }) {
  const [copied, setCopied] = useState(null), [sub, setSub] = useState("summary");
  const sTxt = genWeeklySummary(clients), nTxt = genCaseNotes(clients);
  const copy = (t,id) => { copyText(t); setCopied(id); setTimeout(()=>setCopied(null),2000); };
  const dl = (t,fn) => { const b = new Blob([t],{type:"text/plain"}); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href=u; a.download=fn; a.click(); URL.revokeObjectURL(u); };
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 32px", borderBottom:"1px solid #1e2030", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setSub("summary")} style={{ fontSize:15, fontWeight:600, padding:"8px 20px", borderRadius:10, background:sub==="summary"?"rgba(52,211,153,0.12)":"transparent", color:sub==="summary"?"#34d399":"#6b7189", border:"none" }}>Weekly Overview</button>
          <button onClick={()=>setSub("notes")} style={{ fontSize:15, fontWeight:600, padding:"8px 20px", borderRadius:10, background:sub==="notes"?"rgba(167,139,250,0.12)":"transparent", color:sub==="notes"?"#a78bfa":"#6b7189", border:"none" }}>Batch Case Notes</button>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>copy(sub==="summary"?sTxt:nTxt,sub)} style={{ fontSize:15, fontWeight:600, padding:"10px 24px", borderRadius:12, background:copied===sub?"rgba(52,211,153,0.15)":"rgba(91,141,239,0.12)", color:copied===sub?"#34d399":"#5b8def", border:"none" }}>{copied===sub?"✓ Copied!":"⎘ Copy All"}</button>
          <button onClick={()=>dl(sub==="summary"?sTxt:nTxt,`${sub}-${new Date().toISOString().split("T")[0]}.txt`)} style={{ fontSize:15, fontWeight:600, padding:"10px 24px", borderRadius:12, background:"rgba(251,146,60,0.12)", color:"#fb923c", border:"none" }}>↓ Download</button>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:32 }}>
        <div style={{ fontSize:14, color:"#6b7189", marginBottom:16 }}>{sub==="summary"?"All clients, all tasks — grouped by status.":"Auto-generated case notes for clients with activity."}</div>
        <pre style={{ fontSize:15, lineHeight:1.65, whiteSpace:"pre-wrap", padding:28, borderRadius:16, background:"#161822", border:"1px solid #1e2030", color:"#9ca3b8", fontFamily:"inherit", margin:0 }}>{sub==="summary"?sTxt:nTxt}</pre>
      </div>
    </div>
  );
}

// ═══ TODAY / MY DAY ═══
function TodayPanel({ clients, onJumpClient }) {
  const [band, setBand] = useState("red"); // red = urgent, blue = normal, green = non‑urgent

  const items = clients.flatMap(c =>
    c.tasks
      .filter(t => t.status !== "Done")
      .map(t => ({ client: c, task: t }))
  );

  const withBand = items.map(x => {
    const p = x.task.priority;
    const cat = p === "urgent" ? "red" : p === "normal" ? "blue" : "green";
    return { ...x, band: cat };
  }).filter(x => x.band === band);

  const colorForBand = (b) =>
    b === "red" ? "#ef4444" : b === "blue" ? "#60a5fa" : "#22c55e";

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 32px", borderBottom:"1px solid #1e2030", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={()=>setBand("red")} style={{ fontSize:14, fontWeight:600, padding:"8px 16px", borderRadius:999, border:"none", background:band==="red"?"rgba(248,113,113,0.18)":"transparent", color:band==="red"?"#ef4444":"#6b7189" }}>● Urgent</button>
          <button onClick={()=>setBand("blue")} style={{ fontSize:14, fontWeight:600, padding:"8px 16px", borderRadius:999, border:"none", background:band==="blue"?"rgba(96,165,250,0.18)":"transparent", color:band==="blue"?"#60a5fa":"#6b7189" }}>● Normal</button>
          <button onClick={()=>setBand("green")} style={{ fontSize:14, fontWeight:600, padding:"8px 16px", borderRadius:999, border:"none", background:band==="green"?"rgba(34,197,94,0.18)":"transparent", color:band==="green"?"#22c55e":"#6b7189" }}>● Non‑urgent</button>
        </div>
        <span style={{ fontSize:13, color:"#4a4f65" }}>
          {withBand.length} tasks · click a row to jump to client board
        </span>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"8px 32px 24px" }}>
        {withBand.length === 0 && (
          <div style={{ padding:"40px 0", textAlign:"center", color:"#4a4f65", fontSize:15 }}>
            No tasks in this band right now.
          </div>
        )}
        {withBand.map(({ client, task }, idx) => (
          <div
            key={task.id ?? `${client.name}-${idx}`}
            onClick={() => onJumpClient(client.name)}
            style={{
              padding:"12px 14px",
              borderRadius:12,
              marginBottom:8,
              cursor:"pointer",
              background:"#161822",
              border:"1px solid #1e2030",
              display:"flex",
              alignItems:"flex-start",
              gap:10,
            }}
          >
            <div style={{ width:8, height:32, borderRadius:999, background:colorForBand(band), marginTop:2 }}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
                <span style={{ fontSize:14, fontWeight:600, color:"#e8eaf0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {task.text}
                </span>
                <span style={{ fontSize:12, color:"#6b7189", flexShrink:0 }}>
                  {client.name}
                </span>
              </div>
              <div style={{ marginTop:6, display:"flex", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, padding:"3px 8px", borderRadius:999, background:"rgba(31,41,55,0.9)", color:"#9ca3b8", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  {task.status}
                </span>
                {task.tag && (
                  <span style={{ fontSize:11, padding:"3px 8px", borderRadius:999, background:"rgba(55,65,81,0.8)", color:"#9ca3b8" }}>
                    {task.tag}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══ CLIENT SUMMARY ═══
function SummaryPanel({ client }) {
  const [copied, setCopied] = useState(false);
  const today = new Date().toLocaleDateString("en-AU",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const L = [`CLIENT SUMMARY — ${client.name}`,`Date: ${today}`,"SC: Nico | Disability Support Link",""];
  if(client.note) L.push(`Context: ${client.note}`,"");
  const byS={}; client.tasks.forEach(t=>{if(!byS[t.status])byS[t.status]=[];byS[t.status].push(t)});
  Object.entries(byS).forEach(([st,ts])=>{ L.push(`── ${st.toUpperCase()} ──`); ts.forEach(t=>{L.push(`${st==="Done"?"✓":"○"} ${t.text}`);if(t.outcome)L.push(`  → ${t.outcome}`);t.subtasks.filter(s=>!s.done).forEach(s=>L.push(`  • ${s.text}`))});L.push(""); });
  const txt = L.join("\n").trim();
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 32px", borderBottom:"1px solid #1e2030" }}>
        <span style={{ fontSize:16, fontWeight:600, color:"#6b7189" }}>Summary — {client.name}</span>
        <button onClick={()=>{copyText(txt);setCopied(true);setTimeout(()=>setCopied(false),1500)}} style={{ fontSize:16, fontWeight:600, padding:"10px 24px", borderRadius:12, background:copied?"rgba(52,211,153,0.15)":"rgba(91,141,239,0.12)", color:copied?"#34d399":"#5b8def", border:"none" }}>{copied?"✓ Copied!":"⎘ Copy"}</button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:32 }}>
        <pre style={{ fontSize:15, lineHeight:1.65, whiteSpace:"pre-wrap", padding:28, borderRadius:16, background:"#161822", border:"1px solid #1e2030", color:"#9ca3b8", fontFamily:"inherit", margin:0 }}>{txt}</pre>
      </div>
    </div>
  );
}

function AddForm({ onAdd, onClose }) {
  const [name, setName] = useState(""), [note, setNote] = useState("");
  const add = () => { if(!name.trim()) return; onAdd({name:name.trim(),priority:"normal",tags:["Action Item"],note:note.trim(),tasks:[],aiNotes:[]}); };
  return (<div>
    <div style={{ marginBottom:16 }}><div style={{ fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"#4a4f65", marginBottom:8 }}>Client Name *</div>
      <input autoFocus value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Full name" style={{ width:"100%", fontSize:16, padding:"14px 18px", borderRadius:12, background:"#161822", border:"1px solid #252839", color:"#e8eaf0", outline:"none" }}/></div>
    <div style={{ marginBottom:24 }}><div style={{ fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", color:"#4a4f65", marginBottom:8 }}>Context Note</div>
      <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Brief context (optional)" style={{ width:"100%", fontSize:16, padding:"14px 18px", borderRadius:12, background:"#161822", border:"1px solid #252839", color:"#e8eaf0", outline:"none" }}/></div>
    <div style={{ display:"flex", gap:12 }}>
      <button onClick={add} disabled={!name.trim()} style={{ flex:1, padding:"14px 0", borderRadius:12, fontSize:16, fontWeight:600, background:"#5b8def", color:"white", border:"none", opacity:name.trim()?1:0.3 }}>Add Client</button>
      <button onClick={onClose} style={{ flex:1, padding:"14px 0", borderRadius:12, fontSize:16, fontWeight:600, background:"#252839", color:"#6b7189", border:"none" }}>Cancel</button>
    </div>
  </div>);
}

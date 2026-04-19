import { useState, useEffect } from "react";

const PLANS = {
  plan1:  { label: "£200 Setup + £97/mo",   setup: 200, monthly: 97,  type: "saas" },
  plan2:  { label: "£200 Setup + £197/mo",  setup: 200, monthly: 197, type: "saas" },
  plan3:  { label: "£300 Setup + £197/mo",  setup: 300, monthly: 197, type: "saas" },
  plan4:  { label: "£300 Setup + £297/mo",  setup: 300, monthly: 297, type: "saas" },
  plan5:  { label: "£400 Setup + £297/mo",  setup: 400, monthly: 297, type: "saas" },
  plan6:  { label: "£400 Setup + £397/mo",  setup: 400, monthly: 397, type: "saas" },
  plan7:  { label: "£500 Setup + £397/mo",  setup: 500, monthly: 397, type: "saas" },
  plan8:  { label: "£500 Setup + £497/mo",  setup: 500, monthly: 497, type: "saas" },
  plan9:  { label: "£600 Setup + £497/mo",  setup: 600, monthly: 497, type: "saas" },
  plan10: { label: "£595 One-Off",          setup: 595, monthly: 0,   type: "oneoff" },
};

const STAGES = ["New Lead", "Call Booked", "Call Completed", "Closed Won", "Active Client", "Follow Up", "Cancelled"];

const STAGE_COLORS = {
  "New Lead":       { bg: "#1e293b", text: "#94a3b8", border: "#334155" },
  "Call Booked":    { bg: "#1e3a5f", text: "#60a5fa", border: "#2563eb" },
  "Call Completed": { bg: "#312e81", text: "#a5b4fc", border: "#4f46e5" },
  "Closed Won":     { bg: "#14532d", text: "#4ade80", border: "#16a34a" },
  "Active Client":  { bg: "#1a3a2e", text: "#34d399", border: "#059669" },
  "Follow Up":      { bg: "#292524", text: "#fbbf24", border: "#d97706" },
  "Cancelled":      { bg: "#3b0f0f", text: "#f87171", border: "#dc2626" },
};

function calcCommissionCustom(monthlyFee, setupFee, months = 3) {
  const monthly = parseFloat(monthlyFee) || 0;
  const setup = parseFloat(setupFee) || 0;
  const schedule = [];

  if (setup > 0) {
    schedule.push({
      month: 0,
      label: "Setup / One-Off",
      setter: +(setup * 0.1).toFixed(2),
      closer: +(setup * 0.2).toFixed(2),
    });
  }

  for (let m = 1; m <= months; m++) {
    if (monthly > 0) {
      schedule.push({
        month: m,
        label: `Month ${m}`,
        setter: +(monthly * 0.1).toFixed(2),
        closer: +(monthly * 0.2).toFixed(2),
      });
    }
  }

  const setter = +schedule.reduce((a, r) => a + r.setter, 0).toFixed(2);
  const closer = +schedule.reduce((a, r) => a + r.closer, 0).toFixed(2);
  return { setter, closer, total: +(setter + closer).toFixed(2), schedule };
}

function daysSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

const emptyDeal = () => ({
  id: Date.now().toString(),
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  monthlyFee: "",
  setupFee: "",
  stage: "New Lead",
  saleDate: new Date().toISOString().split("T")[0],
  notes: "",
  activityLog: [],
  commissionPaid: [false, false, false, false, false],
  clawback: false,
  createdAt: new Date().toISOString(),
});

const STORAGE_KEY = "ghl_crm_deals_v2";

async function saveDeals(deals) {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(deals)); } catch (e) {}
}
async function loadDeals() {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    return r ? JSON.parse(r.value) : [];
  } catch { return []; }
}

export default function App() {
  const [deals, setDeals] = useState([]);
  const [view, setView] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [form, setForm] = useState(emptyDeal());
  const [newNote, setNewNote] = useState("");
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [filterStage, setFilterStage] = useState("All");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadDeals().then(d => { setDeals(d); setLoaded(true); });
  }, []);

  useEffect(() => {
    if (loaded) saveDeals(deals);
  }, [deals, loaded]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveDeal = () => {
    if (!form.clientName.trim()) { showToast("Client name required", "error"); return; }
    if (editDeal) {
      setDeals(prev => prev.map(d => d.id === editDeal ? { ...form } : d));
      showToast("Deal updated");
    } else {
      setDeals(prev => [{ ...form, id: Date.now().toString(), createdAt: new Date().toISOString() }, ...prev]);
      showToast("Deal added");
    }
    setShowForm(false);
    setEditDeal(null);
    setForm(emptyDeal());
  };

  const openEdit = (deal) => {
    setForm({ ...deal });
    setEditDeal(deal.id);
    setShowForm(true);
    setSelectedDeal(null);
  };

  const deleteDeal = (id) => {
    setDeals(prev => prev.filter(d => d.id !== id));
    setSelectedDeal(null);
    showToast("Deal deleted");
  };

  const togglePaid = (dealId, idx) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const cp = [...d.commissionPaid];
      cp[idx] = !cp[idx];
      return { ...d, commissionPaid: cp };
    }));
  };

  const addActivity = (dealId) => {
    if (!newNote.trim()) return;
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      return { ...d, activityLog: [{ text: newNote, date: new Date().toISOString() }, ...(d.activityLog || [])] };
    }));
    setNewNote("");
  };

  const markClawback = (dealId) => {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, clawback: !d.clawback, stage: !d.clawback ? "Cancelled" : d.stage } : d));
  };

  const updateStage = (dealId, stage) => {
    setDeals(prev => prev.map(d => {
      if (d.id !== dealId) return d;
      const clawback = stage === "Cancelled" && PLANS[d.plan]?.type === "saas" && daysSince(d.saleDate) <= 90;
      return { ...d, stage, clawback };
    }));
  };

  // Stats
  const activeSaas = deals.filter(d => d.stage === "Active Client" && (parseFloat(d.monthlyFee) || 0) > 0);
  const closedDeals = deals.filter(d => d.stage === "Closed Won" || d.stage === "Active Client");
  const totalRevenue = closedDeals.reduce((a, d) => {
    const monthly = parseFloat(d.monthlyFee) || 0;
    const setup = parseFloat(d.setupFee) || 0;
    return a + setup + monthly * 3;
  }, 0);
  const totalCommOwed = deals.reduce((a, d) => {
    if (d.clawback) return a;
    const c = calcCommissionCustom(d.monthlyFee, d.setupFee);
    const paid = d.commissionPaid?.reduce((s, v, i) => s + (v ? (c.schedule[i]?.setter || 0) + (c.schedule[i]?.closer || 0) : 0), 0) || 0;
    return a + c.total - paid;
  }, 0);
  const totalCommPaid = deals.reduce((a, d) => {
    const c = calcCommissionCustom(d.monthlyFee, d.setupFee);
    return a + (d.commissionPaid?.reduce((s, v, i) => s + (v ? (c.schedule[i]?.setter || 0) + (c.schedule[i]?.closer || 0) : 0), 0) || 0);
  }, 0);
  const clawbacks = deals.filter(d => d.clawback).length;
  const mrr = activeSaas.reduce((a, d) => a + (parseFloat(d.monthlyFee) || 0), 0);

  const filtered = filterStage === "All" ? deals : deals.filter(d => d.stage === filterStage);

  const detailDeal = selectedDeal ? deals.find(d => d.id === selectedDeal) : null;
  const detailComm = detailDeal ? calcCommissionCustom(detailDeal.monthlyFee, detailDeal.setupFee) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "#e2e8f0", fontFamily: "'DM Mono', 'Courier New', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0f172a; } ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
        input, select, textarea { background: #0f172a !important; color: #e2e8f0 !important; border: 1px solid #1e293b !important; border-radius: 6px !important; padding: 8px 12px !important; font-family: inherit !important; font-size: 13px !important; width: 100%; outline: none !important; transition: border-color 0.2s; }
        input:focus, select:focus, textarea:focus { border-color: #f59e0b !important; }
        button { cursor: pointer; font-family: inherit; }
        .nav-btn { background: none; border: none; color: #64748b; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; padding: 8px 16px; border-radius: 4px; transition: all 0.2s; }
        .nav-btn.active { color: #f59e0b; background: #1a1200; }
        .nav-btn:hover { color: #f59e0b; }
        .card { background: #0d1420; border: 1px solid #1e293b; border-radius: 10px; padding: 20px; }
        .btn-primary { background: #f59e0b; color: #000; border: none; padding: 9px 20px; border-radius: 6px; font-weight: 500; font-size: 13px; transition: all 0.15s; }
        .btn-primary:hover { background: #fbbf24; transform: translateY(-1px); }
        .btn-ghost { background: none; border: 1px solid #1e293b; color: #94a3b8; padding: 7px 16px; border-radius: 6px; font-size: 12px; transition: all 0.15s; }
        .btn-ghost:hover { border-color: #475569; color: #e2e8f0; }
        .btn-danger { background: #7f1d1d; color: #fca5a5; border: none; padding: 7px 14px; border-radius: 6px; font-size: 12px; }
        .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 20px; font-size: 11px; letter-spacing: 0.05em; font-weight: 500; border: 1px solid; }
        .stat-card { background: linear-gradient(135deg, #0d1420 0%, #0f172a 100%); border: 1px solid #1e293b; border-radius: 12px; padding: 22px; position: relative; overflow: hidden; }
        .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #f59e0b, transparent); }
        .deal-row { background: #0d1420; border: 1px solid #1e293b; border-radius: 8px; padding: 14px 18px; display: flex; align-items: center; gap: 14px; cursor: pointer; transition: all 0.15s; }
        .deal-row:hover { border-color: #334155; background: #111827; transform: translateX(2px); }
        .deal-row.selected { border-color: #f59e0b; background: #1a1200; }
        .comm-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #0f172a; border-radius: 6px; border: 1px solid #1e293b; }
        .paid-btn { background: none; border: 1px solid #16a34a; color: #4ade80; border-radius: 4px; padding: 3px 10px; font-size: 11px; }
        .unpaid-btn { background: none; border: 1px solid #334155; color: #64748b; border-radius: 4px; padding: 3px 10px; font-size: 11px; }
        .clawback-banner { background: #3b0f0f; border: 1px solid #dc2626; border-radius: 8px; padding: 12px 16px; color: #f87171; font-size: 12px; margin-bottom: 12px; }
        .activity-item { padding: 10px 12px; background: #0f172a; border-left: 2px solid #f59e0b; border-radius: 0 6px 6px 0; margin-bottom: 8px; }
        .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #0d1420; border: 1px solid #1e293b; border-radius: 14px; padding: 28px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; }
        .toast { position: fixed; bottom: 24px; right: 24px; z-index: 999; padding: 12px 20px; border-radius: 8px; font-size: 13px; animation: slideIn 0.3s ease; }
        @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .section-label { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #475569; margin-bottom: 10px; }
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid #1e293b", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 28, height: 28, background: "#f59e0b", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>G</span>
          </div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>RMA<span style={{ color: "#f59e0b" }}>CRM</span></span>
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
          {["dashboard", "deals", "commissions"].map(v => (
            <button key={v} className={`nav-btn ${view === v ? "active" : ""}`} onClick={() => setView(v)}>{v}</button>
          ))}
        </nav>
        <button className="btn-primary" onClick={() => { setForm(emptyDeal()); setEditDeal(null); setShowForm(true); }}>+ New Deal</button>
      </div>

      <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 24, marginBottom: 24, letterSpacing: "-0.03em" }}>
              Overview <span style={{ color: "#f59e0b" }}>↗</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
              {[
                { label: "Total Deals", value: deals.length, sub: `${closedDeals.length} closed` },
                { label: "MRR (Active)", value: `£${mrr}`, sub: `${activeSaas.length} active plans` },
                { label: "Revenue (3mo)", value: `£${totalRevenue.toFixed(0)}`, sub: "projected" },
                { label: "Comm. Owed", value: `£${totalCommOwed.toFixed(2)}`, sub: "unpaid", accent: totalCommOwed > 0 },
                { label: "Comm. Paid", value: `£${totalCommPaid.toFixed(2)}`, sub: "settled" },
                { label: "Clawbacks", value: clawbacks, sub: "flagged", danger: clawbacks > 0 },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="section-label">{s.label}</div>
                  <div style={{ fontSize: 26, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: s.danger ? "#f87171" : s.accent ? "#f59e0b" : "#f1f5f9", lineHeight: 1.1 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Pipeline */}
            <div className="section-label">Pipeline Breakdown</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 28, flexWrap: "wrap" }}>
              {STAGES.map(s => {
                const count = deals.filter(d => d.stage === s).length;
                const sc = STAGE_COLORS[s];
                return (
                  <div key={s} style={{ background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 8, padding: "14px 20px", minWidth: 100, flex: 1 }}>
                    <div style={{ color: sc.text, fontSize: 22, fontFamily: "'Syne', sans-serif", fontWeight: 800 }}>{count}</div>
                    <div style={{ color: sc.text, fontSize: 11, opacity: 0.8, marginTop: 2 }}>{s}</div>
                  </div>
                );
              })}
            </div>

            {/* Recent */}
            <div className="section-label">Recent Deals</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {deals.slice(0, 5).map(d => {
                const sc = STAGE_COLORS[d.stage] || STAGE_COLORS["New Lead"];
                const comm = calcCommissionCustom(d.monthlyFee, d.setupFee);
                const feeLabel = [d.setupFee ? `£${d.setupFee} setup` : "", d.monthlyFee ? `£${d.monthlyFee}/mo` : ""].filter(Boolean).join(" + ") || "No fees set";
                return (
                  <div key={d.id} className="deal-row" onClick={() => { setSelectedDeal(d.id); setView("deals"); }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#f1f5f9" }}>{d.clientName}</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{feeLabel}</div>
                    </div>
                    <span className="badge" style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>{d.stage}</span>
                    <div style={{ textAlign: "right", minWidth: 80 }}>
                      <div style={{ fontSize: 13, color: "#f59e0b" }}>£{comm.total}</div>
                      <div style={{ fontSize: 10, color: "#475569" }}>commission</div>
                    </div>
                    {d.clawback && <span style={{ fontSize: 10, color: "#f87171", background: "#3b0f0f", padding: "2px 8px", borderRadius: 4 }}>⚠ CLAWBACK</span>}
                  </div>
                );
              })}
              {deals.length === 0 && <div style={{ color: "#334155", textAlign: "center", padding: 32, fontSize: 13 }}>No deals yet. Add your first deal ↗</div>}
            </div>
          </div>
        )}

        {/* DEALS VIEW */}
        {view === "deals" && (
          <div style={{ display: "grid", gridTemplateColumns: selectedDeal ? "1fr 380px" : "1fr", gap: 20 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20 }}>All Deals</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["All", ...STAGES].map(s => (
                    <button key={s} onClick={() => setFilterStage(s)}
                      style={{ background: filterStage === s ? "#f59e0b" : "#0d1420", color: filterStage === s ? "#000" : "#64748b", border: `1px solid ${filterStage === s ? "#f59e0b" : "#1e293b"}`, padding: "4px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.map(d => {
                  const sc = STAGE_COLORS[d.stage] || STAGE_COLORS["New Lead"];
                  const comm = calcCommissionCustom(d.monthlyFee, d.setupFee);
                  const feeLabel = [d.setupFee ? `£${d.setupFee} setup` : "", d.monthlyFee ? `£${d.monthlyFee}/mo` : ""].filter(Boolean).join(" + ") || "No fees set";
                  const isSelected = selectedDeal === d.id;
                  return (
                    <div key={d.id} className={`deal-row ${isSelected ? "selected" : ""}`} onClick={() => setSelectedDeal(isSelected ? null : d.id)}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, color: "#f1f5f9", fontWeight: 500 }}>{d.clientName}</div>
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{d.clientEmail || "—"} · {d.saleDate}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{feeLabel}</div>
                      <span className="badge" style={{ background: sc.bg, color: sc.text, borderColor: sc.border }}>{d.stage}</span>
                      <div style={{ textAlign: "right", minWidth: 70 }}>
                        <div style={{ fontSize: 13, color: "#f59e0b" }}>£{comm.total}</div>
                      </div>
                      {d.clawback && <span style={{ fontSize: 10, color: "#f87171" }}>⚠</span>}
                    </div>
                  );
                })}
                {filtered.length === 0 && <div style={{ color: "#334155", textAlign: "center", padding: 40, fontSize: 13 }}>No deals in this stage.</div>}
              </div>
            </div>

            {/* DEAL DETAIL PANEL */}
            {detailDeal && detailComm && (
              <div style={{ position: "sticky", top: 20, height: "fit-content", maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}>
                <div className="card" style={{ border: "1px solid #334155" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18 }}>{detailDeal.clientName}</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{detailDeal.clientEmail}</div>
                    </div>
                    <button onClick={() => setSelectedDeal(null)} style={{ background: "none", border: "none", color: "#475569", fontSize: 18 }}>✕</button>
                  </div>

                  {detailDeal.clawback && (
                    <div className="clawback-banner">⚠ CLAWBACK ACTIVE — cancelled within 90 days. Commission should be recovered.</div>
                  )}

                  {/* Stage Selector */}
                  <div className="section-label">Stage</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                    {STAGES.map(s => {
                      const sc = STAGE_COLORS[s];
                      return (
                        <button key={s} onClick={() => updateStage(detailDeal.id, s)}
                          style={{ background: detailDeal.stage === s ? sc.bg : "transparent", color: detailDeal.stage === s ? sc.text : "#475569", border: `1px solid ${detailDeal.stage === s ? sc.border : "#1e293b"}`, padding: "4px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer" }}>
                          {s}
                        </button>
                      );
                    })}
                  </div>

                  {/* Fees & dates */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
                    <div style={{ background: "#0f172a", borderRadius: 6, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>Monthly Fee</div>
                      <div style={{ fontSize: 12, color: "#f59e0b" }}>{detailDeal.monthlyFee ? `£${detailDeal.monthlyFee}` : "—"}</div>
                    </div>
                    <div style={{ background: "#0f172a", borderRadius: 6, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>Setup / One-Off</div>
                      <div style={{ fontSize: 12, color: "#f59e0b" }}>{detailDeal.setupFee ? `£${detailDeal.setupFee}` : "—"}</div>
                    </div>
                    <div style={{ background: "#0f172a", borderRadius: 6, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>Sale Date</div>
                      <div style={{ fontSize: 12 }}>{detailDeal.saleDate}</div>
                    </div>
                  </div>

                  {/* Commission Schedule */}
                  <div className="section-label">Commission Schedule</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                    {detailComm.schedule.map((row, i) => {
                      const isPaid = detailDeal.commissionPaid?.[i];
                      const rowTotal = row.setter + row.closer;
                      return (
                        <div key={i} className="comm-row" style={{ opacity: detailDeal.clawback ? 0.4 : 1 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, color: "#94a3b8" }}>{row.label}</div>
                            <div style={{ fontSize: 10, color: "#475569" }}>S: £{row.setter} · C: £{row.closer}</div>
                          </div>
                          <div style={{ fontSize: 13, color: "#f59e0b", minWidth: 50, textAlign: "right" }}>£{rowTotal.toFixed(2)}</div>
                          <button className={isPaid ? "paid-btn" : "unpaid-btn"} onClick={() => togglePaid(detailDeal.id, i)}>
                            {isPaid ? "✓ Paid" : "Unpaid"}
                          </button>
                        </div>
                      );
                    })}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderTop: "1px solid #1e293b", marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>Total Commission</span>
                      <span style={{ fontSize: 14, color: "#f59e0b", fontWeight: 500 }}>£{detailComm.total}</span>
                    </div>
                  </div>

                  {/* Clawback Toggle */}
                  <button onClick={() => markClawback(detailDeal.id)}
                    style={{ width: "100%", background: detailDeal.clawback ? "#7f1d1d" : "#0f172a", border: `1px solid ${detailDeal.clawback ? "#dc2626" : "#1e293b"}`, color: detailDeal.clawback ? "#f87171" : "#64748b", borderRadius: 6, padding: "8px", fontSize: 12, marginBottom: 16, cursor: "pointer" }}>
                    {detailDeal.clawback ? "⚠ Remove Clawback Flag" : "Flag as Clawback"}
                  </button>

                  {/* Activity Log */}
                  <div className="section-label">Activity Log</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <input value={newNote} onChange={e => setNewNote(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addActivity(detailDeal.id)}
                      placeholder="Add note or activity..." style={{ flex: 1 }} />
                    <button className="btn-primary" style={{ padding: "8px 14px", whiteSpace: "nowrap" }} onClick={() => addActivity(detailDeal.id)}>Add</button>
                  </div>
                  <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                    {(detailDeal.activityLog || []).map((log, i) => (
                      <div key={i} className="activity-item">
                        <div style={{ fontSize: 12, color: "#e2e8f0" }}>{log.text}</div>
                        <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>{new Date(log.date).toLocaleString()}</div>
                      </div>
                    ))}
                    {(!detailDeal.activityLog || detailDeal.activityLog.length === 0) && (
                      <div style={{ color: "#334155", fontSize: 12, padding: 8 }}>No activity yet.</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button className="btn-ghost" style={{ flex: 1 }} onClick={() => openEdit(detailDeal)}>✎ Edit</button>
                    <button className="btn-danger" onClick={() => deleteDeal(detailDeal.id)}>Delete</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* COMMISSIONS VIEW */}
        {view === "commissions" && (
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 20 }}>Commission Tracker</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
              {[
                { label: "Total Owed", value: `£${totalCommOwed.toFixed(2)}`, accent: true },
                { label: "Total Paid Out", value: `£${totalCommPaid.toFixed(2)}` },
                { label: "Clawbacks", value: clawbacks, danger: clawbacks > 0 },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="section-label">{s.label}</div>
                  <div style={{ fontSize: 28, fontFamily: "'Syne', sans-serif", fontWeight: 800, color: s.danger ? "#f87171" : s.accent ? "#f59e0b" : "#f1f5f9" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Due This Month Filter */}
            {(() => {
              const now = new Date();
              const thisMonth = now.getMonth();
              const thisYear = now.getFullYear();

              const dueThisMonth = deals.filter(d => {
                if (d.clawback) return false;
                const comm = calcCommissionCustom(d.monthlyFee, d.setupFee);
                return comm.schedule.some((row, i) => {
                  if (d.commissionPaid?.[i]) return false;
                  const saleDate = new Date(d.saleDate);
                  const dueDate = new Date(saleDate);
                  dueDate.setMonth(dueDate.getMonth() + row.month);
                  return dueDate.getMonth() === thisMonth && dueDate.getFullYear() === thisYear;
                });
              });

              const dueTotal = dueThisMonth.reduce((a, d) => {
                const comm = calcCommissionCustom(d.monthlyFee, d.setupFee);
                return a + comm.schedule.reduce((s, row, i) => {
                  if (d.commissionPaid?.[i]) return s;
                  const saleDate = new Date(d.saleDate);
                  const dueDate = new Date(saleDate);
                  dueDate.setMonth(dueDate.getMonth() + row.month);
                  if (dueDate.getMonth() === thisMonth && dueDate.getFullYear() === thisYear) {
                    return s + row.setter + row.closer;
                  }
                  return s;
                }, 0);
              }, 0);

              return dueThisMonth.length > 0 ? (
                <div style={{ background: "#1a1200", border: "1px solid #f59e0b", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15, color: "#f59e0b" }}>
                      🗓 Due This Month
                    </div>
                    <div style={{ fontSize: 13, color: "#f59e0b" }}>Total: £{dueTotal.toFixed(2)}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {dueThisMonth.map(d => {
                      const comm = calcCommissionCustom(d.monthlyFee, d.setupFee);
                      const feeLabel = [d.setupFee ? `£${d.setupFee} setup` : "", d.monthlyFee ? `£${d.monthlyFee}/mo` : ""].filter(Boolean).join(" + ");
                      return (
                        <div key={d.id} style={{ background: "#0d1420", borderRadius: 6, padding: "10px 14px" }}>
                          <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 500, marginBottom: 6 }}>{d.clientName} <span style={{ fontSize: 11, color: "#475569" }}>{feeLabel}</span></div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {comm.schedule.map((row, i) => {
                              if (d.commissionPaid?.[i]) return null;
                              const saleDate = new Date(d.saleDate);
                              const dueDate = new Date(saleDate);
                              dueDate.setMonth(dueDate.getMonth() + row.month);
                              if (dueDate.getMonth() !== thisMonth || dueDate.getFullYear() !== thisYear) return null;
                              const rowTotal = row.setter + row.closer;
                              return (
                                <button key={i} onClick={() => togglePaid(d.id, i)}
                                  style={{ background: "#f59e0b", color: "#000", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                                  Pay {row.label}: £{rowTotal.toFixed(2)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ background: "#0d1420", border: "1px solid #1e293b", borderRadius: 10, padding: 14, marginBottom: 20, color: "#475569", fontSize: 13 }}>
                  ✅ Nothing due this month
                </div>
              );
            })()}

            {/* All Deals */}
            <div className="section-label">All Commission Records</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {deals.map(d => {
                const comm = calcCommissionCustom(d.monthlyFee, d.setupFee);
                const paidTotal = d.commissionPaid?.reduce((s, v, i) => s + (v ? (comm.schedule[i]?.setter || 0) + (comm.schedule[i]?.closer || 0) : 0), 0) || 0;
                const owed = d.clawback ? 0 : comm.total - paidTotal;
                const feeLabel = [d.setupFee ? `£${d.setupFee} setup` : "", d.monthlyFee ? `£${d.monthlyFee}/mo` : ""].filter(Boolean).join(" + ") || "No fees set";
                return (
                  <div key={d.id} className="card" style={{ border: d.clawback ? "1px solid #7f1d1d" : "1px solid #1e293b" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        <span style={{ fontWeight: 500, color: "#f1f5f9" }}>{d.clientName}</span>
                        <span style={{ marginLeft: 10, fontSize: 11, color: "#475569" }}>{feeLabel}</span>
                        {d.clawback && <span style={{ marginLeft: 8, fontSize: 10, color: "#f87171", background: "#3b0f0f", padding: "2px 8px", borderRadius: 4 }}>⚠ CLAWBACK</span>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, color: d.clawback ? "#475569" : "#f59e0b" }}>£{owed.toFixed(2)} owed</div>
                        <div style={{ fontSize: 11, color: "#334155" }}>£{paidTotal.toFixed(2)} paid</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {comm.schedule.map((row, i) => {
                        const isPaid = d.commissionPaid?.[i];
                        const rowTotal = row.setter + row.closer;
                        return isPaid ? (
                          <div key={i}
                            style={{ background: "#14532d", border: "1px solid #16a34a", color: "#4ade80", borderRadius: 6, padding: "6px 12px", fontSize: 11, opacity: d.clawback ? 0.4 : 1 }}>
                            {row.label}: £{rowTotal.toFixed(2)} ✓ Paid
                          </div>
                        ) : (
                          <button key={i} onClick={() => !d.clawback && togglePaid(d.id, i)}
                            style={{ background: "#0f172a", border: "1px solid #1e293b", color: "#64748b", borderRadius: 6, padding: "6px 12px", fontSize: 11, cursor: d.clawback ? "not-allowed" : "pointer", opacity: d.clawback ? 0.4 : 1 }}>
                            {row.label}: £{rowTotal.toFixed(2)} ○ Unpaid
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {deals.length === 0 && <div style={{ color: "#334155", textAlign: "center", padding: 40 }}>No deals yet.</div>}
            </div>
          </div>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      {showForm && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 20 }}>
              {editDeal ? "Edit Deal" : "New Deal"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div className="section-label">Client Name *</div>
                <input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} placeholder="e.g. John Smith" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div className="section-label">Email</div>
                  <input value={form.clientEmail} onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} placeholder="john@email.com" />
                </div>
                <div>
                  <div className="section-label">Phone</div>
                  <input value={form.clientPhone} onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} placeholder="+44..." />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div className="section-label">Monthly Fee (£)</div>
                  <input type="number" min="0" value={form.monthlyFee} onChange={e => setForm(f => ({ ...f, monthlyFee: e.target.value }))} placeholder="e.g. 197" />
                </div>
                <div>
                  <div className="section-label">One-Off / Setup Fee (£)</div>
                  <input type="number" min="0" value={form.setupFee} onChange={e => setForm(f => ({ ...f, setupFee: e.target.value }))} placeholder="e.g. 297" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div className="section-label">Stage</div>
                  <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <div className="section-label">Sale Date</div>
                  <input type="date" value={form.saleDate} onChange={e => setForm(f => ({ ...f, saleDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <div className="section-label">Notes</div>
                <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes about this deal..." />
              </div>

              {/* Commission Preview */}
              <div style={{ background: "#0f172a", borderRadius: 8, padding: 14, border: "1px solid #1e293b" }}>
                <div className="section-label">Commission Preview (Setter 10% · Closer 20% · 3 months)</div>
                {(() => {
                  const c = calcCommissionCustom(form.monthlyFee, form.setupFee);
                  return (
                    <div>
                      <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                        <div><div style={{ fontSize: 10, color: "#475569" }}>Setter earns</div><div style={{ color: "#f59e0b", fontSize: 16, fontWeight: 500 }}>£{c.setter}</div></div>
                        <div><div style={{ fontSize: 10, color: "#475569" }}>Closer earns</div><div style={{ color: "#f59e0b", fontSize: 16, fontWeight: 500 }}>£{c.closer}</div></div>
                        <div><div style={{ fontSize: 10, color: "#475569" }}>Total</div><div style={{ color: "#f59e0b", fontSize: 16, fontWeight: 500 }}>£{c.total}</div></div>
                      </div>
                      {c.schedule.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {c.schedule.map((row, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
                              <span>{row.label}</span>
                              <span>S: £{row.setter} · C: £{row.closer} · Total: £{(row.setter + row.closer).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="btn-ghost" onClick={() => { setShowForm(false); setEditDeal(null); }}>Cancel</button>
                <button className="btn-primary" onClick={saveDeal}>{editDeal ? "Save Changes" : "Add Deal"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="toast" style={{ background: toast.type === "error" ? "#7f1d1d" : "#14532d", color: toast.type === "error" ? "#fca5a5" : "#4ade80", border: `1px solid ${toast.type === "error" ? "#dc2626" : "#16a34a"}` }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

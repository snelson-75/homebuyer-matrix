import React, { useState, useEffect, useMemo } from "react";

/* ============================================================
    AM I READY? — Homebuyer Readiness Tracker
    Commercial Standalone Product Edition (Master Release v2.3)
    Educational/informational only. Not financial advice.
    Calculations are self-contained and run on the user's device.
    ============================================================ */
const CONFIG = {
  author: "HomePath Digital Products",
  productVersion: "2.3.0",
};

const STORE_KEY = "amiready:commercial_master";

const DEBT_TYPES = ["Credit card", "Auto loan", "Student loan", "Personal loan", "Other"];

const fmt = (n) => n == null || isNaN(n) ? "$0" : Math.round(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const pctf = (n) => n == null || isNaN(n) ? "—" : `${n.toFixed(1)}%`;
const uid = () => Math.random().toString(36).slice(2, 9);

function creditBand(score) {
  const s = Number(score) || 0;
  if (s >= 740) return { label: "Excellent", note: "Strongest pricing parameters across most lending guidelines." };
  if (s >= 680) return { label: "Good", note: "Qualifies comfortably for standard conventional programs." };
  if (s >= 620) return { label: "Fair", note: "Baseline for conventional criteria; highly accessible for FHA models." };
  if (s >= 580) return { label: "Building", note: "Standard FHA transactional layer. Focus on payment consistency." };
  if (s > 0)   return { label: "Initial", note: "Scores below 580 typically require increased capital down adjustments." };
  return { label: "—", note: "Enter your current score to see general program context." };
}

export default function CommercialReadinessTracker() {
  const [income, setIncome] = useState(0);
  const [credit, setCredit] = useState(0);
  const [targetDti, setTargetDti] = useState(43);
  const [debts, setDebts] = useState([]);
  const [price, setPrice] = useState(0);
  const [dpPct, setDpPct] = useState(0);
  const [closingPct, setClosingPct] = useState(0);
  const [saved, setSaved] = useState(0);
  const [monthly, setMonthly] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const loadData = () => {
      try {
        const localData = localStorage.getItem(STORE_KEY);
        if (localData) {
          const s = JSON.parse(localData);
          if (s.income != null) setIncome(s.income);
          if (s.credit != null) setCredit(s.credit);
          if (s.targetDti != null) setTargetDti(s.targetDti);
          if (Array.isArray(s.debts)) setDebts(s.debts);
          if (s.price != null) setPrice(s.price);
          if (s.dpPct != null) setDpPct(s.dpPct);
          if (s.closingPct != null) setClosingPct(s.closingPct);
          if (s.saved != null) setSaved(s.saved);
          if (s.monthly != null) setMonthly(s.monthly);
          setStatus("Loaded your saved progress.");
          setTimeout(() => setStatus(""), 2000);
        }
      } catch (e) {}
    };
    loadData();
  }, []);

  const saveProgress = () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ income, credit, targetDti, debts, price, dpPct, closingPct, saved, monthly }));
      setStatus("Progress saved successfully ✓");
    } catch (e) {
      setStatus("Progress held temporarily in this window session.");
    }
    setTimeout(() => setStatus(""), 3500);
  };

  const triggerPrint = () => {
    window.print();
  };

  const addDebt = () => setDebts((d) => [...d, { id: uid(), name: "", type: "Credit card", balance: 0, payment: 0, limit: 0 }]);
  const updDebt = (id, k, v) => setDebts((d) => d.map((x) => (x.id === id ? { ...x, [k]: v } : x)));
  const delDebt = (id) => setDebts((d) => d.filter((x) => x.id !== id));

  const c = useMemo(() => {
    const inc = Number(income) || 0;
    const totalPay = debts.reduce((s, x) => s + (Number(x.payment) || 0), 0);
    const totalBal = debts.reduce((s, x) => s + (Number(x.balance) || 0), 0);
    const dti = inc ? (totalPay / inc) * 100 : 0;
    const maxDebt = inc * (Number(targetDti) || 43) / 100;
    const headroom = maxDebt - totalPay;

    const ranked = [...debts]
      .filter((x) => (Number(x.balance) || 0) > 0)
      .map((x) => {
        const bal = Number(x.balance) || 0, pay = Number(x.payment) || 0, lim = Number(x.limit) || 0;
        const relief = bal ? pay / bal : 0;       
        const util = x.type === "Credit card" && lim ? (bal / lim) * 100 : null;
        const flags = [];
        if (util != null && util > 30) flags.push(`High utilization ${Math.round(util)}%`);
        return { ...x, relief, util, flags };
      })
      .sort((a, b) => b.relief - a.relief);

    const cashGoal = (Number(price) || 0) * ((Number(dpPct) || 0) + (Number(closingPct) || 0)) / 100;
    const dpGoal = (Number(price) || 0) * (Number(dpPct) || 0) / 100;
    const ccGoal = (Number(price) || 0) * (Number(closingPct) || 0) / 100;
    const remaining = Math.max(cashGoal - (Number(saved) || 0), 0);
    const progress = cashGoal ? Math.min(((Number(saved) || 0) / cashGoal) * 100, 100) : 0;
    const months = (Number(monthly) || 0) > 0 ? Math.ceil(remaining / (Number(monthly) || 1)) : null;
    let eta = null;
    if (months != null) {
      const dt = new Date();
      dt.setMonth(dt.getMonth() + months);
      eta = dt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }

    let rs = 0;
    rs += Math.max(0, Math.min(40, (1 - dti / (Number(targetDti) || 43)) * 40)); 
    const cs = Number(credit) || 0;
    rs += cs >= 740 ? 30 : cs >= 680 ? 24 : cs >= 620 ? 16 : cs >= 580 ? 8 : 2;                  
    rs += Math.min(30, progress * 0.3);                                       
    rs = Math.round(Math.max(0, Math.min(100, rs)));

    return { inc, totalPay, totalBal, dti, maxDebt, headroom, ranked, cashGoal, dpGoal, ccGoal, remaining, progress, months, eta, rs };
  }, [income, credit, targetDti, debts, price, dpPct, closingPct, saved, monthly]);

  const band = creditBand(credit);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
    .rt *{box-sizing:border-box;}
    .rt{--paper:#F6F1E7;--ink:#191712;--ink2:#5b554a;--line:#ddd3c0;--green:#1f6b5c;--green2:#15534a;--clay:#c8743a;--red:#b4452f;--card:#fffdf8;
      font-family:'Hanken Grotesk',sans-serif;background:var(--paper);color:var(--ink);min-height:100vh;}
    .rt h1,.rt h2,.rt .disp{font-family:'Fraunces',serif;}
    .rt-shell{max-width:1080px;margin:0 auto;padding:28px 20px 64px;}
    .rt-tag{display:inline-block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--green);border:1px solid var(--green);border-radius:999px;padding:3px 9px;margin-bottom:12px;}
    .rt-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:22px;}
    @media(max-width:860px){.rt-grid{grid-template-columns:1fr;}}
    .rt-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:24px;box-shadow:0 18px 40px -30px rgba(25,23,18,.45);margin-bottom:20px;}
    .rt-kicker{font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:var(--clay);font-weight:600;margin-bottom:12px;}
    .rt-field{margin-bottom:14px;}.rt-field label{display:block;font-size:13px;font-weight:600;margin-bottom:5px;}
    .rt-field .hint{font-weight:400;color:var(--ink2);}
    .rt-input,.rt-select{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;font-size:15px;font-family:inherit;background:#fff;color:var(--ink);}
    .rt-input:focus,.rt-select:focus{outline:none;border-color:var(--green);box-shadow:0 0 0 3px rgba(31,107,92,.12);}
    .rt-row{display:flex;gap:12px;}.rt-row>*{flex:1;}
    
    .rt-debtcard{border:1px solid var(--line);border-radius:12px;padding:14px;margin-bottom:12px;background:#fff;}
    .rt-debtcard input,.rt-debtcard select{padding:9px 12px;border:1px solid var(--line);border-radius:8px;font-family:inherit;font-size:14px;width:100%;background:#fff;color:var(--ink);}
    .rt-debtcard input:focus,.rt-debtcard select:focus{outline:none;border-color:var(--green);box-shadow:0 0 0 3px rgba(31,107,92,.1);}
    .rt-debttop{display:flex;gap:10px;align-items:center;margin-bottom:12px;}
    .rt-debttop input{flex:1;}
    .rt-debttop select{flex:0 0 auto;width:auto; max-width:140px;}
    .rt-debttop .x{flex:none;border:0;background:#f3ece0;color:var(--ink2);border-radius:8px;padding:9px 13px;cursor:pointer;font-size:14px;transition:background 0.15s;}
    .rt-debttop .x:hover{background:#eadfca;}
    .rt-debtfields{display:flex;gap:12px;flex-wrap:wrap;}
    .rt-debtfields .f{flex:1;min-width:110px;}
    .rt-debtfields .f label{display:block;font-size:12px;color:var(--ink2);margin-bottom:5px;font-weight:600;}
    
    .rt-add{margin-top:6px;border:1px dashed var(--line);background:transparent;color:var(--green);font-weight:600;border-radius:10px;padding:10px;width:100%;cursor:pointer;font-family:inherit;}
    .rt-btn{border:0;border-radius:11px;padding:12px 20px;font-family:inherit;font-size:15px;font-weight:600;cursor:pointer;}
    .rt-btn.prim{background:var(--green);color:#fff;}.rt-btn.prim:hover{background:var(--green2);}
    .rt-btn.action-btn{background:var(--clay);color:#fff;display:block;width:100%;text-align:center;text-decoration:none;margin-top:14px;}
    .rt-btn.action-btn:hover{filter:brightness(0.95);}
    .rt-score{display:flex;align-items:center;gap:16px;}
    .rt-ring{--p:0;width:104px;height:104px;border-radius:50%;flex:none;
      background:conic-gradient(var(--green) calc(var(--p)*1%), #eadfca 0);display:grid;place-items:center;}
    .rt-ring div{width:80px;height:80px;border-radius:50%;background:var(--card);display:grid;place-items:center;font-family:'Fraunces',serif;font-size:30px;font-weight:600;}
    .rt-big{font-family:'Fraunces',serif;font-size:40px;font-weight:600;line-height:1;}
    .rt-sub{color:var(--ink2);font-size:13px;}
    .rt-line{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--line);font-size:14px;}
    .rt-line span:last-child{font-weight:600;font-variant-numeric:tabular-nums;}
    .rt-bar{height:12px;border-radius:999px;background:#eadfca;overflow:hidden;margin:8px 0;}
    .rt-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--green),var(--clay));}
    .rt-prio{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:8px;background:#fff;}
    .rt-prio b{font-size:14px;}
    .rt-flag{display:inline-block;font-size:11px;font-weight:600;color:var(--red);background:#f7e7e2;border-radius:999px;padding:2px 8px;margin:4px 4px 0 0;}
    .rt-pillgreen{display:inline-block;font-size:11px;font-weight:600;color:var(--green);background:#e7f3ef;border-radius:999px;padding:3px 9px;}
    .rt-note{font-size:12.5px;color:var(--ink2);background:#fbf6ec;border:1px solid var(--line);border-left:3px solid var(--clay);border-radius:8px;padding:9px 11px;margin-top:10px;line-height:1.45;}
    .rt-disc{font-size:11.5px;color:var(--ink2);line-height:1.55;margin-top:16px;border-top:1px solid var(--line);padding-top:14px;}
    .rt-save{display:flex;align-items:center;gap:12px;margin-top:4px;}
    .rt-status{font-size:13px;color:var(--green);font-weight:600;}
    .rt-help{margin:6px 0 0;border:1px solid var(--line);border-radius:10px;background:#fff;}
    .rt-help summary{cursor:pointer;font-size:13px;font-weight:600;color:var(--green);padding:9px 12px;list-style:none;}
    .rt-help summary::-webkit-details-marker{display:none;}
    .rt-help summary:before{content:"▸ ";}
    .rt-help[open] summary:before{content:"▾ ";}
    .rt-help .body{font-size:12.5px;color:var(--ink2);line-height:1.55;padding:0 12px 11px;}
    .rt-master{border:1px solid var(--line);border-radius:12px;background:#fff;}
    .rt-day{border-bottom:1px dashed var(--line);}
    .rt-fac:last-child{border-bottom:0;}
    .rt-fac summary{cursor:pointer;font-size:13.5px;font-weight:600;padding:11px 14px;list-style:none;display:flex;justify-content:space-between;}
    .rt-fac summary::-webkit-details-marker{display:none;}
    .rt-fac .body{font-size:12.5px;color:var(--ink2);line-height:1.55;padding:0 14px 12px;}
    .rt-pct{font-family:'Fraunces',serif;color:var(--clay);}
    .rt-road{margin-top:6px;}
    .rt-step{display:flex;gap:12px;margin-bottom:12px;}
    .rt-step .n{flex:none;width:28px;height:28px;border-radius:50%;background:var(--green);color:#fff;display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:600;font-size:15px;}
    .rt-step .t{font-size:13px;color:var(--ink2);line-height:1.5;}
    .rt-step .t b{color:var(--ink);}
    
    @media print {
      .rt { background: #fff; color: #000; }
      .rt-shell { padding: 0; }
      .rt-add, .rt-btn, .rt-help, .rt-save, .x { display: none !important; }
      .rt-card { box-shadow: none; border: 1px solid #000; page-break-inside: avoid; }
    }
  `;

  return (
    <div className="rt">
      <style>{css}</style>
      <div className="rt-shell">
        <span className="rt-tag">INFORMATIONAL ESTIMATE · NOT AN EXTENSION OF CREDIT</span>
        <h1 className="disp" style={{ fontSize: 32, fontWeight: 600, margin: "0 0 4px" }}>Homebuyer Readiness Matrix</h1>
        <p className="rt-sub" style={{ marginBottom: 22, maxWidth: 560 }}>Track your debt-to-income, find which liabilities to clear first, and build a targeted savings timeline milestone. Everything runs inside your local device session cache.</p>

        <div className="rt-grid">
          {/* LEFT: INPUTS */}
          <div>
            <div className="rt-card">
              <div className="rt-kicker">1 · Income & credit profiles</div>
              <div className="rt-row">
                <div className="rt-field"><label>Gross monthly income</label><input className="rt-input" type="number" value={income === 0 ? "" : income} placeholder="0" onChange={(e) => setIncome(Number(e.target.value))} /></div>
                <div className="rt-field"><label>Current credit score</label><input className="rt-input" type="number" value={credit === 0 ? "" : credit} placeholder="0" onChange={(e) => setCredit(Number(e.target.value))} /></div>
              </div>
              
              <details className="rt-help">
                <summary>Where do I locate my gross income?</summary>
                <div className="body">
                  Check your latest paystub summary for "Gross Pay" or "Total Earnings" — income <b>before</b> baseline taxes, active insurance, or retirement match assets come out.<br />
                  • Hourly: rate × hours/week × 52 ÷ 12<br />
                  • Salary: gross yearly salary ÷ 12
                </div>
              </details>
              
              <details className="rt-help">
                <summary>How do I check my credit score safely (free)?</summary>
                <div className="body">
                  Checking your own score is a "soft pull" — it never lowers your score. 
                  You can obtain a free FICO® Score 8 based on Equifax data with no credit card required at 
                  <a href="https://www.myfico.com/free" target="_blank" rel="noopener noreferrer" style={{color:"var(--green)", fontWeight:700, textDecoration:"underline", marginLeft:"4px"}}>
                    myfico.com/free
                  </a>.
                  <br /><br />
                  <i>Note: Mortgage lenders use a specific industry FICO version that may vary slightly from consumer-facing scoring models, but this will provide a reliable diagnostic benchmark.</i>
                </div>
              </details>
              
              <div className="rt-note"><b>{band.label}.</b> {band.note}</div>
            </div>

            <div className="rt-card">
              <div className="rt-kicker">2 · Account liabilities & minimums</div>
              {debts.map((x) => (
                <div className="rt-debtcard" key={x.id}>
                  <div className="rt-debttop">
                    <input value={x.name} placeholder="e.g., Visa card, Car loan" onChange={(e) => updDebt(x.id, "name", e.target.value)} />
                    <select value={x.type} onChange={(e) => updDebt(x.id, "type", e.target.value)}>{DEBT_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                    <button className="x" onClick={() => delDebt(x.id)}>✕</button>
                  </div>
                  <div className="rt-debtfields">
                    <div className="f"><label>Total Balance</label><input type="number" value={x.balance === 0 ? "" : x.balance} placeholder="0" onChange={(e) => updDebt(x.id, "balance", Number(e.target.value))} /></div>
                    <div className="f"><label>Payment / mo</label><input type="number" value={x.payment === 0 ? "" : x.payment} placeholder="0" onChange={(e) => updDebt(x.id, "payment", Number(e.target.value))} /></div>
                    <div className="f"><label>Card limit</label><input type="number" value={x.limit === 0 ? "" : x.limit} placeholder="Cards only" onChange={(e) => updDebt(x.id, "limit", Number(e.target.value))} /></div>
                  </div>
                </div>
              ))}
              <button className="rt-add" onClick={addDebt}>+ Add New Liability</button>
              <details className="rt-help"><summary>Which debts should be declared here?</summary><div className="body"><b>Include:</b> Structured credit configurations with set monthly minimum boundaries: car contracts, rolling card obligations, student profiles (even while deferred), or signature personal lines.<br /><b>Exclude:</b> Current residential lease parameters, utilities, recurring groceries, car insurance policies, or standard streaming applications.</div></details>
            </div>

            <div className="rt-card">
              <div className="rt-kicker">Credit Matrix Insights · Dynamic Components</div>
              <p className="rt-sub" style={{ marginTop: -4, marginBottom: 10 }}>FICO models rely on predictable mathematical weights. Review the baseline variables below to evaluate their tracking significance.</p>
              <div className="rt-master">
                <details className="rt-fac"><summary><span>Payment execution history</span> <span className="rt-pct">35%</span></summary><div className="body">The principal foundational weight. On-time minimum performance is paramount — single late cycles severely contract analytical optimizations. Auto-pay protections preserve this layer.</div></details>
                <details className="rt-fac"><summary><span>Capacity utilization ratios</span> <span className="rt-pct">30%</span></summary><div className="body">The rapid operational fix category. Approaching maximum limits alerts tracking algorithms. Minimizing card balances safely below 30% of thresholds elevates scoring velocity quickly.</div></details>
                <details className="rt-fac"><summary><span>Trade line historical age</span> <span className="rt-pct">15%</span></summary><div className="body">Structural timeline age. Long-standing accounts yield programmatic tracking stability. Avoid closing mature repository profiles right before property purchase applications.</div></details>
                <details className="rt-fac"><summary><span>New profile inquiry velocity</span> <span className="rt-pct">10%</span></summary><div className="body">The expansion alert area. Sourcing new revolving or commercial accounts concurrently triggers elevated exposure markers. Restrict credit activity when approaching active targets.</div></details>
                <details className="rt-fac"><summary><span>Diversified account mix</span> <span className="rt-pct">10%</span></summary><div className="body">Composition profiling. Scoring matrices favor balanced historical usage spanning revolving limits and installment contracts smoothly.</div></details>
              </div>
            </div>

            <div className="rt-card">
              <div className="rt-kicker">3 · Target capital & goals</div>
              <div className="rt-row">
                <div className="rt-field"><label>Target purchase price</label><input className="rt-input" type="number" value={price === 0 ? "" : price} placeholder="0" onChange={(e) => setPrice(Number(e.target.value))} /></div>
                {/* Applied user request suggestion for Down Payment Strategy text */}
                <div className="rt-field"><label>Down payment strategy <span className="hint">% (3.5% is suggested)</span></label><input className="rt-input" type="number" value={dpPct === 0 ? "" : dpPct} placeholder="0" onChange={(e) => setDpPct(Number(e.target.value))} /></div>
              </div>
              <div className="rt-row">
                {/* Applied user request text swap and alignment for Estimated Closing Costs text */}
                <div className="rt-field"><label>Estimated closing costs <span className="hint">% (3% is suggested)</span></label><input className="rt-input" type="number" step="0.1" value={closingPct === 0 ? "" : closingPct} placeholder="0" onChange={(e) => setClosingPct(Number(e.target.value))} /></div>
                <div className="rt-field"><label>Target baseline ceiling DTI <span className="hint">%</span></label><input className="rt-input" type="number" value={targetDti} onChange={(e) => setTargetDti(Number(e.target.value))} /></div>
              </div>
              <div className="rt-row">
                <div className="rt-field"><label>Current validated savings assets</label><input className="rt-input" type="number" value={saved === 0 ? "" : saved} placeholder="0" onChange={(e) => setSaved(Number(e.target.value))} /></div>
                <div className="rt-field"><label>Monthly regular savings velocity</label><input className="rt-input" type="number" value={monthly === 0 ? "" : monthly} placeholder="0" onChange={(e) => setMonthly(Number(e.target.value))} /></div>
              </div>
              
              <div style={{ marginTop: 18 }}>
                <div className="rt-save">
                  <button className="rt-btn prim" onClick={saveProgress}>Save Your Progress Safely</button>
                  {status && <span className="rt-status">{status}</span>}
                </div>
                <p className="rt-sub" style={{ marginTop: 8, fontSize: "12px", lineHeight: "1.4" }}>
                  <b>What does this button do?</b> Clicking this saves your numbers directly inside your phone or laptop's built-in web browser storage. Your data is completely private to you. You can safely close this window, come back later, and your workspace will automatically load back up exactly where you left off!
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: RESULTS */}
          <div>
            <div className="rt-card">
              <div className="rt-kicker">Analytical Readiness Score</div>
              <div className="rt-score">
                <div className="rt-ring" style={{ "--p": c.rs }}><div>{c.rs}</div></div>
                <div>
                  <div className="rt-sub">Baseline readiness projection — a formula tracking input debt-to-income weights, credit profile variables, and capital progress.</div>
                  <div style={{ marginTop: 8 }}><span className="rt-pillgreen">{c.rs > 74 ? "Optimal Horizon" : c.rs >= 50 ? "Advancing Progress" : "Building Foundation"}</span></div>
                </div>
              </div>
            </div>

            <div className="rt-card">
              <div className="rt-kicker">Debt-to-income parameters</div>
              <div className="rt-big" style={{ color: c.dti > (Number(targetDti) || 43) ? "var(--clay)" : "var(--green)" }}>{pctf(c.dti)}</div>
              <div className="rt-sub">Derived from total obligations of {fmt(c.totalPay)}/mo relative to gross inputs of {fmt(c.inc)}/mo</div>
              <div className="rt-line" style={{ marginTop: 10 }}><span>Target DTI ceiling threshold ({targetDti}%)</span><span>{fmt(c.maxDebt)}/mo</span></div>
              <div className="rt-line"><span>Estimated Housing Budget Cushion Room</span><span style={{ color: c.headroom < 0 ? "var(--red)" : "inherit" }}>{fmt(c.headroom)}/mo</span></div>
              <div className="rt-note">The cushion matrix models rough mechanical space between current obligations and your target ratio threshold limit. Treat this figure exclusively as an educational baseline reference.</div>
              {c.dti <= 45
                ? <div className="rt-note" style={{ borderLeftColor: "var(--green)", background: "#e7f3ef" }}>Calculated metrics reflect balanced foundational parameters relative to standard programmatic guidelines.</div>
                : <div style={{ marginTop: 14 }}>
                  <div className="rt-kicker" style={{ color: "var(--clay)" }}>Operational adjustment sequences</div>
                  <div className="rt-road">
                    <div className="rt-step"><div className="n">1</div><div className="t"><b>Target Complete Liability Extinguishment.</b> Direct adjustments toward clearing accounts that remove entire minimum statements quickly. Eliminating a whole recurring item compresses debt ratios faster than scattered principal reductions.</div></div>
                    <div className="rt-step"><div className="n">2</div><div className="t"><b>Enforce Trade Line Stability.</b> Restrict alternative retail line requests, vehicle financing, or accessory consumer accounts while preparing parameters. Maintain current positions steadily down.</div></div>
                    <div className="rt-step"><div className="n">3</div><div className="t"><b>Organize Historical Income Documentation.</b> Ensure access to clear 2-year verification paths covering bonus allocations, overtime variables, or secondary income streams to validate eligibility thresholds securely.</div></div>
                  </div>
                </div>}
            </div>

            <div className="rt-card">
              <div className="rt-kicker">Liability Priority Matrix — DTI Relief</div>
              <div className="rt-sub" style={{ marginBottom: 12 }}>Ranked by optimization efficiency — tracking which account liquidations eliminate the most monthly debt burden per dollar deployed.</div>
              {c.ranked.length === 0 && <div className="rt-sub">Declare outstanding liabilities to view optimization sequence rankings.</div>}
              {c.ranked.map((x, i) => (
                <div className="rt-prio" key={x.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <b>{i + 1}. {x.name || x.type}</b>
                    <span className="rt-sub">{fmt(x.payment)}/mo · Balance: {fmt(x.balance)}</span>
                  </div>
                  {x.flags.map(f => <span className="rt-flag" key={f}>{f}</span>)}
                </div>
              ))}
            </div>

            <div className="rt-card">
              <div className="rt-kicker">Capital Requirements Timeline Matrix</div>
              <div className="rt-line"><span>Down Payment Milestone Target</span><span>{fmt(c.dpGoal)}</span></div>
              <div className="rt-line"><span>Estimated Settlement Transaction Fees</span><span>{fmt(c.ccGoal)}</span></div>
              <div className="rt-line"><span>Total Cash Settlement Target Goal</span><span>{fmt(c.cashGoal)}</span></div>
              <div className="rt-bar"><i style={{ width: `${c.progress}%` }} /></div>
              <div className="rt-sub">{fmt(c.saved)} allocated · {pctf(c.progress)} of milestone verified · {fmt(c.remaining)} remaining</div>
              {c.months != null && <div className="rt-line" style={{ marginTop: 8 }}><span>Projected Accumulation Path (@ {fmt(monthly)}/mo velocity)</span><span>{c.months} Months · Target: {c.eta}</span></div>}
              
              <button onClick={triggerPrint} className="rt-btn action-btn">Print / Save PDF Report</button>
              
              <div className="rt-disc">
                This diagnostic software application serves exclusively as a mathematical engine for consumer structural planning. It does not process credit authorizations, formal loan application files, lending commitments, or qualification updates. Mechanical outputs vary based on shifting programmatic macro underwriting rules and localized property tax parameters.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
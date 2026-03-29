import { useState, useEffect } from "react";

const STORAGE_KEYS = {
  farmers: "rice_farmers",
  lots: "rice_lots",
  dryers: "rice_dryers",
  hulling: "rice_hulling",
};

const VARIETIES = ["ヒノヒカリ", "おてんとそだち", "もち米", "その他"];
const SERVICE_TYPES = ["乾燥のみ", "籾摺りのみ", "乾燥＋籾摺り"];
const DRYER_COUNT = 9;
const BAG_TYPES = ["新袋", "一空"];

// 乾燥機マスタ（名前・容量固定）
const DRYER_MASTER = [
  { id: 1, name: "乾燥機1B", capacity: "2.5" },
  { id: 2, name: "乾燥機2A", capacity: "3.5" },
  { id: 3, name: "乾燥機2B", capacity: "3" },
  { id: 4, name: "乾燥機3A", capacity: "3.5" },
  { id: 5, name: "乾燥機3B", capacity: "3" },
  { id: 6, name: "乾燥機4",  capacity: "3" },
  { id: 7, name: "乾燥機5",  capacity: "4.5" },
  { id: 8, name: "乾燥機6",  capacity: "5.5" },
  { id: 9, name: "乾燥機7",  capacity: "" },
];

// ===== カラーパレット：見やすさ最優先 =====
const C = {
  bg: "#f0f4f8",
  surface: "#ffffff",
  surfaceAlt: "#f8fafc",
  border: "#cbd5e1",
  text: "#1e293b",
  textSub: "#475569",
  textMuted: "#94a3b8",
  primary: "#1d4ed8",      // メインブルー
  primaryLight: "#dbeafe",
  primaryBorder: "#93c5fd",
  green: "#15803d",
  greenLight: "#dcfce7",
  greenBorder: "#86efac",
  orange: "#c2410c",
  orangeLight: "#ffedd5",
  orangeBorder: "#fdba74",
  red: "#be123c",
  redLight: "#ffe4e6",
  redBorder: "#fda4af",
  purple: "#7e22ce",
  purpleLight: "#f3e8ff",
  purpleBorder: "#d8b4fe",
  teal: "#0f766e",
  tealLight: "#ccfbf1",
  tealBorder: "#5eead4",
  gold: "#92400e",
  goldLight: "#fef3c7",
  goldBorder: "#fcd34d",
  sky: "#0369a1",
  skyLight: "#e0f2fe",
  skyBorder: "#7dd3fc",
};

const STATUS = {
  "空き":       { color: C.green,  bg: C.greenLight,  border: C.greenBorder },
  "乾燥中":     { color: C.orange, bg: C.orangeLight,  border: C.orangeBorder },
  "予約中":     { color: C.sky,    bg: C.skyLight,     border: C.skyBorder },
  "乾燥完了":   { color: C.purple, bg: C.purpleLight,  border: C.purpleBorder },
  "受付":       { color: C.textSub,bg: C.surfaceAlt,   border: C.border },
  "乾燥待ち":   { color: C.orange, bg: C.orangeLight,  border: C.orangeBorder },
  "籾摺り待ち": { color: C.purple, bg: C.purpleLight,  border: C.purpleBorder },
  "籾摺り中":   { color: C.red,    bg: C.redLight,     border: C.redBorder },
  "完了":       { color: C.green,  bg: C.greenLight,   border: C.greenBorder },
  "予約済":     { color: C.gold,   bg: C.goldLight,    border: C.goldBorder },
};

const defaultDryers = DRYER_MASTER.map(m => ({
  id: m.id, name: m.name, lotId: null, status: "空き", capacity: m.capacity,
}));

function loadData(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function saveData(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const dryerLabel = (id, dryersList) => {
  if (dryersList) { const d = dryersList.find(d => d.id === id); if (d?.name) return d.name; }
  const m = DRYER_MASTER.find(m => m.id === id);
  return m ? m.name : `乾燥機${id}`;
};
const googleMapsUrl = (addr) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;

// 時刻フォーマット
const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
};

// 残り時間計算（終了予定時刻から）
const calcRemaining = (endIso) => {
  if (!endIso) return null;
  const end = new Date(endIso);
  if (isNaN(end)) return null;
  const diff = end - new Date();
  if (diff <= 0) return "終了予定時刻を過ぎています";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `残り約 ${h}時間${m}分` : `残り約 ${m}分`;
};

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [reportSort, setReportSort] = useState({ key: "date", dir: "asc" });
  const [farmers, setFarmers] = useState(() => loadData(STORAGE_KEYS.farmers, []));
  const [lots, setLots] = useState(() => loadData(STORAGE_KEYS.lots, []));
  const [dryers, setDryers] = useState(() => loadData(STORAGE_KEYS.dryers, defaultDryers));
  const [hulling, setHulling] = useState(() => loadData(STORAGE_KEYS.hulling, []));
  const [modal, setModal] = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);
  const [selectedHulling, setSelectedHulling] = useState(null);
  const [selectedDryer, setSelectedDryer] = useState(null);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { saveData(STORAGE_KEYS.farmers, farmers); }, [farmers]);
  useEffect(() => { saveData(STORAGE_KEYS.lots, lots); }, [lots]);
  useEffect(() => { saveData(STORAGE_KEYS.dryers, dryers); }, [dryers]);
  useEffect(() => { saveData(STORAGE_KEYS.hulling, hulling); }, [hulling]);

  const addFarmer = () => {
    if (!form.name) return;
    setFarmers(prev => [...prev, { id: Date.now(), name: form.name, phone: form.phone || "", address: form.address || "", district: form.district || "", service: form.service || "乾燥＋籾摺り", note: form.note || "" }]);
    setModal(null); setForm({});
  };
  const editFarmer = () => {
    if (!form.name || !selectedFarmer) return;
    setFarmers(prev => prev.map(f => f.id === selectedFarmer.id ? { ...f, name: form.name, phone: form.phone || "", address: form.address || "", district: form.district || "", service: form.service || "乾燥＋籾摺り", note: form.note || "" } : f));
    setSelectedFarmer(null); setModal(null); setForm({});
  };
  const addLot = () => {
    if (!form.farmerId) return;
    setLots(prev => [...prev, { id: Date.now(), farmerId: Number(form.farmerId), variety: form.variety || "ヒノヒカリ", tanIn: form.tanIn || "", bagsIn: Number(form.bagsIn) || 0, bagType: form.bagType || "新袋", moistureIn: form.moistureIn || "", moistureOut: "", receivedAt: form.receivedAt || new Date().toISOString().slice(0, 10), status: "受付", dryerId: form.dryerId ? Number(form.dryerId) : null, dryStartAt: null, dryEndAt: null, hullingId: null, fee: Number(form.fee) || 0, paid: false, note: form.note || "" }]);
    if (form.dryerId) setDryers(prev => prev.map(d => d.id === Number(form.dryerId) ? { ...d, status: "予約中" } : d));
    setModal(null); setForm({});
  };
  const assignDryer = (dryerId) => {
    if (!selectedLot) return;
    const now = new Date().toISOString().slice(0, 10);
    setDryers(prev => prev.map(d => d.id === dryerId ? { ...d, lotId: selectedLot.id, status: "乾燥中" } : d));
    setLots(prev => prev.map(l => l.id === selectedLot.id ? { ...l, dryerId, dryStartAt: now, status: "乾燥中" } : l));
    setSelectedLot(null); setModal(null);
  };
  const startDrying = (lotId) => {
    const lot = lots.find(l => l.id === lotId);
    if (!lot || !lot.dryerId) return;
    const now = new Date().toISOString();
    setDryers(prev => prev.map(d => d.id === lot.dryerId ? { ...d, lotId, status: "乾燥中" } : d));
    setLots(prev => prev.map(l => l.id === lotId ? { ...l, dryStartAt: now, status: "乾燥中" } : l));
  };
  const completeDrying = (lotId) => {
    const now = new Date().toISOString().slice(0, 10);
    setLots(prev => prev.map(l => l.id === lotId ? { ...l, status: "乾燥完了", dryEndAt: now, moistureOut: form.moistureOut || l.moistureOut } : l));
    setDryers(prev => prev.map(d => d.lotId === lotId ? { ...d, lotId: null, status: "空き" } : d));
    setModal(null); setForm({});
  };
  const scheduleHulling = () => {
    if (!selectedLot || !form.hullingDate) return;
    const h = { id: Date.now(), lotId: selectedLot.id, date: form.hullingDate, status: "予約済", note: form.note || "" };
    setHulling(prev => [...prev, h]);
    setLots(prev => prev.map(l => l.id === selectedLot.id ? { ...l, hullingId: h.id, status: "籾摺り待ち" } : l));
    setSelectedLot(null); setModal(null); setForm({});
  };
  const startHulling = (hId) => {
    setHulling(prev => prev.map(h => h.id === hId ? { ...h, status: "籾摺り中" } : h));
    const h = hulling.find(h => h.id === hId);
    if (h) setLots(prev => prev.map(l => l.id === h.lotId ? { ...l, status: "籾摺り中" } : l));
  };
  const saveHullingResult = (isEdit) => {
    if (!selectedHulling) return;
    const result = { jaSupply: form.jaSupply || "", agriSupply: form.agriSupply || "", otherSupply: form.otherSupply || "", iimaiCount: form.iimaiCount || "", iimaiType: form.iimaiType || "新袋", momiKanso: form.momiKanso || "", kuzuMai: form.kuzuMai || "", zanMai: form.zanMai || "", tanBetsu: form.tanBetsu || "", moisture: form.moisture || "", resultNote: form.resultNote || "", feeHulling: form.feeHulling || "", feeDrying: form.feeDrying || "", feeBag: form.feeBag || "", feeKuzu: form.feeKuzu || "", feeOther: form.feeOther || "" };
    setHulling(prev => prev.map(h => h.id === selectedHulling.id ? { ...h, status: isEdit ? h.status : "完了", result } : h));
    if (!isEdit) {
      const h = hulling.find(h => h.id === selectedHulling.id);
      if (h) setLots(prev => prev.map(l => l.id === h.lotId ? { ...l, status: "完了" } : l));
    }
    setSelectedHulling(null); setModal(null); setForm({});
  };
  const saveDryerCapacity = () => {
    if (!selectedDryer) return;
    setDryers(prev => prev.map(d => d.id === selectedDryer.id ? { ...d, capacity: form.capacity || "" } : d));
    setSelectedDryer(null); setModal(null); setForm({});
  };
  const togglePaid = (lotId) => setLots(prev => prev.map(l => l.id === lotId ? { ...l, paid: !l.paid } : l));

  const getFarmer = (id) => farmers.find(f => f.id === id);
  const getLot = (id) => lots.find(l => l.id === id);
  const getDryer = (id) => dryers.find(d => d.id === id);

  const activeLots = lots.filter(l => l.status !== "完了");
  const waitingLots = lots.filter(l => (l.status === "受付" || l.status === "乾燥待ち") && !l.dryerId);
  const reservedLots = lots.filter(l => l.status === "受付" && l.dryerId);
  const dryingLots = lots.filter(l => l.status === "乾燥中");
  const hullingWaitLots = lots.filter(l => l.status === "乾燥完了");
  const activeHulling = hulling.filter(h => h.status !== "完了");
  const completedHulling = hulling.filter(h => h.status === "完了");

  const TABS = [
    { id: "dashboard", label: "ダッシュボード" },
    { id: "dryers",    label: "乾燥機管理" },
    { id: "reception", label: "受付・持込" },
    { id: "hulling",   label: "籾摺り" },
    { id: "history",   label: "精算管理" },
    { id: "report",    label: "実績日報" },
    { id: "farmers",   label: "顧客管理" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif", fontSize: 16 }}>

      {/* ヘッダー */}
      <header style={{ background: C.primary, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 28 }}>🌾</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: "800", color: "#ffffff", letterSpacing: 1 }}>ライスセンター管理システム</div>
            <div style={{ fontSize: 12, color: "#bfdbfe" }}>乾燥機10台・籾摺り実績管理</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#bfdbfe", fontWeight: "600" }}>
          {new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
        </div>
      </header>

      {/* ナビ */}
      <nav style={{ background: "#1e3a8a", display: "flex", overflowX: "auto", borderBottom: "3px solid #1d4ed8" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "14px 18px", background: "none", border: "none", cursor: "pointer",
            color: tab === t.id ? "#ffffff" : "#93c5fd",
            borderBottom: tab === t.id ? "3px solid #60a5fa" : "3px solid transparent",
            marginBottom: -3,
            fontFamily: "inherit", fontSize: 15, whiteSpace: "nowrap",
            fontWeight: tab === t.id ? "700" : "400",
          }}>{t.label}</button>
        ))}
      </nav>

      <main style={{ padding: "24px 16px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ===== ダッシュボード ===== */}
        {tab === "dashboard" && (
          <div>
            <SectionTitle>本日の状況</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 28 }}>
              {[
                { label: "稼働中乾燥機", value: dryingLots.length, unit: "/ 10台", color: C.orange, bg: C.orangeLight, border: C.orangeBorder },
                { label: "空き乾燥機",   value: dryers.filter(d=>d.status==="空き").length, unit: "台", color: C.green, bg: C.greenLight, border: C.greenBorder },
                { label: "予約中",       value: dryers.filter(d=>d.status==="予約中").length, unit: "台", color: C.sky, bg: C.skyLight, border: C.skyBorder },
                { label: "籾摺り予定",   value: activeHulling.length, unit: "件", color: C.purple, bg: C.purpleLight, border: C.purpleBorder },
                { label: "今季完了",     value: completedHulling.length, unit: "件", color: C.teal, bg: C.tealLight, border: C.tealBorder },
                { label: "未精算",       value: lots.filter(l=>!l.paid&&l.fee>0).length, unit: "件", color: C.red, bg: C.redLight, border: C.redBorder },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, border: `2px solid ${s.border}`, borderRadius: 12, padding: "16px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: "800", color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 13, color: s.color, fontWeight: "600", marginTop: 2 }}>{s.unit}</div>
                  <div style={{ fontSize: 13, color: C.textSub, marginTop: 6, fontWeight: "600" }}>{s.label}</div>
                </div>
              ))}
            </div>

            <SectionTitle>乾燥機一覧</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 28 }}>
              {dryers.map(d => {
                const lot = d.lotId ? getLot(d.lotId) : d.status === "予約中" ? lots.find(l => l.dryerId === d.id) : null;
                const farmer = lot ? getFarmer(lot.farmerId) : null;
                const ss = STATUS[d.status] || { color: C.textSub, bg: C.surfaceAlt, border: C.border };
                return (
                  <div key={d.id} style={{ background: ss.bg, border: `2px solid ${ss.border}`, borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: C.textSub, fontWeight: "700", marginBottom: 4 }}>{dryerLabel(d.id, dryers)}</div>
                    {d.capacity && <div style={{ fontSize: 12, color: C.green, fontWeight: "600", marginBottom: 4 }}>{d.capacity}石</div>}
                    <div style={{ fontSize: 13, color: ss.color, fontWeight: "800", marginBottom: 6, background: C.surface, padding: "2px 6px", borderRadius: 6, display: "inline-block", border: `1px solid ${ss.border}` }}>{d.status}</div>
                    {farmer && <div style={{ fontSize: 14, color: C.text, fontWeight: "700", marginTop: 4 }}>{farmer.name}</div>}
                    {lot && <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{lot.variety}</div>}
                    {d.status === "乾燥中" && lot?.dryEndScheduled && (
                      <div style={{ fontSize: 11, color: new Date(lot.dryEndScheduled) < new Date() ? C.red : C.orange, fontWeight: "700", marginTop: 4 }}>
                        {calcRemaining(lot.dryEndScheduled)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {reservedLots.length > 0 && (
              <AlertBox color={C.sky} bg={C.skyLight} border={C.skyBorder} title="🔵 乾燥機予約済み・開始待ち">
                {reservedLots.map(lot => {
                  const farmer = getFarmer(lot.farmerId);
                  return (
                    <AlertRow key={lot.id}>
                      <span style={{ fontSize: 16, fontWeight: "700" }}>{farmer?.name}</span>
                      <span style={{ fontSize: 14, color: C.textSub, marginLeft: 8 }}>{lot.variety} / {lot.tanIn}反 → {dryerLabel(getDryer(lot.dryerId)?.id)}</span>
                      <Btn color={C.orange} onClick={() => { setSelectedLot(lot); setForm({ dryEndScheduled: "" }); setModal("startDrying"); }}>乾燥開始</Btn>
                    </AlertRow>
                  );
                })}
              </AlertBox>
            )}
            {waitingLots.length > 0 && (
              <AlertBox color={C.orange} bg={C.orangeLight} border={C.orangeBorder} title="⚠️ 乾燥機未割り当て">
                {waitingLots.map(lot => {
                  const farmer = getFarmer(lot.farmerId);
                  return (
                    <AlertRow key={lot.id}>
                      <span style={{ fontSize: 16, fontWeight: "700" }}>{farmer?.name}</span>
                      <span style={{ fontSize: 14, color: C.textSub, marginLeft: 8 }}>{lot.variety} / {lot.tanIn}反</span>
                      <Btn color={C.orange} onClick={() => { setSelectedLot(lot); setModal("assignDryer"); }}>割り当て</Btn>
                    </AlertRow>
                  );
                })}
              </AlertBox>
            )}
            {hullingWaitLots.length > 0 && (
              <AlertBox color={C.purple} bg={C.purpleLight} border={C.purpleBorder} title="💡 籾摺りスケジュール未設定">
                {hullingWaitLots.map(lot => {
                  const farmer = getFarmer(lot.farmerId);
                  return (
                    <AlertRow key={lot.id}>
                      <span style={{ fontSize: 16, fontWeight: "700" }}>{farmer?.name}</span>
                      <span style={{ fontSize: 14, color: C.textSub, marginLeft: 8 }}>{lot.variety}</span>
                      <Btn color={C.purple} onClick={() => { setSelectedLot(lot); setModal("hullingSchedule"); }}>日程を設定</Btn>
                    </AlertRow>
                  );
                })}
              </AlertBox>
            )}
          </div>
        )}

        {/* ===== 乾燥機管理 ===== */}
        {tab === "dryers" && (
          <div>
            <SectionTitle>乾燥機管理</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {dryers.map(d => {
                const lot = d.lotId ? getLot(d.lotId) : d.status === "予約中" ? lots.find(l => l.dryerId === d.id) : null;
                const farmer = lot ? getFarmer(lot.farmerId) : null;
                const ss = STATUS[d.status] || { color: C.textSub, bg: C.surfaceAlt, border: C.border };
                const remaining = lot?.dryEndScheduled ? calcRemaining(lot.dryEndScheduled) : null;
                const isOverdue = lot?.dryEndScheduled && new Date(lot.dryEndScheduled) < new Date();
                return (
                  <div key={d.id} style={{ background: C.surface, border: `2px solid ${isOverdue ? C.red : ss.border}`, borderRadius: 14, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 18, color: C.text, fontWeight: "800" }}>{dryerLabel(d.id, dryers)}</span>
                      <span style={{ fontSize: 14, background: ss.bg, color: ss.color, padding: "4px 12px", borderRadius: 20, border: `1px solid ${ss.border}`, fontWeight: "700" }}>{d.status}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 15, color: C.textSub }}>容量: <b style={{ color: C.green }}>{d.capacity ? d.capacity + "石" : "未設定"}</b></span>
                    </div>
                    {lot && farmer ? (
                      <div>
                        <Row label="顧客" value={farmer.name} />
                        <Row label="品種" value={lot.variety} />
                        <Row label="持込" value={`${lot.tanIn}反 / ${lot.bagsIn}袋（${lot.bagType}）`} />
                        <Row label="水分(入)" value={lot.moistureIn ? lot.moistureIn + "%" : "—"} />
                        {d.status === "乾燥中" && (
                          <>
                            <Row label="開始時刻" value={fmtDateTime(lot.dryStartAt)} />
                            <Row label="終了予定" value={fmtDateTime(lot.dryEndScheduled)} />
                            {remaining && (
                              <div style={{ marginTop: 8, background: isOverdue ? C.redLight : C.orangeLight, border: `1px solid ${isOverdue ? C.redBorder : C.orangeBorder}`, borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
                                <span style={{ fontSize: 15, fontWeight: "800", color: isOverdue ? C.red : C.orange }}>{remaining}</span>
                              </div>
                            )}
                          </>
                        )}
                        {d.status === "予約中" && (
                          <Row label="受付日" value={lot.receivedAt} />
                        )}
                        <div style={{ marginTop: 12 }}>
                          {d.status === "乾燥中" && <Btn color={C.green} full onClick={() => { setSelectedLot(lot); setModal("completeDrying"); }}>乾燥完了にする</Btn>}
                          {d.status === "予約中" && <Btn color={C.orange} full onClick={() => { setSelectedLot(lot); setForm({ dryEndScheduled: "" }); setModal("startDrying"); }}>乾燥開始</Btn>}
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: "16px 0", color: C.green }}>
                        <div style={{ fontSize: 32 }}>✓</div>
                        <div style={{ fontSize: 16, fontWeight: "700", marginTop: 4 }}>空き</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== 受付・持込 ===== */}
        {tab === "reception" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <SectionTitle noMargin>受付・持込管理</SectionTitle>
              <Btn color={C.primary} onClick={() => { setForm({}); setModal("addLot"); }}>＋ 新規受付</Btn>
            </div>
            {activeLots.length === 0 && <Empty />}
            {activeLots.map(lot => {
              const farmer = getFarmer(lot.farmerId);
              const dryer = lot.dryerId ? getDryer(lot.dryerId) : null;
              const ss = STATUS[lot.status] || { color: C.textSub, bg: C.surfaceAlt, border: C.border };
              return (
                <div key={lot.id} style={{ background: C.surface, border: `2px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 12, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18, color: C.text, fontWeight: "800" }}>{farmer?.name}</span>
                      <span style={{ fontSize: 14, background: ss.bg, color: ss.color, padding: "4px 12px", borderRadius: 20, border: `1px solid ${ss.border}`, fontWeight: "700" }}>{lot.status}</span>
                    </div>
                    <span style={{ fontSize: 14, color: C.textMuted }}>受付日: {lot.receivedAt}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginBottom: 14 }}>
                    {[["品種", lot.variety], ["持込量", `${lot.tanIn}反`], ["袋数", `${lot.bagsIn}袋（${lot.bagType}）`], ["水分(入)", lot.moistureIn ? lot.moistureIn + "%" : "—"], ["水分(出)", lot.moistureOut ? lot.moistureOut + "%" : "—"], ["乾燥機", dryer ? dryerLabel(dryer.id, dryers) : "未割当"]].map(([l, v]) => (
                      <div key={l} style={{ background: C.surfaceAlt, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 15, color: C.text, fontWeight: "700" }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {lot.status === "受付" && !lot.dryerId && <Btn color={C.orange} onClick={() => { setSelectedLot(lot); setModal("assignDryer"); }}>乾燥機を割り当て</Btn>}
                    {lot.status === "受付" && lot.dryerId && <Btn color={C.sky} onClick={() => { setSelectedLot(lot); setForm({ dryEndScheduled: "" }); setModal("startDrying"); }}>乾燥開始</Btn>}
                    {lot.status === "乾燥中" && <Btn color={C.green} onClick={() => { setSelectedLot(lot); setModal("completeDrying"); }}>乾燥完了</Btn>}
                    {lot.status === "乾燥完了" && <Btn color={C.purple} onClick={() => { setSelectedLot(lot); setModal("hullingSchedule"); }}>籾摺り日程を設定</Btn>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== 籾摺り ===== */}
        {tab === "hulling" && (
          <div>
            <SectionTitle>籾摺りスケジュール</SectionTitle>
            {activeHulling.length === 0 && <Empty />}
            {[...activeHulling].sort((a, b) => a.date > b.date ? 1 : -1).map(h => {
              const lot = getLot(h.lotId);
              const farmer = lot ? getFarmer(lot.farmerId) : null;
              const ss = STATUS[h.status] || { color: C.textSub, bg: C.surfaceAlt, border: C.border };
              return (
                <div key={h.id} style={{ background: C.surface, border: `2px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18, fontWeight: "800" }}>{farmer?.name || "不明"}</span>
                      <span style={{ fontSize: 14, background: ss.bg, color: ss.color, padding: "4px 12px", borderRadius: 20, border: `1px solid ${ss.border}`, fontWeight: "700" }}>{h.status}</span>
                    </div>
                    <div style={{ fontSize: 15, color: C.gold, fontWeight: "700", background: C.goldLight, padding: "6px 14px", borderRadius: 10, border: `1px solid ${C.goldBorder}` }}>📅 {h.date}</div>
                  </div>
                  {lot && <div style={{ fontSize: 15, color: C.textSub, marginBottom: 8 }}>{lot.variety} / {lot.tanIn}反 / {lot.bagsIn}袋（{lot.bagType || "新袋"}）</div>}
                  {h.note && <div style={{ fontSize: 14, color: C.textMuted }}>備考: {h.note}</div>}
                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    {h.status === "予約済" && <Btn color={C.red} onClick={() => startHulling(h.id)}>籾摺り開始</Btn>}
                    {h.status === "籾摺り中" && <Btn color={C.teal} onClick={() => { setSelectedHulling(h); setForm({}); setModal("completeHulling"); }}>実績を入力して完了</Btn>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== 実績日報 ===== */}
        {tab === "report" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <SectionTitle noMargin>籾摺り実績日報</SectionTitle>
              {completedHulling.length > 0 && (
                <button onClick={() => {
                  // SheetJSを動的に読み込んでExcel出力
                  const script = document.createElement("script");
                  script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
                  script.onload = () => {
                    const XLSX = window.XLSX;
                    const headers = ["日付","氏名","品種","反別","JA供出","アグリ供出","他供出","飯米","籾乾燥","くず米","残米","水分","その他備考","籾摺り賃","籾乾燥賃","米袋代","くず米代（返金）","その他費用","請求合計"];
                    const rows = [...completedHulling].sort((a, b) => a.date > b.date ? 1 : -1).map(h => {
                      const lot = getLot(h.lotId);
                      const farmer = lot ? getFarmer(lot.farmerId) : null;
                      const r = h.result || {};
                      const total = (Number(r.feeHulling)||0) + (Number(r.feeDrying)||0) + (Number(r.feeBag)||0) - (Number(r.feeKuzu)||0);
                      return [
                        h.date || "",
                        farmer?.name || "",
                        lot?.variety || "",
                        r.tanBetsu || lot?.tanIn || "",
                        r.jaSupply || "",
                        r.agriSupply || "",
                        r.otherSupply || "",
                        r.iimaiCount ? `${r.iimaiType === "一空" ? "一空" : "新"}${r.iimaiCount}` : "",
                        r.momiKanso || "",
                        r.kuzuMai || "",
                        r.zanMai || "",
                        r.moisture || lot?.moistureOut || "",
                        r.resultNote || "",
                        r.feeHulling ? Number(r.feeHulling) : "",
                        r.feeDrying ? Number(r.feeDrying) : "",
                        r.feeBag ? Number(r.feeBag) : "",
                        r.feeKuzu ? Number(r.feeKuzu) : "",
                        r.feeOther || "",
                        total > 0 ? total : "",
                      ];
                    });
                    const wsData = [headers, ...rows];
                    const ws = XLSX.utils.aoa_to_sheet(wsData);
                    // 列幅設定
                    ws["!cols"] = [
                      {wch:12},{wch:14},{wch:14},{wch:8},{wch:9},{wch:11},{wch:9},{wch:10},
                      {wch:12},{wch:9},{wch:9},{wch:8},{wch:16},{wch:11},{wch:11},{wch:9},{wch:13},{wch:12},{wch:11}
                    ];
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "籾摺り実績日報");
                    const year = new Date().getFullYear();
                    XLSX.writeFile(wb, `籾摺り実績日報_${year}.xlsx`);
                  };
                  script.onerror = () => alert("ダウンロードに失敗しました。インターネット接続を確認してください。");
                  document.head.appendChild(script);
                }} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontSize: 15, fontFamily: "inherit", fontWeight: "700", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 4px rgba(0,0,0,0.15)" }}>
                  📥 Excelで出力
                </button>
              )}
            </div>
            {completedHulling.length === 0 && <Empty />}
            {completedHulling.length > 0 && (
              <div style={{ background: C.surface, borderRadius: 14, border: `2px solid ${C.border}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                    <thead>
                      <tr style={{ background: C.primary }}>
                        {[
                          { label: "日付", key: "date" },
                          { label: "氏名", key: "name" },
                          { label: "JA供出", key: "jaSupply" },
                          { label: "アグリ供出", key: "agriSupply" },
                          { label: "他供出", key: "otherSupply" },
                        ].map(col => (
                          <th key={col.key} onClick={() => setReportSort(prev => ({ key: col.key, dir: prev.key === col.key && prev.dir === "asc" ? "desc" : "asc" }))} style={{ padding: "12px 10px", color: "#ffffff", textAlign: "center", whiteSpace: "nowrap", fontWeight: "700", fontSize: 14, cursor: "pointer", userSelect: "none", background: reportSort.key === col.key ? "#1e40af" : C.primary }}>
                            {col.label} {reportSort.key === col.key ? (reportSort.dir === "asc" ? "▲" : "▼") : "⇅"}
                          </th>
                        ))}
                        {["飯米","籾乾燥","くず米","残米","反別","水分","その他","籾摺り賃","籾乾燥賃","米袋代","くず米代","その他費用","操作"].map((h, i) => (
                          <th key={i} style={{ padding: "12px 10px", color: "#ffffff", textAlign: "center", whiteSpace: "nowrap", fontWeight: "700", fontSize: 14 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...completedHulling].sort((a, b) => {
                        const lotA = getLot(a.lotId); const lotB = getLot(b.lotId);
                        const farmerA = lotA ? getFarmer(lotA.farmerId) : null;
                        const farmerB = lotB ? getFarmer(lotB.farmerId) : null;
                        const rA = a.result || {}; const rB = b.result || {};
                        let valA, valB;
                        if (reportSort.key === "date") { valA = a.date || ""; valB = b.date || ""; }
                        else if (reportSort.key === "name") { valA = farmerA?.name || ""; valB = farmerB?.name || ""; }
                        else if (reportSort.key === "jaSupply") { valA = Number(rA.jaSupply) || 0; valB = Number(rB.jaSupply) || 0; }
                        else if (reportSort.key === "agriSupply") { valA = Number(rA.agriSupply) || 0; valB = Number(rB.agriSupply) || 0; }
                        else if (reportSort.key === "otherSupply") { valA = Number(rA.otherSupply) || 0; valB = Number(rB.otherSupply) || 0; }
                        else { valA = a.date || ""; valB = b.date || ""; }
                        if (valA < valB) return reportSort.dir === "asc" ? -1 : 1;
                        if (valA > valB) return reportSort.dir === "asc" ? 1 : -1;
                        return 0;
                      }).map((h, i) => {
                        const lot = getLot(h.lotId);
                        const farmer = lot ? getFarmer(lot.farmerId) : null;
                        const r = h.result || {};
                        return (
                          <tr key={h.id} style={{ background: i % 2 === 0 ? C.surface : C.surfaceAlt, borderBottom: `1px solid ${C.border}` }}>
                            <td style={TD}>{h.date?.slice(5)}</td>
                            <td style={{ ...TD, fontWeight: "700", color: C.text, fontSize: 15 }}>{farmer?.name || "—"}</td>
                            <td style={TD}>{r.jaSupply || "—"}</td>
                            <td style={TD}>{r.agriSupply || "—"}</td>
                            <td style={TD}>{r.otherSupply || "—"}</td>
                            <td style={TD}>{r.iimaiCount ? `${r.iimaiType === "一空" ? "一空" : "新"}${r.iimaiCount}` : "—"}</td>
                            <td style={TD}>{r.momiKanso || "—"}</td>
                            <td style={TD}>{r.kuzuMai || "—"}</td>
                            <td style={TD}>{r.zanMai || "—"}</td>
                            <td style={TD}>{r.tanBetsu || lot?.tanIn || "—"}</td>
                            <td style={TD}>{r.moisture || lot?.moistureOut || "—"}</td>
                            <td style={{ ...TD, color: C.textSub }}>{r.resultNote || "—"}</td>
                            <td style={{ ...TD, color: C.green, fontWeight: "700" }}>{r.feeHulling ? `¥${Number(r.feeHulling).toLocaleString()}` : "—"}</td>
                            <td style={{ ...TD, color: C.green, fontWeight: "700" }}>{r.feeDrying ? `¥${Number(r.feeDrying).toLocaleString()}` : "—"}</td>
                            <td style={{ ...TD, color: C.green, fontWeight: "700" }}>{r.feeBag ? `¥${Number(r.feeBag).toLocaleString()}` : "—"}</td>
                            <td style={{ ...TD, color: C.green, fontWeight: "700" }}>{r.feeKuzu ? `¥${Number(r.feeKuzu).toLocaleString()}` : "—"}</td>
                            <td style={{ ...TD, color: C.textSub }}>{r.feeOther || "—"}</td>
                            <td style={TD}>
                              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                <button onClick={() => { setSelectedHulling(h); setForm({ ...r, feeHulling: r.feeHulling || "", feeDrying: r.feeDrying || "", feeBag: r.feeBag || "", feeKuzu: r.feeKuzu || "", feeOther: r.feeOther || "" }); setModal("editHulling"); }} style={smallBtn(C.gold)}>✏️ 訂正</button>
                                <button onClick={() => {
                                  const name = farmer?.name || "";
                                  const variety = lot?.variety || "";
                                  const tan = r.tanBetsu || lot?.tanIn || "";
                                  const date = h.date || "";
                                  const moisture = r.moisture || lot?.moistureOut || "";
                                  const fee = lot?.fee ? `¥${Number(lot.fee).toLocaleString()}` : "未設定";
                                  const feeHulling = r.feeHulling ? `籾摺り賃: ¥${Number(r.feeHulling).toLocaleString()}` : "";
                                  const feeDrying = r.feeDrying ? `籾乾燥賃: ¥${Number(r.feeDrying).toLocaleString()}` : "";
                                  const feeBag = r.feeBag ? `米袋代: ¥${Number(r.feeBag).toLocaleString()}` : "";
                                  const feeKuzu = r.feeKuzu ? `くず米代: ¥${Number(r.feeKuzu).toLocaleString()}` : "";
                                  const feeOther = r.feeOther ? `その他: ${r.feeOther}` : "";
                                  const feeLines = [feeHulling, feeDrying, feeBag, feeKuzu, feeOther].filter(Boolean).join("\n");
                                  const totalFee = [r.feeHulling, r.feeDrying, r.feeBag, r.feeKuzu].reduce((sum, v) => sum + (Number(v) || 0), 0);
                                  const totalLine = totalFee > 0 ? `\n合計: ¥${totalFee.toLocaleString()}` : "";
                                  const supplies = [
                                    r.jaSupply ? `JA供出: ${r.jaSupply}袋` : "",
                                    r.agriSupply ? `アグリ供出: ${r.agriSupply}袋` : "",
                                    r.otherSupply ? `他供出: ${r.otherSupply}袋` : "",
                                    r.iimaiCount ? `飯米: ${r.iimaiType === "一空" ? "一空" : "新"}${r.iimaiCount}袋` : "",
                                  ].filter(Boolean).join("\n");
                                  const msg = `【籾摺り完了のお知らせ】\n${name} 様\n\n籾摺り作業が完了しましたのでお知らせします。\n\n品種: ${variety}\n反別: ${tan}反\n完了日: ${date}\n水分値: ${moisture}%\n\n${supplies}\n\n【精算金額】\n${feeLines}${totalLine}\n\nよろしくお願いいたします。`;
                                  navigator.clipboard.writeText(msg).then(() => alert("LINEメッセージをコピーしました！")).catch(() => alert("コピーに失敗しました"));
                                }} style={smallBtn(C.green)}>📋 LINEコピー</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== 顧客管理 ===== */}
        {tab === "farmers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <SectionTitle noMargin>顧客管理</SectionTitle>
              <Btn color={C.primary} onClick={() => { setForm({}); setModal("addFarmer"); }}>＋ 顧客を登録</Btn>
            </div>
            {farmers.length === 0 && <Empty />}
            {farmers.map(f => {
              const fl = lots.filter(l => l.farmerId === f.id);
              const afl = fl.filter(l => l.status !== "完了");
              return (
                <div key={f.id} style={{ background: C.surface, border: `2px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 12, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 20, color: C.text, fontWeight: "800", marginBottom: 8 }}>{f.name}</div>
                      {f.phone && (
                        <a href={`tel:${f.phone}`} style={{ fontSize: 16, color: C.primary, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.primaryLight, padding: "6px 14px", borderRadius: 24, border: `1px solid ${C.primaryBorder}`, fontWeight: "600", marginBottom: 8 }}>
                          📞 {f.phone}
                        </a>
                      )}
                      {f.district && <div style={{ fontSize: 15, color: C.textSub, marginBottom: 4, fontWeight: "600" }}>📍 {f.district}</div>}
                      {f.address && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                          <span style={{ fontSize: 15, color: C.textSub }}>{f.address}</span>
                          <a href={googleMapsUrl(f.address)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: C.teal, border: `1px solid ${C.tealBorder}`, borderRadius: 20, padding: "4px 12px", textDecoration: "none", background: C.tealLight, fontWeight: "600", whiteSpace: "nowrap" }}>🗺️ マップ</a>
                        </div>
                      )}
                      <span style={{ fontSize: 14, color: C.primary, background: C.primaryLight, padding: "4px 12px", borderRadius: 20, border: `1px solid ${C.primaryBorder}`, fontWeight: "600" }}>{f.service}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, marginLeft: 12 }}>
                      <button onClick={() => { setSelectedFarmer(f); setForm({ name: f.name, phone: f.phone, address: f.address, district: f.district, service: f.service, note: f.note }); setModal("editFarmer"); }} style={smallBtn(C.gold)}>✏️ 編集</button>
                      <div style={{ fontSize: 14, color: C.textMuted }}>今季: {fl.length}件</div>
                      {afl.length > 0 && <div style={{ fontSize: 14, color: C.orange, fontWeight: "700" }}>対応中: {afl.length}件</div>}
                    </div>
                  </div>
                  {f.note && <div style={{ fontSize: 14, color: C.textMuted, marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>備考: {f.note}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* ===== 精算管理 ===== */}
        {tab === "history" && (
          <div>
            <SectionTitle>精算管理</SectionTitle>
            {lots.length === 0 && <Empty />}
            {[...lots].reverse().map(lot => {
              const farmer = getFarmer(lot.farmerId);
              const ss = STATUS[lot.status] || { color: C.textSub, bg: C.surfaceAlt, border: C.border };
              const hullRec = hulling.find(h => h.lotId === lot.id && h.result);
              const r = hullRec?.result || lot.directFee || {};
              const totalFee = (Number(r.feeHulling) || 0) + (Number(r.feeDrying) || 0) + (Number(r.feeBag) || 0) - (Number(r.feeKuzu) || 0);
              return (
                <div key={lot.id} style={{ background: C.surface, border: `2px solid ${C.border}`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
                  {/* ヘッダー行 */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20, fontWeight: "800" }}>{farmer?.name}</span>
                      <span style={{ fontSize: 14, background: ss.bg, color: ss.color, padding: "4px 12px", borderRadius: 20, border: `1px solid ${ss.border}`, fontWeight: "700" }}>{lot.status}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {totalFee > 0 && (
                        <span style={{ fontSize: 17, color: lot.paid ? C.green : C.red, fontWeight: "800" }}>
                          合計 ¥{totalFee.toLocaleString()} {lot.paid ? "✓ 精算済" : "未精算"}
                        </span>
                      )}
                      {totalFee > 0 && (
                        <button onClick={() => togglePaid(lot.id)} style={smallBtn(lot.paid ? C.textSub : C.green)}>
                          {lot.paid ? "未精算に戻す" : "精算済みにする"}
                        </button>
                      )}
                      <button onClick={() => { setSelectedLot(lot); setForm({ feeHulling: r.feeHulling || "", feeDrying: r.feeDrying || "", feeBag: r.feeBag || "", feeKuzu: r.feeKuzu || "", feeOther: r.feeOther || "" }); setModal("editFee"); }} style={smallBtn(C.gold)}>💰 金額を入力</button>
                    </div>
                  </div>

                  {/* 基本情報 */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, marginBottom: 14 }}>
                    {[
                      ["品種", lot.variety],
                      ["受付日", lot.receivedAt],
                      ["持込量", `${lot.tanIn}反`],
                      ["袋数", `${lot.bagsIn}袋（${lot.bagType || "新袋"}）`],
                      ["水分(入)", lot.moistureIn ? lot.moistureIn + "%" : "—"],
                      ["水分(出)", lot.moistureOut ? lot.moistureOut + "%" : "—"],
                      ["乾燥完了", lot.dryEndAt || "—"],
                      ["籾摺り日", hullRec?.date || "—"],
                    ].map(([l, v]) => (
                      <div key={l} style={{ background: C.surfaceAlt, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 2 }}>{l}</div>
                        <div style={{ fontSize: 15, color: C.text, fontWeight: "700" }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* 供出情報 */}
                  {hullRec && (
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 13, color: C.textMuted, fontWeight: "700", marginBottom: 8 }}>供出・実績</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                        {[
                          ["JA供出", r.jaSupply ? r.jaSupply + "袋" : "—"],
                          ["アグリ供出", r.agriSupply ? r.agriSupply + "袋" : "—"],
                          ["他供出", r.otherSupply ? r.otherSupply + "袋" : "—"],
                          ["飯米", r.iimaiCount ? `${r.iimaiType === "一空" ? "一空" : "新"}${r.iimaiCount}袋` : "—"],
                          ["籾乾燥", r.momiKanso || "—"],
                          ["くず米", r.kuzuMai || "—"],
                          ["残米", r.zanMai || "—"],
                          ["反別", r.tanBetsu || lot.tanIn || "—"],
                          ["水分", r.moisture ? r.moisture + "%" : "—"],
                        ].map(([l, v]) => (
                          <div key={l} style={{ background: C.surfaceAlt, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 2 }}>{l}</div>
                            <div style={{ fontSize: 15, color: C.text, fontWeight: "700" }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 金額内訳 */}
                  {(r.feeHulling || r.feeDrying || r.feeBag || r.feeKuzu || r.feeOther) && (
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                      <div style={{ fontSize: 13, color: C.textMuted, fontWeight: "700", marginBottom: 8 }}>金額内訳</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
                        {[
                          ["籾摺り賃", r.feeHulling ? `¥${Number(r.feeHulling).toLocaleString()}` : null, false],
                          ["籾乾燥賃", r.feeDrying ? `¥${Number(r.feeDrying).toLocaleString()}` : null, false],
                          ["米袋代", r.feeBag ? `¥${Number(r.feeBag).toLocaleString()}` : null, false],
                          ["くず米代（返金）", r.feeKuzu ? `－¥${Number(r.feeKuzu).toLocaleString()}` : null, true],
                          ["その他", r.feeOther || null, false],
                        ].filter(([, v]) => v).map(([l, v, isRefund]) => (
                          <div key={l} style={{ background: isRefund ? C.redLight : C.greenLight, borderRadius: 8, padding: "8px 10px", border: `1px solid ${isRefund ? C.redBorder : C.greenBorder}` }}>
                            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 2 }}>{l}</div>
                            <div style={{ fontSize: 15, color: isRefund ? C.red : C.green, fontWeight: "700" }}>{v}</div>
                          </div>
                        ))}
                        {(r.feeHulling || r.feeDrying || r.feeBag) && (
                          <div style={{ background: C.green, borderRadius: 8, padding: "8px 10px" }}>
                            <div style={{ fontSize: 12, color: "#86efac", marginBottom: 2 }}>請求合計</div>
                            <div style={{ fontSize: 16, color: "#ffffff", fontWeight: "800" }}>¥{totalFee.toLocaleString()}</div>
                            {r.feeKuzu && <div style={{ fontSize: 11, color: "#86efac", marginTop: 2 }}>（くず米代控除済）</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ===== モーダル ===== */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setModal(null)}>
          <div style={{ background: C.surface, border: `2px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>

            {(modal === "addFarmer" || modal === "editFarmer") && (
              <div>
                <MTitle>{modal === "addFarmer" ? "👥 顧客を登録" : "✏️ 顧客情報を編集"}</MTitle>
                <MF label="氏名 *"><input style={INP} value={form.name || ""} onChange={e => setForm({...form, name: e.target.value})} placeholder="例: 山田 太郎" /></MF>
                <MF label="電話番号"><input style={INP} type="tel" value={form.phone || ""} onChange={e => setForm({...form, phone: e.target.value})} placeholder="090-0000-0000" /></MF>
                <MF label="地区名"><input style={INP} value={form.district || ""} onChange={e => setForm({...form, district: e.target.value})} placeholder="例: 竹田地区" /></MF>
                <MF label="住所（マップ表示対応）"><input style={INP} value={form.address || ""} onChange={e => setForm({...form, address: e.target.value})} placeholder="例: 大分県大分市○○町1-2-3" /></MF>
                <MF label="備考"><textarea style={{...INP, height: 70}} value={form.note || ""} onChange={e => setForm({...form, note: e.target.value})} /></MF>
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <Btn color={C.primary} full onClick={modal === "addFarmer" ? addFarmer : editFarmer}>{modal === "addFarmer" ? "登録する" : "保存する"}</Btn>
                  <Btn color={C.textSub} full onClick={() => setModal(null)}>キャンセル</Btn>
                </div>
                {modal === "editFarmer" && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                    <button onClick={() => {
                      if (window.confirm(`「${selectedFarmer?.name}」を削除しますか？\n関連するデータは残ります。`)) {
                        setFarmers(prev => prev.filter(f => f.id !== selectedFarmer.id));
                        setSelectedFarmer(null); setModal(null); setForm({});
                      }
                    }} style={{ width: "100%", background: C.redLight, color: C.red, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: "10px", cursor: "pointer", fontSize: 15, fontFamily: "inherit", fontWeight: "700" }}>
                      🗑️ この顧客を削除する
                    </button>
                  </div>
                )}
              </div>
            )}

            {modal === "addLot" && (
              <div>
                <MTitle>📥 新規持込受付</MTitle>
                <MF label="顧客 *"><select style={INP} value={form.farmerId || ""} onChange={e => setForm({...form, farmerId: e.target.value})}><option value="">-- 顧客を選択 --</option>{farmers.map(f => <option key={f.id} value={f.id}>{f.name}{f.district ? `（${f.district}）` : ""}</option>)}</select></MF>
                <MF label="品種"><select style={INP} value={form.variety || "ヒノヒカリ"} onChange={e => setForm({...form, variety: e.target.value})}>{VARIETIES.map(v => <option key={v}>{v}</option>)}</select></MF>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <MF label="持込量（反）"><input style={INP} type="number" step="0.1" value={form.tanIn || ""} onChange={e => setForm({...form, tanIn: e.target.value})} placeholder="例: 3.5" /></MF>
                  <MF label="水分値(入) (%)"><input style={INP} type="number" step="0.1" value={form.moistureIn || ""} onChange={e => setForm({...form, moistureIn: e.target.value})} /></MF>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <MF label="袋数"><input style={INP} type="number" value={form.bagsIn || ""} onChange={e => setForm({...form, bagsIn: e.target.value})} /></MF>
                  <MF label="袋種別"><select style={INP} value={form.bagType || "新袋"} onChange={e => setForm({...form, bagType: e.target.value})}>{BAG_TYPES.map(b => <option key={b}>{b}</option>)}</select></MF>
                </div>
                <MF label="乾燥機を予約（任意）"><select style={INP} value={form.dryerId || ""} onChange={e => setForm({...form, dryerId: e.target.value})}><option value="">-- 後で割り当て --</option>{dryers.filter(d => d.status === "空き").map(d => <option key={d.id} value={d.id}>{dryerLabel(d.id, dryers)}（空き）{d.capacity ? ` / ${d.capacity}石` : ""}</option>)}</select></MF>
                <MF label="受付日"><input style={INP} type="date" value={form.receivedAt || new Date().toISOString().slice(0,10)} onChange={e => setForm({...form, receivedAt: e.target.value})} /></MF>
                <MF label="備考"><textarea style={{...INP, height: 60}} value={form.note || ""} onChange={e => setForm({...form, note: e.target.value})} /></MF>
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <Btn color={C.orange} full onClick={addLot}>受付する</Btn>
                  <Btn color={C.textSub} full onClick={() => setModal(null)}>キャンセル</Btn>
                </div>
              </div>
            )}

            {modal === "assignDryer" && selectedLot && (
              <div>
                <MTitle>乾燥機を割り当て</MTitle>
                <div style={{ background: C.surfaceAlt, borderRadius: 10, padding: 14, marginBottom: 18, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 17, fontWeight: "700" }}>{getFarmer(selectedLot.farmerId)?.name} — {selectedLot.variety}</div>
                  <div style={{ fontSize: 15, color: C.textSub, marginTop: 4 }}>{selectedLot.tanIn}反 / {selectedLot.bagsIn}袋（{selectedLot.bagType}）</div>
                </div>
                <div style={{ fontSize: 15, color: C.textSub, marginBottom: 12, fontWeight: "600" }}>空いている乾燥機を選んでください：</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {dryers.map(d => {
                    const avail = d.status === "空き";
                    return (
                      <button key={d.id} onClick={() => avail && assignDryer(d.id)} style={{ padding: "14px 8px", borderRadius: 10, border: avail ? `2px solid ${C.greenBorder}` : `1px solid ${C.border}`, background: avail ? C.greenLight : C.surfaceAlt, color: avail ? C.green : C.textMuted, cursor: avail ? "pointer" : "not-allowed", fontSize: 13, fontFamily: "inherit", fontWeight: avail ? "700" : "400" }}>
                        <div>{dryerLabel(d.id, dryers)}</div>
                        <div style={{ fontSize: 11, marginTop: 2 }}>{d.status}</div>
                        {d.capacity && <div style={{ fontSize: 11 }}>{d.capacity}石</div>}
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: 16 }}><Btn color={C.textSub} full onClick={() => setModal(null)}>キャンセル</Btn></div>
              </div>
            )}

            {/* 乾燥開始モーダル（開始時刻・終了予定時刻入力） */}
            {modal === "startDrying" && selectedLot && (
              <div>
                <MTitle>🔥 乾燥開始</MTitle>
                <div style={{ background: C.surfaceAlt, borderRadius: 10, padding: 14, marginBottom: 18, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 17, fontWeight: "700" }}>{getFarmer(selectedLot.farmerId)?.name} — {selectedLot.variety}</div>
                  <div style={{ fontSize: 15, color: C.textSub, marginTop: 4 }}>{dryerLabel(getDryer(selectedLot.dryerId)?.id, dryers)}</div>
                </div>
                <MF label="終了予定日時">
                  <input style={INP} type="datetime-local" value={form.dryEndScheduled || ""} onChange={e => setForm({...form, dryEndScheduled: e.target.value})} />
                </MF>
                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>※ 開始時刻は今この瞬間として記録されます</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn color={C.orange} full onClick={() => {
                    const now = new Date().toISOString();
                    setDryers(prev => prev.map(d => d.id === selectedLot.dryerId ? { ...d, lotId: selectedLot.id, status: "乾燥中" } : d));
                    setLots(prev => prev.map(l => l.id === selectedLot.id ? { ...l, dryStartAt: now, dryEndScheduled: form.dryEndScheduled ? new Date(form.dryEndScheduled).toISOString() : null, status: "乾燥中" } : l));
                    setSelectedLot(null); setModal(null); setForm({});
                  }}>乾燥開始する</Btn>
                  <Btn color={C.textSub} full onClick={() => setModal(null)}>キャンセル</Btn>
                </div>
              </div>
            )}

            {modal === "completeDrying" && selectedLot && (
              <div>
                <MTitle>✅ 乾燥完了処理</MTitle>
                <div style={{ background: C.surfaceAlt, borderRadius: 10, padding: 14, marginBottom: 18, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 17, fontWeight: "700" }}>{getFarmer(selectedLot.farmerId)?.name} — {selectedLot.variety}</div>
                </div>
                <MF label="水分値(出) (%)"><input style={INP} type="number" step="0.1" value={form.moistureOut || ""} onChange={e => setForm({...form, moistureOut: e.target.value})} placeholder="例: 14.5" /></MF>
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <Btn color={C.green} full onClick={() => completeDrying(selectedLot.id)}>完了にする</Btn>
                  <Btn color={C.textSub} full onClick={() => setModal(null)}>キャンセル</Btn>
                </div>
              </div>
            )}

            {modal === "hullingSchedule" && selectedLot && (
              <div>
                <MTitle>🌀 籾摺り日程を設定</MTitle>
                <div style={{ background: C.surfaceAlt, borderRadius: 10, padding: 14, marginBottom: 18, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 17, fontWeight: "700" }}>{getFarmer(selectedLot.farmerId)?.name} — {selectedLot.variety}</div>
                </div>
                <MF label="籾摺り予定日 *"><input style={INP} type="date" value={form.hullingDate || ""} onChange={e => setForm({...form, hullingDate: e.target.value})} /></MF>
                <MF label="備考"><textarea style={{...INP, height: 60}} value={form.note || ""} onChange={e => setForm({...form, note: e.target.value})} /></MF>
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <Btn color={C.purple} full onClick={scheduleHulling}>日程を確定</Btn>
                  <Btn color={C.textSub} full onClick={() => setModal(null)}>キャンセル</Btn>
                </div>
              </div>
            )}

            {modal === "editCapacity" && selectedDryer && (
              <div>
                <MTitle>{dryerLabel(selectedDryer.id)} の容量設定</MTitle>
                <MF label="対応容量（石）"><input style={INP} type="number" step="0.1" value={form.capacity || ""} onChange={e => setForm({...form, capacity: e.target.value})} placeholder="例: 20" /></MF>
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <Btn color={C.primary} full onClick={saveDryerCapacity}>保存する</Btn>
                  <Btn color={C.textSub} full onClick={() => setModal(null)}>キャンセル</Btn>
                </div>
              </div>
            )}

            {(modal === "completeHulling" || modal === "editHulling") && selectedHulling && (
              <div>
                <MTitle>{modal === "completeHulling" ? "📋 籾摺り実績を入力" : "✏️ 実績日報を訂正"}</MTitle>
                {(() => {
                  const lot = getLot(selectedHulling.lotId);
                  const farmer = lot ? getFarmer(lot.farmerId) : null;
                  return (
                    <div style={{ background: C.surfaceAlt, borderRadius: 10, padding: 14, marginBottom: 18, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 17, fontWeight: "700" }}>{farmer?.name}</div>
                      <div style={{ fontSize: 15, color: C.textSub, marginTop: 4 }}>{lot?.variety} / {lot?.tanIn}反 / {lot?.bagsIn}袋（{lot?.bagType}）</div>
                    </div>
                  );
                })()}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <MF label="JA供出（袋）"><input style={INP} type="number" value={form.jaSupply || ""} onChange={e => setForm({...form, jaSupply: e.target.value})} placeholder="0" /></MF>
                  <MF label="アグリ供出"><input style={INP} type="number" value={form.agriSupply || ""} onChange={e => setForm({...form, agriSupply: e.target.value})} placeholder="0" /></MF>
                  <MF label="他供出"><input style={INP} type="number" value={form.otherSupply || ""} onChange={e => setForm({...form, otherSupply: e.target.value})} placeholder="0" /></MF>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <MF label="飯米（袋数）"><input style={INP} type="number" value={form.iimaiCount || ""} onChange={e => setForm({...form, iimaiCount: e.target.value})} placeholder="0" /></MF>
                  <MF label="飯米袋種別"><select style={INP} value={form.iimaiType || "新袋"} onChange={e => setForm({...form, iimaiType: e.target.value})}>{BAG_TYPES.map(b => <option key={b}>{b}</option>)}</select></MF>
                </div>
                <MF label="籾乾燥（例: 30×15）"><input style={INP} value={form.momiKanso || ""} onChange={e => setForm({...form, momiKanso: e.target.value})} placeholder="30×15" /></MF>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <MF label="くず米"><input style={INP} type="number" value={form.kuzuMai || ""} onChange={e => setForm({...form, kuzuMai: e.target.value})} /></MF>
                  <MF label="残米"><input style={INP} type="number" value={form.zanMai || ""} onChange={e => setForm({...form, zanMai: e.target.value})} /></MF>
                  <MF label="反別"><input style={INP} value={form.tanBetsu || ""} onChange={e => setForm({...form, tanBetsu: e.target.value})} /></MF>
                </div>
                <MF label="水分 (%)"><input style={INP} type="number" step="0.1" value={form.moisture || ""} onChange={e => setForm({...form, moisture: e.target.value})} placeholder="例: 14.5" /></MF>
                <MF label="その他備考"><textarea style={{...INP, height: 60}} value={form.resultNote || ""} onChange={e => setForm({...form, resultNote: e.target.value})} /></MF>

                {/* 金額入力 */}
                <div style={{ borderTop: `2px solid ${C.border}`, marginTop: 16, paddingTop: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: "800", color: C.text, marginBottom: 12 }}>💰 精算金額</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <MF label="籾摺り賃 (円)"><input style={INP} type="number" value={form.feeHulling || ""} onChange={e => setForm({...form, feeHulling: e.target.value})} placeholder="0" /></MF>
                    <MF label="籾乾燥賃 (円)"><input style={INP} type="number" value={form.feeDrying || ""} onChange={e => setForm({...form, feeDrying: e.target.value})} placeholder="0" /></MF>
                    <MF label="米袋代 (円)"><input style={INP} type="number" value={form.feeBag || ""} onChange={e => setForm({...form, feeBag: e.target.value})} placeholder="0" /></MF>
                    <MF label="くず米代 (円)"><input style={INP} type="number" value={form.feeKuzu || ""} onChange={e => setForm({...form, feeKuzu: e.target.value})} placeholder="0" /></MF>
                  </div>
                  <MF label="その他 (内容・金額など自由入力)"><input style={INP} value={form.feeOther || ""} onChange={e => setForm({...form, feeOther: e.target.value})} placeholder="例: 運搬費 ¥1,000" /></MF>
                  {/* 合計表示 */}
                  {[form.feeHulling, form.feeDrying, form.feeBag].some(v => v) && (
                    <div style={{ background: C.greenLight, border: `1px solid ${C.greenBorder}`, borderRadius: 8, padding: "10px 14px", textAlign: "right" }}>
                      <span style={{ fontSize: 15, color: C.textSub }}>請求合計（くず米代控除済）: </span>
                      <span style={{ fontSize: 18, fontWeight: "800", color: C.green }}>
                        ¥{((Number(form.feeHulling) || 0) + (Number(form.feeDrying) || 0) + (Number(form.feeBag) || 0) - (Number(form.feeKuzu) || 0)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <Btn color={C.teal} full onClick={() => saveHullingResult(modal === "editHulling")}>{modal === "completeHulling" ? "完了・日報に記録" : "訂正を保存"}</Btn>
                  <Btn color={C.textSub} full onClick={() => setModal(null)}>キャンセル</Btn>
                </div>
              </div>
            )}

            {/* 精算管理 金額入力モーダル */}
            {modal === "editFee" && selectedLot && (
              <div>
                <MTitle>💰 金額を入力</MTitle>
                {(() => {
                  const farmer = getFarmer(selectedLot.farmerId);
                  return (
                    <div style={{ background: C.surfaceAlt, borderRadius: 10, padding: 14, marginBottom: 18, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 17, fontWeight: "700" }}>{farmer?.name}</div>
                      <div style={{ fontSize: 15, color: C.textSub, marginTop: 4 }}>{selectedLot.variety} / {selectedLot.tanIn}反 / {selectedLot.bagsIn}袋（{selectedLot.bagType}）</div>
                    </div>
                  );
                })()}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <MF label="籾摺り賃 (円)"><input style={INP} type="number" value={form.feeHulling || ""} onChange={e => setForm({...form, feeHulling: e.target.value})} placeholder="0" /></MF>
                  <MF label="籾乾燥賃 (円)"><input style={INP} type="number" value={form.feeDrying || ""} onChange={e => setForm({...form, feeDrying: e.target.value})} placeholder="0" /></MF>
                  <MF label="米袋代 (円)"><input style={INP} type="number" value={form.feeBag || ""} onChange={e => setForm({...form, feeBag: e.target.value})} placeholder="0" /></MF>
                  <MF label="くず米代 (円)"><input style={INP} type="number" value={form.feeKuzu || ""} onChange={e => setForm({...form, feeKuzu: e.target.value})} placeholder="0" /></MF>
                </div>
                <MF label="その他 (内容・金額など自由入力)"><input style={INP} value={form.feeOther || ""} onChange={e => setForm({...form, feeOther: e.target.value})} placeholder="例: 運搬費 ¥1,000" /></MF>
                {[form.feeHulling, form.feeDrying, form.feeBag].some(v => v) && (
                  <div style={{ background: C.greenLight, border: `1px solid ${C.greenBorder}`, borderRadius: 8, padding: "12px 16px", textAlign: "right", marginBottom: 8 }}>
                    <span style={{ fontSize: 15, color: C.textSub }}>請求合計（くず米代控除済）: </span>
                    <span style={{ fontSize: 20, fontWeight: "800", color: C.green }}>
                      ¥{((Number(form.feeHulling) || 0) + (Number(form.feeDrying) || 0) + (Number(form.feeBag) || 0) - (Number(form.feeKuzu) || 0)).toLocaleString()}
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <Btn color={C.green} full onClick={() => {
                    // 対応するhullingレコードに金額を保存
                    const hullRec = hulling.find(h => h.lotId === selectedLot.id);
                    if (hullRec) {
                      const updatedResult = { ...(hullRec.result || {}), feeHulling: form.feeHulling || "", feeDrying: form.feeDrying || "", feeBag: form.feeBag || "", feeKuzu: form.feeKuzu || "", feeOther: form.feeOther || "" };
                      setHulling(prev => prev.map(h => h.id === hullRec.id ? { ...h, result: updatedResult } : h));
                    } else {
                      // hullingレコードがない場合はlotsに直接保存
                      setLots(prev => prev.map(l => l.id === selectedLot.id ? { ...l, directFee: { feeHulling: form.feeHulling || "", feeDrying: form.feeDrying || "", feeBag: form.feeBag || "", feeKuzu: form.feeKuzu || "", feeOther: form.feeOther || "" } } : l));
                    }
                    setSelectedLot(null); setModal(null); setForm({});
                  }}>保存する</Btn>
                  <Btn color={C.textSub} full onClick={() => setModal(null)}>キャンセル</Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== コンポーネント =====
function SectionTitle({ children, noMargin }) {
  return <h2 style={{ fontSize: 18, fontWeight: "800", color: "#1e293b", marginBottom: noMargin ? 0 : 18, paddingLeft: 12, borderLeft: "4px solid #1d4ed8" }}>{children}</h2>;
}
function AlertBox({ color, bg, border, title, children }) {
  return (
    <div style={{ background: bg, border: `2px solid ${border}`, borderRadius: 12, padding: 18, marginBottom: 14 }}>
      <div style={{ color, fontSize: 16, fontWeight: "800", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}
function AlertRow({ children }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.08)", gap: 8, flexWrap: "wrap" }}>{children}</div>;
}
function Btn({ color, onClick, children, full }) {
  return <button onClick={onClick} style={{ background: color, color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontSize: 15, fontFamily: "inherit", width: full ? "100%" : "auto", fontWeight: "700", boxShadow: "0 2px 4px rgba(0,0,0,0.15)" }}>{children}</button>;
}
function Row({ label, value }) {
  return <div style={{ fontSize: 15, color: "#475569", marginBottom: 6 }}><span style={{ color: "#94a3b8", marginRight: 8, fontSize: 13 }}>{label}</span><b style={{ color: "#1e293b" }}>{value}</b></div>;
}
function MTitle({ children }) {
  return <h3 style={{ fontSize: 18, fontWeight: "800", color: "#1e293b", marginBottom: 20, paddingBottom: 14, borderBottom: "2px solid #e2e8f0" }}>{children}</h3>;
}
function MF({ label, children }) {
  return <div style={{ marginBottom: 14 }}><div style={{ fontSize: 14, color: "#475569", marginBottom: 6, fontWeight: "700" }}>{label}</div>{children}</div>;
}
function Empty() {
  return <div style={{ textAlign: "center", color: "#94a3b8", padding: "48px 0", fontSize: 16, background: "#f8fafc", borderRadius: 12, border: "2px dashed #cbd5e1", fontWeight: "600" }}>データがありません</div>;
}
const smallBtn = (color) => ({ fontSize: 13, color: "#fff", background: color, border: "none", borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontFamily: "inherit", fontWeight: "600" });
const TD = { padding: "10px 12px", color: "#475569", textAlign: "center", whiteSpace: "nowrap", fontSize: 14 };
const INP = { width: "100%", background: "#f8fafc", border: "2px solid #cbd5e1", borderRadius: 8, color: "#1e293b", padding: "10px 12px", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" };

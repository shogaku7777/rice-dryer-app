import { useState, useEffect } from "react";

const STORAGE_KEYS = {
  farmers: "rice_farmers",
  lots: "rice_lots",
  dryers: "rice_dryers",
  hulling: "rice_hulling",
};

const VARIETIES = ["ヒノヒカリ", "おてんとそだち", "もち米", "その他"];
const SERVICE_TYPES = ["乾燥のみ", "籾摺りのみ", "乾燥＋籾摺り"];
const DRYER_COUNT = 10;
const BAG_TYPES = ["新袋", "一空"];

// カラーパレット（ライトテーマ）
const C = {
  bg: "#f7f5f0",          // ページ背景：温かみのある白
  surface: "#ffffff",      // カード背景
  surfaceAlt: "#faf9f7",  // 交互背景
  border: "#e8e2d9",      // ボーダー
  borderStrong: "#d4cbbf", // 強いボーダー
  text: "#2c2418",        // メインテキスト
  textSub: "#7a6f5e",     // サブテキスト
  textMuted: "#b0a494",   // ミュートテキスト
  accent: "#5c8a3c",      // メインアクセント（稲穂の緑）
  accentLight: "#eef5e8", // アクセント薄め
  gold: "#b8860b",        // ゴールドアクセント
  goldLight: "#fdf8ea",   // ゴールド薄め
  blue: "#2e6da4",        // ブルー
  blueLight: "#e8f1fa",   // ブルー薄め
  orange: "#c4651a",      // オレンジ
  orangeLight: "#fdf0e6", // オレンジ薄め
  red: "#b5362a",         // レッド
  redLight: "#fdf0ee",    // レッド薄め
  purple: "#6b4fa0",      // パープル
  purpleLight: "#f2eef9", // パープル薄め
  pink: "#b54e7a",        // ピンク
  pinkLight: "#fdf0f6",   // ピンク薄め
  teal: "#2a7a6f",        // ティール
  tealLight: "#e8f7f5",   // ティール薄め
};

const statusStyle = {
  "空き":      { color: C.teal,   bg: C.tealLight,   border: "#b0dbd7" },
  "乾燥中":    { color: C.orange, bg: C.orangeLight,  border: "#f0c89a" },
  "予約中":    { color: C.blue,   bg: C.blueLight,    border: "#a8c8f0" },
  "乾燥完了":  { color: C.purple, bg: C.purpleLight,  border: "#c8b8e8" },
  "受付":      { color: C.textSub,bg: "#f3f0ec",      border: C.border },
  "乾燥待ち":  { color: C.orange, bg: C.orangeLight,  border: "#f0c89a" },
  "籾摺り待ち":{ color: C.purple, bg: C.purpleLight,  border: "#c8b8e8" },
  "籾摺り中":  { color: C.pink,   bg: C.pinkLight,    border: "#e8b0cc" },
  "完了":      { color: C.teal,   bg: C.tealLight,    border: "#b0dbd7" },
  "予約済":    { color: C.gold,   bg: C.goldLight,    border: "#e8d080" },
};

const defaultDryers = Array.from({ length: DRYER_COUNT }, (_, i) => ({
  id: i + 1, lotId: null, status: "空き", capacity: "",
}));

function loadData(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function saveData(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const dryerLabel = (id) => `乾燥機${id}`;
const googleMapsUrl = (addr) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;

export default function App() {
  const [tab, setTab] = useState("dashboard");
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
    const now = new Date().toISOString().slice(0, 10);
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
    const result = { jaSupply: form.jaSupply || "", agriSupply: form.agriSupply || "", otherSupply: form.otherSupply || "", iimaiCount: form.iimaiCount || "", iimaiType: form.iimaiType || "新袋", momiKanso: form.momiKanso || "", kuzuMai: form.kuzuMai || "", zanMai: form.zanMai || "", tanBetsu: form.tanBetsu || "", moisture: form.moisture || "", resultNote: form.resultNote || "" };
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

  const tabs = [
    { id: "dashboard", label: "ダッシュボード", icon: "◈" },
    { id: "dryers", label: "乾燥機管理", icon: "▦" },
    { id: "reception", label: "受付・持込", icon: "＋" },
    { id: "hulling", label: "籾摺り", icon: "◎" },
    { id: "report", label: "実績日報", icon: "≡" },
    { id: "farmers", label: "顧客管理", icon: "◯" },
    { id: "history", label: "精算管理", icon: "¥" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif" }}>

      {/* Header */}
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: C.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🌾</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: "700", color: C.text, letterSpacing: 1 }}>籾乾燥管理システム</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>乾燥機10台・籾摺り実績管理</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.textSub, background: C.accentLight, padding: "4px 12px", borderRadius: 20, border: `1px solid ${C.border}` }}>
          {new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
        </div>
      </header>

      {/* Nav */}
      <nav style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", overflowX: "auto", paddingLeft: 8 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "14px 16px", background: "none", border: "none", cursor: "pointer",
            color: tab === t.id ? C.accent : C.textSub,
            borderBottom: tab === t.id ? `2px solid ${C.accent}` : "2px solid transparent",
            fontFamily: "inherit", fontSize: 12, whiteSpace: "nowrap",
            fontWeight: tab === t.id ? "700" : "400",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <span style={{ fontSize: 10 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>

      <main style={{ padding: "24px 16px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ===== DASHBOARD ===== */}
        {tab === "dashboard" && (
          <div>
            <SectionTitle>本日の状況</SectionTitle>

            {/* サマリーカード */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
              {[
                { label: "稼働中乾燥機", value: `${dryingLots.length} / 10`, unit: "台", color: C.orange, bg: C.orangeLight, border: "#f0c89a" },
                { label: "空き乾燥機", value: dryers.filter(d => d.status === "空き").length, unit: "台", color: C.teal, bg: C.tealLight, border: "#b0dbd7" },
                { label: "予約中", value: dryers.filter(d => d.status === "予約中").length, unit: "台", color: C.blue, bg: C.blueLight, border: "#a8c8f0" },
                { label: "籾摺り予定", value: activeHulling.length, unit: "件", color: C.purple, bg: C.purpleLight, border: "#c8b8e8" },
                { label: "今季完了", value: completedHulling.length, unit: "件", color: C.accent, bg: C.accentLight, border: "#b8d8a0" },
                { label: "未精算", value: lots.filter(l => !l.paid && l.fee > 0).length, unit: "件", color: C.red, bg: C.redLight, border: "#e8b0a8" },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: "16px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: "800", color: s.color }}>{s.value}<span style={{ fontSize: 13, fontWeight: "600", marginLeft: 2 }}>{s.unit}</span></div>
                  <div style={{ fontSize: 11, color: C.textSub, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* 乾燥機グリッド */}
            <SectionTitle sub>乾燥機一覧</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 24 }}>
              {dryers.map(d => {
                const lot = d.lotId ? getLot(d.lotId) : d.status === "予約中" ? lots.find(l => l.dryerId === d.id) : null;
                const farmer = lot ? getFarmer(lot.farmerId) : null;
                const ss = statusStyle[d.status] || { color: C.textSub, bg: C.surfaceAlt, border: C.border };
                return (
                  <div key={d.id} style={{ background: ss.bg, border: `1px solid ${ss.border}`, borderRadius: 10, padding: "10px 8px", textAlign: "center", minHeight: 88 }}>
                    <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>{dryerLabel(d.id)}</div>
                    {d.capacity && <div style={{ fontSize: 9, color: C.accent, marginBottom: 2, fontWeight: "600" }}>{d.capacity}石</div>}
                    <div style={{ fontSize: 11, color: ss.color, fontWeight: "700", marginBottom: 4, background: `${ss.color}15`, padding: "1px 6px", borderRadius: 6, display: "inline-block" }}>{d.status}</div>
                    {farmer && <div style={{ fontSize: 11, color: C.text, marginTop: 2 }}>{farmer.name}</div>}
                    {lot && <div style={{ fontSize: 10, color: C.textSub }}>{lot.variety}</div>}
                  </div>
                );
              })}
            </div>

            {/* アラート */}
            {reservedLots.length > 0 && (
              <AlertCard color={C.blue} bg={C.blueLight} border="#a8c8f0" title="🔵 乾燥機予約済み・開始待ち">
                {reservedLots.map(lot => {
                  const farmer = getFarmer(lot.farmerId);
                  return (
                    <AlertRow key={lot.id}>
                      <span style={{ color: C.text, fontSize: 13 }}>{farmer?.name}</span>
                      <span style={{ color: C.textSub, fontSize: 11, marginLeft: 8 }}>{lot.variety} / {lot.tanIn}反 → {dryerLabel(getDryer(lot.dryerId)?.id)}</span>
                      <Btn color={C.orange} onClick={() => startDrying(lot.id)}>乾燥開始</Btn>
                    </AlertRow>
                  );
                })}
              </AlertCard>
            )}
            {waitingLots.length > 0 && (
              <AlertCard color={C.orange} bg={C.orangeLight} border="#f0c89a" title="⚠️ 乾燥機未割り当て">
                {waitingLots.map(lot => {
                  const farmer = getFarmer(lot.farmerId);
                  return (
                    <AlertRow key={lot.id}>
                      <span style={{ color: C.text, fontSize: 13 }}>{farmer?.name}</span>
                      <span style={{ color: C.textSub, fontSize: 11, marginLeft: 8 }}>{lot.variety} / {lot.tanIn}反</span>
                      <Btn color={C.orange} onClick={() => { setSelectedLot(lot); setModal("assignDryer"); }}>割り当て</Btn>
                    </AlertRow>
                  );
                })}
              </AlertCard>
            )}
            {hullingWaitLots.length > 0 && (
              <AlertCard color={C.purple} bg={C.purpleLight} border="#c8b8e8" title="💡 籾摺りスケジュール未設定">
                {hullingWaitLots.map(lot => {
                  const farmer = getFarmer(lot.farmerId);
                  return (
                    <AlertRow key={lot.id}>
                      <span style={{ color: C.text, fontSize: 13 }}>{farmer?.name}</span>
                      <span style={{ color: C.textSub, fontSize: 11, marginLeft: 8 }}>{lot.variety}</span>
                      <Btn color={C.purple} onClick={() => { setSelectedLot(lot); setModal("hullingSchedule"); }}>日程を設定</Btn>
                    </AlertRow>
                  );
                })}
              </AlertCard>
            )}
          </div>
        )}

        {/* ===== DRYERS ===== */}
        {tab === "dryers" && (
          <div>
            <SectionTitle>乾燥機管理</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {dryers.map(d => {
                const lot = d.lotId ? getLot(d.lotId) : d.status === "予約中" ? lots.find(l => l.dryerId === d.id) : null;
                const farmer = lot ? getFarmer(lot.farmerId) : null;
                const ss = statusStyle[d.status] || { color: C.textSub, bg: C.surfaceAlt, border: C.border };
                return (
                  <div key={d.id} style={{ background: C.surface, border: `1px solid ${ss.border}`, borderRadius: 12, padding: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 15, color: C.text, fontWeight: "700" }}>{dryerLabel(d.id)}</span>
                      <span style={{ fontSize: 11, background: ss.bg, color: ss.color, padding: "3px 10px", borderRadius: 20, border: `1px solid ${ss.border}`, fontWeight: "600" }}>{d.status}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: C.textSub }}>容量: {d.capacity ? <b style={{ color: C.accent }}>{d.capacity}石</b> : <span style={{ color: C.textMuted }}>未設定</span>}</span>
                      <button onClick={() => { setSelectedDryer(d); setForm({ capacity: d.capacity || "" }); setModal("editCapacity"); }} style={{ fontSize: 11, color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 6, padding: "1px 8px", background: C.blueLight, cursor: "pointer", fontFamily: "inherit" }}>変更</button>
                    </div>
                    {lot && farmer ? (
                      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                        <InfoRow label="顧客" value={farmer.name} />
                        <InfoRow label="品種" value={lot.variety} />
                        <InfoRow label="持込" value={`${lot.tanIn}反 / ${lot.bagsIn}袋（${lot.bagType}）`} />
                        <InfoRow label="水分(入)" value={lot.moistureIn ? lot.moistureIn + "%" : "—"} />
                        <InfoRow label="開始日" value={lot.dryStartAt || "—"} />
                        <div style={{ marginTop: 10 }}>
                          {d.status === "乾燥中" && <Btn color={C.teal} full onClick={() => { setSelectedLot(lot); setModal("completeDrying"); }}>乾燥完了にする</Btn>}
                          {d.status === "予約中" && <Btn color={C.orange} full onClick={() => startDrying(lot.id)}>乾燥開始</Btn>}
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", paddingTop: 12, color: C.teal }}>
                        <div style={{ fontSize: 24 }}>✓</div>
                        <div style={{ fontSize: 12, marginTop: 2 }}>空き</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== RECEPTION ===== */}
        {tab === "reception" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <SectionTitle noMargin>受付・持込管理</SectionTitle>
              <Btn color={C.accent} onClick={() => { setForm({}); setModal("addLot"); }}>＋ 新規受付</Btn>
            </div>
            {activeLots.length === 0 && <EmptyState />}
            {activeLots.map(lot => {
              const farmer = getFarmer(lot.farmerId);
              const dryer = lot.dryerId ? getDryer(lot.dryerId) : null;
              const ss = statusStyle[lot.status] || { color: C.textSub, bg: C.surfaceAlt, border: C.border };
              return (
                <div key={lot.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, color: C.text, fontWeight: "700" }}>{farmer?.name}</span>
                      <StatusBadge status={lot.status} />
                    </div>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{lot.receivedAt}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                    <InfoCard label="品種" value={lot.variety} />
                    <InfoCard label="持込量" value={`${lot.tanIn}反`} />
                    <InfoCard label="袋数" value={`${lot.bagsIn}袋（${lot.bagType}）`} />
                    <InfoCard label="水分(入)" value={lot.moistureIn ? lot.moistureIn + "%" : "—"} />
                    <InfoCard label="水分(出)" value={lot.moistureOut ? lot.moistureOut + "%" : "—"} />
                    <InfoCard label="乾燥機" value={dryer ? dryerLabel(dryer.id) : "未割当"} />
                  </div>
                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {lot.status === "受付" && !lot.dryerId && <Btn color={C.orange} onClick={() => { setSelectedLot(lot); setModal("assignDryer"); }}>乾燥機を割り当て</Btn>}
                    {lot.status === "受付" && lot.dryerId && <Btn color={C.blue} onClick={() => startDrying(lot.id)}>乾燥開始</Btn>}
                    {lot.status === "乾燥中" && <Btn color={C.teal} onClick={() => { setSelectedLot(lot); setModal("completeDrying"); }}>乾燥完了</Btn>}
                    {lot.status === "乾燥完了" && <Btn color={C.purple} onClick={() => { setSelectedLot(lot); setModal("hullingSchedule"); }}>籾摺り日程を設定</Btn>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== HULLING ===== */}
        {tab === "hulling" && (
          <div>
            <SectionTitle>籾摺りスケジュール</SectionTitle>
            {activeHulling.length === 0 && <EmptyState />}
            {[...activeHulling].sort((a, b) => a.date > b.date ? 1 : -1).map(h => {
              const lot = getLot(h.lotId);
              const farmer = lot ? getFarmer(lot.farmerId) : null;
              return (
                <div key={h.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, color: C.text, fontWeight: "700" }}>{farmer?.name || "不明"}</span>
                      <StatusBadge status={h.status} />
                    </div>
                    <div style={{ fontSize: 13, color: C.gold, fontWeight: "600", background: C.goldLight, padding: "3px 10px", borderRadius: 8, border: `1px solid #e8d080` }}>📅 {h.date}</div>
                  </div>
                  {lot && <div style={{ fontSize: 12, color: C.textSub, marginTop: 8 }}>{lot.variety} / {lot.tanIn}反 / {lot.bagsIn}袋（{lot.bagType || "新袋"}）</div>}
                  {h.note && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>備考: {h.note}</div>}
                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    {h.status === "予約済" && <Btn color={C.pink} onClick={() => startHulling(h.id)}>籾摺り開始</Btn>}
                    {h.status === "籾摺り中" && <Btn color={C.teal} onClick={() => { setSelectedHulling(h); setForm({}); setModal("completeHulling"); }}>実績を入力して完了</Btn>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== REPORT ===== */}
        {tab === "report" && (
          <div>
            <SectionTitle>籾摺り実績日報</SectionTitle>
            {completedHulling.length === 0 && <EmptyState />}
            {completedHulling.length > 0 && (
              <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 900 }}>
                    <thead>
                      <tr style={{ background: C.accentLight, borderBottom: `2px solid ${C.accent}30` }}>
                        {["日付", "氏名", "JA供出", "アグリ供出", "他供出", "飯米", "籾乾燥", "くず米", "残米", "反別", "水分", "その他", ""].map((h, i) => (
                          <th key={i} style={{ padding: "10px 12px", color: C.accent, textAlign: "center", whiteSpace: "nowrap", fontWeight: "700", fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...completedHulling].sort((a, b) => a.date > b.date ? 1 : -1).map((h, i) => {
                        const lot = getLot(h.lotId);
                        const farmer = lot ? getFarmer(lot.farmerId) : null;
                        const r = h.result || {};
                        return (
                          <tr key={h.id} style={{ background: i % 2 === 0 ? C.surface : C.surfaceAlt, borderBottom: `1px solid ${C.border}` }}>
                            <td style={td}>{h.date?.slice(5)}</td>
                            <td style={{ ...td, fontWeight: "700", color: C.text }}>{farmer?.name || "—"}</td>
                            <td style={td}>{r.jaSupply || "—"}</td>
                            <td style={td}>{r.agriSupply || "—"}</td>
                            <td style={td}>{r.otherSupply || "—"}</td>
                            <td style={td}>{r.iimaiCount ? `${r.iimaiType === "一空" ? "一空" : "新"}${r.iimaiCount}` : "—"}</td>
                            <td style={td}>{r.momiKanso || "—"}</td>
                            <td style={td}>{r.kuzuMai || "—"}</td>
                            <td style={td}>{r.zanMai || "—"}</td>
                            <td style={td}>{r.tanBetsu || lot?.tanIn || "—"}</td>
                            <td style={td}>{r.moisture || lot?.moistureOut || "—"}</td>
                            <td style={{ ...td, color: C.textSub }}>{r.resultNote || "—"}</td>
                            <td style={td}>
                              <button onClick={() => { setSelectedHulling(h); setForm({ ...r }); setModal("editHulling"); }} style={{ fontSize: 11, color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 6, padding: "2px 8px", background: C.goldLight, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>✏️ 訂正</button>
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

        {/* ===== CUSTOMERS ===== */}
        {tab === "farmers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <SectionTitle noMargin>顧客管理</SectionTitle>
              <Btn color={C.accent} onClick={() => { setForm({}); setModal("addFarmer"); }}>＋ 顧客を登録</Btn>
            </div>
            {farmers.length === 0 && <EmptyState />}
            {farmers.map(f => {
              const farmerLots = lots.filter(l => l.farmerId === f.id);
              const activeFarmerLots = farmerLots.filter(l => l.status !== "完了");
              return (
                <div key={f.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, color: C.text, fontWeight: "700" }}>{f.name}</div>
                      {f.phone && (
                        <a href={`tel:${f.phone}`} style={{ fontSize: 13, color: C.blue, marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", background: C.blueLight, padding: "3px 10px", borderRadius: 20, border: `1px solid #a8c8f0` }}>
                          📞 {f.phone}
                        </a>
                      )}
                      {f.district && <div style={{ fontSize: 12, color: C.textSub, marginTop: 6 }}>📍 {f.district}</div>}
                      {f.address && (
                        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: C.textSub }}>{f.address}</span>
                          <a href={googleMapsUrl(f.address)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.teal, border: `1px solid ${C.teal}`, borderRadius: 20, padding: "2px 10px", textDecoration: "none", background: C.tealLight, whiteSpace: "nowrap" }}>🗺️ マップ</a>
                        </div>
                      )}
                      <div style={{ marginTop: 8 }}>
                        <span style={{ fontSize: 11, color: C.accent, background: C.accentLight, padding: "2px 8px", borderRadius: 20, border: `1px solid #b8d8a0` }}>{f.service}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginLeft: 12 }}>
                      <button onClick={() => { setSelectedFarmer(f); setForm({ name: f.name, phone: f.phone, address: f.address, district: f.district, service: f.service, note: f.note }); setModal("editFarmer"); }} style={{ fontSize: 11, color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 8, padding: "4px 12px", background: C.goldLight, cursor: "pointer", fontFamily: "inherit" }}>✏️ 編集</button>
                      <div style={{ fontSize: 11, color: C.textMuted }}>今季: {farmerLots.length}件</div>
                      {activeFarmerLots.length > 0 && <div style={{ fontSize: 11, color: C.orange, fontWeight: "600" }}>対応中: {activeFarmerLots.length}件</div>}
                    </div>
                  </div>
                  {f.note && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>備考: {f.note}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* ===== HISTORY ===== */}
        {tab === "history" && (
          <div>
            <SectionTitle>精算管理</SectionTitle>
            {lots.length === 0 && <EmptyState />}
            {[...lots].reverse().map(lot => {
              const farmer = getFarmer(lot.farmerId);
              return (
                <div key={lot.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 8, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, color: C.text, fontWeight: "700" }}>{farmer?.name}</span>
                      <StatusBadge status={lot.status} />
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {lot.fee > 0 && <span style={{ fontSize: 13, color: lot.paid ? C.teal : C.red, fontWeight: "600" }}>¥{lot.fee.toLocaleString()} {lot.paid ? "✓ 精算済" : "未精算"}</span>}
                      {lot.fee > 0 && (
                        <button onClick={() => togglePaid(lot.id)} style={{ fontSize: 11, color: lot.paid ? C.textSub : C.teal, border: `1px solid ${lot.paid ? C.border : C.teal}`, borderRadius: 8, padding: "3px 10px", background: lot.paid ? C.surfaceAlt : C.tealLight, cursor: "pointer", fontFamily: "inherit" }}>
                          {lot.paid ? "未精算に戻す" : "精算済みにする"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 6, marginTop: 10 }}>
                    <InfoCard label="品種" value={lot.variety} />
                    <InfoCard label="受付日" value={lot.receivedAt} />
                    <InfoCard label="持込量" value={`${lot.tanIn}反`} />
                    <InfoCard label="袋数" value={`${lot.bagsIn}袋（${lot.bagType}）`} />
                    <InfoCard label="水分(入)" value={lot.moistureIn ? lot.moistureIn + "%" : "—"} />
                    <InfoCard label="水分(出)" value={lot.moistureOut ? lot.moistureOut + "%" : "—"} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ===== MODAL ===== */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(44,36,24,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setModal(null)}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }} onClick={e => e.stopPropagation()}>

            {/* 顧客登録・編集 */}
            {(modal === "addFarmer" || modal === "editFarmer") && (
              <div>
                <MTitle>{modal === "addFarmer" ? "👥 顧客を登録" : "✏️ 顧客情報を編集"}</MTitle>
                <MField label="氏名 *"><input style={inp} value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例: 山田 太郎" /></MField>
                <MField label="電話番号"><input style={inp} type="tel" value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="090-0000-0000" /></MField>
                <MField label="地区名"><input style={inp} value={form.district || ""} onChange={e => setForm({ ...form, district: e.target.value })} placeholder="例: 竹田地区" /></MField>
                <MField label="住所（マップ表示対応）"><input style={inp} value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="例: 大分県大分市○○町1-2-3" /></MField>
                <MField label="サービス種別">
                  <select style={inp} value={form.service || "乾燥＋籾摺り"} onChange={e => setForm({ ...form, service: e.target.value })}>
                    {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </MField>
                <MField label="備考"><textarea style={{ ...inp, height: 60 }} value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} /></MField>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <Btn color={C.accent} full onClick={modal === "addFarmer" ? addFarmer : editFarmer}>{modal === "addFarmer" ? "登録する" : "保存する"}</Btn>
                  <Btn color={C.textSub} full onClick={() => setModal(null)}>キャンセル</Btn>
                </div>
              </div>
            )}

            {/* 新規受付 */}
            {modal === "addLot" && (
              <div>
                <MTitle>📥 新規持込受付</MTitle>
                <MField label="顧客 *">
                  <select style={inp} value={form.farmerId || ""} onChange={e => setForm({ ...form, farmerId: e.target.value })}>
                    <option value="">-- 顧客を選択 --</option>
                    {farmers.map(f => <option key={f.id} value={f.id}>{f.name}{f.district ? `（${f.district}）` : ""}</option>)}
                  </select>
                </MField>
                <MField label="品種">
                  <select style={inp} value={form.variety || "ヒノヒカリ"} onChange={e => setForm({ ...form, variety: e.target.value })}>
                    {VARIETIES.map(v => <option key={v}>{v}</option>)}
                  </select>
                </MField>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <MField label="持込量（反）"><input style={inp} type="number" step="0.1" value={form.tanIn || ""} onChange={e => setForm({ ...form, tanIn: e.target.value })} placeholder="例: 3.5" /></MField>
                  <MField label="水分値(入) (%)"><input style={inp} type="number" step="0.1" value={form.moistureIn || ""} onChange={e => setForm({ ...form, moistureIn: e.target.value })} /></MField>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <MField label="袋数"><input style={inp} type="number" value={form.bagsIn || ""} onChange={e => setForm({ ...form, bagsIn: e.target.value })} /></MField>
                  <MField label="袋種別">
                    <select style={inp} value={form.bagType || "新袋"} onChange={e => setForm({ ...form, bagType: e.target.value })}>
                      {BAG_TYPES.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </MField>
                </div>
                <MField label="乾燥機を予約（任意）">
                  <select style={inp} value={form.dryerId || ""} onChange={e => setForm({ ...form, dryerId: e.target.value })}>
                    <option value="">-- 後で割り当て --</option>
                    {dryers.filter(d => d.status === "空き").map(d => <option key={d.id} value={d.id}>{dryerLabel(d.id)}（空き）{d.capacity ? ` / ${d.capacity}石` : ""}</option>)}
                  </select>
                </MField>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <MField label="受付日"><input style={inp} type="date" value={form.receivedAt || new Date().toISOString().slice(0, 10)} onChange={e => setForm({ ...form, receivedAt: e.target.value })} /></MField>
                  <MField label="料金 (円)"><input style={inp} type="number" value={form.fee || ""} onChange={e => setForm({ ...form, fee: e.target.value })} /></MField>
                </div>
                <MField label="備考"><textarea style={{ ...inp, height: 50 }} value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} /></MField>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <Btn color={C.orange} full onClick={addLot}>受付する</Btn>
                  <Btn color={C.textSub} full onClick={() => setModal(null)}>キャンセル</Btn>
                </div>
              </div>
            )}

            {/* 乾燥機割り当て */}
            {modal === "assignDryer" && selectedLot && (
              <div>
                <MTitle>乾燥機を割り当て</MTitle>
                <div style={{ background: C.surfaceAlt, borderRadius: 8, padding: 12, marginBottom: 16, border: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: "700" }}>{getFarmer(selectedLot.farmerId)?.name} — {selectedLot.variety}</div>
                  <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>{selectedLot.tanIn}反 / {selectedLot.bagsIn}袋（{selectedLot.bagType}）</div>
                </div>
                <div style={{ fontSize: 12, color: C.textSub, marginBottom: 10 }}>空いている乾燥機を選んでください：</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                  {dryers.map(d => {
                    const avail = d.status === "空き";
                    return (
                      <button key={d.id} onClick={() => avail && assignDryer(d.id)} style={{ padding: "12px 4px", borderRadius: 10, border: avail ? `1px solid ${C.teal}` : `1px solid ${C.border}`, background: avail ? C.tealLight : C.surfaceAlt, color: avail ? C.teal : C.textMuted, cursor: avail ? "pointer" : "not-allowed", fontSize: 11, fontFamily: "inherit", fontWeight: avail ? "700" : "400" }}>
                        <div>{dryerLabel(d.id)}</div>
                        <div style={{ fontSize: 9, marginTop: 2 }}>{d.status}</div>
                        {d.capacity && <div style={{ fontSize: 9, color: C.accent }}>{d.capacity}石</div>}
                      </button>
                    );
                  })}
                </div>
                <Btn color={C.textSub} full onClick={() => setModal(null)} style={{ marginTop: 16 }}>キャンセル</Btn>
              </div>
            )}

            {/* 乾燥完了 */}
            {modal === "completeDrying" && selectedLot && (
              <div>
                <MTitle>✅ 乾燥完了処理</MTitle>
                <div style={{ background: C.surfaceAlt, borderRadius: 8, padding: 12, marginBottom: 16, border: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: "700" }}>{getFarmer(selectedLot.farmerId)?.name} — {selectedLot.variety}</div>
                </div>
                <MField label="水分値(出) (%)"><input style={inp} type="number" step="0.1" value={form.moistureOut || ""} onChange={e => setForm({ ...form, moistureOut: e.target.value })} placeholder="例: 14.5" /></MField>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <Btn color={C.teal} full onClick={() => completeDrying(selectedLot.id)}>完了にする</Btn>
                  <Btn color={C.textSub} full onClick={() => setModal(null)}>キャンセル</Btn>
                </div>
              </div>
            )}

            {/* 籾摺り日程 */}
            {modal === "hullingSchedule" && selectedLot && (
              <div>
                <MTitle>🌀 籾摺り日程を設定</MTitle>
                <div style={{ background: C.surfaceAlt, borderRadius: 8, padding: 12, marginBottom: 16, border: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: "700" }}>{getFarmer(selectedLot.farmerId)?.name} — {selectedLot.variety}</div>
                </div>
                <MField label="籾摺り予定日 *"><input style={inp} type="date" value={form.hullingDate || ""} onChange={e => setForm({ ...form, hullingDate: e.target.value })} /></MField>
                <MField label="備考"><textarea style={{ ...inp, height: 50 }} value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} /></MField>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <Btn color={C.purple} full onClick={scheduleHulling}>日程を確定</Btn>
                  <Btn color={C.textSub} full onClick={() => setModal(null)}>キャンセル</Btn>
                </div>
              </div>
            )}

            {/* 乾燥機容量 */}
            {modal === "editCapacity" && selectedDryer && (
              <div>
                <MTitle>{dryerLabel(selectedDryer.id)} の容量設定</MTitle>
                <MField label="対応容量（石）"><input style={inp} type="number" step="0.1" value={form.capacity || ""} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="例: 20" /></MField>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <Btn color={C.blue} full onClick={saveDryerCapacity}>保存する</Btn>
                  <Btn color={C.textSub} full onClick={() => setModal(null)}>キャンセル</Btn>
                </div>
              </div>
            )}

            {/* 籾摺り実績入力・訂正 */}
            {(modal === "completeHulling" || modal === "editHulling") && selectedHulling && (
              <div>
                <MTitle>{modal === "completeHulling" ? "📋 籾摺り実績を入力" : "✏️ 実績日報を訂正"}</MTitle>
                {(() => {
                  const lot = getLot(selectedHulling.lotId);
                  const farmer = lot ? getFarmer(lot.farmerId) : null;
                  return (
                    <div style={{ background: C.surfaceAlt, borderRadius: 8, padding: 12, marginBottom: 16, border: `1px solid ${C.border}` }}>
                      <div style={{ fontWeight: "700" }}>{farmer?.name}</div>
                      <div style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>{lot?.variety} / {lot?.tanIn}反 / {lot?.bagsIn}袋（{lot?.bagType}）</div>
                    </div>
                  );
                })()}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <MField label="JA供出（袋）"><input style={inp} type="number" value={form.jaSupply || ""} onChange={e => setForm({ ...form, jaSupply: e.target.value })} placeholder="0" /></MField>
                  <MField label="アグリ供出（袋）"><input style={inp} type="number" value={form.agriSupply || ""} onChange={e => setForm({ ...form, agriSupply: e.target.value })} placeholder="0" /></MField>
                  <MField label="他供出（袋）"><input style={inp} type="number" value={form.otherSupply || ""} onChange={e => setForm({ ...form, otherSupply: e.target.value })} placeholder="0" /></MField>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <MField label="飯米（袋数）"><input style={inp} type="number" value={form.iimaiCount || ""} onChange={e => setForm({ ...form, iimaiCount: e.target.value })} placeholder="0" /></MField>
                  <MField label="飯米袋種別"><select style={inp} value={form.iimaiType || "新袋"} onChange={e => setForm({ ...form, iimaiType: e.target.value })}>{BAG_TYPES.map(b => <option key={b}>{b}</option>)}</select></MField>
                </div>
                <MField label="籾乾燥（例: 30×15）"><input style={inp} value={form.momiKanso || ""} onChange={e => setForm({ ...form, momiKanso: e.target.value })} placeholder="30×15" /></MField>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <MField label="くず米"><input style={inp} type="number" value={form.kuzuMai || ""} onChange={e => setForm({ ...form, kuzuMai: e.target.value })} /></MField>
                  <MField label="残米"><input style={inp} type="number" value={form.zanMai || ""} onChange={e => setForm({ ...form, zanMai: e.target.value })} /></MField>
                  <MField label="反別"><input style={inp} value={form.tanBetsu || ""} onChange={e => setForm({ ...form, tanBetsu: e.target.value })} /></MField>
                </div>
                <MField label="水分 (%)"><input style={inp} type="number" step="0.1" value={form.moisture || ""} onChange={e => setForm({ ...form, moisture: e.target.value })} placeholder="例: 14.5" /></MField>
                <MField label="その他備考"><textarea style={{ ...inp, height: 50 }} value={form.resultNote || ""} onChange={e => setForm({ ...form, resultNote: e.target.value })} /></MField>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <Btn color={C.teal} full onClick={() => saveHullingResult(modal === "editHulling")}>{modal === "completeHulling" ? "完了・日報に記録" : "訂正を保存"}</Btn>
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

// ===== UI Components =====
function SectionTitle({ children, sub, noMargin }) {
  return <h2 style={{ fontSize: sub ? 14 : 17, fontWeight: "700", color: sub ? "#5c7a4a" : "#2c2418", marginBottom: noMargin ? 0 : 16, paddingLeft: 10, borderLeft: `3px solid ${sub ? "#8ab870" : "#5c8a3c"}` }}>{children}</h2>;
}
function StatusBadge({ status }) {
  const ss = statusStyle[status] || { color: "#7a6f5e", bg: "#f3f0ec", border: "#e8e2d9" };
  return <span style={{ fontSize: 11, background: ss.bg, color: ss.color, padding: "2px 8px", borderRadius: 20, border: `1px solid ${ss.border}`, fontWeight: "600" }}>{status}</span>;
}
function Btn({ color, onClick, children, full }) {
  return <button onClick={onClick} style={{ background: color + "18", color, border: `1px solid ${color}60`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", width: full ? "100%" : "auto", fontWeight: "600" }}>{children}</button>;
}
function AlertCard({ color, bg, border, title, children }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div style={{ color, fontSize: 13, fontWeight: "700", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}
function AlertRow({ children }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.06)", gap: 8, flexWrap: "wrap" }}>{children}</div>;
}
function InfoCard({ label, value }) {
  return (
    <div style={{ background: "#f7f5f0", borderRadius: 8, padding: "6px 10px", border: "1px solid #e8e2d9" }}>
      <div style={{ fontSize: 9, color: "#b0a494", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: "#2c2418", fontWeight: "600" }}>{value}</div>
    </div>
  );
}
function InfoRow({ label, value }) {
  return <div style={{ fontSize: 12, color: "#7a6f5e", marginBottom: 4 }}><span style={{ color: "#b0a494", marginRight: 6 }}>{label}</span>{value}</div>;
}
function MTitle({ children }) {
  return <h3 style={{ fontSize: 15, fontWeight: "700", color: "#2c2418", marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid #e8e2d9" }}>{children}</h3>;
}
function MField({ label, children }) {
  return <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, color: "#7a6f5e", marginBottom: 4, fontWeight: "600" }}>{label}</div>{children}</div>;
}
function EmptyState() {
  return <div style={{ textAlign: "center", color: "#b0a494", padding: "48px 0", fontSize: 13, background: "#faf9f7", borderRadius: 12, border: "1px dashed #e8e2d9" }}>データがありません</div>;
}

const td = { padding: "8px 12px", color: "#5a5040", textAlign: "center", whiteSpace: "nowrap" };
const inp = {
  width: "100%", background: "#faf9f7", border: "1px solid #e8e2d9", borderRadius: 8,
  color: "#2c2418", padding: "8px 12px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
};

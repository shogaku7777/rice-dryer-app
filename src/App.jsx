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

const defaultDryers = Array.from({ length: DRYER_COUNT }, (_, i) => ({
  id: i + 1, lotId: null, status: "空き", capacity: "",
}));

function loadData(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function saveData(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const statusColor = {
  "空き": "#4ade80", "乾燥中": "#f59e0b", "完了待ち": "#60a5fa",
  "乾燥完了": "#a78bfa", "受付": "#94a3b8", "乾燥待ち": "#fb923c",
  "籾摺り待ち": "#818cf8", "籾摺り中": "#f472b6", "完了": "#34d399",
  "未定": "#94a3b8", "予約済": "#fbbf24", "予約中": "#38bdf8",
};
const statusBg = {
  "空き": "#052e16", "乾燥中": "#451a03", "完了待ち": "#172554",
  "乾燥完了": "#2e1065", "受付": "#1e293b", "乾燥待ち": "#431407",
  "籾摺り待ち": "#1e1b4b", "籾摺り中": "#500724", "完了": "#022c22",
  "未定": "#1e293b", "予約済": "#422006", "予約中": "#0c2a3a",
};

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

  // 顧客追加
  const addFarmer = () => {
    if (!form.name) return;
    setFarmers(prev => [...prev, {
      id: Date.now(), name: form.name, phone: form.phone || "",
      address: form.address || "", district: form.district || "",
      service: form.service || "乾燥＋籾摺り", note: form.note || ""
    }]);
    setModal(null); setForm({});
  };

  // 顧客編集
  const editFarmer = () => {
    if (!form.name || !selectedFarmer) return;
    setFarmers(prev => prev.map(f => f.id === selectedFarmer.id ? {
      ...f, name: form.name, phone: form.phone || "",
      address: form.address || "", district: form.district || "",
      service: form.service || "乾燥＋籾摺り", note: form.note || ""
    } : f));
    setSelectedFarmer(null); setModal(null); setForm({});
  };

  const addLot = () => {
    if (!form.farmerId) return;
    setLots(prev => [...prev, {
      id: Date.now(), farmerId: Number(form.farmerId), variety: form.variety || "ヒノヒカリ",
      tanIn: form.tanIn || "", bagsIn: Number(form.bagsIn) || 0,
      bagType: form.bagType || "新袋",
      moistureIn: form.moistureIn || "", moistureOut: "",
      receivedAt: form.receivedAt || new Date().toISOString().slice(0, 10),
      status: "受付",
      dryerId: form.dryerId ? Number(form.dryerId) : null,
      dryStartAt: null, dryEndAt: null,
      hullingId: null, fee: Number(form.fee) || 0, paid: false, note: form.note || "",
    }]);
    if (form.dryerId) {
      setDryers(prev => prev.map(d => d.id === Number(form.dryerId) ? { ...d, status: "予約中" } : d));
    }
    setModal(null); setForm({});
  };

  const assignDryer = (dryerId) => {
    if (!selectedLot) return;
    const now = new Date().toISOString().slice(0, 10);
    setDryers(prev => prev.map(d => {
      if (d.id === dryerId) return { ...d, lotId: selectedLot.id, status: "乾燥中" };
      if (d.id === selectedLot.dryerId && d.status === "予約中") return { ...d, status: "乾燥中" };
      return d;
    }));
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

  const completeHullingWithResult = () => {
    if (!selectedHulling) return;
    const result = {
      jaSupply: form.jaSupply || "", agriSupply: form.agriSupply || "",
      otherSupply: form.otherSupply || "", iimaiCount: form.iimaiCount || "",
      iimaiType: form.iimaiType || "新袋", momiKanso: form.momiKanso || "",
      kuzuMai: form.kuzuMai || "", zanMai: form.zanMai || "",
      tanBetsu: form.tanBetsu || "", moisture: form.moisture || "",
      resultNote: form.resultNote || "",
    };
    setHulling(prev => prev.map(h => h.id === selectedHulling.id ? { ...h, status: "完了", result } : h));
    const h = hulling.find(h => h.id === selectedHulling.id);
    if (h) setLots(prev => prev.map(l => l.id === h.lotId ? { ...l, status: "完了" } : l));
    setSelectedHulling(null); setModal(null); setForm({});
  };

  // 実績日報の編集
  const editHullingResult = () => {
    if (!selectedHulling) return;
    const result = {
      jaSupply: form.jaSupply || "", agriSupply: form.agriSupply || "",
      otherSupply: form.otherSupply || "", iimaiCount: form.iimaiCount || "",
      iimaiType: form.iimaiType || "新袋", momiKanso: form.momiKanso || "",
      kuzuMai: form.kuzuMai || "", zanMai: form.zanMai || "",
      tanBetsu: form.tanBetsu || "", moisture: form.moisture || "",
      resultNote: form.resultNote || "",
    };
    setHulling(prev => prev.map(h => h.id === selectedHulling.id ? { ...h, result } : h));
    setSelectedHulling(null); setModal(null); setForm({});
  };

  const saveDryerCapacity = () => {
    if (!selectedDryer) return;
    setDryers(prev => prev.map(d => d.id === selectedDryer.id ? { ...d, capacity: form.capacity || "" } : d));
    setSelectedDryer(null); setModal(null); setForm({});
  };

  const togglePaid = (lotId) => {
    setLots(prev => prev.map(l => l.id === lotId ? { ...l, paid: !l.paid } : l));
  };

  const getFarmer = (id) => farmers.find(f => f.id === id);
  const getLot = (id) => lots.find(l => l.id === id);
  const getDryer = (id) => dryers.find(d => d.id === id);

  const activeLots = lots.filter(l => l.status !== "完了");
  const waitingLots = lots.filter(l => l.status === "受付" || l.status === "乾燥待ち");
  const reservedLots = lots.filter(l => l.status === "受付" && l.dryerId);
  const dryingLots = lots.filter(l => l.status === "乾燥中");
  const hullingWaitLots = lots.filter(l => l.status === "乾燥完了");
  const activeHulling = hulling.filter(h => h.status !== "完了");
  const completedHulling = hulling.filter(h => h.status === "完了");

  const googleMapsUrl = (address) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  const buildLineMessage = (farmer, lot, r) => {
    const lines = [];
    lines.push(`${farmer?.name || ""}　様`);
    lines.push("");
    lines.push("籾摺りが完了しました🌾");
    lines.push("");
    lines.push("【作業内容】");
    if (lot?.variety) lines.push(`品種：${lot.variety}`);
    if (lot?.tanIn) lines.push(`持込量：${lot.tanIn}反`);
    if (r?.jaSupply) lines.push(`JA供出：${r.jaSupply}袋`);
    if (r?.agriSupply) lines.push(`アグリ供出：${r.agriSupply}袋`);
    if (r?.otherSupply) lines.push(`他供出：${r.otherSupply}袋`);
    if (r?.iimaiCount) lines.push(`飯米：${r.iimaiType === "一空" ? "一空" : "新"}${r.iimaiCount}袋`);
    if (r?.momiKanso) lines.push(`籾乾燥：${r.momiKanso}`);
    if (r?.kuzuMai) lines.push(`くず米：${r.kuzuMai}`);
    if (r?.zanMai) lines.push(`残米：${r.zanMai}`);
    if (r?.moisture) lines.push(`水分：${r.moisture}%`);
    if (r?.resultNote) lines.push(`備考：${r.resultNote}`);
    if (lot?.fee > 0) {
      lines.push("");
      lines.push("【精算金額】");
      lines.push(`¥${Number(lot.fee).toLocaleString()}`);
    }
    lines.push("");
    lines.push("ご確認よろしくお願いします。");
    return lines.join("\n");
  };

  // 乾燥機ラベル（「乾燥機1」形式）
  const dryerLabel = (id) => `乾燥機${id}`;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", color: "#e8dcc8", fontFamily: "'Noto Serif JP', 'Hiragino Mincho ProN', serif" }}>
      <header style={{ background: "linear-gradient(135deg, #1a0f00 0%, #2d1a00 50%, #1a0f00 100%)", borderBottom: "2px solid #8b6914", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>🌾</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#f0c060", letterSpacing: 2 }}>籾乾燥管理システム</div>
            <div style={{ fontSize: 11, color: "#a08040", letterSpacing: 1 }}>乾燥機10台・籾摺り実績日報</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#806030" }}>{new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}</div>
      </header>

      <nav style={{ background: "#111827", borderBottom: "1px solid #374151", display: "flex", overflowX: "auto" }}>
        {[
          { id: "dashboard", label: "📊 ダッシュボード" },
          { id: "dryers", label: "🔢 乾燥機管理" },
          { id: "reception", label: "📥 受付・持込" },
          { id: "hulling", label: "🌀 籾摺り" },
          { id: "report", label: "📋 実績日報" },
          { id: "farmers", label: "👥 顧客管理" },
          { id: "history", label: "💰 精算管理" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "12px 16px", background: "none", border: "none", cursor: "pointer",
            color: tab === t.id ? "#f0c060" : "#6b7280",
            borderBottom: tab === t.id ? "2px solid #f0c060" : "2px solid transparent",
            fontFamily: "inherit", fontSize: 12, whiteSpace: "nowrap",
            fontWeight: tab === t.id ? "bold" : "normal",
          }}>{t.label}</button>
        ))}
      </nav>

      <main style={{ padding: "20px 16px", maxWidth: 1100, margin: "0 auto" }}>

        {/* ===== DASHBOARD ===== */}
        {tab === "dashboard" && (
          <div>
            <h2 style={sectionTitle}>本日の状況</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "稼働中乾燥機", value: dryingLots.length + " / 10台", color: "#f59e0b" },
                { label: "空き乾燥機", value: dryers.filter(d => d.status === "空き").length + "台", color: "#4ade80" },
                { label: "予約中乾燥機", value: dryers.filter(d => d.status === "予約中").length + "台", color: "#38bdf8" },
                { label: "籾摺り予定", value: activeHulling.length + "件", color: "#818cf8" },
                { label: "今季完了", value: completedHulling.length + "件", color: "#34d399" },
                { label: "未精算", value: lots.filter(l => !l.paid && l.fee > 0).length + "件", color: "#f472b6" },
              ].map(s => (
                <div key={s.label} style={{ background: "#111827", border: "1px solid #374151", borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: "bold", color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <h3 style={{ color: "#c8a040", fontSize: 15, marginBottom: 12 }}>乾燥機一覧</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 24 }}>
              {dryers.map(d => {
                const lot = d.lotId ? getLot(d.lotId) : d.status === "予約中" ? lots.find(l => l.dryerId === d.id) : null;
                const farmer = lot ? getFarmer(lot.farmerId) : null;
                const sc = statusColor[d.status] || "#94a3b8";
                const sb = statusBg[d.status] || "#1e293b";
                return (
                  <div key={d.id} style={{ background: sb, border: `1px solid ${sc}`, borderRadius: 8, padding: "10px 8px", textAlign: "center", minHeight: 90 }}>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>{dryerLabel(d.id)}</div>
                    {d.capacity && <div style={{ fontSize: 9, color: "#4a7c3f", marginBottom: 2 }}>{d.capacity}石</div>}
                    <div style={{ fontSize: 12, color: sc, fontWeight: "bold", marginBottom: 4 }}>{d.status}</div>
                    {farmer && <div style={{ fontSize: 11, color: "#e8dcc8" }}>{farmer.name}</div>}
                    {lot && <div style={{ fontSize: 10, color: "#a08040" }}>{lot.variety} / {lot.tanIn}反</div>}
                  </div>
                );
              })}
            </div>

            {reservedLots.length > 0 && (
              <div style={{ background: "#0c2a3a", border: "1px solid #38bdf8", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <h3 style={{ color: "#38bdf8", fontSize: 14, marginBottom: 10 }}>🔵 乾燥機予約済み・開始待ち</h3>
                {reservedLots.map(lot => {
                  const farmer = getFarmer(lot.farmerId);
                  const dryer = getDryer(lot.dryerId);
                  return (
                    <div key={lot.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #374151" }}>
                      <div>
                        <span style={{ color: "#e8dcc8", fontSize: 13 }}>{farmer?.name}</span>
                        <span style={{ color: "#a08040", fontSize: 11, marginLeft: 8 }}>{lot.variety} / {lot.tanIn}反 → {dryerLabel(dryer?.id)}</span>
                      </div>
                      <button onClick={() => startDrying(lot.id)} style={btnStyle("#f59e0b")}>乾燥開始</button>
                    </div>
                  );
                })}
              </div>
            )}

            {waitingLots.filter(l => !l.dryerId).length > 0 && (
              <div style={{ background: "#1c1008", border: "1px solid #92400e", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <h3 style={{ color: "#fb923c", fontSize: 14, marginBottom: 10 }}>⚠️ 乾燥機未割り当て</h3>
                {waitingLots.filter(l => !l.dryerId).map(lot => {
                  const farmer = getFarmer(lot.farmerId);
                  return (
                    <div key={lot.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #374151" }}>
                      <div>
                        <span style={{ color: "#e8dcc8", fontSize: 13 }}>{farmer?.name}</span>
                        <span style={{ color: "#a08040", fontSize: 11, marginLeft: 8 }}>{lot.variety} / {lot.tanIn}反</span>
                      </div>
                      <button onClick={() => { setSelectedLot(lot); setModal("assignDryer"); }} style={btnStyle("#f59e0b")}>乾燥機を割り当て</button>
                    </div>
                  );
                })}
              </div>
            )}

            {hullingWaitLots.length > 0 && (
              <div style={{ background: "#120a2e", border: "1px solid #4c1d95", borderRadius: 10, padding: 16 }}>
                <h3 style={{ color: "#a78bfa", fontSize: 14, marginBottom: 10 }}>💡 籾摺りスケジュール未設定</h3>
                {hullingWaitLots.map(lot => {
                  const farmer = getFarmer(lot.farmerId);
                  return (
                    <div key={lot.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #374151" }}>
                      <div>
                        <span style={{ color: "#e8dcc8", fontSize: 13 }}>{farmer?.name}</span>
                        <span style={{ color: "#a08040", fontSize: 11, marginLeft: 8 }}>{lot.variety}</span>
                      </div>
                      <button onClick={() => { setSelectedLot(lot); setModal("hullingSchedule"); }} style={btnStyle("#818cf8")}>日程を設定</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== DRYERS ===== */}
        {tab === "dryers" && (
          <div>
            <h2 style={sectionTitle}>乾燥機管理</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {dryers.map(d => {
                const lot = d.lotId ? getLot(d.lotId) : d.status === "予約中" ? lots.find(l => l.dryerId === d.id) : null;
                const farmer = lot ? getFarmer(lot.farmerId) : null;
                const sc = statusColor[d.status] || "#94a3b8";
                return (
                  <div key={d.id} style={{ background: "#111827", border: `1px solid ${sc}40`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 16, color: "#f0c060", fontWeight: "bold" }}>{dryerLabel(d.id)}</span>
                      <span style={{ fontSize: 12, background: `${sc}20`, color: sc, padding: "2px 8px", borderRadius: 10, border: `1px solid ${sc}` }}>{d.status}</span>
                    </div>
                    <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#60a5fa" }}>容量: {d.capacity ? d.capacity + " 石" : "未設定"}</span>
                      <button onClick={() => { setSelectedDryer(d); setForm({ capacity: d.capacity || "" }); setModal("editCapacity"); }} style={btnStyle("#60a5fa", false, true)}>変更</button>
                    </div>
                    {lot && farmer ? (
                      <div>
                        <div style={{ marginBottom: 6 }}><Label>顧客</Label>{farmer.name}</div>
                        <div style={{ marginBottom: 6 }}><Label>品種</Label>{lot.variety}</div>
                        <div style={{ marginBottom: 6 }}><Label>持込</Label>{lot.tanIn}反 / {lot.bagsIn}袋（{lot.bagType || "新袋"}）</div>
                        <div style={{ marginBottom: 6 }}><Label>水分(入)</Label>{lot.moistureIn || "—"}%</div>
                        <div style={{ marginBottom: 10 }}><Label>開始日</Label>{lot.dryStartAt || "—"}</div>
                        {d.status === "乾燥中" && (
                          <button onClick={() => { setSelectedLot(lot); setModal("completeDrying"); }} style={btnStyle("#4ade80", true)}>乾燥完了にする</button>
                        )}
                        {d.status === "予約中" && (
                          <button onClick={() => startDrying(lot.id)} style={btnStyle("#f59e0b", true)}>乾燥開始</button>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: "#4ade80", textAlign: "center", paddingTop: 10 }}>
                        <div style={{ fontSize: 28 }}>✓</div>
                        <div style={{ fontSize: 13 }}>空き</div>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={sectionTitle}>受付・持込管理</h2>
              <button onClick={() => { setForm({}); setModal("addLot"); }} style={btnStyle("#f59e0b")}>＋ 新規受付</button>
            </div>
            {activeLots.length === 0 && <EmptyState>現在アクティブなロットはありません</EmptyState>}
            {activeLots.map(lot => {
              const farmer = getFarmer(lot.farmerId);
              const dryer = lot.dryerId ? getDryer(lot.dryerId) : null;
              const sc = statusColor[lot.status] || "#94a3b8";
              return (
                <div key={lot.id} style={{ background: "#111827", border: "1px solid #374151", borderRadius: 10, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 15, color: "#e8dcc8", fontWeight: "bold", marginRight: 8 }}>{farmer?.name}</span>
                      <span style={{ fontSize: 12, background: `${sc}20`, color: sc, padding: "2px 8px", borderRadius: 10, border: `1px solid ${sc}` }}>{lot.status}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{lot.receivedAt}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginTop: 10 }}>
                    <Info label="品種" value={lot.variety} />
                    <Info label="持込量" value={`${lot.tanIn}反`} />
                    <Info label="袋数" value={`${lot.bagsIn}袋（${lot.bagType || "新袋"}）`} />
                    <Info label="水分(入)" value={lot.moistureIn ? lot.moistureIn + "%" : "—"} />
                    <Info label="水分(出)" value={lot.moistureOut ? lot.moistureOut + "%" : "—"} />
                    <Info label="乾燥機" value={dryer ? dryerLabel(dryer.id) : "未割当"} />
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {lot.status === "受付" && !lot.dryerId && (
                      <button onClick={() => { setSelectedLot(lot); setModal("assignDryer"); }} style={btnStyle("#f59e0b")}>乾燥機を割り当て</button>
                    )}
                    {lot.status === "受付" && lot.dryerId && (
                      <button onClick={() => startDrying(lot.id)} style={btnStyle("#38bdf8")}>乾燥開始</button>
                    )}
                    {lot.status === "乾燥中" && (
                      <button onClick={() => { setSelectedLot(lot); setModal("completeDrying"); }} style={btnStyle("#4ade80")}>乾燥完了</button>
                    )}
                    {lot.status === "乾燥完了" && (
                      <button onClick={() => { setSelectedLot(lot); setModal("hullingSchedule"); }} style={btnStyle("#818cf8")}>籾摺り日程を設定</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== HULLING ===== */}
        {tab === "hulling" && (
          <div>
            <h2 style={sectionTitle}>籾摺りスケジュール</h2>
            {activeHulling.length === 0 && <EmptyState>籾摺り予定はありません</EmptyState>}
            {[...activeHulling].sort((a, b) => a.date > b.date ? 1 : -1).map(h => {
              const lot = getLot(h.lotId);
              const farmer = lot ? getFarmer(lot.farmerId) : null;
              const sc = statusColor[h.status] || "#94a3b8";
              return (
                <div key={h.id} style={{ background: "#111827", border: "1px solid #374151", borderRadius: 10, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 14, color: "#e8dcc8", fontWeight: "bold", marginRight: 8 }}>{farmer?.name || "不明"}</span>
                      <span style={{ fontSize: 12, background: `${sc}20`, color: sc, padding: "2px 8px", borderRadius: 10, border: `1px solid ${sc}` }}>{h.status}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#f0c060" }}>📅 {h.date}</div>
                  </div>
                  {lot && <div style={{ fontSize: 12, color: "#a08040", marginTop: 6 }}>{lot.variety} / {lot.tanIn}反 / {lot.bagsIn}袋（{lot.bagType || "新袋"}）</div>}
                  {h.note && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>備考: {h.note}</div>}
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    {h.status === "予約済" && <button onClick={() => startHulling(h.id)} style={btnStyle("#f472b6")}>籾摺り開始</button>}
                    {h.status === "籾摺り中" && (
                      <button onClick={() => { setSelectedHulling(h); setForm({}); setModal("completeHulling"); }} style={btnStyle("#34d399")}>実績を入力して完了</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===== REPORT ===== */}
        {tab === "report" && (
          <div>
            <h2 style={sectionTitle}>籾摺り実績日報</h2>
            {completedHulling.length === 0 && <EmptyState>完了した籾摺りがありません</EmptyState>}
            {completedHulling.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 900 }}>
                  <thead>
                    <tr style={{ background: "#1e2d1a", borderBottom: "2px solid #4a7c3f" }}>
                      {["日付", "氏名", "JA供出", "アグリ供出", "他供出", "飯米", "籾乾燥", "くず米", "残米", "反別", "水分", "その他", "訂正"].map(h => (
                        <th key={h} style={{ padding: "8px 10px", color: "#a0c080", textAlign: "center", whiteSpace: "nowrap", fontWeight: "bold" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...completedHulling].sort((a, b) => a.date > b.date ? 1 : -1).map((h, i) => {
                      const lot = getLot(h.lotId);
                      const farmer = lot ? getFarmer(lot.farmerId) : null;
                      const r = h.result || {};
                      return (
                        <tr key={h.id} style={{ background: i % 2 === 0 ? "#0f1a0f" : "#111827", borderBottom: "1px solid #2d3748" }}>
                          <td style={tdStyle}>{h.date?.slice(5)}</td>
                          <td style={{ ...tdStyle, fontWeight: "bold", color: "#e8dcc8" }}>{farmer?.name || "—"}</td>
                          <td style={tdStyle}>{r.jaSupply || "—"}</td>
                          <td style={tdStyle}>{r.agriSupply || "—"}</td>
                          <td style={tdStyle}>{r.otherSupply || "—"}</td>
                          <td style={tdStyle}>{r.iimaiCount ? `${r.iimaiType === "一空" ? "一空" : "新"}${r.iimaiCount}` : "—"}</td>
                          <td style={tdStyle}>{r.momiKanso || "—"}</td>
                          <td style={tdStyle}>{r.kuzuMai || "—"}</td>
                          <td style={tdStyle}>{r.zanMai || "—"}</td>
                          <td style={tdStyle}>{r.tanBetsu || lot?.tanIn || "—"}</td>
                          <td style={tdStyle}>{r.moisture || lot?.moistureOut || "—"}</td>
                          <td style={{ ...tdStyle, color: "#a08040" }}>{r.resultNote || "—"}</td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                              <button onClick={() => {
                                setSelectedHulling(h);
                                setForm({ ...r });
                                setModal("editHulling");
                              }} style={btnStyle("#f0c060", false, true)}>✏️ 訂正</button>
                              <button onClick={() => {
                                const msg = buildLineMessage(farmer, lot, r);
                                navigator.clipboard.writeText(msg).then(() => alert("📋 コピーしました！\nLINEに貼り付けて送信してください。"));
                              }} style={btnStyle("#06b6d4", false, true)}>📋 LINE</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== CUSTOMERS ===== */}
        {tab === "farmers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={sectionTitle}>顧客管理</h2>
              <button onClick={() => { setForm({}); setModal("addFarmer"); }} style={btnStyle("#f0c060")}>＋ 顧客を登録</button>
            </div>
            {farmers.length === 0 && <EmptyState>顧客が登録されていません</EmptyState>}
            {farmers.map(f => {
              const farmerLots = lots.filter(l => l.farmerId === f.id);
              const activeFarmerLots = farmerLots.filter(l => l.status !== "完了");
              return (
                <div key={f.id} style={{ background: "#111827", border: "1px solid #374151", borderRadius: 10, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, color: "#e8dcc8", fontWeight: "bold" }}>{f.name}</div>
                      {/* 電話番号タップで電話発信 */}
                      {f.phone && (
                        <a href={`tel:${f.phone}`} style={{ fontSize: 13, color: "#38bdf8", marginTop: 4, display: "block", textDecoration: "none" }}>
                          📞 {f.phone}
                        </a>
                      )}
                      {f.district && <div style={{ fontSize: 12, color: "#a08040", marginTop: 4 }}>📍 {f.district}</div>}
                      {f.address && (
                        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>{f.address}</span>
                          <a href={googleMapsUrl(f.address)} target="_blank" rel="noopener noreferrer" style={{
                            fontSize: 11, color: "#34d399", border: "1px solid #34d399", borderRadius: 6,
                            padding: "2px 8px", textDecoration: "none", background: "#022c22"
                          }}>🗺️ マップ</a>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "#f59e0b", background: "#451a03", padding: "2px 8px", borderRadius: 8 }}>{f.service}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", marginLeft: 12, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      <button onClick={() => {
                        setSelectedFarmer(f);
                        setForm({ name: f.name, phone: f.phone, address: f.address, district: f.district, service: f.service, note: f.note });
                        setModal("editFarmer");
                      }} style={btnStyle("#f0c060", false, true)}>✏️ 編集</button>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>今季受付: {farmerLots.length}件</div>
                      {activeFarmerLots.length > 0 && <div style={{ fontSize: 12, color: "#f59e0b" }}>対応中: {activeFarmerLots.length}件</div>}
                    </div>
                  </div>
                  {f.note && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8, borderTop: "1px solid #374151", paddingTop: 8 }}>備考: {f.note}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* ===== HISTORY ===== */}
        {tab === "history" && (
          <div>
            <h2 style={sectionTitle}>精算管理</h2>
            {lots.length === 0 && <EmptyState>履歴はありません</EmptyState>}
            {[...lots].reverse().map(lot => {
              const farmer = getFarmer(lot.farmerId);
              const sc = statusColor[lot.status] || "#94a3b8";
              return (
                <div key={lot.id} style={{ background: "#111827", border: "1px solid #374151", borderRadius: 10, padding: 14, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, color: "#e8dcc8", fontWeight: "bold" }}>{farmer?.name}</span>
                      <span style={{ fontSize: 11, background: `${sc}20`, color: sc, padding: "2px 6px", borderRadius: 8, border: `1px solid ${sc}` }}>{lot.status}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {lot.fee > 0 && (
                        <span style={{ fontSize: 13, color: lot.paid ? "#34d399" : "#f472b6" }}>
                          ¥{lot.fee.toLocaleString()} {lot.paid ? "✓精算済" : "未精算"}
                        </span>
                      )}
                      {lot.fee > 0 && (
                        <button onClick={() => togglePaid(lot.id)} style={btnStyle(lot.paid ? "#374151" : "#34d399", false, true)}>
                          {lot.paid ? "未精算に戻す" : "精算済みにする"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 6, marginTop: 8 }}>
                    <Info label="品種" value={lot.variety} small />
                    <Info label="受付日" value={lot.receivedAt} small />
                    <Info label="持込量" value={`${lot.tanIn}反`} small />
                    <Info label="袋数" value={`${lot.bagsIn}袋（${lot.bagType || "新袋"}）`} small />
                    <Info label="水分(入)" value={lot.moistureIn ? lot.moistureIn + "%" : "—"} small />
                    <Info label="水分(出)" value={lot.moistureOut ? lot.moistureOut + "%" : "—"} small />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ===== MODALS ===== */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setModal(null)}>
          <div style={{ background: "#111827", border: "1px solid #374151", borderRadius: 14, padding: 24, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>

            {/* 顧客登録フォーム（共通） */}
            {(modal === "addFarmer" || modal === "editFarmer") && (
              <div>
                <ModalTitle>{modal === "addFarmer" ? "👥 顧客を登録" : "✏️ 顧客情報を編集"}</ModalTitle>
                <Field label="氏名 *"><input style={inputStyle} value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例: 山田 太郎" /></Field>
                <Field label="電話番号"><input style={inputStyle} type="tel" value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="090-0000-0000" /></Field>
                <Field label="地区名"><input style={inputStyle} value={form.district || ""} onChange={e => setForm({ ...form, district: e.target.value })} placeholder="例: 竹田地区" /></Field>
                <Field label="住所（Googleマップで表示できます）"><input style={inputStyle} value={form.address || ""} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="例: 大分県大分市○○町1-2-3" /></Field>
                <Field label="サービス種別">
                  <select style={inputStyle} value={form.service || "乾燥＋籾摺り"} onChange={e => setForm({ ...form, service: e.target.value })}>
                    {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="備考"><textarea style={{ ...inputStyle, height: 60 }} value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} /></Field>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={modal === "addFarmer" ? addFarmer : editFarmer} style={btnStyle("#f0c060", true)}>
                    {modal === "addFarmer" ? "登録する" : "保存する"}
                  </button>
                  <button onClick={() => setModal(null)} style={btnStyle("#374151", true)}>キャンセル</button>
                </div>
              </div>
            )}

            {/* 新規受付 */}
            {modal === "addLot" && (
              <div>
                <ModalTitle>📥 新規持込受付</ModalTitle>
                <Field label="顧客 *">
                  <select style={inputStyle} value={form.farmerId || ""} onChange={e => setForm({ ...form, farmerId: e.target.value })}>
                    <option value="">-- 顧客を選択 --</option>
                    {farmers.map(f => <option key={f.id} value={f.id}>{f.name}{f.district ? `（${f.district}）` : ""}</option>)}
                  </select>
                </Field>
                <Field label="品種">
                  <select style={inputStyle} value={form.variety || "ヒノヒカリ"} onChange={e => setForm({ ...form, variety: e.target.value })}>
                    {VARIETIES.map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="持込量（反）"><input style={inputStyle} type="number" step="0.1" value={form.tanIn || ""} onChange={e => setForm({ ...form, tanIn: e.target.value })} placeholder="例: 3.5" /></Field>
                  <Field label="水分値(入) (%)"><input style={inputStyle} type="number" step="0.1" value={form.moistureIn || ""} onChange={e => setForm({ ...form, moistureIn: e.target.value })} /></Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="袋数"><input style={inputStyle} type="number" value={form.bagsIn || ""} onChange={e => setForm({ ...form, bagsIn: e.target.value })} /></Field>
                  <Field label="袋種別">
                    <select style={inputStyle} value={form.bagType || "新袋"} onChange={e => setForm({ ...form, bagType: e.target.value })}>
                      {BAG_TYPES.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="乾燥機を予約（任意）">
                  <select style={inputStyle} value={form.dryerId || ""} onChange={e => setForm({ ...form, dryerId: e.target.value })}>
                    <option value="">-- 後で割り当て --</option>
                    {dryers.filter(d => d.status === "空き").map(d => (
                      <option key={d.id} value={d.id}>{dryerLabel(d.id)}（空き）{d.capacity ? ` / ${d.capacity}石` : ""}</option>
                    ))}
                  </select>
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="受付日"><input style={inputStyle} type="date" value={form.receivedAt || new Date().toISOString().slice(0, 10)} onChange={e => setForm({ ...form, receivedAt: e.target.value })} /></Field>
                  <Field label="料金 (円)"><input style={inputStyle} type="number" value={form.fee || ""} onChange={e => setForm({ ...form, fee: e.target.value })} /></Field>
                </div>
                <Field label="備考"><textarea style={{ ...inputStyle, height: 50 }} value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} /></Field>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={addLot} style={btnStyle("#f59e0b", true)}>受付する</button>
                  <button onClick={() => setModal(null)} style={btnStyle("#374151", true)}>キャンセル</button>
                </div>
              </div>
            )}

            {/* 乾燥機割り当て */}
            {modal === "assignDryer" && selectedLot && (
              <div>
                <ModalTitle>乾燥機を割り当て</ModalTitle>
                <div style={{ background: "#1e293b", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <div style={{ color: "#e8dcc8", fontSize: 14 }}>{getFarmer(selectedLot.farmerId)?.name} — {selectedLot.variety}</div>
                  <div style={{ color: "#a08040", fontSize: 12, marginTop: 4 }}>{selectedLot.tanIn}反 / {selectedLot.bagsIn}袋（{selectedLot.bagType}）</div>
                </div>
                <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 10 }}>空いている乾燥機を選んでください：</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                  {dryers.map(d => (
                    <button key={d.id} onClick={() => d.status === "空き" && assignDryer(d.id)} style={{
                      padding: "12px 4px", borderRadius: 8,
                      border: d.status === "空き" ? "1px solid #4ade80" : "1px solid #374151",
                      background: d.status === "空き" ? "#052e16" : "#1e293b",
                      color: d.status === "空き" ? "#4ade80" : "#4b5563",
                      cursor: d.status === "空き" ? "pointer" : "not-allowed",
                      fontSize: 11, fontFamily: "inherit",
                    }}>
                      <div>{dryerLabel(d.id)}</div>
                      <div style={{ fontSize: 9, marginTop: 2 }}>{d.status}</div>
                      {d.capacity && <div style={{ fontSize: 9, color: "#60a5fa" }}>{d.capacity}石</div>}
                    </button>
                  ))}
                </div>
                <button onClick={() => setModal(null)} style={{ ...btnStyle("#374151", true), marginTop: 16 }}>キャンセル</button>
              </div>
            )}

            {/* 乾燥完了 */}
            {modal === "completeDrying" && selectedLot && (
              <div>
                <ModalTitle>✅ 乾燥完了処理</ModalTitle>
                <div style={{ background: "#1e293b", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <div style={{ color: "#e8dcc8" }}>{getFarmer(selectedLot.farmerId)?.name} — {selectedLot.variety}</div>
                </div>
                <Field label="水分値(出) (%)"><input style={inputStyle} type="number" step="0.1" value={form.moistureOut || ""} onChange={e => setForm({ ...form, moistureOut: e.target.value })} placeholder="例: 14.5" /></Field>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={() => completeDrying(selectedLot.id)} style={btnStyle("#4ade80", true)}>完了にする</button>
                  <button onClick={() => setModal(null)} style={btnStyle("#374151", true)}>キャンセル</button>
                </div>
              </div>
            )}

            {/* 籾摺り日程 */}
            {modal === "hullingSchedule" && selectedLot && (
              <div>
                <ModalTitle>🌀 籾摺り日程を設定</ModalTitle>
                <div style={{ background: "#1e293b", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <div style={{ color: "#e8dcc8" }}>{getFarmer(selectedLot.farmerId)?.name} — {selectedLot.variety}</div>
                </div>
                <Field label="籾摺り予定日 *"><input style={inputStyle} type="date" value={form.hullingDate || ""} onChange={e => setForm({ ...form, hullingDate: e.target.value })} /></Field>
                <Field label="備考"><textarea style={{ ...inputStyle, height: 50 }} value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} /></Field>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={scheduleHulling} style={btnStyle("#818cf8", true)}>日程を確定</button>
                  <button onClick={() => setModal(null)} style={btnStyle("#374151", true)}>キャンセル</button>
                </div>
              </div>
            )}

            {/* 乾燥機容量編集 */}
            {modal === "editCapacity" && selectedDryer && (
              <div>
                <ModalTitle>{dryerLabel(selectedDryer.id)} の容量設定</ModalTitle>
                <Field label="対応容量（石）">
                  <input style={inputStyle} type="number" step="0.1" value={form.capacity || ""} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="例: 20" />
                </Field>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={saveDryerCapacity} style={btnStyle("#60a5fa", true)}>保存する</button>
                  <button onClick={() => setModal(null)} style={btnStyle("#374151", true)}>キャンセル</button>
                </div>
              </div>
            )}

            {/* 籾摺り実績入力（完了時・訂正共通） */}
            {(modal === "completeHulling" || modal === "editHulling") && selectedHulling && (
              <div>
                <ModalTitle>{modal === "completeHulling" ? "📋 籾摺り実績を入力" : "✏️ 実績日報を訂正"}</ModalTitle>
                {(() => {
                  const lot = getLot(selectedHulling.lotId);
                  const farmer = lot ? getFarmer(lot.farmerId) : null;
                  return (
                    <div style={{ background: "#1e293b", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                      <div style={{ color: "#e8dcc8", fontSize: 14, fontWeight: "bold" }}>{farmer?.name}</div>
                      <div style={{ color: "#a08040", fontSize: 12, marginTop: 4 }}>{lot?.variety} / {lot?.tanIn}反 / {lot?.bagsIn}袋（{lot?.bagType}）</div>
                    </div>
                  );
                })()}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <Field label="JA供出（袋）"><input style={inputStyle} type="number" value={form.jaSupply || ""} onChange={e => setForm({ ...form, jaSupply: e.target.value })} placeholder="0" /></Field>
                  <Field label="アグリ供出（袋）"><input style={inputStyle} type="number" value={form.agriSupply || ""} onChange={e => setForm({ ...form, agriSupply: e.target.value })} placeholder="0" /></Field>
                  <Field label="他供出（袋）"><input style={inputStyle} type="number" value={form.otherSupply || ""} onChange={e => setForm({ ...form, otherSupply: e.target.value })} placeholder="0" /></Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="飯米（袋数）"><input style={inputStyle} type="number" value={form.iimaiCount || ""} onChange={e => setForm({ ...form, iimaiCount: e.target.value })} placeholder="0" /></Field>
                  <Field label="飯米袋種別">
                    <select style={inputStyle} value={form.iimaiType || "新袋"} onChange={e => setForm({ ...form, iimaiType: e.target.value })}>
                      {BAG_TYPES.map(b => <option key={b}>{b}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="籾乾燥（例: 30×15）"><input style={inputStyle} value={form.momiKanso || ""} onChange={e => setForm({ ...form, momiKanso: e.target.value })} placeholder="30×15" /></Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <Field label="くず米"><input style={inputStyle} type="number" value={form.kuzuMai || ""} onChange={e => setForm({ ...form, kuzuMai: e.target.value })} /></Field>
                  <Field label="残米"><input style={inputStyle} type="number" value={form.zanMai || ""} onChange={e => setForm({ ...form, zanMai: e.target.value })} /></Field>
                  <Field label="反別"><input style={inputStyle} value={form.tanBetsu || ""} onChange={e => setForm({ ...form, tanBetsu: e.target.value })} /></Field>
                </div>
                <Field label="水分 (%)"><input style={inputStyle} type="number" step="0.1" value={form.moisture || ""} onChange={e => setForm({ ...form, moisture: e.target.value })} placeholder="例: 14.5" /></Field>
                <Field label="その他備考"><textarea style={{ ...inputStyle, height: 50 }} value={form.resultNote || ""} onChange={e => setForm({ ...form, resultNote: e.target.value })} /></Field>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={modal === "completeHulling" ? completeHullingWithResult : editHullingResult} style={btnStyle("#34d399", true)}>
                    {modal === "completeHulling" ? "完了・日報に記録" : "訂正を保存"}
                  </button>
                  <button onClick={() => setModal(null)} style={btnStyle("#374151", true)}>キャンセル</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const sectionTitle = { color: "#f0c060", fontSize: 18, marginBottom: 16, borderLeft: "3px solid #f0c060", paddingLeft: 10, margin: "0 0 16px 0" };
const tdStyle = { padding: "7px 10px", color: "#c8bca8", textAlign: "center", whiteSpace: "nowrap" };
const btnStyle = (color, full = false, small = false) => ({
  background: `${color}20`, color, border: `1px solid ${color}`, borderRadius: 6,
  padding: small ? "3px 8px" : "7px 14px", cursor: "pointer", fontSize: small ? 11 : 12,
  fontFamily: "inherit", width: full ? "100%" : "auto",
});
const inputStyle = {
  width: "100%", background: "#0f172a", border: "1px solid #374151", borderRadius: 6,
  color: "#e8dcc8", padding: "8px 10px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
};
function Label({ children }) {
  return <span style={{ fontSize: 11, color: "#6b7280", marginRight: 6 }}>{children}:</span>;
}
function Field({ label, children }) {
  return <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>{label}</div>{children}</div>;
}
function Info({ label, value, small }) {
  return (
    <div style={{ background: "#1e293b", borderRadius: 6, padding: "6px 8px" }}>
      <div style={{ fontSize: 10, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: small ? 11 : 12, color: "#e8dcc8", marginTop: 2 }}>{value}</div>
    </div>
  );
}
function ModalTitle({ children }) {
  return <h3 style={{ color: "#f0c060", fontSize: 16, marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #374151" }}>{children}</h3>;
}
function EmptyState({ children }) {
  return <div style={{ textAlign: "center", color: "#4b5563", padding: "40px 0", fontSize: 14 }}>{children}</div>;
}

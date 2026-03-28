import { useState, useEffect } from "react";

const STORAGE_KEYS = {
  farmers: "rice_farmers",
  lots: "rice_lots",
  dryers: "rice_dryers",
  hulling: "rice_hulling",
};

const VARIETIES = ["コシヒカリ", "ひとめぼれ", "あきたこまち", "ヒノヒカリ", "つや姫", "新之助", "その他"];
const SERVICE_TYPES = ["乾燥のみ", "籾摺りのみ", "乾燥＋籾摺り"];
const DRYER_COUNT = 10;

const defaultDryers = Array.from({ length: DRYER_COUNT }, (_, i) => ({
  id: i + 1, lotId: null, status: "空き",
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
  "未定": "#94a3b8", "予約済": "#fbbf24",
};
const statusBg = {
  "空き": "#052e16", "乾燥中": "#451a03", "完了待ち": "#172554",
  "乾燥完了": "#2e1065", "受付": "#1e293b", "乾燥待ち": "#431407",
  "籾摺り待ち": "#1e1b4b", "籾摺り中": "#500724", "完了": "#022c22",
  "未定": "#1e293b", "予約済": "#422006",
};

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [farmers, setFarmers] = useState(() => loadData(STORAGE_KEYS.farmers, []));
  const [lots, setLots] = useState(() => loadData(STORAGE_KEYS.lots, []));
  const [dryers, setDryers] = useState(() => loadData(STORAGE_KEYS.dryers, defaultDryers));
  const [hulling, setHulling] = useState(() => loadData(STORAGE_KEYS.hulling, []));
  const [modal, setModal] = useState(null);
  const [selectedLot, setSelectedLot] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => { saveData(STORAGE_KEYS.farmers, farmers); }, [farmers]);
  useEffect(() => { saveData(STORAGE_KEYS.lots, lots); }, [lots]);
  useEffect(() => { saveData(STORAGE_KEYS.dryers, dryers); }, [dryers]);
  useEffect(() => { saveData(STORAGE_KEYS.hulling, hulling); }, [hulling]);

  const addFarmer = () => {
    if (!form.name) return;
    setFarmers(prev => [...prev, { id: Date.now(), name: form.name, phone: form.phone || "", service: form.service || "乾燥＋籾摺り", note: form.note || "" }]);
    setModal(null); setForm({});
  };

  const addLot = () => {
    if (!form.farmerId) return;
    setLots(prev => [...prev, {
      id: Date.now(), farmerId: Number(form.farmerId), variety: form.variety || "コシヒカリ",
      kgIn: Number(form.kgIn) || 0, bagsIn: Number(form.bagsIn) || 0,
      moistureIn: form.moistureIn || "", moistureOut: "",
      receivedAt: form.receivedAt || new Date().toISOString().slice(0, 10),
      status: "受付", dryerId: null, dryStartAt: null, dryEndAt: null,
      hullingId: null, fee: Number(form.fee) || 0, paid: false, note: form.note || "",
    }]);
    setModal(null); setForm({});
  };

  const assignDryer = (dryerId) => {
    if (!selectedLot) return;
    const now = new Date().toISOString().slice(0, 10);
    setDryers(prev => prev.map(d => d.id === dryerId ? { ...d, lotId: selectedLot.id, status: "乾燥中" } : d));
    setLots(prev => prev.map(l => l.id === selectedLot.id ? { ...l, dryerId, dryStartAt: now, status: "乾燥中" } : l));
    setSelectedLot(null); setModal(null);
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

  const completeHulling = (hId) => {
    setHulling(prev => prev.map(h => h.id === hId ? { ...h, status: "完了" } : h));
    const h = hulling.find(h => h.id === hId);
    if (h) setLots(prev => prev.map(l => l.id === h.lotId ? { ...l, status: "完了" } : l));
  };

  const togglePaid = (lotId) => {
    setLots(prev => prev.map(l => l.id === lotId ? { ...l, paid: !l.paid } : l));
  };

  const getFarmer = (id) => farmers.find(f => f.id === id);
  const getLot = (id) => lots.find(l => l.id === id);
  const getDryer = (id) => dryers.find(d => d.id === id);

  const activeLots = lots.filter(l => l.status !== "完了");
  const waitingLots = lots.filter(l => l.status === "受付" || l.status === "乾燥待ち");
  const dryingLots = lots.filter(l => l.status === "乾燥中");
  const hullingWaitLots = lots.filter(l => l.status === "乾燥完了" || l.status === "籾摺り待ち");
  const todayHulling = hulling.filter(h => h.status !== "完了");

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1a", color: "#e8dcc8", fontFamily: "'Noto Serif JP', 'Hiragino Mincho ProN', serif" }}>
      <header style={{ background: "linear-gradient(135deg, #1a0f00 0%, #2d1a00 50%, #1a0f00 100%)", borderBottom: "2px solid #8b6914", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 32 }}>🌾</span>
          <div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#f0c060", letterSpacing: 2 }}>籾乾燥管理システム</div>
            <div style={{ fontSize: 11, color: "#a08040", letterSpacing: 1 }}>乾燥機10台・籾摺り一括管理</div>
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
          { id: "farmers", label: "👨‍🌾 農家管理" },
          { id: "history", label: "📋 履歴・精算" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "12px 18px", background: "none", border: "none", cursor: "pointer",
            color: tab === t.id ? "#f0c060" : "#6b7280",
            borderBottom: tab === t.id ? "2px solid #f0c060" : "2px solid transparent",
            fontFamily: "inherit", fontSize: 13, whiteSpace: "nowrap",
            fontWeight: tab === t.id ? "bold" : "normal",
          }}>{t.label}</button>
        ))}
      </nav>

      <main style={{ padding: "20px 16px", maxWidth: 1000, margin: "0 auto" }}>

        {tab === "dashboard" && (
          <div>
            <h2 style={{ color: "#f0c060", fontSize: 18, marginBottom: 16, borderLeft: "3px solid #f0c060", paddingLeft: 10 }}>本日の状況</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
              {[
                { label: "稼働中乾燥機", value: dryingLots.length + " / 10台", color: "#f59e0b" },
                { label: "空き乾燥機", value: dryers.filter(d => d.status === "空き").length + "台", color: "#4ade80" },
                { label: "乾燥待ちロット", value: waitingLots.length + "件", color: "#fb923c" },
                { label: "籾摺り予定", value: todayHulling.length + "件", color: "#818cf8" },
                { label: "未精算", value: lots.filter(l => !l.paid && l.fee > 0).length + "件", color: "#f472b6" },
              ].map(s => (
                <div key={s.label} style={{ background: "#111827", border: "1px solid #374151", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: "bold", color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <h3 style={{ color: "#c8a040", fontSize: 15, marginBottom: 12 }}>🔢 乾燥機一覧</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 24 }}>
              {dryers.map(d => {
                const lot = d.lotId ? getLot(d.lotId) : null;
                const farmer = lot ? getFarmer(lot.farmerId) : null;
                const sc = statusColor[d.status] || "#94a3b8";
                const sb = statusBg[d.status] || "#1e293b";
                return (
                  <div key={d.id} style={{ background: sb, border: `1px solid ${sc}`, borderRadius: 8, padding: "10px 8px", textAlign: "center", minHeight: 80 }}>
                    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>乾燥機 {d.id}号</div>
                    <div style={{ fontSize: 12, color: sc, fontWeight: "bold", marginBottom: 4 }}>{d.status}</div>
                    {farmer && <div style={{ fontSize: 11, color: "#e8dcc8" }}>{farmer.name}</div>}
                    {lot && <div style={{ fontSize: 10, color: "#a08040" }}>{lot.variety}</div>}
                  </div>
                );
              })}
            </div>

            {waitingLots.length > 0 && (
              <div style={{ background: "#1c1008", border: "1px solid #92400e", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <h3 style={{ color: "#fb923c", fontSize: 14, marginBottom: 10 }}>⚠️ 乾燥機割り当て待ち</h3>
                {waitingLots.map(lot => {
                  const farmer = getFarmer(lot.farmerId);
                  return (
                    <div key={lot.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #374151" }}>
                      <div>
                        <span style={{ color: "#e8dcc8", fontSize: 13 }}>{farmer?.name}</span>
                        <span style={{ color: "#a08040", fontSize: 11, marginLeft: 8 }}>{lot.variety} / {lot.kgIn}kg</span>
                      </div>
                      <button onClick={() => { setSelectedLot(lot); setModal("assignDryer"); }} style={btnStyle("#f59e0b")}>乾燥機を割り当て</button>
                    </div>
                  );
                })}
              </div>
            )}

            {hullingWaitLots.filter(l => l.status === "乾燥完了").length > 0 && (
              <div style={{ background: "#120a2e", border: "1px solid #4c1d95", borderRadius: 10, padding: 16 }}>
                <h3 style={{ color: "#a78bfa", fontSize: 14, marginBottom: 10 }}>💡 籾摺りスケジュール未設定</h3>
                {hullingWaitLots.filter(l => l.status === "乾燥完了").map(lot => {
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

        {tab === "dryers" && (
          <div>
            <h2 style={{ color: "#f0c060", fontSize: 18, marginBottom: 16, borderLeft: "3px solid #f0c060", paddingLeft: 10 }}>乾燥機管理</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {dryers.map(d => {
                const lot = d.lotId ? getLot(d.lotId) : null;
                const farmer = lot ? getFarmer(lot.farmerId) : null;
                const sc = statusColor[d.status] || "#94a3b8";
                return (
                  <div key={d.id} style={{ background: "#111827", border: `1px solid ${sc}40`, borderRadius: 10, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontSize: 16, color: "#f0c060", fontWeight: "bold" }}>乾燥機 {d.id}号機</span>
                      <span style={{ fontSize: 12, background: `${sc}20`, color: sc, padding: "2px 8px", borderRadius: 10, border: `1px solid ${sc}` }}>{d.status}</span>
                    </div>
                    {lot && farmer ? (
                      <div>
                        <div style={{ marginBottom: 6 }}><Label>農家</Label>{farmer.name}</div>
                        <div style={{ marginBottom: 6 }}><Label>品種</Label>{lot.variety}</div>
                        <div style={{ marginBottom: 6 }}><Label>持込量</Label>{lot.kgIn}kg / {lot.bagsIn}袋</div>
                        <div style={{ marginBottom: 6 }}><Label>水分(入)</Label>{lot.moistureIn || "—"}%</div>
                        <div style={{ marginBottom: 10 }}><Label>開始日</Label>{lot.dryStartAt || "—"}</div>
                        <button onClick={() => { setSelectedLot(lot); setModal("completeDrying"); }} style={btnStyle("#4ade80", true)}>乾燥完了にする</button>
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

        {tab === "reception" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ color: "#f0c060", fontSize: 18, borderLeft: "3px solid #f0c060", paddingLeft: 10 }}>受付・持込管理</h2>
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
                    <Info label="持込量" value={`${lot.kgIn}kg / ${lot.bagsIn}袋`} />
                    <Info label="水分(入)" value={lot.moistureIn ? lot.moistureIn + "%" : "—"} />
                    <Info label="水分(出)" value={lot.moistureOut ? lot.moistureOut + "%" : "—"} />
                    <Info label="乾燥機" value={dryer ? `${dryer.id}号機` : "未割当"} />
                    <Info label="サービス" value={farmer?.service || "—"} />
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(lot.status === "受付" || lot.status === "乾燥待ち") && (
                      <button onClick={() => { setSelectedLot(lot); setModal("assignDryer"); }} style={btnStyle("#f59e0b")}>乾燥機を割り当て</button>
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

        {tab === "hulling" && (
          <div>
            <h2 style={{ color: "#f0c060", fontSize: 18, marginBottom: 16, borderLeft: "3px solid #f0c060", paddingLeft: 10 }}>籾摺りスケジュール</h2>
            {hulling.length === 0 && <EmptyState>籾摺り予定はありません</EmptyState>}
            {[...hulling].sort((a, b) => a.date > b.date ? 1 : -1).map(h => {
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
                  {lot && <div style={{ fontSize: 12, color: "#a08040", marginTop: 6 }}>{lot.variety} / {lot.kgIn}kg</div>}
                  {h.note && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>備考: {h.note}</div>}
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    {h.status === "予約済" && <button onClick={() => startHulling(h.id)} style={btnStyle("#f472b6")}>籾摺り開始</button>}
                    {h.status === "籾摺り中" && <button onClick={() => completeHulling(h.id)} style={btnStyle("#34d399")}>完了</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "farmers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ color: "#f0c060", fontSize: 18, borderLeft: "3px solid #f0c060", paddingLeft: 10 }}>農家管理</h2>
              <button onClick={() => { setForm({}); setModal("addFarmer"); }} style={btnStyle("#f0c060")}>＋ 農家を登録</button>
            </div>
            {farmers.length === 0 && <EmptyState>農家が登録されていません</EmptyState>}
            {farmers.map(f => {
              const farmerLots = lots.filter(l => l.farmerId === f.id);
              const activeFarmerLots = farmerLots.filter(l => l.status !== "完了");
              return (
                <div key={f.id} style={{ background: "#111827", border: "1px solid #374151", borderRadius: 10, padding: 16, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 16, color: "#e8dcc8", fontWeight: "bold" }}>{f.name}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{f.phone}</div>
                      <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4, background: "#451a03", padding: "2px 8px", borderRadius: 8, display: "inline-block" }}>{f.service}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>今季受付: {farmerLots.length}件</div>
                      {activeFarmerLots.length > 0 && <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 4 }}>対応中: {activeFarmerLots.length}件</div>}
                    </div>
                  </div>
                  {f.note && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8, borderTop: "1px solid #374151", paddingTop: 8 }}>備考: {f.note}</div>}
                </div>
              );
            })}
          </div>
        )}

        {tab === "history" && (
          <div>
            <h2 style={{ color: "#f0c060", fontSize: 18, marginBottom: 16, borderLeft: "3px solid #f0c060", paddingLeft: 10 }}>履歴・精算管理</h2>
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
                    <Info label="受付" value={lot.receivedAt} small />
                    <Info label="持込量" value={`${lot.kgIn}kg`} small />
                    <Info label="水分(入)" value={lot.moistureIn ? lot.moistureIn + "%" : "—"} small />
                    <Info label="水分(出)" value={lot.moistureOut ? lot.moistureOut + "%" : "—"} small />
                    <Info label="乾燥完了" value={lot.dryEndAt || "—"} small />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setModal(null)}>
          <div style={{ background: "#111827", border: "1px solid #374151", borderRadius: 14, padding: 24, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>

            {modal === "addFarmer" && (
              <div>
                <ModalTitle>👨‍🌾 農家を登録</ModalTitle>
                <Field label="氏名 *"><input style={inputStyle} value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例: 山田 太郎" /></Field>
                <Field label="電話番号"><input style={inputStyle} value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="090-0000-0000" /></Field>
                <Field label="サービス種別">
                  <select style={inputStyle} value={form.service || "乾燥＋籾摺り"} onChange={e => setForm({ ...form, service: e.target.value })}>
                    {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="備考"><textarea style={{ ...inputStyle, height: 60 }} value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} /></Field>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={addFarmer} style={btnStyle("#f0c060", true)}>登録する</button>
                  <button onClick={() => setModal(null)} style={btnStyle("#374151", true)}>キャンセル</button>
                </div>
              </div>
            )}

            {modal === "addLot" && (
              <div>
                <ModalTitle>📥 新規持込受付</ModalTitle>
                <Field label="農家 *">
                  <select style={inputStyle} value={form.farmerId || ""} onChange={e => setForm({ ...form, farmerId: e.target.value })}>
                    <option value="">-- 農家を選択 --</option>
                    {farmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </Field>
                <Field label="品種">
                  <select style={inputStyle} value={form.variety || "コシヒカリ"} onChange={e => setForm({ ...form, variety: e.target.value })}>
                    {VARIETIES.map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="持込量 (kg)"><input style={inputStyle} type="number" value={form.kgIn || ""} onChange={e => setForm({ ...form, kgIn: e.target.value })} /></Field>
                  <Field label="袋数"><input style={inputStyle} type="number" value={form.bagsIn || ""} onChange={e => setForm({ ...form, bagsIn: e.target.value })} /></Field>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="水分値(入) (%)"><input style={inputStyle} type="number" step="0.1" value={form.moistureIn || ""} onChange={e => setForm({ ...form, moistureIn: e.target.value })} /></Field>
                  <Field label="受付日"><input style={inputStyle} type="date" value={form.receivedAt || new Date().toISOString().slice(0, 10)} onChange={e => setForm({ ...form, receivedAt: e.target.value })} /></Field>
                </div>
                <Field label="料金 (円)"><input style={inputStyle} type="number" value={form.fee || ""} onChange={e => setForm({ ...form, fee: e.target.value })} /></Field>
                <Field label="備考"><textarea style={{ ...inputStyle, height: 60 }} value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} /></Field>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={addLot} style={btnStyle("#f59e0b", true)}>受付する</button>
                  <button onClick={() => setModal(null)} style={btnStyle("#374151", true)}>キャンセル</button>
                </div>
              </div>
            )}

            {modal === "assignDryer" && selectedLot && (
              <div>
                <ModalTitle>🔢 乾燥機を割り当て</ModalTitle>
                <div style={{ background: "#1e293b", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <div style={{ color: "#e8dcc8", fontSize: 14 }}>{getFarmer(selectedLot.farmerId)?.name} — {selectedLot.variety}</div>
                  <div style={{ color: "#a08040", fontSize: 12, marginTop: 4 }}>{selectedLot.kgIn}kg / {selectedLot.bagsIn}袋</div>
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
                      fontSize: 12, fontFamily: "inherit",
                    }}>
                      <div>{d.id}号</div>
                      <div style={{ fontSize: 10, marginTop: 2 }}>{d.status}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setModal(null)} style={{ ...btnStyle("#374151", true), marginTop: 16 }}>キャンセル</button>
              </div>
            )}

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

            {modal === "hullingSchedule" && selectedLot && (
              <div>
                <ModalTitle>🌀 籾摺り日程を設定</ModalTitle>
                <div style={{ background: "#1e293b", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <div style={{ color: "#e8dcc8" }}>{getFarmer(selectedLot.farmerId)?.name} — {selectedLot.variety}</div>
                </div>
                <Field label="籾摺り予定日 *"><input style={inputStyle} type="date" value={form.hullingDate || ""} onChange={e => setForm({ ...form, hullingDate: e.target.value })} /></Field>
                <Field label="備考"><textarea style={{ ...inputStyle, height: 60 }} value={form.note || ""} onChange={e => setForm({ ...form, note: e.target.value })} /></Field>
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button onClick={scheduleHulling} style={btnStyle("#818cf8", true)}>日程を確定</button>
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

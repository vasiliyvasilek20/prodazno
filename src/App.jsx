import { useState, useRef, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart, Funnel, Cell, BarChart, Bar } from "recharts";

const ACCENT = "#185FA5";
const COLORS = { green: "#3B6D11", yellow: "#BA7517", red: "#A32D2D", greenBg: "#EAF3DE", yellowBg: "#FAEEDA", redBg: "#FCEBEB", greenText: "#27500A", yellowText: "#633806", redText: "#791F1F" };

const fmt = n => n.toLocaleString("ru-RU") + " ₽";
const fmtM = n => (n / 1000000).toFixed(1).replace(".", ",") + " млн ₽";

const managers = [
  { id: 1, name: "Ирина Соколова", initials: "ИС", revenue: 1240000, plan: 58, deals: 7, conv: 18, status: "red" },
  { id: 2, name: "Алексей Петров", initials: "АП", revenue: 3180000, plan: 106, deals: 14, conv: 34, status: "green" },
  { id: 3, name: "Мария Козлова", initials: "МК", revenue: 2750000, plan: 91, deals: 11, conv: 29, status: "yellow" },
  { id: 4, name: "Дмитрий Орлов", initials: "ДО", revenue: 3640000, plan: 121, deals: 16, conv: 38, status: "green" },
  { id: 5, name: "Наталья Волкова", initials: "НВ", revenue: 2100000, plan: 87, deals: 9, conv: 27, status: "yellow" },
  { id: 6, name: "Сергей Захаров", initials: "СЗ", revenue: 1890000, plan: 79, deals: 8, conv: 22, status: "yellow" },
];

const deals = [
  { id: 1, name: "Поставка оборудования", client: "ООО «Металлпром»", sum: 1200000, stage: "Договор", mgr: "Алексей Петров", days: 3, status: "green" },
  { id: 2, name: "Сервисный контракт", client: "АО «Стройгрупп»", sum: 450000, stage: "КП", mgr: "Ирина Соколова", days: 18, status: "red" },
  { id: 3, name: "Комплект запчастей", client: "ЗАО «Авторесурс»", sum: 320000, stage: "Квалификация", mgr: "Мария Козлова", days: 5, status: "green" },
  { id: 4, name: "Монтажные работы", client: "ООО «СтройМастер»", sum: 780000, stage: "КП", mgr: "Дмитрий Орлов", days: 21, status: "red" },
  { id: 5, name: "Поставка расходников", client: "ИП Смирнов А.В.", sum: 95000, stage: "Оплата", mgr: "Наталья Волкова", days: 1, status: "green" },
  { id: 6, name: "Технадзор объекта", client: "ООО «Инвест-Юг»", sum: 560000, stage: "Лид", mgr: "Сергей Захаров", days: 2, status: "green" },
  { id: 7, name: "Электроавтоматика", client: "ПАО «Энергосеть»", sum: 2100000, stage: "Договор", mgr: "Алексей Петров", days: 7, status: "green" },
  { id: 8, name: "Насосная станция", client: "МУП «Водоканал»", sum: 3400000, stage: "КП", mgr: "Дмитрий Орлов", days: 16, status: "red" },
  { id: 9, name: "Ревизия склада", client: "ООО «Логистик-Центр»", sum: 180000, stage: "Квалификация", mgr: "Ирина Соколова", days: 8, status: "yellow" },
  { id: 10, name: "Проект вентиляции", client: "ЗАО «ТехноПарк»", sum: 640000, stage: "КП", mgr: "Мария Козлова", days: 12, status: "yellow" },
  { id: 11, name: "Газовое оборудование", client: "АО «РегионГаз»", sum: 1750000, stage: "Договор", mgr: "Дмитрий Орлов", days: 4, status: "green" },
  { id: 12, name: "Охранная система", client: "ООО «Безопасность+»", sum: 390000, stage: "Лид", mgr: "Наталья Волкова", days: 1, status: "green" },
  { id: 13, name: "Котельная установка", client: "ГУП «Теплосеть»", sum: 4200000, stage: "КП", mgr: "Алексей Петров", days: 19, status: "red" },
  { id: 14, name: "Электрощитовые", client: "ООО «ПромЭлектро»", sum: 870000, stage: "Квалификация", mgr: "Сергей Захаров", days: 6, status: "green" },
  { id: 15, name: "Диагностика линий", client: "АО «СвязьТелеком»", sum: 230000, stage: "Оплата", mgr: "Мария Козлова", days: 0, status: "green" },
  { id: 16, name: "Пожарная автоматика", client: "ООО «Норматив»", sum: 510000, stage: "Договор", mgr: "Наталья Волкова", days: 9, status: "yellow" },
];

const stages = ["Лид", "Квалификация", "КП", "Договор", "Оплата"];
const stageColors = ["#B5D4F4", "#85B7EB", "#378ADD", "#185FA5", "#0C447C"];

const funnelData = [
  { name: "Лид", count: 84, sum: 18400000, conv: 100 },
  { name: "Квалификация", count: 52, sum: 12800000, conv: 62 },
  { name: "КП", count: 31, sum: 9100000, conv: 60 },
  { name: "Договор", count: 19, sum: 6200000, conv: 61 },
  { name: "Оплата", count: 12, sum: 4100000, conv: 63 },
];

const stuckDeals = deals.filter(d => d.days >= 14);

const revenueData = Array.from({ length: 21 }, (_, i) => ({
  day: i + 1,
  revenue: Math.round((200000 + Math.random() * 400000) * (i < 10 ? 0.8 : i < 17 ? 1.1 : 1.3)),
}));

const chatHistory = [
  { role: "user", text: "Привет! Как дела с планом на апрель?" },
  { role: "ai", text: "Добрый день! По данным на сегодня, апрель идёт с отставанием. Общая выручка — 14 800 000 ₽ при плане 18 000 000 ₽, выполнение 82%. Лучший результат у Дмитрия Орлова — 121% плана, он уже перевыполнил задачу. Под угрозой Ирина Соколова — 58% плана при 21 рабочем дне. Рекомендую провести встречу с ней сегодня." },
  { role: "user", text: "Кто в зоне риска по сделкам?" },
  { role: "ai", text: "Выявил 4 сделки с высоким риском срыва:\n\n1. «Котельная установка» (4 200 000 ₽) — 19 дней на этапе КП, клиент ГУП «Теплосеть». Ответственный: Алексей Петров.\n2. «Монтажные работы» (780 000 ₽) — 21 день без движения на КП, клиент ООО «СтройМастер».\n3. «Насосная станция» (3 400 000 ₽) — 16 дней на этапе КП, требует оперативного контакта.\n4. «Сервисный контракт» (450 000 ₽) — 18 дней, зависла у Соколовой.\n\nСовокупный риск — 8 830 000 ₽. Рекомендую сегодня же связаться с клиентами по п. 1 и п. 3." },
];

const statusDot = (status, small = false) => {
  const s = small ? 6 : 8;
  const bg = status === "green" ? COLORS.green : status === "yellow" ? COLORS.yellow : COLORS.red;
  return <span style={{ display: "inline-block", width: s, height: s, borderRadius: "50%", background: bg, flexShrink: 0 }} />;
};

const Badge = ({ status, label }) => {
  const bg = status === "green" ? COLORS.greenBg : status === "yellow" ? COLORS.yellowBg : COLORS.redBg;
  const color = status === "green" ? COLORS.greenText : status === "yellow" ? COLORS.yellowText : COLORS.redText;
  return <span style={{ background: bg, color, fontSize: 11, padding: "2px 8px", borderRadius: 4, fontWeight: 500 }}>{label}</span>;
};

export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [stageFilter, setStageFilter] = useState("Все");
  const [mgrFilter, setMgrFilter] = useState("Все");
  const [search, setSearch] = useState("");
  const [sortDeals, setSortDeals] = useState("sum");
  const [chatInput, setChatInput] = useState("");
  const [localChat, setLocalChat] = useState(chatHistory);
  const chatRef = useRef(null);

  const navItems = [
    { id: "dashboard", label: "Дашборд", icon: "◈" },
    { id: "funnel", label: "Воронка", icon: "▽" },
    { id: "deals", label: "Сделки", icon: "≡" },
    { id: "managers", label: "Менеджеры", icon: "⊙" },
    { id: "ai", label: "AI-ассистент", icon: "✦" },
  ];

  const filteredDeals = deals
    .filter(d => stageFilter === "Все" || d.stage === stageFilter)
    .filter(d => mgrFilter === "Все" || d.mgr === mgrFilter)
    .filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.client.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortDeals === "sum" ? b.sum - a.sum : b.days - a.days);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [localChat]);

  const sidebarStyle = {
    width: 200, minWidth: 200, background: "#fff", borderRight: "1px solid #e8e8e6",
    display: "flex", flexDirection: "column", padding: "20px 0",
  };

  const contentStyle = {
    flex: 1, overflow: "auto", background: "#f8f8f7", padding: 28,
  };

  const kpiCard = (label, value, sub, status, delta) => (
    <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 8, padding: "16px 18px", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "#888", letterSpacing: 0.2 }}>{label}</span>
        {statusDot(status)}
      </div>
      <div style={{ fontSize: 26, fontWeight: 500, color: "#1a1a1a", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#aaa", marginTop: 5 }}>{sub} · <span style={{ color: delta > 0 ? COLORS.green : COLORS.red }}>{delta > 0 ? "+" : ""}{delta}% vs март</span></div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Onest, system-ui, sans-serif", fontSize: 14, color: "#1a1a1a" }}>
      {/* Sidebar */}
      <div style={sidebarStyle}>
        <div style={{ padding: "0 20px 20px", borderBottom: "1px solid #e8e8e6", marginBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>Рубка</div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>ТД Восток</div>
        </div>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setScreen(n.id)} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 20px",
            background: screen === n.id ? "#EBF3FB" : "transparent",
            color: screen === n.id ? ACCENT : "#555",
            border: "none", width: "100%", textAlign: "left", cursor: "pointer",
            fontSize: 13.5, fontWeight: screen === n.id ? 500 : 400,
            borderLeft: screen === n.id ? `2px solid ${ACCENT}` : "2px solid transparent",
          }}>
            <span style={{ fontSize: 13, opacity: 0.7 }}>{n.icon}</span>{n.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: "16px 20px", borderTop: "1px solid #e8e8e6" }}>
          <div style={{ fontSize: 11, color: "#bbb" }}>Апрель 2026</div>
          <div style={{ fontSize: 11, color: "#ccc", marginTop: 2 }}>Обновлено 08:14</div>
        </div>
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {screen === "dashboard" && <Dashboard kpiCard={kpiCard} />}
        {screen === "funnel" && <FunnelScreen />}
        {screen === "deals" && (
          <DealsScreen
            filteredDeals={filteredDeals} stageFilter={stageFilter} setStageFilter={setStageFilter}
            mgrFilter={mgrFilter} setMgrFilter={setMgrFilter}
            search={search} setSearch={setSearch}
            sortDeals={sortDeals} setSortDeals={setSortDeals}
          />
        )}
        {screen === "managers" && <ManagersScreen />}
        {screen === "ai" && (
          <AIScreen localChat={localChat} setLocalChat={setLocalChat} chatInput={chatInput} setChatInput={setChatInput} chatRef={chatRef} />
        )}
      </div>
    </div>
  );
}

function Dashboard({ kpiCard }) {
  const alerts = [
    { status: "red", text: "Менеджер Соколова просела на 42% от плана — требуется встреча сегодня" },
    { status: "red", text: "4 сделки зависли на этапе КП больше 14 дней, риск на 8,8 млн ₽" },
    { status: "yellow", text: "При текущем темпе квартальный план будет выполнен на 87%" },
    { status: "green", text: "Орлов закрыл план досрочно — 121%, можно загрузить новыми лидами" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Сводка дня</h1>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>ТД Восток · Апрель 2026 · обновлено 08:14</div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {kpiCard("Выручка месяца", "14,8 млн ₽", "план 18 млн ₽", "yellow", +8)}
        {kpiCard("План выполнен", "82%", "цель 100%", "yellow", -5)}
        {kpiCard("Средний чек", "925 000 ₽", "16 сделок", "green", +12)}
        {kpiCard("Конверсия воронки", "14,3%", "лид → оплата", "yellow", -2)}
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 2 }}>
          <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 8, padding: "18px 18px 8px" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14, color: "#555" }}>Выручка по дням, апрель 2026</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#bbb" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#bbb" }} axisLine={false} tickLine={false} tickFormatter={v => (v / 1000000).toFixed(1) + "M"} />
                <Tooltip formatter={v => fmt(v)} labelFormatter={l => `День ${l}`} contentStyle={{ fontSize: 12, border: "1px solid #e8e8e6", borderRadius: 6 }} />
                <Area type="monotone" dataKey="revenue" stroke={ACCENT} strokeWidth={1.5} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 8, padding: "18px" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14, color: "#555" }}>Что важно сегодня</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", paddingBottom: 10, borderBottom: i < alerts.length - 1 ? "1px solid #f0f0ee" : "none" }}>
                  <div style={{ marginTop: 5, flexShrink: 0 }}>{statusDot(a.status, true)}</div>
                  <div style={{ fontSize: 12.5, color: "#333", lineHeight: 1.5 }}>{a.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FunnelScreen() {
  const maxCount = funnelData[0].count;
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Воронка продаж</h1>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>Апрель 2026 · все менеджеры</div>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 2, background: "#fff", border: "1px solid #e8e8e6", borderRadius: 8, padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "center" }}>
            {funnelData.map((s, i) => {
              const w = 40 + (s.count / maxCount) * 56;
              const nextConv = i < funnelData.length - 1 ? Math.round((funnelData[i + 1].count / s.count) * 100) : null;
              return (
                <div key={s.name} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: `${w}%`, background: stageColors[i], borderRadius: 4, padding: "12px 0", textAlign: "center", color: i >= 3 ? "#fff" : "#1a1a1a", transition: "width 0.3s" }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{s.count} сделок · {fmtM(s.sum)}</div>
                  </div>
                  {nextConv !== null && (
                    <div style={{ fontSize: 11, color: nextConv >= 60 ? COLORS.green : nextConv >= 50 ? COLORS.yellow : COLORS.red, padding: "4px 0", fontWeight: 500 }}>
                      ↓ {nextConv}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 20, fontSize: 12, color: "#888" }}>
            <span>Итоговая конверсия: <b style={{ color: "#1a1a1a" }}>14,3%</b></span>
            <span>Средний цикл сделки: <b style={{ color: "#1a1a1a" }}>28 дней</b></span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 8, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14, color: "#555" }}>Застрявшие сделки</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {stuckDeals.map(d => (
                <div key={d.id} style={{ paddingBottom: 10, borderBottom: "1px solid #f0f0ee" }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{d.client}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ fontSize: 11, background: "#FEF3C7", color: "#92400E", padding: "2px 7px", borderRadius: 4 }}>{d.stage} · {d.days} дн.</span>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{fmt(d.sum)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DealsScreen({ filteredDeals, stageFilter, setStageFilter, mgrFilter, setMgrFilter, search, setSearch, sortDeals, setSortDeals }) {
  const mgrNames = ["Все", ...Array.from(new Set(managers.map(m => m.name)))];
  const selStyle = { fontSize: 12, padding: "5px 10px", border: "1px solid #e0e0de", borderRadius: 6, background: "#fff", color: "#333", cursor: "pointer" };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Сделки</h1>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>Апрель 2026 · {filteredDeals.length} из {deals.length}</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию или клиенту..."
          style={{ fontSize: 12, padding: "5px 10px", border: "1px solid #e0e0de", borderRadius: 6, width: 220, outline: "none" }} />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={selStyle}>
          {["Все", ...stages].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={mgrFilter} onChange={e => setMgrFilter(e.target.value)} style={selStyle}>
          {mgrNames.map(s => <option key={s}>{s}</option>)}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {[["sum", "По сумме"], ["days", "По дням"]].map(([val, label]) => (
            <button key={val} onClick={() => setSortDeals(val)} style={{ fontSize: 12, padding: "5px 10px", border: "1px solid #e0e0de", borderRadius: 6, background: sortDeals === val ? ACCENT : "#fff", color: sortDeals === val ? "#fff" : "#555", cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8f8f7" }}>
              {["Название", "Клиент", "Сумма", "Стадия", "Ответственный", "Дней", ""].map((h, i) => (
                <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, color: "#999", fontWeight: 500, borderBottom: "1px solid #e8e8e6" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredDeals.map((d, i) => (
              <tr key={d.id} style={{ borderBottom: "1px solid #f0f0ee", background: i % 2 === 0 ? "#fff" : "#fdfdfb" }}>
                <td style={{ padding: "10px 14px", fontWeight: 500 }}>{d.name}</td>
                <td style={{ padding: "10px 14px", color: "#666" }}>{d.client}</td>
                <td style={{ padding: "10px 14px", fontWeight: 500 }}>{fmt(d.sum)}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ fontSize: 11, background: "#EBF3FB", color: ACCENT, padding: "2px 8px", borderRadius: 4 }}>{d.stage}</span>
                </td>
                <td style={{ padding: "10px 14px", color: "#666" }}>{d.mgr.split(" ")[0]} {d.mgr.split(" ")[1]?.[0]}.</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ fontSize: 11, color: d.days >= 14 ? COLORS.redText : d.days >= 7 ? COLORS.yellowText : COLORS.greenText }}>{d.days}</span>
                </td>
                <td style={{ padding: "10px 14px" }}><Badge status={d.status} label={d.status === "green" ? "норма" : d.status === "yellow" ? "внимание" : "действие"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManagersScreen() {
  const sorted = [...managers].sort((a, b) => b.revenue - a.revenue);
  const statusLabel = { green: "норма", yellow: "внимание", red: "действие" };
  const statusBorder = { green: "#E0EDD0", yellow: "#FAE5C0", red: "#FAD4D4" };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Менеджеры</h1>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>Апрель 2026 · сортировка по выручке</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {sorted.map((m, i) => (
          <div key={m.id} style={{ background: "#fff", border: `1px solid ${statusBorder[m.status]}`, borderRadius: 8, padding: "18px 18px 14px", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EBF3FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: ACCENT }}>{m.initials}</div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>{m.name}</div>
                <Badge status={m.status} label={statusLabel[m.status]} />
              </div>
              {i === 0 && <span style={{ marginLeft: "auto", fontSize: 11, color: COLORS.greenText, background: COLORS.greenBg, padding: "2px 7px", borderRadius: 4 }}>★ Лидер</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Выручка", fmt(m.revenue)], ["План", m.plan + "%"], ["Сделки", m.deals], ["Конверсия", m.conv + "%"]].map(([label, val]) => (
                <div key={label} style={{ background: "#f8f8f7", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "#aaa", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a" }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "#bbb" }}>Прогресс плана</span>
                <span style={{ fontSize: 10, color: m.plan >= 100 ? COLORS.greenText : m.plan >= 80 ? COLORS.yellowText : COLORS.redText, fontWeight: 500 }}>{m.plan}%</span>
              </div>
              <div style={{ height: 4, background: "#f0f0ee", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(m.plan, 100)}%`, background: m.plan >= 100 ? COLORS.green : m.plan >= 80 ? COLORS.yellow : COLORS.red, borderRadius: 2 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIScreen({ localChat, setLocalChat, chatInput, setChatInput, chatRef }) {
  const quickBtns = ["Разобрать вчерашний день", "Кто в зоне риска?", "Что с воронкой?", "Прогноз до конца месяца"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)", maxWidth: 700, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>AI-ассистент</h1>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>Анализирует данные ТД Восток · Апрель 2026</div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {quickBtns.map(q => (
          <button key={q} onClick={() => {}} style={{ fontSize: 12, padding: "6px 12px", border: "1px solid #e0e0de", borderRadius: 20, background: "#fff", color: "#555", cursor: "pointer" }}>
            {q}
          </button>
        ))}
      </div>

      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingBottom: 8 }}>
        {localChat.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "ai" && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EBF3FB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: ACCENT, marginRight: 8, flexShrink: 0, marginTop: 2 }}>✦</div>
            )}
            <div style={{
              maxWidth: "80%", padding: "10px 14px", borderRadius: 8, fontSize: 13, lineHeight: 1.6,
              background: msg.role === "user" ? ACCENT : "#fff",
              color: msg.role === "user" ? "#fff" : "#1a1a1a",
              border: msg.role === "ai" ? "1px solid #e8e8e6" : "none",
              whiteSpace: "pre-line",
            }}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid #e8e8e6" }}>
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          placeholder="Спросите что-нибудь о ваших продажах..."
          style={{ flex: 1, fontSize: 13, padding: "10px 14px", border: "1px solid #e0e0de", borderRadius: 8, outline: "none", color: "#333" }}
        />
        <button style={{ padding: "10px 18px", background: ACCENT, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
          Отправить
        </button>
      </div>
    </div>
  );
}

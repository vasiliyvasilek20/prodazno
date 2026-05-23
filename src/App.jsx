import { useState, useRef, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { LayoutDashboard, Filter, Users, Bot, TrendingUp, AlertCircle, CheckCircle, Clock, Search, LogOut, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "./supabase";

const ACCENT = "#005BFF";
const COLORS = {
  green: "#00A650", yellow: "#FF6A00", red: "#FF0032",
  greenBg: "#E6F7EF", yellowBg: "#FFF3E6", redBg: "#FFE6EA",
  greenText: "#00733A", yellowText: "#B34700", redText: "#B3001F"
};

const fmt = n => n.toLocaleString("ru-RU") + " ₽";
const fmtM = n => (n / 1000000).toFixed(1).replace(".", ",") + " млн ₽";

const stages = ["Лид", "Квалификация", "КП", "Договор", "Оплата"];
const stageColors = ["#CCE0FF", "#99C0FF", "#4D94FF", "#005BFF", "#0040B3"];

const funnelData = [
  { name: "Лид", count: 84, sum: 18400000 },
  { name: "Квалификация", count: 52, sum: 12800000 },
  { name: "КП", count: 31, sum: 9100000 },
  { name: "Договор", count: 19, sum: 6200000 },
  { name: "Оплата", count: 12, sum: 4100000 },
];

const revenueData = Array.from({ length: 21 }, (_, i) => ({
  day: i + 1,
  revenue: Math.round((200000 + Math.random() * 400000) * (i < 10 ? 0.8 : i < 17 ? 1.1 : 1.3)),
}));

const chatHistory = [
  { role: "user", text: "Привет! Как дела с планом?" },
  { role: "ai", text: "Добрый день! По данным на сегодня план выполняется на 82%. Есть 4 зависших сделки." },
];

const validatePassword = (pwd) => {
  if (pwd.length < 8) return "Минимум 8 символов";
  if (!/[A-Z]/.test(pwd)) return "Нужна хотя бы одна заглавная буква";
  if (!/[0-9]/.test(pwd)) return "Нужна хотя бы одна цифра";
  if (!/[!@#$%^&*._\-]/.test(pwd)) return "Нужен спецсимвол: !@#$%^&*._-";
  return null;
};

const translateError = (error) => {
  if (!error) return "Ошибка при выполнении операции";
  
  const msg = error.message || "";
  
  // 429 — слишком много попыток
  if (msg.includes("429") || msg.includes("Too Many Requests")) {
    return "Слишком много попыток. Пожалуйста, подождите перед следующей попыткой.";
  }
  
  // Invalid email
  if (msg.includes("invalid email") || msg.includes("Invalid email")) {
    return "Этот email-адрес недействителен. Пожалуйста, проверьте адрес и попробуйте снова.";
  }
  
  // Email already exists
  if (msg.includes("already exists") || msg.includes("duplicate key")) {
    return "Этот email уже зарегистрирован. Попробуйте войти или используйте другой адрес.";
  }
  
  // Password too short
  if (msg.includes("password") && msg.includes("short")) {
    return "Пароль недостаточно длинный. Минимум 8 символов.";
  }
  
  // Invalid credentials
  if (msg.includes("Invalid login credentials") || msg.includes("invalid credentials")) {
    return "Неверный email или пароль. Пожалуйста, попробуйте снова.";
  }
  
  // Email not confirmed
  if (msg.includes("Email not confirmed")) {
    return "Пожалуйста, подтвердите ваш email перед входом. Проверьте почту.";
  }
  
  // User not found
  if (msg.includes("User not found")) {
    return "Пользователь не найден. Пожалуйста, зарегистрируйтесь.";
  }
  
  // Default translation for common errors
  if (msg.includes("network") || msg.includes("connection")) {
    return "Ошибка подключения. Проверьте интернет и попробуйте снова.";
  }
  
  // Fallback: show original error if it looks like a user-friendly message
  if (msg.length < 100 && !msg.includes("PostgreSQL")) {
    return msg;
  }
  
  return "Ошибка при выполнении операции. Пожалуйста, попробуйте снова.";
};

const statusDot = (status) => {
  const bg = status === "green" ? COLORS.green : status === "yellow" ? COLORS.yellow : COLORS.red;
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: bg, flexShrink: 0 }} />;
};

const Badge = ({ status, label }) => {
  const bg = status === "green" ? COLORS.greenBg : status === "yellow" ? COLORS.yellowBg : COLORS.redBg;
  const color = status === "green" ? COLORS.greenText : status === "yellow" ? COLORS.yellowText : COLORS.redText;
  return <span style={{ background: bg, color, fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{label}</span>;
};

const inputStyle = {
  width: "100%", padding: "10px 12px", border: "1.5px solid #E8EEFF",
  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
  fontFamily: "Onest, sans-serif", color: "#0A0A0A",
};

// ─── AUTH SCREEN ────────────────────────────────────────────
function AuthScreen({ setUser, onLoadData }) {
  const [mode, setMode] = useState("login"); // login | register | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const showMsg = (text, type = "error") => setMsg({ text, type });

  // Баг 4: кнопка задизейблена если есть ошибки валидации
  const isRegisterDisabled = !!passwordError || !email || !password || !confirm;

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !password) return showMsg("Введите email и пароль");
    setMsg({ text: "", type: "" }); // Баг 3: сброс ошибки при новой попытке
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const friendlyMsg = translateError(error);
      return showMsg(friendlyMsg);
    }
    setUser(data.user);
    onLoadData(data.user.id);
  }

  async function handleRegister(e) {
    e.preventDefault();
    if (!email) return showMsg("Введите email");
    const pwdErr = validatePassword(password);
    if (pwdErr) return showMsg(pwdErr);
    if (password.trim() !== confirm.trim()) return showMsg("Пароли не совпадают");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://incandescent-quokka-28174c.netlify.app'
      }
    });
    setLoading(false);
    if (error) {
      const friendlyMsg = translateError(error);
      return showMsg(friendlyMsg);
    }
    showMsg("Письмо подтверждения отправлено! Проверьте почту.", "success");
    setPassword(""); 
    setConfirm("");
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!email) return showMsg("Введите email");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) {
      const friendlyMsg = translateError(error);
      return showMsg(friendlyMsg);
    }
    showMsg("Ссылка для сброса пароля отправлена на почту!", "success");
  }

  return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#F4F7FF", fontFamily: "Onest, sans-serif" }}>
      <div style={{ background: "#fff", padding: 40, borderRadius: 20, boxShadow: "0 8px 32px rgba(0,91,255,0.12)", width: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: ACCENT }}>Рубка</div>
          <div style={{ fontSize: 13, color: "#aaa", marginTop: 6 }}>Дашборд для отдела продаж</div>
        </div>

        {mode !== "reset" && (
          <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "#F4F7FF", borderRadius: 10, padding: 4 }}>
            {[["login", "Вход"], ["register", "Регистрация"]].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setMsg({ text: "", type: "" }); }} style={{
                flex: 1, padding: "8px 0", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13,
                background: mode === m ? "#fff" : "transparent",
                color: mode === m ? ACCENT : "#888",
                boxShadow: mode === m ? "0 1px 4px rgba(0,91,255,0.1)" : "none",
              }}>{l}</button>
            ))}
          </div>
        )}

        {mode === "reset" && (
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#0A0A0A" }}>Сброс пароля</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "#666", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Mail size={13} /> Email
            </label>
            <input value={email} onChange={e => { setEmail(e.target.value); setMsg({ text: "", type: "" }); }} placeholder="your@email.com" style={inputStyle} />
          </div>

          {mode !== "reset" && (
            <div>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <Lock size={13} /> Пароль
              </label>
              <div style={{ position: "relative" }}>
              <input type={showPassword ? "text" : "password"} value={password} onChange={e => {
                setPassword(e.target.value);
                const _err = validatePassword(e.target.value);
                setPasswordError(_err || "");
              }} placeholder="••••••••" style={{...inputStyle, paddingRight: 40}} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#888", display: "flex", alignItems: "center", padding: 0 }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
              {mode === "register" && passwordError && (
                <div style={{ fontSize: 11, color: "#B3001F", marginTop: 5, fontWeight: 500 }}>
                  {passwordError}
                </div>
              )}
              {mode === "register" && !passwordError && (
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 5 }}>
                  8+ символов · заглавная буква · цифра · спецсимвол (!@#$%^&*)
                </div>
              )}
            </div>
          )}

          {mode === "register" && (
            <div>
              <label style={{ fontSize: 12, color: "#666", marginBottom: 6, display: "block" }}>Подтверждение пароля</label>
              <div style={{ position: "relative" }}>
              <input type={showConfirm ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" style={{...inputStyle, paddingRight: 40}} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#888", display: "flex", alignItems: "center", padding: 0 }}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            </div>
          )}

          {msg.text && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, fontSize: 13,
              background: msg.type === "success" ? COLORS.greenBg : COLORS.redBg,
              color: msg.type === "success" ? COLORS.greenText : COLORS.redText,
            }}>{msg.text}</div>
          )}

          <button
            onClick={mode === "login" ? handleLogin : mode === "register" ? handleRegister : handleReset}
            disabled={loading || (mode === "register" && isRegisterDisabled)}
            style={{ padding: "12px 0", background: ACCENT, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: (loading || (mode === "register" && isRegisterDisabled)) ? "not-allowed" : "pointer", opacity: (loading || (mode === "register" && isRegisterDisabled)) ? 0.5 : 1 }}>
            {loading ? "Загрузка..." : mode === "login" ? "Войти" : mode === "register" ? "Зарегистрироваться" : "Отправить ссылку"}
          </button>

          {mode === "login" && (
            <button onClick={() => { setMode("reset"); setMsg({ text: "", type: "" }); }}
              style={{ background: "none", border: "none", color: "#aaa", fontSize: 12, cursor: "pointer", textAlign: "center" }}>
              Забыли пароль?
            </button>
          )}

          {mode === "reset" && (
            <button onClick={() => { setMode("login"); setMsg({ text: "", type: "" }); }}
              style={{ background: "none", border: "none", color: ACCENT, fontSize: 12, cursor: "pointer", textAlign: "center", fontWeight: 600 }}>
              ← Вернуться к входу
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState("dashboard");
  const [managers, setManagers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [stageFilter, setStageFilter] = useState("Все");
  const [mgrFilter, setMgrFilter] = useState("Все");
  const [search, setSearch] = useState("");
  const [sortDeals, setSortDeals] = useState("sum");
  const [chatInput, setChatInput] = useState("");
  const [localChat, setLocalChat] = useState(chatHistory);
  const chatRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user || null;
      setUser(u);
      if (u) loadData(u.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) loadData(u.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadData(userId) {
    // Показываем данные компании — менеджеры и сделки без фильтра по пользователю
    // (т.к. все менеджеры принадлежат одной компании-клиенту)
    const { data: mgrs } = await supabase.from("managers").select("*");
    const { data: dls } = await supabase.from("deals").select("*");
    if (mgrs) setManagers(mgrs);
    if (dls) setDeals(dls);
  }

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [localChat]);

  const navItems = [
    { id: "dashboard", label: "Дашборд", icon: <LayoutDashboard size={16} /> },
    { id: "funnel", label: "Воронка", icon: <TrendingUp size={16} /> },
    { id: "deals", label: "Сделки", icon: <Filter size={16} /> },
    { id: "managers", label: "Менеджеры", icon: <Users size={16} /> },
    { id: "ai", label: "AI-ассистент", icon: <Bot size={16} /> },
  ];

  const filteredDeals = deals
    .filter(d => stageFilter === "Все" || d.stage === stageFilter)
    .filter(d => mgrFilter === "Все" || d.mgr === mgrFilter)
    .filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.client?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortDeals === "sum" ? b.sum - a.sum : b.days - a.days);

  const kpiCard = (label, value, sub, status, delta) => (
    <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 12, padding: "18px 20px", flex: 1, boxShadow: "0 1px 4px rgba(0,91,255,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "#888" }}>{label}</span>
        {statusDot(status)}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#0A0A0A", lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>{sub} {delta !== 0 && <span style={{ color: delta > 0 ? COLORS.green : COLORS.red, fontWeight: 600 }}>{delta > 0 ? "+" : ""}{delta}% vs март</span>}</div>
    </div>
  );

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Onest, sans-serif", color: ACCENT, fontSize: 16 }}>
      Загружаем...
    </div>
  );

  if (!user) return <AuthScreen setUser={setUser} onLoadData={loadData} />;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "Onest, system-ui, sans-serif", fontSize: 14, color: "#0A0A0A", background: "#F4F7FF" }}>
      {/* Sidebar */}
      <div style={{ width: 220, minWidth: 220, background: "#fff", borderRight: "1px solid #E8EEFF", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #E8EEFF" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: ACCENT }}>Рубка</div>
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
        </div>
        <div style={{ padding: "8px 10px", flex: 1 }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setScreen(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              background: screen === n.id ? "#EEF3FF" : "transparent",
              color: screen === n.id ? ACCENT : "#666",
              border: "none", width: "100%", textAlign: "left", cursor: "pointer",
              fontSize: 13.5, fontWeight: screen === n.id ? 600 : 400,
              borderRadius: 8, marginBottom: 2,
            }}>
              <span style={{ opacity: screen === n.id ? 1 : 0.5 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </div>
        <div style={{ padding: "14px 20px", borderTop: "1px solid #E8EEFF" }}>
          <button onClick={async () => { await supabase.auth.signOut(); setUser(null); setManagers([]); setDeals([]); }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: COLORS.redBg, color: COLORS.red, border: "none", borderRadius: 8, width: "100%", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            <LogOut size={14} /> Выйти из аккаунта
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
        {screen === "dashboard" && <Dashboard kpiCard={kpiCard} managers={managers} deals={deals} />}
        {screen === "funnel" && <FunnelScreen deals={deals} />}
        {screen === "deals" && <DealsScreen filteredDeals={filteredDeals} stageFilter={stageFilter} setStageFilter={setStageFilter} mgrFilter={mgrFilter} setMgrFilter={setMgrFilter} search={search} setSearch={setSearch} sortDeals={sortDeals} setSortDeals={setSortDeals} managers={managers} deals={deals} />}
        {screen === "managers" && <ManagersScreen managers={managers} />}
        {screen === "ai" && <AIScreen localChat={localChat} setLocalChat={setLocalChat} chatInput={chatInput} setChatInput={setChatInput} chatRef={chatRef} />}
      </div>
    </div>
  );
}

// ─── DASHBOARD ──────────────────────────────────────────────
function Dashboard({ kpiCard, managers, deals }) {
  const totalRevenue = managers.reduce((s, m) => s + (m.revenue || 0), 0);
  const avgPlan = managers.length ? Math.round(managers.reduce((s, m) => s + (m.plan || 0), 0) / managers.length) : 0;
  const stuckDeals = deals.filter(d => d.days >= 14);
  const riskAmount = stuckDeals.reduce((s, d) => s + (d.sum || 0), 0);

  const alerts = [
    stuckDeals.length > 0 && { status: "red", icon: <AlertCircle size={14} />, text: `${stuckDeals.length} сделок зависло больше 14 дней — риск ${fmtM(riskAmount)}` },
    avgPlan < 100 && { status: "yellow", icon: <Clock size={14} />, text: `Средний план по команде: ${avgPlan}%` },
    { status: "green", icon: <CheckCircle size={14} />, text: `Активных менеджеров: ${managers.length} · Сделок: ${deals.length}` },
  ].filter(Boolean);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Сводка дня</h1>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>Апрель 2026 · данные из базы</div>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {kpiCard("Выручка месяца", fmtM(totalRevenue), "план 18 млн ₽", "yellow", +8)}
        {kpiCard("Средний план", avgPlan + "%", "цель 100%", avgPlan >= 100 ? "green" : "yellow", -5)}
        {kpiCard("Сделок в работе", deals.length, `${stuckDeals.length} зависших`, "green", +12)}
        {kpiCard("Средний чек", deals.length ? fmt(Math.round(totalRevenue / deals.length)) : "—", "на сделку", "green", 0)}
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 2 }}>
          <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 12, padding: "18px 18px 8px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#444" }}>Выручка по дням, апрель 2026</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#bbb" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#bbb" }} axisLine={false} tickLine={false} tickFormatter={v => (v / 1000000).toFixed(1) + "M"} />
                <Tooltip formatter={v => fmt(v)} labelFormatter={l => `День ${l}`} contentStyle={{ fontSize: 12, border: "1px solid #E8EEFF", borderRadius: 8 }} />
                <Area type="monotone" dataKey="revenue" stroke={ACCENT} strokeWidth={2} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#444" }}>Что важно сегодня</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", paddingBottom: 10, borderBottom: i < alerts.length - 1 ? "1px solid #F0F4FF" : "none" }}>
                  <span style={{ color: a.status === "green" ? COLORS.green : a.status === "yellow" ? COLORS.yellow : COLORS.red, marginTop: 1, flexShrink: 0 }}>{a.icon}</span>
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

// ─── FUNNEL ─────────────────────────────────────────────────
function FunnelScreen({ deals }) {
  const maxCount = funnelData[0].count;
  const stuckDeals = deals.filter(d => d.days >= 14);
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Воронка продаж</h1>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>Апрель 2026</div>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 2, background: "#fff", border: "1px solid #E8EEFF", borderRadius: 12, padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "center" }}>
            {funnelData.map((s, i) => {
              const w = 40 + (s.count / maxCount) * 56;
              const nextConv = i < funnelData.length - 1 ? Math.round((funnelData[i + 1].count / s.count) * 100) : null;
              return (
                <div key={s.name} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: `${w}%`, background: stageColors[i], borderRadius: 8, padding: "12px 0", textAlign: "center", color: i >= 3 ? "#fff" : "#0A0A0A" }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{s.count} сделок · {fmtM(s.sum)}</div>
                  </div>
                  {nextConv !== null && <div style={{ fontSize: 11, color: "#aaa", padding: "4px 0" }}>↓ {nextConv}%</div>}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 20, fontSize: 12, color: "#888" }}>
            <span>Конверсия: <b style={{ color: "#0A0A0A" }}>14,3%</b></span>
            <span>Средний цикл: <b style={{ color: "#0A0A0A" }}>28 дней</b></span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "#444" }}>Застрявшие сделки</div>
            {stuckDeals.length === 0
              ? <div style={{ fontSize: 13, color: "#aaa" }}>Нет застрявших сделок 🎉</div>
              : stuckDeals.map(d => (
                <div key={d.id} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid #F0F4FF" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{d.client}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ fontSize: 11, background: COLORS.yellowBg, color: COLORS.yellowText, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{d.stage} · {d.days} дн.</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{fmt(d.sum)}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DEALS ──────────────────────────────────────────────────
function DealsScreen({ filteredDeals, stageFilter, setStageFilter, mgrFilter, setMgrFilter, search, setSearch, sortDeals, setSortDeals, managers, deals }) {
  const mgrNames = ["Все", ...Array.from(new Set(managers.map(m => m.name)))];
  const selStyle = { fontSize: 12, padding: "6px 10px", border: "1px solid #E8EEFF", borderRadius: 8, background: "#fff", color: "#333", cursor: "pointer" };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Сделки</h1>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>{filteredDeals.length} из {deals.length}</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#aaa" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..."
            style={{ fontSize: 12, padding: "6px 10px 6px 30px", border: "1px solid #E8EEFF", borderRadius: 8, width: 200, outline: "none" }} />
        </div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={selStyle}>
          {["Все", ...stages].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={mgrFilter} onChange={e => setMgrFilter(e.target.value)} style={selStyle}>
          {mgrNames.map(s => <option key={s}>{s}</option>)}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {[["sum", "По сумме"], ["days", "По дням"]].map(([val, label]) => (
            <button key={val} onClick={() => setSortDeals(val)} style={{ fontSize: 12, padding: "6px 12px", border: "1px solid #E8EEFF", borderRadius: 8, background: sortDeals === val ? ACCENT : "#fff", color: sortDeals === val ? "#fff" : "#555", cursor: "pointer" }}>{label}</button>
          ))}
        </div>
      </div>
      <div style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#F4F7FF" }}>
              {["Название", "Клиент", "Сумма", "Стадия", "Менеджер", "Дней", "Статус"].map((h, i) => (
                <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, color: "#999", fontWeight: 600, borderBottom: "1px solid #E8EEFF" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredDeals.map(d => (
              <tr key={d.id} style={{ borderBottom: "1px solid #F0F4FF" }}>
                <td style={{ padding: "10px 14px", fontWeight: 600 }}>{d.name}</td>
                <td style={{ padding: "10px 14px", color: "#666" }}>{d.client}</td>
                <td style={{ padding: "10px 14px", fontWeight: 700, color: ACCENT }}>{fmt(d.sum)}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ fontSize: 11, background: "#EEF3FF", color: ACCENT, padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>{d.stage}</span>
                </td>
                <td style={{ padding: "10px 14px", color: "#666" }}>{d.mgr}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ fontSize: 11, color: d.days >= 14 ? COLORS.red : d.days >= 7 ? COLORS.yellow : COLORS.green, fontWeight: 600 }}>{d.days}</span>
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

// ─── MANAGERS ───────────────────────────────────────────────
function ManagersScreen({ managers }) {
  const sorted = [...managers].sort((a, b) => b.revenue - a.revenue);
  const statusLabel = { green: "норма", yellow: "внимание", red: "действие" };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Менеджеры</h1>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>{managers.length} человек</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {sorted.map((m, i) => (
          <div key={m.id} style={{ background: "#fff", border: "1px solid #E8EEFF", borderRadius: 12, padding: "18px 18px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "#EEF3FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: ACCENT }}>{m.initials}</div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{m.name}</div>
                <Badge status={m.status} label={statusLabel[m.status] || m.status} />
              </div>
              {i === 0 && <span style={{ marginLeft: "auto", fontSize: 11, color: COLORS.greenText, background: COLORS.greenBg, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>★ Лидер</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Выручка", fmt(m.revenue)], ["План", m.plan + "%"], ["Сделки", m.deals], ["Конверсия", m.conv + "%"]].map(([label, val]) => (
                <div key={label} style={{ background: "#F4F7FF", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "#aaa", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "#bbb" }}>Прогресс плана</span>
                <span style={{ fontSize: 10, color: m.plan >= 100 ? COLORS.green : m.plan >= 80 ? COLORS.yellow : COLORS.red, fontWeight: 700 }}>{m.plan}%</span>
              </div>
              <div style={{ height: 6, background: "#EEF3FF", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(m.plan, 100)}%`, background: m.plan >= 100 ? COLORS.green : m.plan >= 80 ? COLORS.yellow : COLORS.red, borderRadius: 3 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI ─────────────────────────────────────────────────────
function AIScreen({ localChat, chatInput, setChatInput, chatRef }) {
  const quickBtns = ["Кто в зоне риска?", "Что с воронкой?", "Прогноз до конца месяца"];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)", maxWidth: 700, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>AI-ассистент</h1>
        <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>Анализирует данные · Апрель 2026</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {quickBtns.map(q => (
          <button key={q} style={{ fontSize: 12, padding: "6px 14px", border: "1px solid #E8EEFF", borderRadius: 20, background: "#fff", color: "#555", cursor: "pointer" }}>{q}</button>
        ))}
      </div>
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, paddingBottom: 8 }}>
        {localChat.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.6, background: msg.role === "user" ? ACCENT : "#fff", color: msg.role === "user" ? "#fff" : "#0A0A0A", border: msg.role === "ai" ? "1px solid #E8EEFF" : "none", whiteSpace: "pre-line" }}>{msg.text}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid #E8EEFF" }}>
        <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Задайте вопрос о продажах..." style={{ flex: 1, fontSize: 13, padding: "10px 14px", border: "1px solid #E8EEFF", borderRadius: 10, outline: "none" }} />
        <button style={{ padding: "10px 20px", background: ACCENT, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Отправить</button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, BarChart, Bar, XAxis, YAxis } from "recharts";
import type { AlertRecord, BillRecord, ChatMessage, OnboardingData, SubscriptionRecord, UploadedFileRecord } from "@/lib/types";

const COLORS = ["#2f6df6", "#00c49f", "#ffbb28", "#ff8042", "#a855f7", "#10b981", "#f43f5e"];
const CHART_TOOLTIP_STYLE = {
  borderRadius: "12px",
  border: "1px solid rgba(148,163,184,0.28)",
  boxShadow: "0 8px 26px rgba(15,23,42,0.12)",
  background: "var(--bg-soft)",
  color: "var(--text)"
};

interface DashboardSummary {
  income: number;
  expense: number;
  transfers: number;
  net: number;
  totalTransactions: number;
}

type ThemeMode = "light" | "dark";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Falha em ${url}`);
  return response.json();
}

export default function PetrovaApp() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ email: "", password: "", workspaceName: "Workspace Principal" });
  const [authError, setAuthError] = useState("");
  const [onboarding, setOnboarding] = useState<OnboardingData>({ completed: false });
  const [summary, setSummary] = useState<DashboardSummary>({ income: 0, expense: 0, transfers: 0, net: 0, totalTransactions: 0 });
  const [categories, setCategories] = useState<Array<{ name: string; value: number }>>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [files, setFiles] = useState<UploadedFileRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [newBill, setNewBill] = useState({ beneficiary: "", amount: "", dueDate: "" });
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ola, eu sou seu copiloto financeiro. Posso te ajudar a entender gastos, patrimonio e oportunidades de melhoria. Quer começar com upload de extrato ou uma pergunta?"
    }
  ]);

  async function refreshData(showSkeleton = true) {
    if (showSkeleton) setIsDataLoading(true);
    try {
      const [ob, sum, cat, alertData, fileData, subsData, billsData] = await Promise.all([
        api<OnboardingData>("/api/onboarding/status"),
        api<DashboardSummary>("/api/dashboard/summary"),
        api<Array<{ name: string; value: number }>>("/api/dashboard/categories"),
        api<AlertRecord[]>("/api/alerts"),
        api<UploadedFileRecord[]>("/api/files"),
        api<SubscriptionRecord[]>("/api/subscriptions"),
        api<BillRecord[]>("/api/bills")
      ]);
      setOnboarding(ob);
      setSummary(sum);
      setCategories(cat);
      setAlerts(alertData);
      setFiles(fileData);
      setSubscriptions(subsData);
      setBills(billsData);
    } finally {
      setIsDataLoading(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem("petrova_theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const mode: ThemeMode = saved === "dark" || saved === "light" ? (saved as ThemeMode) : systemDark ? "dark" : "light";
    setTheme(mode);
    document.documentElement.setAttribute("data-theme", mode);

    (async () => {
      const meResponse = await fetch("/api/auth/me", { credentials: "include" });
      if (meResponse.ok) {
        setAuthenticated(true);
        await refreshData();
      } else if (process.env.NODE_ENV !== "production") {
        await fetch("/api/auth/login", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demo: true })
        });
        const retry = await fetch("/api/auth/me", { credentials: "include" });
        if (retry.ok) {
          setAuthenticated(true);
          await refreshData();
        }
      }
      setAuthChecked(true);
    })().catch(console.error);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("petrova_theme", next);
  }

  const latestChart = useMemo(() => {
    const withChart = [...messages].reverse().find((msg) => msg.chart);
    return withChart?.chart;
  }, [messages]);

  async function handleOnboardingSubmit(formData: FormData) {
    const payload = {
      preferredName: String(formData.get("preferredName") || ""),
      objective: String(formData.get("objective") || ""),
      useType: String(formData.get("useType") || "pf"),
      startMode: String(formData.get("startMode") || "upload"),
      familiarity: String(formData.get("familiarity") || "basico")
    };
    await api("/api/onboarding/answer", { method: "POST", body: JSON.stringify(payload) });
    await api("/api/onboarding/complete", { method: "POST", body: "{}" });
    await refreshData();
  }

  async function handleUpload(file: File) {
    const formUpload = new FormData();
    formUpload.append("file", file);
    const upload = await fetch("/api/files/upload", {
      method: "POST",
      body: formUpload,
      credentials: "include"
    }).then((r) => r.json());
    // O processamento ocorre em background via fila; aprovacao agora e manual.
    if (upload?.id) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    await refreshData(false);
  }

  async function approveFile(fileId: string) {
    await api(`/api/files/${fileId}/approve`, { method: "POST" });
    await refreshData(false);
  }

  async function sendMessage() {
    if (!message.trim()) return;
    const user: ChatMessage = { id: crypto.randomUUID(), role: "user", content: message.trim() };
    setMessages((prev) => [...prev, user]);

    const answer = await api<ChatMessage>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message: user.content })
    });

    setMessages((prev) => [...prev, answer]);
    setMessage("");
    await refreshData(false);
  }

  async function createBill() {
    if (!newBill.beneficiary || !newBill.amount || !newBill.dueDate) return;
    await api("/api/bills", {
      method: "POST",
      body: JSON.stringify({
        beneficiary: newBill.beneficiary,
        amount: Number(newBill.amount),
        dueDate: new Date(newBill.dueDate).toISOString()
      })
    });
    setNewBill({ beneficiary: "", amount: "", dueDate: "" });
    await refreshData(false);
  }

  async function exportMonthlyReport() {
    const data = await api<{ report: { transactionsCsv: string } }>("/api/reports/monthly");
    const blob = new Blob([data.report.transactionsCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `petrova-relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportMonthlyPdf() {
    const response = await fetch("/api/reports/monthly?format=pdf", {
      credentials: "include"
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `petrova-relatorio-${new Date().toISOString().slice(0, 10)}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleAuthSubmit() {
    setAuthError("");
    try {
      if (authMode === "login") {
        await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: authForm.email, password: authForm.password })
        });
      } else {
        await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(authForm)
        });
      }
      setAuthenticated(true);
      await refreshData();
    } catch {
      setAuthError("Nao foi possivel autenticar. Verifique os dados.");
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
    setAuthenticated(false);
    setOnboarding({ completed: false });
    setMessages((prev) => prev.slice(0, 1));
  }

  if (!authChecked) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50">
        <div className="card-premium fade-in-up p-6">
          <p className="text-sm">Preparando Petrova...</p>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="grid min-h-screen place-items-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <section className="card-premium surface-glow fade-in-up w-full max-w-md p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Petrova</p>
          <h1 className="mt-2 text-2xl font-semibold">Acesse sua central financeira</h1>
          <p className="text-muted mt-1 text-sm">Experiencia simples, dados robustos e privacidade por padrao.</p>

          <div className="mt-5 flex gap-2 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setAuthMode("login")}
              className={`w-1/2 rounded-lg py-2 text-sm transition ${authMode === "login" ? "bg-white font-medium shadow-sm" : "text-slate-600"}`}
            >
              Entrar
            </button>
            <button
              onClick={() => setAuthMode("register")}
              className={`w-1/2 rounded-lg py-2 text-sm transition ${authMode === "register" ? "bg-white font-medium shadow-sm" : "text-slate-600"}`}
            >
              Criar conta
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <input
              className="input-premium w-full p-2 text-sm"
              placeholder="Email"
              value={authForm.email}
              onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))}
            />
            <input
              type="password"
              className="input-premium w-full p-2 text-sm"
              placeholder="Senha"
              value={authForm.password}
              onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))}
            />
            {authMode === "register" && (
              <input
                className="input-premium w-full p-2 text-sm"
                placeholder="Nome do workspace"
                value={authForm.workspaceName}
                onChange={(e) => setAuthForm((p) => ({ ...p, workspaceName: e.target.value }))}
              />
            )}
            {authError && <p className="text-xs text-rose-600">{authError}</p>}
            <button onClick={() => void handleAuthSubmit()} className="btn-primary w-full py-2 text-sm font-medium">
              {authMode === "login" ? "Entrar" : "Criar conta e entrar"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <header className="mx-auto mb-6 flex max-w-7xl items-center justify-between px-4 pt-6 md:px-6 fade-in-up">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Petrova</p>
          <h1 className="mt-1 text-2xl font-semibold">Copiloto financeiro premium</h1>
          <p className="text-muted mt-1 text-sm">Clareza, controle e insights em uma interface minimalista.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="btn-ghost px-3 py-2 text-sm transition hover:scale-[1.02]">
            {theme === "light" ? "Dark" : "Light"}
          </button>
          <button onClick={() => void logout()} className="btn-ghost px-3 py-2 text-sm transition hover:scale-[1.02]">
            Sair
          </button>
        </div>
      </header>

      {!onboarding.completed ? (
        <section className="mx-auto grid max-w-5xl gap-4 px-4 pb-8 md:grid-cols-2 md:px-6">
          <div className="card-premium surface-glow fade-in-up p-6">
            <h2 className="text-lg font-semibold">Onboarding conversacional</h2>
            <p className="text-muted mt-1 text-sm">
              Responda o essencial e eu monto seu ambiente financeiro em menos de 1 minuto.
            </p>
            <form
              className="mt-4 space-y-3"
              action={async (formData) => {
                await handleOnboardingSubmit(formData);
              }}
            >
              <input name="preferredName" placeholder="Como prefere ser chamado?" className="input-premium w-full p-2" />
              <select name="objective" className="input-premium w-full p-2">
                <option value="organizar_gastos">Organizar gastos</option>
                <option value="patrimonio">Ver patrimonio</option>
                <option value="investimentos">Controlar investimentos</option>
                <option value="planejamento">Planejamento financeiro</option>
              </select>
              <select name="useType" className="input-premium w-full p-2">
                <option value="pf">Pessoa fisica</option>
                <option value="familia">Familia</option>
                <option value="pj">Pessoa juridica</option>
                <option value="holding">Holding</option>
              </select>
              <select name="startMode" className="input-premium w-full p-2">
                <option value="upload">Subir extrato</option>
                <option value="integracao">Conectar contas</option>
                <option value="manual">Cadastro manual</option>
                <option value="conversa">Explorar primeiro</option>
              </select>
              <select name="familiarity" className="input-premium w-full p-2">
                <option value="basico">Basico</option>
                <option value="intermediario">Intermediario</option>
                <option value="avancado">Avancado</option>
              </select>
              <button className="btn-primary px-4 py-2 font-medium">Continuar</button>
            </form>
          </div>
          <div className="card-premium fade-in-up stagger-1 p-6">
            <h2 className="text-lg font-semibold">Fluxo premium simplificado</h2>
            <p className="text-muted mt-2 text-sm">Converse, envie arquivos e aprove transacoes em poucos cliques. Sem menus complexos.</p>
          </div>
        </section>
      ) : (
        <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-8 lg:grid-cols-[1.35fr_1fr] md:px-6">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 fade-in-up">
              {isDataLoading ? (
                <>
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                  <MetricCardSkeleton />
                </>
              ) : (
                <>
                  <MetricCard label="Entradas" value={money(summary.income)} />
                  <MetricCard label="Saidas" value={money(summary.expense)} />
                  <MetricCard label="Saldo" value={money(summary.net)} />
                  <MetricCard label="Lancamentos" value={String(summary.totalTransactions)} />
                </>
              )}
            </div>

            <div className="card-premium surface-glow fade-in-up stagger-1 p-5">
              <h2 className="text-lg font-semibold">Upload Center</h2>
              <p className="text-muted mt-1 text-sm">Envie CSV, Excel, PDF ou imagem. O processamento e assíncrono e seguro.</p>
              <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed p-6 text-sm transition hover:scale-[1.01]">
                Clique para enviar arquivo
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (file) await handleUpload(file);
                  }}
                />
              </label>
              <div className="mt-4 space-y-2">
                {files.length === 0 && <EmptyState text="Nenhum arquivo enviado ainda. Envie seu primeiro extrato para iniciar a análise." />}
                {files.slice(0, 4).map((file) => (
                  <div key={file.id} className="rounded-lg border p-2 text-sm transition hover:scale-[1.01] fade-in-up">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{file.filename}</p>
                        <p className="text-muted">
                          {file.status} • {file.parsedTransactions.length} lancamentos
                        </p>
                      </div>
                      {(file.status === "parsed" || file.status === "needs_review") && (
                        <button onClick={() => void approveFile(file.id)} className="btn-primary px-2 py-1 text-xs">
                          Aprovar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => void exportMonthlyReport()}
                className="btn-ghost mt-4 px-3 py-2 text-sm font-medium text-brand-700 transition hover:scale-[1.02]"
              >
                Exportar relatorio mensal (CSV)
              </button>
              <button onClick={() => void exportMonthlyPdf()} className="btn-primary ml-2 mt-4 px-3 py-2 text-sm font-medium">
                Exportar relatorio mensal (PDF)
              </button>
            </div>

            <div className="card-premium fade-in-up stagger-2 p-5">
              <h2 className="text-lg font-semibold">Visualizacao automatica</h2>
              <div className="mt-4 h-64">
                {isDataLoading ? (
                  <div className="skeleton h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categories} dataKey="value" nameKey="name" outerRadius={90}>
                        {categories.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => money(Number(value))} contentStyle={CHART_TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card-premium surface-glow fade-in-up p-5">
              <h2 className="text-lg font-semibold">Copiloto (chat + dados)</h2>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl p-3 text-sm transition ${msg.role === "assistant" ? "bg-slate-100" : "bg-brand-50 text-brand-900"}`}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void sendMessage();
                  }}
                  className="input-premium w-full p-2 text-sm"
                  placeholder='Ex: "Quanto gastei com alimentacao?"'
                />
                <button onClick={() => void sendMessage()} className="btn-primary px-3 text-sm">
                  Enviar
                </button>
              </div>
            </div>

            {latestChart && (
              <div className="card-premium fade-in-up stagger-1 p-5">
                <h3 className="text-sm font-semibold">{latestChart.title}</h3>
                <div className="mt-3 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={latestChart.data}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip formatter={(value) => money(Number(value))} contentStyle={CHART_TOOLTIP_STYLE} />
                      <Bar dataKey="value" fill="#2f6df6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="card-premium fade-in-up stagger-2 p-5">
              <h3 className="text-sm font-semibold">Alertas inteligentes</h3>
              <div className="mt-3 space-y-2">
                {alerts.length === 0 && <EmptyState text="Sem alertas no momento. Quando surgir algo importante, aparece aqui." />}
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="rounded-lg border p-2 text-sm transition hover:scale-[1.01]">
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-muted">{alert.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-premium fade-in-up stagger-3 p-5">
              <h3 className="text-sm font-semibold">Assinaturas detectadas</h3>
              <div className="mt-3 space-y-2">
                {subscriptions.length === 0 && <EmptyState text="Nenhuma assinatura detectada ainda." />}
                {subscriptions.slice(0, 5).map((sub) => (
                  <div key={sub.id} className="rounded-lg border p-2 text-sm transition hover:scale-[1.01]">
                    <p className="font-medium">{sub.name}</p>
                    <p className="text-muted">
                      {money(sub.amount)} por {sub.frequency}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-premium fade-in-up stagger-3 p-5">
              <h3 className="text-sm font-semibold">Boletos e vencimentos</h3>
              <div className="mt-3 grid gap-2">
                <input
                  value={newBill.beneficiary}
                  onChange={(e) => setNewBill((prev) => ({ ...prev, beneficiary: e.target.value }))}
                  className="input-premium p-2 text-sm"
                  placeholder="Beneficiario"
                />
                <input
                  type="number"
                  value={newBill.amount}
                  onChange={(e) => setNewBill((prev) => ({ ...prev, amount: e.target.value }))}
                  className="input-premium p-2 text-sm"
                  placeholder="Valor"
                />
                <input
                  type="date"
                  value={newBill.dueDate}
                  onChange={(e) => setNewBill((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="input-premium p-2 text-sm"
                />
                <button onClick={() => void createBill()} className="btn-primary px-3 py-2 text-sm">
                  Adicionar boleto
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {bills.length === 0 && <EmptyState text="Sem boletos cadastrados." />}
                {bills.slice(0, 5).map((bill) => (
                  <div key={bill.id} className="rounded-lg border p-2 text-sm transition hover:scale-[1.01]">
                    <p className="font-medium">{bill.beneficiary}</p>
                    <p className="text-muted">
                      {money(bill.amount)} • vence em {new Date(bill.dueDate).toLocaleDateString("pt-BR")} • {bill.status}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-premium p-4">
      <p className="text-muted text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function MetricCardSkeleton() {
  return (
    <div className="card-premium p-4">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton mt-3 h-7 w-28" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state text-sm">{text}</div>;
}

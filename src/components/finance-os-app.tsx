"use client";

import { useEffect, useMemo, useState } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, BarChart, Bar, XAxis, YAxis } from "recharts";
import type { AlertRecord, BillRecord, ChatMessage, OnboardingData, SubscriptionRecord, UploadedFileRecord } from "@/lib/types";

const COLORS = ["#2f6df6", "#00c49f", "#ffbb28", "#ff8042", "#a855f7", "#10b981", "#f43f5e"];

interface DashboardSummary {
  income: number;
  expense: number;
  transfers: number;
  net: number;
  totalTransactions: number;
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("finance_os_token") : null;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Falha em ${url}`);
  return response.json();
}

export default function FinanceOsApp() {
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

  async function refreshData() {
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
  }

  useEffect(() => {
    (async () => {
      if (!localStorage.getItem("finance_os_token")) {
        const demo = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demo: true })
        }).then((r) => r.json());
        if (demo.token) localStorage.setItem("finance_os_token", demo.token);
      }
      await refreshData();
    })().catch(console.error);
  }, []);

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
    const token = localStorage.getItem("finance_os_token");
    const upload = await fetch("/api/files/upload", {
      method: "POST",
      body: formUpload,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    }).then((r) => r.json());
    await fetch(`/api/files/${upload.id}/process`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    await fetch(`/api/files/${upload.id}/approve`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    await refreshData();
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
    await refreshData();
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
    await refreshData();
  }

  async function exportMonthlyReport() {
    const data = await api<{ report: { transactionsCsv: string } }>("/api/reports/monthly");
    const blob = new Blob([data.report.transactionsCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance-os-relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportMonthlyPdf() {
    const token = localStorage.getItem("finance_os_token");
    const response = await fetch("/api/reports/monthly?format=pdf", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance-os-relatorio-${new Date().toISOString().slice(0, 10)}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl p-4 md:p-6">
      <header className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Finance OS</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Copiloto financeiro simples por fora, poderoso por dentro</h1>
      </header>

      {!onboarding.completed ? (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Onboarding conversacional</h2>
            <p className="mt-1 text-sm text-slate-600">
              Responda o essencial e eu monto seu ambiente financeiro em menos de 1 minuto.
            </p>
            <form
              className="mt-4 space-y-3"
              action={async (formData) => {
                await handleOnboardingSubmit(formData);
              }}
            >
              <input name="preferredName" placeholder="Como prefere ser chamado?" className="w-full rounded-xl border p-2" />
              <select name="objective" className="w-full rounded-xl border p-2">
                <option value="organizar_gastos">Organizar gastos</option>
                <option value="patrimonio">Ver patrimonio</option>
                <option value="investimentos">Controlar investimentos</option>
                <option value="planejamento">Planejamento financeiro</option>
              </select>
              <select name="useType" className="w-full rounded-xl border p-2">
                <option value="pf">Pessoa fisica</option>
                <option value="familia">Familia</option>
                <option value="pj">Pessoa juridica</option>
                <option value="holding">Holding</option>
              </select>
              <select name="startMode" className="w-full rounded-xl border p-2">
                <option value="upload">Subir extrato</option>
                <option value="integracao">Conectar contas</option>
                <option value="manual">Cadastro manual</option>
                <option value="conversa">Explorar primeiro</option>
              </select>
              <select name="familiarity" className="w-full rounded-xl border p-2">
                <option value="basico">Basico</option>
                <option value="intermediario">Intermediario</option>
                <option value="avancado">Avancado</option>
              </select>
              <button className="rounded-xl bg-brand-500 px-4 py-2 font-medium text-white">Comecar</button>
            </form>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">O que este MVP ja faz</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>Upload de CSV/Excel com parsing e classificacao inicial</li>
              <li>Pipeline em staging com aprovacao antes do ledger oficial</li>
              <li>Dashboard mensal de receitas, despesas e saldo</li>
              <li>Chat com dados e geracao de grafico por intencao</li>
              <li>Alertas de periodo incompleto e assinaturas</li>
            </ul>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Entradas" value={money(summary.income)} />
              <MetricCard label="Saidas" value={money(summary.expense)} />
              <MetricCard label="Saldo" value={money(summary.net)} />
              <MetricCard label="Lancamentos" value={String(summary.totalTransactions)} />
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Upload Center</h2>
              <p className="mt-1 text-sm text-slate-600">Envie CSV, Excel ou PDF para alimentar o dashboard automaticamente.</p>
              <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed p-6 text-sm">
                Clique para enviar arquivo
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (file) await handleUpload(file);
                  }}
                />
              </label>
              <div className="mt-4 space-y-2">
                {files.slice(0, 4).map((file) => (
                  <div key={file.id} className="rounded-lg border p-2 text-sm">
                    <p className="font-medium">{file.filename}</p>
                    <p className="text-slate-500">
                      {file.status} • {file.parsedTransactions.length} lancamentos
                    </p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => void exportMonthlyReport()}
                className="mt-4 rounded-xl border border-brand-500 px-3 py-2 text-sm font-medium text-brand-700"
              >
                Exportar relatorio mensal (CSV)
              </button>
              <button onClick={() => void exportMonthlyPdf()} className="ml-2 mt-4 rounded-xl bg-brand-500 px-3 py-2 text-sm font-medium text-white">
                Exportar relatorio mensal (PDF)
              </button>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Visualizacao automatica</h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} dataKey="value" nameKey="name" outerRadius={90}>
                      {categories.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => money(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Copiloto (chat + dados)</h2>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl p-3 text-sm ${msg.role === "assistant" ? "bg-slate-100" : "bg-brand-50 text-brand-900"}`}
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
                  className="w-full rounded-xl border p-2 text-sm"
                  placeholder='Ex: "Quanto gastei com alimentacao?"'
                />
                <button onClick={() => void sendMessage()} className="rounded-xl bg-brand-500 px-3 text-sm text-white">
                  Enviar
                </button>
              </div>
            </div>

            {latestChart && (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold">{latestChart.title}</h3>
                <div className="mt-3 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={latestChart.data}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip formatter={(value) => money(Number(value))} />
                      <Bar dataKey="value" fill="#2f6df6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold">Alertas inteligentes</h3>
              <div className="mt-3 space-y-2">
                {alerts.length === 0 && <p className="text-sm text-slate-500">Sem alertas no momento.</p>}
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="rounded-lg border p-2 text-sm">
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-slate-600">{alert.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold">Assinaturas detectadas</h3>
              <div className="mt-3 space-y-2">
                {subscriptions.length === 0 && <p className="text-sm text-slate-500">Nenhuma assinatura detectada ainda.</p>}
                {subscriptions.slice(0, 5).map((sub) => (
                  <div key={sub.id} className="rounded-lg border p-2 text-sm">
                    <p className="font-medium">{sub.name}</p>
                    <p className="text-slate-600">{money(sub.amount)} por {sub.frequency}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold">Boletos e vencimentos</h3>
              <div className="mt-3 grid gap-2">
                <input
                  value={newBill.beneficiary}
                  onChange={(e) => setNewBill((prev) => ({ ...prev, beneficiary: e.target.value }))}
                  className="rounded-xl border p-2 text-sm"
                  placeholder="Beneficiario"
                />
                <input
                  type="number"
                  value={newBill.amount}
                  onChange={(e) => setNewBill((prev) => ({ ...prev, amount: e.target.value }))}
                  className="rounded-xl border p-2 text-sm"
                  placeholder="Valor"
                />
                <input
                  type="date"
                  value={newBill.dueDate}
                  onChange={(e) => setNewBill((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="rounded-xl border p-2 text-sm"
                />
                <button onClick={() => void createBill()} className="rounded-xl bg-brand-500 px-3 py-2 text-sm text-white">
                  Adicionar boleto
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {bills.length === 0 && <p className="text-sm text-slate-500">Sem boletos cadastrados.</p>}
                {bills.slice(0, 5).map((bill) => (
                  <div key={bill.id} className="rounded-lg border p-2 text-sm">
                    <p className="font-medium">{bill.beneficiary}</p>
                    <p className="text-slate-600">
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
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ReportMarkdown } from "@/components/report-markdown"
import { AGENTS, AGENT_KEYS, channelLabel, type AgentKey } from "@/lib/channels"
import { deleteReport, upsertSchedule } from "@/app/actions/reports"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Sparkles,
  Loader2,
  Trash2,
  ChevronDown,
  Bot,
  CalendarClock,
} from "lucide-react"
import { formatDate } from "@/lib/format"

type Report = {
  id: string
  agent: string
  title: string
  content: string
  scheduled: boolean
  createdAt: Date | string
}
type Schedule = { agent: string; frequency: string; enabled: boolean }

const RANGES = [
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
]

export function AgentsPanel({
  clientId,
  isAdmin,
  initialReports,
  initialSchedules,
}: {
  clientId: string
  isAdmin: boolean
  initialReports: Report[]
  initialSchedules: Schedule[]
}) {
  const router = useRouter()
  const [agent, setAgent] = useState<AgentKey>("cross")
  const [range, setRange] = useState("30")
  const [streaming, setStreaming] = useState(false)
  const [output, setOutput] = useState("")

  async function analyze() {
    setStreaming(true)
    setOutput("")
    try {
      const res = await fetch("/api/agents/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, agent, range: parseInt(range, 10) }),
      })
      if (!res.ok || !res.body) {
        throw new Error(await res.text().catch(() => "Error en el análisis"))
      }
      let full = ""
      for await (const chunk of parseSSEStream(res)) {
        if (chunk.type === "text-delta" && typeof chunk.delta === "string") {
          full += chunk.delta
          setOutput(full)
        }
      }
      toast.success("Análisis completo y guardado")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar el análisis")
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,1.4fr)]">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Elegí un analista</CardTitle>
            <CardDescription>
              Cada agente analiza desde su especialidad y genera conclusiones
              accionables.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {AGENT_KEYS.map((key) => {
              const a = AGENTS[key]
              const active = agent === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAgent(key)}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Bot className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.expertise}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {a.channels.map((ch) => (
                        <Badge key={ch} variant="outline" className="font-normal">
                          {channelLabel(ch)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <Select value={range} onValueChange={(v) => setRange(v ?? "30")}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    Últimos {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={analyze} disabled={streaming} className="flex-1">
              {streaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {streaming ? "Analizando..." : "Analizar"}
            </Button>
          </CardContent>
        </Card>

        {isAdmin && (
          <SchedulesCard
            clientId={clientId}
            initialSchedules={initialSchedules}
          />
        )}
      </div>

      <div className="flex flex-col gap-4">
        {(streaming || output) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" />
                {AGENTS[agent].label}
              </CardTitle>
              <CardDescription>Análisis en vivo</CardDescription>
            </CardHeader>
            <CardContent>
              {output ? (
                <ReportMarkdown content={output} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Generando análisis...
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Reportes guardados
          </h2>
          {initialReports.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Todavía no hay reportes. Generá uno con un analista.
              </CardContent>
            </Card>
          ) : (
            initialReports.map((r) => (
              <ReportItem
                key={r.id}
                report={r}
                clientId={clientId}
                isAdmin={isAdmin}
                onDeleted={() => router.refresh()}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function ReportItem({
  report,
  clientId,
  isAdmin,
  onDeleted,
}: {
  report: Report
  clientId: string
  isAdmin: boolean
  onDeleted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function remove() {
    setDeleting(true)
    try {
      await deleteReport(report.id, clientId)
      toast.success("Reporte eliminado")
      onDeleted()
    } catch {
      toast.error("No se pudo eliminar")
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-start gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
          <div>
            <p className="text-sm font-medium leading-tight">{report.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDate(report.createdAt)}
              {report.scheduled && (
                <Badge variant="outline" className="ml-2 font-normal">
                  Programado
                </Badge>
              )}
            </p>
          </div>
        </button>
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={remove}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        )}
      </CardHeader>
      {open && (
        <CardContent>
          <ReportMarkdown content={report.content} />
        </CardContent>
      )}
    </Card>
  )
}

function SchedulesCard({
  clientId,
  initialSchedules,
}: {
  clientId: string
  initialSchedules: Schedule[]
}) {
  const router = useRouter()
  const map = new Map(initialSchedules.map((s) => [s.agent, s]))
  const [pendingAgent, setPendingAgent] = useState<string | null>(null)

  async function toggle(agent: AgentKey, enabled: boolean, frequency: string) {
    setPendingAgent(agent)
    try {
      await upsertSchedule({ clientId, agent, enabled, frequency })
      router.refresh()
    } catch {
      toast.error("No se pudo actualizar la programación")
    } finally {
      setPendingAgent(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4" />
          Reportes programados
        </CardTitle>
        <CardDescription>
          Activá la generación automática por analista.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {AGENT_KEYS.map((key) => {
          const sched = map.get(key)
          const enabled = sched?.enabled ?? false
          const frequency = sched?.frequency ?? "weekly"
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{AGENTS[key].label}</p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={frequency}
                  onValueChange={(v) => toggle(key, enabled, v ?? "weekly")}
                  disabled={pendingAgent === key}
                >
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                  </SelectContent>
                </Select>
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => toggle(key, v, frequency)}
                  disabled={pendingAgent === key}
                />
              </div>
            </div>
          )
        })}
        <p className="text-xs text-muted-foreground">
          Nota: la ejecución automática requiere configurar un cron job que
          dispare la generación según esta frecuencia.
        </p>
      </CardContent>
    </Card>
  )
}

// Parses an SSE response body from toUIMessageStreamResponse into chunk objects.
async function* parseSSEStream(
  response: Response,
): AsyncGenerator<Record<string, unknown>> {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith("data:")) {
        const data = trimmed.slice(5).trim()
        if (data === "[DONE]") return
        try {
          yield JSON.parse(data)
        } catch {
          /* skip */
        }
      }
    }
  }
}

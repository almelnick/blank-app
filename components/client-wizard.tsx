"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  CHANNELS,
  CHANNEL_KEYS,
  CLIENT_TYPES,
  DIMENSION_LABEL_PRESETS,
  type ChannelKey,
  type ClientType,
} from "@/lib/channels"
import { createClient } from "@/app/actions/clients"
import { toast } from "sonner"
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

const STEPS = ["Datos", "Canales", "Normalización"] as const

export function ClientWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState("")
  const [type, setType] = useState<ClientType>("lead_gen")
  const [channels, setChannels] = useState<ChannelKey[]>(["meta", "google_ads"])
  const [dimensionLabel, setDimensionLabel] = useState(
    CLIENT_TYPES.lead_gen.defaultDimension,
  )

  function pickType(t: ClientType) {
    setType(t)
    setDimensionLabel(CLIENT_TYPES[t].defaultDimension)
  }

  function toggleChannel(ch: ChannelKey) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    )
  }

  const canNext =
    step === 0 ? name.trim().length > 1 : step === 1 ? channels.length > 0 : true

  async function submit() {
    setSaving(true)
    try {
      const res = await createClient({ name: name.trim(), type, dimensionLabel, channels })
      toast.success("Cliente creado")
      router.push(`/dashboard/clients/${res.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear el cliente")
      setSaving(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Nuevo cliente</CardTitle>
        <Stepper step={step} />
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre del cliente</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Concesionaria Norte"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>Tipo de cliente</Label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(CLIENT_TYPES) as ClientType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => pickType(t)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors",
                      type === t
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <p className="font-medium">{CLIENT_TYPES[t].label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t === "ecommerce"
                        ? "Foco en ingresos y ROAS"
                        : "Foco en leads y costo por lead"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <div>
              <Label>Canales conectados vía Windsor</Label>
              <p className="text-sm text-muted-foreground">
                Seleccioná las fuentes de datos para este cliente.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {CHANNEL_KEYS.map((ch) => {
                const active = channels.includes(ch)
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleChannel(ch)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-4 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <div>
                      <p className="font-medium">{CHANNELS[ch].label}</p>
                      <p className="text-xs text-muted-foreground">
                        Conector: {CHANNELS[ch].connector}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-full border",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {active && <Check className="size-3" />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dim">Etiqueta de la dimensión principal</Label>
              <p className="text-sm text-muted-foreground">
                Cómo se llama lo que agrupa las campañas para este cliente. Puede
                ser categoría, marca de auto, servicio, etc.
              </p>
              <Input
                id="dim"
                value={dimensionLabel}
                onChange={(e) => setDimensionLabel(e.target.value)}
                placeholder="Ej. Marca de auto"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {DIMENSION_LABEL_PRESETS.map((p) => (
                  <button key={p} type="button" onClick={() => setDimensionLabel(p)}>
                    <Badge
                      variant={dimensionLabel === p ? "default" : "outline"}
                      className="cursor-pointer font-normal"
                    >
                      {p}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Resumen</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>
                  Cliente: <span className="text-foreground">{name || "—"}</span>
                </li>
                <li>
                  Tipo:{" "}
                  <span className="text-foreground">{CLIENT_TYPES[type].label}</span>
                </li>
                <li>
                  Canales:{" "}
                  <span className="text-foreground">
                    {channels.map((c) => CHANNELS[c].label).join(", ") || "—"}
                  </span>
                </li>
                <li>
                  Dimensión:{" "}
                  <span className="text-foreground">{dimensionLabel || "—"}</span>
                </li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Después de crear el cliente vas a poder mapear métricas y
                normalizar nombres en su configuración.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
          >
            <ChevronLeft className="size-4" />
            Atrás
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Crear cliente
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-xs font-medium",
              i <= step
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {i < step ? <Check className="size-3" /> : i + 1}
          </span>
          <span
            className={cn(
              "text-sm",
              i <= step ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
          {i < STEPS.length - 1 && (
            <span className="mx-1 h-px w-6 bg-border" aria-hidden />
          )}
        </div>
      ))}
    </div>
  )
}

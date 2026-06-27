"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, Trash2, Loader2 } from "lucide-react"
import {
  CHANNELS,
  CHANNEL_KEYS,
  CANONICAL_METRICS,
  channelLabel,
  type ChannelKey,
  type CanonicalMetric,
} from "@/lib/channels"
import {
  setConnection,
  addMetricMapping,
  deleteMetricMapping,
  addDimensionMap,
  deleteDimensionMap,
  createClientAccess,
  revokeClientAccess,
  deleteClient,
} from "@/app/actions/clients"

type Connection = {
  id: string
  channel: string
  windsorAccountId: string | null
  enabled: boolean
}
type Mapping = {
  id: string
  channel: string | null
  sourceMetric: string
  canonicalMetric: string
  displayName: string
  format: string
}
type DimMap = {
  id: string
  channel: string | null
  rawValue: string
  normalizedValue: string
}
type Member = { id: string; name: string; email: string }

export function ClientSettings({
  clientId,
  connections,
  mappings,
  dimMaps,
  members,
}: {
  clientId: string
  connections: Connection[]
  mappings: Mapping[]
  dimMaps: DimMap[]
  members: Member[]
}) {
  return (
    <div className="flex flex-col gap-6">
      <ConnectionsSection clientId={clientId} connections={connections} />
      <MetricMappingsSection clientId={clientId} mappings={mappings} />
      <DimensionMapsSection clientId={clientId} dimMaps={dimMaps} />
      <PortalAccessSection clientId={clientId} members={members} />
      <DangerZone clientId={clientId} />
    </div>
  )
}

function ConnectionsSection({
  clientId,
  connections,
}: {
  clientId: string
  connections: Connection[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const byChannel = new Map(connections.map((c) => [c.channel, c]))

  function toggle(channel: ChannelKey, enabled: boolean) {
    start(async () => {
      await setConnection(clientId, channel, enabled, byChannel.get(channel)?.windsorAccountId ?? undefined)
      router.refresh()
    })
  }
  function saveAccount(channel: ChannelKey, accountId: string) {
    start(async () => {
      await setConnection(clientId, channel, byChannel.get(channel)?.enabled ?? true, accountId)
      toast.success("Cuenta de Windsor actualizada")
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Conexiones de Windsor</CardTitle>
        <CardDescription>
          Activá los canales y asociá el ID de cuenta de Windsor para cada uno.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {CHANNEL_KEYS.map((ch) => {
          const conn = byChannel.get(ch)
          return (
            <div
              key={ch}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <Switch
                  checked={conn?.enabled ?? false}
                  onCheckedChange={(v) => toggle(ch, v)}
                  disabled={pending}
                />
                <div>
                  <p className="font-medium">{CHANNELS[ch].label}</p>
                  <p className="text-xs text-muted-foreground">
                    Conector: {CHANNELS[ch].connector}
                  </p>
                </div>
              </div>
              <AccountInput
                defaultValue={conn?.windsorAccountId ?? ""}
                disabled={pending || !conn?.enabled}
                onSave={(v) => saveAccount(ch, v)}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

function AccountInput({
  defaultValue,
  disabled,
  onSave,
}: {
  defaultValue: string
  disabled: boolean
  onSave: (v: string) => void
}) {
  const [value, setValue] = useState(defaultValue)
  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="ID de cuenta Windsor"
        className="h-8 w-48"
        disabled={disabled}
      />
      <Button
        size="sm"
        variant="secondary"
        className="h-8"
        disabled={disabled || value === defaultValue}
        onClick={() => onSave(value)}
      >
        Guardar
      </Button>
    </div>
  )
}

function MetricMappingsSection({
  clientId,
  mappings,
}: {
  clientId: string
  mappings: Mapping[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [source, setSource] = useState("")
  const [canonical, setCanonical] = useState<CanonicalMetric>("conversions")
  const [display, setDisplay] = useState("")
  const [channel, setChannel] = useState<string>("*")

  function add() {
    if (!source.trim() || !display.trim()) {
      toast.error("Completá la métrica de origen y el nombre visible")
      return
    }
    start(async () => {
      await addMetricMapping({
        clientId,
        channel: channel === "*" ? null : channel,
        sourceMetric: source.trim(),
        canonicalMetric: canonical,
        displayName: display.trim(),
        format: CANONICAL_METRICS[canonical].format,
      })
      setSource("")
      setDisplay("")
      toast.success("Mapeo agregado")
      router.refresh()
    })
  }
  function remove(id: string) {
    start(async () => {
      await deleteMetricMapping(id, clientId)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Normalización de métricas</CardTitle>
        <CardDescription>
          Mapeá nombres de métricas de cada fuente a una métrica canónica común
          (ej. &quot;purchase&quot; y &quot;lead&quot; → Conversiones).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label className="text-xs">Métrica de origen</Label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="purchase_roas"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Métrica canónica</Label>
            <Select value={canonical} onValueChange={(v) => setCanonical(v as CanonicalMetric)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CANONICAL_METRICS) as CanonicalMetric[]).map((m) => (
                  <SelectItem key={m} value={m}>
                    {CANONICAL_METRICS[m].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Nombre visible</Label>
            <Input
              value={display}
              onChange={(e) => setDisplay(e.target.value)}
              placeholder="Compras"
            />
          </div>
          <Button onClick={add} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Agregar
          </Button>
        </div>
        <div className="grid gap-1.5 sm:max-w-xs">
          <Label className="text-xs">Aplica a canal</Label>
          <Select value={channel} onValueChange={(v) => setChannel(v ?? "*")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="*">Todos los canales</SelectItem>
              {CHANNEL_KEYS.map((ch) => (
                <SelectItem key={ch} value={ch}>
                  {CHANNELS[ch].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {mappings.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origen</TableHead>
                <TableHead>Canónica</TableHead>
                <TableHead>Nombre visible</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.sourceMetric}</TableCell>
                  <TableCell>
                    {CANONICAL_METRICS[m.canonicalMetric as CanonicalMetric]?.label ??
                      m.canonicalMetric}
                  </TableCell>
                  <TableCell>{m.displayName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {m.channel ? channelLabel(m.channel) : "Todos"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(m.id)}
                      disabled={pending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function DimensionMapsSection({
  clientId,
  dimMaps,
}: {
  clientId: string
  dimMaps: DimMap[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [raw, setRaw] = useState("")
  const [normalized, setNormalized] = useState("")

  function add() {
    if (!raw.trim() || !normalized.trim()) {
      toast.error("Completá ambos valores")
      return
    }
    start(async () => {
      await addDimensionMap({
        clientId,
        channel: null,
        rawValue: raw.trim(),
        normalizedValue: normalized.trim(),
      })
      setRaw("")
      setNormalized("")
      toast.success("Regla de normalización agregada")
      router.refresh()
    })
  }
  function remove(id: string) {
    start(async () => {
      await deleteDimensionMap(id, clientId)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Normalización de nombres</CardTitle>
        <CardDescription>
          Unificá variantes de nombres de campañas/categorías/marcas (ej.
          &quot;VW&quot;, &quot;Volkswagen ARG&quot; → &quot;Volkswagen&quot;).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label className="text-xs">Valor original</Label>
            <Input
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="VW_ARG_2024"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Valor normalizado</Label>
            <Input
              value={normalized}
              onChange={(e) => setNormalized(e.target.value)}
              placeholder="Volkswagen"
            />
          </div>
          <Button onClick={add} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Agregar
          </Button>
        </div>

        {dimMaps.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Original</TableHead>
                <TableHead>Normalizado</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {dimMaps.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.rawValue}</TableCell>
                  <TableCell className="font-medium">{m.normalizedValue}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {m.channel ? channelLabel(m.channel) : "Todos"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(m.id)}
                      disabled={pending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function PortalAccessSection({
  clientId,
  members,
}: {
  clientId: string
  members: Member[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function add() {
    if (!name.trim() || !email.trim() || password.length < 8) {
      toast.error("Completá nombre, email y una contraseña de 8+ caracteres")
      return
    }
    start(async () => {
      try {
        await createClientAccess({
          clientId,
          name: name.trim(),
          email: email.trim(),
          password,
        })
        setName("")
        setEmail("")
        setPassword("")
        toast.success("Acceso de cliente creado")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo crear el acceso")
      }
    })
  }
  function revoke(id: string) {
    start(async () => {
      await revokeClientAccess(id, clientId)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Acceso del cliente</CardTitle>
        <CardDescription>
          Creá usuarios para que el cliente vea su propio dashboard en el portal.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label className="text-xs">Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Pérez" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@cliente.com"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Contraseña</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mín. 8 caracteres"
            />
          </div>
          <Button onClick={add} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Crear
          </Button>
        </div>

        {members.length > 0 && (
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => revoke(m.id)}
                  disabled={pending}
                >
                  Revocar
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DangerZone({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)

  function remove() {
    start(async () => {
      await deleteClient(clientId)
      toast.success("Cliente eliminado")
      router.push("/dashboard/clients")
    })
  }

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base text-destructive">Zona de peligro</CardTitle>
        <CardDescription>
          Eliminar el cliente borra sus conexiones, mapeos y datos sincronizados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {confirming ? (
          <div className="flex items-center gap-2">
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Confirmar eliminación
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button variant="outline" className="border-destructive/40 text-destructive" onClick={() => setConfirming(true)}>
            <Trash2 className="size-4" />
            Eliminar cliente
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

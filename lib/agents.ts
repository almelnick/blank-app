import "server-only"
import {
  getRows,
  sumTotals,
  groupByChannel,
  groupByDimension,
  type Totals,
} from "@/lib/metrics"
import { resolvePeriods } from "@/lib/dates"
import { AGENTS, channelLabel, type AgentKey, type ChannelKey } from "@/lib/channels"
import { ctr, cpa, cpc, roas, convRate, pctChange } from "@/lib/format"

export const AGENT_MODEL = "openai/gpt-5.4-mini"

type ClientCtx = {
  id: string
  name: string
  type: string
  dimensionLabel: string
}

function fmtTotals(t: Totals) {
  return {
    inversion: Math.round(t.spend),
    impresiones: Math.round(t.impressions),
    clicks: Math.round(t.clicks),
    conversiones: Math.round(t.conversions),
    ingresos: Math.round(t.revenue),
    ctr: +(ctr(t.clicks, t.impressions) * 100).toFixed(2),
    cpc: +cpc(t.spend, t.clicks).toFixed(2),
    cpa: +cpa(t.spend, t.conversions).toFixed(2),
    tasaConversion: +(convRate(t.conversions, t.clicks) * 100).toFixed(2),
    roas: +roas(t.revenue, t.spend).toFixed(2),
  }
}

// Builds a compact, normalized data snapshot the agent reasons over. Restricted
// to the channels the agent specializes in.
export async function buildAgentContext(
  client: ClientCtx,
  agent: AgentKey,
  rangeDays: number,
) {
  const { current, previous } = resolvePeriods(rangeDays)
  const channels = AGENTS[agent].channels as ChannelKey[]

  const [curRows, prevRows] = await Promise.all([
    getRows({ clientId: client.id, from: current.from, to: current.to, channels }),
    getRows({ clientId: client.id, from: previous.from, to: previous.to, channels }),
  ])

  const curTotals = sumTotals(curRows)
  const prevTotals = sumTotals(prevRows)

  const perChannel = groupByChannel(curRows).map((c) => ({
    canal: channelLabel(c.channel),
    ...fmtTotals(c.values),
  }))

  const topDims = groupByDimension(curRows)
    .map((d) => ({ name: d.dimensionValue, channel: channelLabel(d.channel), ...d.values }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 15)
    .map((d) => ({
      [client.dimensionLabel]: d.name,
      canal: d.channel,
      inversion: Math.round(d.spend),
      conversiones: Math.round(d.conversions),
      ingresos: Math.round(d.revenue),
      cpa: +cpa(d.spend, d.conversions).toFixed(2),
      roas: +roas(d.revenue, d.spend).toFixed(2),
      ctr: +(ctr(d.clicks, d.impressions) * 100).toFixed(2),
    }))

  const deltas = {
    inversion: pctChange(curTotals.spend, prevTotals.spend),
    conversiones: pctChange(curTotals.conversions, prevTotals.conversions),
    ingresos: pctChange(curTotals.revenue, prevTotals.revenue),
    cpa: pctChange(
      cpa(curTotals.spend, curTotals.conversions),
      cpa(prevTotals.spend, prevTotals.conversions),
    ),
    roas: pctChange(
      roas(curTotals.revenue, curTotals.spend),
      roas(prevTotals.revenue, prevTotals.spend),
    ),
  }

  return {
    cliente: { nombre: client.name, tipo: client.type, dimension: client.dimensionLabel },
    periodo: { dias: rangeDays, desde: current.from, hasta: current.to },
    totales: fmtTotals(curTotals),
    totalesPeriodoAnterior: fmtTotals(prevTotals),
    variaciones: deltas,
    porCanal: perChannel,
    top: topDims,
    hayDatos: curRows.length > 0,
  }
}

const SHARED_GUIDANCE = `
Sos un analista senior de una agencia de marketing. Escribís en español rioplatense, claro y directo.
Tu objetivo es entregar conclusiones ACCIONABLES, no describir números obvios.

Formato de salida (markdown):
## Resumen ejecutivo
2-3 frases con lo más importante del período.

## Hallazgos clave
- Bullets concretos. Cada uno cita el dato que lo respalda y su variación vs. período anterior.

## Recomendaciones accionables
- Lista priorizada. Cada recomendación dice QUÉ hacer, DÓNDE (campaña/canal/segmento) y el IMPACTO esperado.

## Riesgos y alertas
- Cualquier caída, gasto ineficiente o anomalía que requiera atención.

Reglas:
- Basate SOLO en los datos provistos. Si faltan datos, decilo explícitamente y no inventes.
- Para ecommerce priorizá ingresos, ROAS y CPA. Para lead gen priorizá volumen de leads y costo por lead.
- Sé específico: nombrá las campañas/categorías/marcas concretas del dataset.
- No repitas toda la tabla; extraé patrones.
`

const AGENT_PERSONAS: Record<AgentKey, string> = {
  meta: `Sos experto en paid media en Meta Ads (Facebook e Instagram). Conocés estructura de campañas ABO/CBO,
segmentación de audiencias, creatividades, frecuencia, y optimización de pujas. Analizás performance de Meta
y recomendás cambios de presupuesto, audiencias y creativos.`,
  google: `Sos experto en paid media en Google Ads (Search, Performance Max, Shopping, Display). Conocés
match types, calidad de anuncios, pujas inteligentes (tCPA/tROAS), y estructura de campañas. Recomendás
optimizaciones de keywords, pujas y estructura.`,
  cross: `Sos un estratega cross-channel que ve Meta y Google en conjunto. Tu foco es la asignación de
presupuesto entre canales, evitar canibalización, y maximizar el resultado global. Comparás eficiencia
entre canales y recomendás cómo redistribuir inversión.`,
  seo: `Sos experto en SEO técnico y orgánico. Analizás Search Console y GA4: impresiones, clicks, CTR
orgánico, posiciones y tráfico orgánico. Recomendás mejoras técnicas, de contenido y de intención de búsqueda.`,
  content: `Sos experto en estrategia de contenido técnico. Analizás performance editorial vía GA4 y Search
Console: qué contenido atrae y convierte. Recomendás temas, formatos y mejoras de contenido para el público objetivo.`,
}

export function buildSystemPrompt(agent: AgentKey): string {
  return `${AGENT_PERSONAS[agent]}\n${SHARED_GUIDANCE}`
}

export function buildUserPrompt(
  agentLabel: string,
  context: unknown,
  clientName: string,
): string {
  return `Analizá la performance del cliente "${clientName}" desde tu especialidad (${agentLabel}).

Datos normalizados del período (JSON):
${JSON.stringify(context, null, 2)}

Entregá el análisis siguiendo el formato indicado.`
}

"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Loader2, RotateCcw, ZoomIn } from "lucide-react"
import type { DirectionalCountsResponse } from "@/lib/api"

interface DirectionalCountsChartProps {
  timeRange: string
  selectedDate: string
  data?: DirectionalCountsResponse | null
  loading?: boolean
  onTimeSelect?: (time: string) => void
  onResetZoom?: () => void
}

type ChartMode = "day-total" | "hourly-total" | "hourly-location"

const DIRECTION_COLORS = { entering: "#22C55E", exiting: "#06B6D4" }
const LOCATION_COLORS = ["#22C55E", "#06B6D4", "#3B82F6", "#F59E0B", "#A855F7", "#EF4444"]

function formatTimeRangeLabel(timeRange: string) {
  return timeRange
    .replace("whole-day", "Whole Day")
    .replace("last-1h", "Last 1 Hour")
    .replace("last-3h", "Last 3 Hours")
    .replace("last-6h", "Last 6 Hours")
    .replace("last-12h", "Last 12 Hours")
    .replace("morning", "Morning")
    .replace("afternoon", "Afternoon")
    .replace("evening", "Evening")
}

function formatDateLabel(selectedDate: string) {
  return selectedDate
    ? new Date(selectedDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "All dates"
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "")
  const value = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function DirectionalTooltip({
  active,
  payload,
  label,
  mode,
  locations,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; color?: string; payload?: Record<string, string | number | null> }>
  label?: string
  mode: ChartMode
  locations: string[]
}) {
  const entries = (payload ?? []).filter((entry) => entry.value != null)
  const point = entries[0]?.payload
  const displayLabel = String(point?.time ?? label ?? "--")

  if (!active || entries.length === 0) {
    return null
  }

  if (mode === "hourly-location" && point) {
    const enteringBreakdown = locations
      .map((location) => ({ location, value: Number(point[`entering::${location}`] ?? 0) }))
      .filter((item) => item.value > 0)
    const exitingBreakdown = locations
      .map((location) => ({ location, value: Number(point[`exiting::${location}`] ?? 0) }))
      .filter((item) => item.value > 0)

    return (
      <div className="rounded-2xl border border-border bg-popover p-3 shadow-elevated">
        <p className="mb-2 text-sm font-medium text-foreground">{displayLabel}</p>
        <div className="space-y-3 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Entering</p>
            <div className="space-y-1.5">
              {enteringBreakdown.length > 0 ? enteringBreakdown.map((item) => (
                <div key={`entering-${item.location}`} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{item.location}</span>
                  <span className="font-medium text-foreground">{item.value.toLocaleString()}</span>
                </div>
              )) : <p className="text-muted-foreground">No entering counts</p>}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Exiting</p>
            <div className="space-y-1.5">
              {exitingBreakdown.length > 0 ? exitingBreakdown.map((item) => (
                <div key={`exiting-${item.location}`} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{item.location}</span>
                  <span className="font-medium text-foreground">{item.value.toLocaleString()}</span>
                </div>
              )) : <p className="text-muted-foreground">No exiting counts</p>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-popover p-3 shadow-elevated">
      <p className="mb-2 text-sm font-medium text-foreground">{displayLabel}</p>
      <div className="space-y-2 text-sm">
        {entries.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color ?? "#71717A" }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">{Number(entry.value ?? 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DirectionalCountsChart({
  timeRange,
  selectedDate,
  data,
  loading = false,
  onTimeSelect,
  onResetZoom,
}: DirectionalCountsChartProps) {
  const [mode, setMode] = useState<ChartMode>("hourly-total")
  const timeLabelsById = new Map((data?.series ?? []).map((point) => [point.id, point.time]))
  const bucketMinutes = data?.bucketMinutes ?? 60
  const zoomLevel = data?.zoomLevel ?? 0
  const canZoomIn = data?.canZoomIn ?? false
  const focusTime = data?.focusTime
  const windowStart = data?.windowStart
  const windowEnd = data?.windowEnd
  const locations = data?.locations ?? []
  const subtitle = zoomLevel > 0
    ? `Zoom level ${zoomLevel} · ${windowStart ?? focusTime ?? "--"}–${windowEnd ?? "--"}`
    : `${formatDateLabel(selectedDate)} - ${formatTimeRangeLabel(timeRange)}`

  const dayTotalData = useMemo(() => {
    const totals = (data?.series ?? []).reduce(
      (accumulator, point) => ({
        enteringCount: accumulator.enteringCount + Number(point.enteringCount ?? 0),
        exitingCount: accumulator.exitingCount + Number(point.exitingCount ?? 0),
      }),
      { enteringCount: 0, exitingCount: 0 },
    )

    return [{ id: "selected-range", time: "Selected Range", ...totals }]
  }, [data])

  const hourlyTotalData = useMemo(
    () => (data?.series ?? []).map((point) => ({
      ...point,
      enteringCount: Number(point.enteringCount ?? 0),
      exitingCount: Number(point.exitingCount ?? 0),
    })),
    [data],
  )

  const hourlyLocationData = useMemo(
    () => (data?.locationSeries ?? []).map((bucket) => {
      const row: Record<string, string | number> = { id: bucket.id, time: bucket.time }
      bucket.locations.forEach((location) => {
        row[`entering::${location.location}`] = location.enteringCount
        row[`exiting::${location.location}`] = location.exitingCount
      })
      return row
    }),
    [data],
  )

  const chartData = mode === "day-total" ? dayTotalData : mode === "hourly-total" ? hourlyTotalData : hourlyLocationData

  const handleChartClick = (state: unknown) => {
    if (mode === "day-total" || !canZoomIn || typeof onTimeSelect !== "function") {
      return
    }

    const activePayload = typeof state === "object" && state !== null && "activePayload" in state
      ? (state as { activePayload?: Array<{ payload?: { time?: string } }> }).activePayload
      : undefined
    const candidate = activePayload?.find((entry) => typeof entry?.payload?.time === "string")?.payload?.time
    if (typeof candidate === "string" && candidate) {
      onTimeSelect(candidate)
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Entering / Exiting Pedestrians</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          <p className="text-xs text-muted-foreground">
            {mode === "day-total"
              ? "Directional totals summed across the current dashboard scope."
              : mode === "hourly-total"
                ? `Directional pedestrian counts per ${bucketMinutes}-minute bucket across all locations.`
                : `Per-bucket directional counts split by location, with entering and exiting stacked separately.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={mode} onValueChange={(value) => setMode(value as ChartMode)}>
            <TabsList className="h-10 rounded-2xl border border-border bg-secondary p-1">
              <TabsTrigger value="day-total" className="rounded-xl px-3 text-xs">Whole Day</TabsTrigger>
              <TabsTrigger value="hourly-total" className="rounded-xl px-3 text-xs">Per Hour</TabsTrigger>
              <TabsTrigger value="hourly-location" className="rounded-xl px-3 text-xs">Per Hour + Location</TabsTrigger>
            </TabsList>
          </Tabs>
          {zoomLevel > 0 && onResetZoom && (
            <Button variant="outline" size="sm" className="rounded-2xl" onClick={onResetZoom}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Zoom
            </Button>
          )}
        </div>
      </div>

      <div className="h-[320px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading directional counts...
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }} onClick={handleChartClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
              <XAxis
                dataKey="id"
                tickFormatter={(value) => String((chartData.find((point) => String(point.id) === String(value))?.time) ?? timeLabelsById.get(String(value)) ?? value)}
                stroke="#71717A"
                tick={{ fill: "#71717A", fontSize: 12 }}
                axisLine={{ stroke: "#27272A" }}
              />
              <YAxis
                stroke="#71717A"
                tick={{ fill: "#71717A", fontSize: 12 }}
                axisLine={{ stroke: "#27272A" }}
                allowDecimals={false}
                label={{ value: "Pedestrian Count", angle: -90, position: "insideLeft", fill: "#71717A", fontSize: 12 }}
              />
              <Tooltip content={<DirectionalTooltip mode={mode} locations={locations} />} />
              {mode !== "hourly-location" && (
                <Legend wrapperStyle={{ paddingTop: "20px" }} formatter={(value) => <span className="text-sm text-foreground">{value}</span>} />
              )}
              {mode === "hourly-location" ? locations.map((location, index) => {
                const color = LOCATION_COLORS[index % LOCATION_COLORS.length]
                return [
                  <Bar
                    key={`entering-${location}`}
                    dataKey={`entering::${location}`}
                    name={`${location} • Entering`}
                    fill={hexToRgba(color, 0.95)}
                    stackId="entering"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={20}
                  />,
                  <Bar
                    key={`exiting-${location}`}
                    dataKey={`exiting::${location}`}
                    name={`${location} • Exiting`}
                    fill={hexToRgba(color, 0.45)}
                    stackId="exiting"
                    radius={[0, 0, 0, 0]}
                    maxBarSize={20}
                  />,
                ]
              }) : [
                <Bar key="entering" dataKey="enteringCount" name="Entering" fill={DIRECTION_COLORS.entering} radius={[8, 8, 0, 0]} maxBarSize={18} />,
                <Bar key="exiting" dataKey="exitingCount" name="Exiting" fill={DIRECTION_COLORS.exiting} radius={[8, 8, 0, 0]} maxBarSize={18} />,
              ]}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border text-muted-foreground">
            No entering or exiting counts are available for this time range yet.
          </div>
        )}
      </div>

      {mode === "hourly-location" && locations.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border/60 bg-secondary/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-foreground">Location key</p>
            <p className="text-[11px] text-muted-foreground">Within each hour, the left stack represents entering and the right stack represents exiting.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((location, index) => {
              const color = LOCATION_COLORS[index % LOCATION_COLORS.length]
              return (
                <div key={location} className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/45 px-3 py-2 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="truncate text-muted-foreground">{location}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {mode !== "day-total" && canZoomIn && chartData.length > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border/70 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          <ZoomIn className="h-4 w-4" />
          Click a bucket to zoom into a finer time interval for this same range.
        </div>
      )}
    </div>
  )
}
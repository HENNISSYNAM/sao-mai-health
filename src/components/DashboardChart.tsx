import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from 'recharts'
import { TrendingUp, Activity } from "lucide-react"

interface ChartDataPoint {
  name: string
  value: number
  dengue?: number
  tcm?: number
  ari?: number
}

interface DashboardChartProps {
  title: string
  data: ChartDataPoint[]
  type?: 'line' | 'bar' | 'area'
  dataKey?: string
  multiSeries?: boolean
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-xl">
        <p className="text-sm font-semibold mb-2 text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-3 text-sm">
            <div 
              className="w-3 h-3 rounded-full shadow-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="flex-1 text-muted-foreground">{entry.name || 'Ca bệnh'}:</span>
            <span className="font-bold text-foreground">{entry.value?.toLocaleString()} ca</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const CustomDot = (props: any) => {
  const { cx, cy, fill } = props
  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={4} 
      fill={fill} 
      stroke="white" 
      strokeWidth={2}
      className="drop-shadow-sm hover:r-6 transition-all duration-200"
      style={{
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
      }}
    />
  )
}

const CustomActiveDot = (props: any) => {
  const { cx, cy, fill } = props
  return (
    <g>
      <circle 
        cx={cx} 
        cy={cy} 
        r={8} 
        fill="white" 
        stroke={fill} 
        strokeWidth={3}
        className="animate-pulse"
        style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))'
        }}
      />
      <circle 
        cx={cx} 
        cy={cy} 
        r={4} 
        fill={fill}
      />
    </g>
  )
}

export function DashboardChart({ 
  title, 
  data, 
  type = 'line', 
  dataKey = 'value',
  multiSeries = false 
}: DashboardChartProps) {
  // Calculate trend
  const currentValue = data[data.length - 1]?.value || 0
  const previousValue = data[data.length - 2]?.value || 0
  const trend = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0
  const isPositiveTrend = trend >= 0

  return (
    <Card className="rounded-2xl shadow-sm border-0 bg-gradient-to-br from-card via-card to-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className={`h-3 w-3 ${isPositiveTrend ? 'text-danger' : 'text-success'}`} />
            <span className={`font-medium ${isPositiveTrend ? 'text-danger' : 'text-success'}`}>
              {isPositiveTrend ? '+' : ''}{trend.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={350}>
          {type === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.3}
                horizontal={true}
                vertical={false}
              />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                domain={['dataMin - 50', 'dataMax + 50']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fill="url(#primaryGradient)"
                dot={<CustomDot fill="hsl(var(--primary))" />}
                activeDot={<CustomActiveDot fill="hsl(var(--primary))" />}
              />
            </AreaChart>
          ) : type === 'line' ? (
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--secondary))" />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.3}
                horizontal={true}
                vertical={false}
              />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                domain={['dataMin - 50', 'dataMax + 50']}
                label={{ 
                  value: 'Số ca bệnh', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              {multiSeries ? (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="dengue" 
                    stroke="hsl(var(--dengue))" 
                    strokeWidth={3}
                    strokeDasharray="0"
                    name="Sốt xuất huyết"
                    dot={<CustomDot fill="hsl(var(--dengue))" />}
                    activeDot={<CustomActiveDot fill="hsl(var(--dengue))" />}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tcm" 
                    stroke="hsl(var(--tcm))" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    name="Tay chân miệng"
                    dot={<CustomDot fill="hsl(var(--tcm))" />}
                    activeDot={<CustomActiveDot fill="hsl(var(--tcm))" />}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ari" 
                    stroke="hsl(var(--ari))" 
                    strokeWidth={3}
                    strokeDasharray="10 3 3 3"
                    name="Nhiễm khuẩn hô hấp"
                    dot={<CustomDot fill="hsl(var(--ari))" />}
                    activeDot={<CustomActiveDot fill="hsl(var(--ari))" />}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="covid19" 
                    stroke="hsl(var(--covid19))" 
                    strokeWidth={3}
                    strokeDasharray="15 5"
                    name="COVID-19"
                    dot={<CustomDot fill="hsl(var(--covid19))" />}
                    activeDot={<CustomActiveDot fill="hsl(var(--covid19))" />}
                  />
                </>
              ) : (
                <Line 
                  type="monotone" 
                  dataKey={dataKey} 
                  stroke="url(#lineGradient)"
                  strokeWidth={3}
                  dot={<CustomDot fill="hsl(var(--primary))" />}
                  activeDot={<CustomActiveDot fill="hsl(var(--primary))" />}
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
                />
              )}
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.3}
                horizontal={true}
                vertical={false}
              />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey={dataKey} 
                fill="url(#barGradient)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
        
        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">Cao nhất</div>
              <div className="text-sm font-bold">{Math.max(...data.map(d => d.value)).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Thấp nhất</div>
              <div className="text-sm font-bold">{Math.min(...data.map(d => d.value)).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Trung bình</div>
              <div className="text-sm font-bold">
                {Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
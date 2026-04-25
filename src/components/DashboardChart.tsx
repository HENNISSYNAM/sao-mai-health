import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

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
  type?: 'line' | 'bar'
  dataKey?: string
  multiSeries?: boolean
}

export function DashboardChart({ 
  title, 
  data, 
  type = 'line', 
  dataKey = 'value',
  multiSeries = false 
}: DashboardChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {type === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              {multiSeries ? (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="dengue" 
                    stroke="hsl(var(--dengue))" 
                    strokeWidth={3}
                    strokeDasharray="0"
                    name="Sốt xuất huyết"
                    dot={{ fill: 'hsl(var(--dengue))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--dengue))', strokeWidth: 2, fill: 'hsl(var(--card))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tcm" 
                    stroke="hsl(var(--tcm))" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    name="Tay chân miệng"
                    dot={{ fill: 'hsl(var(--tcm))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--tcm))', strokeWidth: 2, fill: 'hsl(var(--card))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ari" 
                    stroke="hsl(var(--ari))" 
                    strokeWidth={3}
                    strokeDasharray="10 3 3 3"
                    name="Nhiễm khuẩn hô hấp"
                    dot={{ fill: 'hsl(var(--ari))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--ari))', strokeWidth: 2, fill: 'hsl(var(--card))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="covid19" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={3}
                    strokeDasharray="15 5"
                    name="COVID-19"
                    dot={{ fill: 'hsl(var(--secondary))', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'hsl(var(--secondary))', strokeWidth: 2, fill: 'hsl(var(--card))' }}
                  />
                </>
              ) : (
                <Line 
                  type="monotone" 
                  dataKey={dataKey} 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
              )}
            </LineChart>
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey={dataKey} fill="hsl(var(--primary))" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface DiseaseData {
  name: string
  dengue?: number
  tcm?: number
  ari?: number
  covid19?: number
  h1n1?: number
  malaria?: number
}

interface DiseaseStreamChartProps {
  title: string
  data: DiseaseData[]
  selectedDiseases?: string[]
  onDiseaseToggle?: (disease: string) => void
}

const diseaseConfig = {
  dengue: {
    name: "Sốt xuất huyết",
    color: "hsl(var(--dengue))",
    strokeDasharray: "0",
    priority: 1
  },
  covid19: {
    name: "COVID-19", 
    color: "hsl(var(--secondary))",
    strokeDasharray: "5 5",
    priority: 2
  },
  tcm: {
    name: "Tay chân miệng",
    color: "hsl(var(--tcm))",
    strokeDasharray: "10 3 3 3",
    priority: 3
  },
  ari: {
    name: "Nhiễm khuẩn hô hấp",
    color: "hsl(var(--ari))",
    strokeDasharray: "15 5",
    priority: 4
  },
  h1n1: {
    name: "Cúm H1N1",
    color: "hsl(var(--warning))",
    strokeDasharray: "2 8",
    priority: 5
  },
  malaria: {
    name: "Sốt rét",
    color: "hsl(var(--info))",
    strokeDasharray: "20 5 5 5",
    priority: 6
  }
}

export function DiseaseStreamChart({ 
  title, 
  data, 
  selectedDiseases = Object.keys(diseaseConfig),
  onDiseaseToggle 
}: DiseaseStreamChartProps) {
  
  const visibleDiseases = selectedDiseases.filter(disease => 
    data.some(item => (item as any)[disease] > 0)
  ).sort((a, b) => diseaseConfig[a as keyof typeof diseaseConfig].priority - diseaseConfig[b as keyof typeof diseaseConfig].priority)

  const handleDiseaseClick = (disease: string) => {
    onDiseaseToggle?.(disease)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload
            .sort((a: any, b: any) => b.value - a.value)
            .map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="flex-1">{entry.name}:</span>
                <span className="font-medium">{entry.value.toLocaleString()} ca</span>
              </div>
            ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex flex-wrap gap-2">
            {Object.entries(diseaseConfig).map(([key, config]) => {
              const isVisible = selectedDiseases.includes(key)
              const hasData = data.some(item => (item as any)[key] > 0)
              
              if (!hasData) return null
              
              return (
                <Badge
                  key={key}
                  variant={isVisible ? "default" : "outline"}
                  className="cursor-pointer text-xs px-2 py-1 transition-all hover:scale-105"
                  style={{
                    backgroundColor: isVisible ? config.color : 'transparent',
                    borderColor: config.color,
                    color: isVisible ? 'white' : config.color
                  }}
                  onClick={() => handleDiseaseClick(key)}
                >
                  {config.name}
                </Badge>
              )
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
              label={{ 
                value: 'Số ca bệnh', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {visibleDiseases.map((disease) => {
              const config = diseaseConfig[disease as keyof typeof diseaseConfig]
              return (
                <Line
                  key={disease}
                  type="monotone"
                  dataKey={disease}
                  stroke={config.color}
                  strokeWidth={3}
                  strokeDasharray={config.strokeDasharray}
                  name={config.name}
                  dot={{ 
                    fill: config.color, 
                    strokeWidth: 2, 
                    r: 4,
                    fillOpacity: 0.8 
                  }}
                  activeDot={{ 
                    r: 6, 
                    stroke: config.color, 
                    strokeWidth: 3, 
                    fill: 'hsl(var(--card))',
                    strokeOpacity: 1
                  }}
                  connectNulls={false}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
        
        {/* Disease Summary */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {visibleDiseases.slice(0, 4).map((disease) => {
              const config = diseaseConfig[disease as keyof typeof diseaseConfig]
              const totalCases = data.reduce((sum, item) => sum + ((item as any)[disease] || 0), 0)
              const lastValue = Number(data[data.length - 1]?.[disease as keyof DiseaseData] || 0)
              const prevValue = Number(data[data.length - 2]?.[disease as keyof DiseaseData] || 0)
              const change = prevValue > 0 ? ((lastValue - prevValue) / prevValue) * 100 : 0
              
              return (
                <div key={disease} className="text-center p-2 rounded-lg bg-muted/20">
                  <div 
                    className="w-4 h-1 mx-auto mb-1 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <div className="text-xs text-muted-foreground mb-1">{config.name}</div>
                  <div className="text-sm font-bold">{totalCases.toLocaleString()}</div>
                  <div className={`text-xs ${change >= 0 ? 'text-success' : 'text-danger'}`}>
                    {change >= 0 ? '↗' : '↘'} {Math.abs(change).toFixed(1)}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
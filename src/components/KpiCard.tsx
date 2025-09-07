import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
  }
  icon: LucideIcon
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export function KpiCard({ title, value, change, icon: Icon, variant = 'default' }: KpiCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-success/20 bg-success/5'
      case 'warning':
        return 'border-warning/20 bg-warning/5'
      case 'danger':
        return 'border-danger/20 bg-danger/5'
      case 'info':
        return 'border-info/20 bg-info/5'
      default:
        return ''
    }
  }

  const getIconColor = () => {
    switch (variant) {
      case 'success':
        return 'text-success'
      case 'warning':
        return 'text-warning'
      case 'danger':
        return 'text-danger'
      case 'info':
        return 'text-info'
      default:
        return 'text-primary'
    }
  }

  const getChangeColor = () => {
    if (!change) return ''
    
    // For disease/case related metrics, increase is bad (red), decrease is good (green)
    if (title.toLowerCase().includes('ca bệnh') || title.toLowerCase().includes('cảnh báo')) {
      return change.type === 'increase' ? 'text-danger' : 'text-success'
    }
    
    // For positive metrics like vaccination rate, increase is good (green), decrease is bad (red)
    if (title.toLowerCase().includes('tiêm chủng') || title.toLowerCase().includes('khỏi bệnh')) {
      return change.type === 'increase' ? 'text-success' : 'text-danger'
    }
    
    // Default: increase good, decrease bad
    return change.type === 'increase' ? 'text-success' : 'text-danger'
  }

  return (
    <Card className={cn("transition-all hover:shadow-md", getVariantStyles())}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn("h-4 w-4", getIconColor())} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString('vi-VN') : value}</div>
        {change && (
          <p className={cn(
            "text-xs flex items-center gap-1 mt-1",
            getChangeColor()
          )}>
            <span>{change.type === 'increase' ? '↗' : '↘'}</span>
            {Math.abs(change.value)}% so với tuần trước
          </p>
        )}
      </CardContent>
    </Card>
  )
}
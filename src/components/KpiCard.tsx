import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
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
  confidence?: 'high' | 'medium' | 'low'
}

const confidenceConfig = {
  high:   { dot: 'bg-success',  label: 'Độ tin cao' },
  medium: { dot: 'bg-warning',  label: 'Độ tin vừa' },
  low:    { dot: 'bg-destructive', label: 'Độ tin thấp' },
}

export function KpiCard({ title, value, change, icon: Icon, variant = 'default', confidence }: KpiCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-success/20 bg-gradient-to-br from-success/5 to-success/10'
      case 'warning':
        return 'border-warning/20 bg-gradient-to-br from-warning/5 to-warning/10'
      case 'danger':
        return 'border-danger/20 bg-gradient-to-br from-danger/5 to-danger/10'
      case 'info':
        return 'border-info/20 bg-gradient-to-br from-info/5 to-info/10'
      default:
        return 'border-border'
    }
  }

  const getIconStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-success/10 text-success'
      case 'warning':
        return 'bg-warning/10 text-warning'
      case 'danger':
        return 'bg-danger/10 text-danger'
      case 'info':
        return 'bg-info/10 text-info'
      default:
        return 'bg-primary/10 text-primary'
    }
  }

  return (
    <Card className={cn(
      "relative overflow-hidden rounded-xl sm:rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group",
      getVariantStyles()
    )}>
      {/* Background decoration - hidden on mobile for cleaner look */}
      <div className="absolute -right-6 -top-6 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-primary/5 to-primary/10 group-hover:scale-110 transition-transform duration-300 hidden sm:block" />
      
      <CardContent className="p-3 sm:p-5 relative">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p className="text-xl sm:text-3xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            {change && (
              <div className={cn(
                "flex items-center gap-1 text-[10px] sm:text-xs font-medium",
                // Health context: increase = bad (red), decrease = good (green)
                change.type === 'increase' ? 'text-destructive' : 'text-success'
              )}>
                {change.type === 'increase' ? (
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                )}
                <span className="truncate">~{Math.abs(change.value)}%</span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-2 sm:p-3 rounded-lg sm:rounded-xl transition-transform duration-300 group-hover:scale-110 shrink-0",
            getIconStyles()
          )}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
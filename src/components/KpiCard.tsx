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
}

export function KpiCard({ title, value, change, icon: Icon, variant = 'default' }: KpiCardProps) {
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
      "relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group",
      getVariantStyles()
    )}>
      {/* Background decoration */}
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-primary/5 to-primary/10 group-hover:scale-110 transition-transform duration-300" />
      
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            {change && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                change.type === 'increase' ? 'text-success' : 'text-danger'
              )}>
                {change.type === 'increase' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(change.value)}% so với tuần trước</span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-xl transition-transform duration-300 group-hover:scale-110",
            getIconStyles()
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
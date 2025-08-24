import { useState, useMemo } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useEnhancedCommandPalette } from "@/hooks/useEnhancedCommandPalette"
import { 
  Search, FileText, AlertTriangle, Bed, Users, Database, Megaphone,
  BarChart3, UserPlus, FileSpreadsheet, Zap, Map, Calendar, Stethoscope,
  Building2, Package, ShieldCheck, Wrench, UserCog, RefreshCw, FileDown
} from "lucide-react"

const iconMap = {
  BarChart3, UserPlus, Users, FileSpreadsheet, AlertTriangle, Zap, Map,
  Megaphone, Bed, Calendar, Stethoscope, Building2, Package, ShieldCheck,
  Wrench, Database, UserCog, RefreshCw, FileDown, FileText
}

const categoryColors = {
  'Điều hành': 'bg-primary text-primary-foreground',
  'Nhập liệu': 'bg-info text-white',
  'Giám sát': 'bg-success text-white',
  'Cảnh báo': 'bg-danger text-white',
  'Chiến dịch': 'bg-warning text-white',
  'Cơ sở y tế': 'bg-secondary text-white',
  'Lịch hẹn': 'bg-accent text-accent-foreground',
  'Khám bệnh': 'bg-muted text-muted-foreground',
  'Kho': 'bg-info text-white',
  'Chất lượng dữ liệu': 'bg-warning text-white',
  'Dữ liệu': 'bg-secondary text-white',
  'Quản lý': 'bg-primary text-primary-foreground',
  'Hệ thống': 'bg-muted text-muted-foreground',
  'Báo cáo': 'bg-accent text-accent-foreground'
}

export function EnhancedCommandPalette() {
  const { isOpen, setIsOpen, getActionsByCategory } = useEnhancedCommandPalette()
  const [search, setSearch] = useState("")

  const categorizedActions = useMemo(() => 
    getActionsByCategory(search), [search, getActionsByCategory]
  )

  const totalResults = useMemo(() => 
    Object.values(categorizedActions).flat().length, [categorizedActions]
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="p-0 max-w-[720px] max-h-[80vh]">
        <Command className="rounded-lg border shadow-md">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Tìm kiếm hành động... (Ctrl+K)"
              value={search}
              onValueChange={setSearch}
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            {search && (
              <Badge variant="outline" className="ml-2 text-xs">
                {totalResults} kết quả
              </Badge>
            )}
          </div>
          
          <CommandList className="max-h-[500px] overflow-y-auto">
            <CommandEmpty>
              <div className="py-6 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Không tìm thấy hành động nào.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Thử từ khóa khác hoặc sử dụng phím tắt Alt+[key]
                </p>
              </div>
            </CommandEmpty>
            
            {Object.entries(categorizedActions).map(([category, categoryActions]) => {
              if (categoryActions.length === 0) return null
              
              return (
                <CommandGroup key={category} heading={
                  <div className="flex items-center gap-2">
                    <span>{category}</span>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${categoryColors[category as keyof typeof categoryColors] || 'bg-muted'}`}
                    >
                      {categoryActions.length}
                    </Badge>
                  </div>
                }>
                  {categoryActions.map(action => {
                    const IconComponent = action.icon ? 
                      iconMap[action.icon as keyof typeof iconMap] || FileText : 
                      FileText
                    
                    return (
                      <CommandItem
                        key={action.id}
                        value={`${action.label} ${action.keywords?.join(' ') || ''}`}
                        onSelect={() => {
                          action.action()
                          setIsOpen(false)
                        }}
                        className="flex items-center justify-between p-3 cursor-pointer group hover:bg-accent/50"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-1.5 rounded-md bg-accent/20 group-hover:bg-accent/30 transition-colors">
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{action.label}</div>
                            {action.description && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {action.description}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {action.shortcut && (
                            <Badge 
                              variant="outline" 
                              className="text-xs font-mono bg-muted/50"
                            >
                              {action.shortcut}
                            </Badge>
                          )}
                          <Badge 
                            variant="secondary"
                            className={`text-xs ${categoryColors[category as keyof typeof categoryColors] || 'bg-muted'}`}
                          >
                            {category}
                          </Badge>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )
            })}
          </CommandList>
          
          {/* Footer with help */}
          <div className="border-t p-3 text-xs text-muted-foreground bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span>↑↓ điều hướng</span>
                <span>↵ chọn</span>
                <span>Esc đóng</span>
              </div>
              <div>
                Phím tắt: Alt + [key]
              </div>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
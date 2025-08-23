import { useState } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useCommandPalette } from "@/hooks/useCommandPalette"
import { Search, FileText, AlertTriangle, Bed, Users, Database } from "lucide-react"

const categoryIcons = {
  'Nhập liệu': FileText,
  'Chiến dịch': Users,
  'Cảnh báo': AlertTriangle,
  'Cơ sở y tế': Bed,
  'Chất lượng dữ liệu': Database
}

export function CommandPalette() {
  const { isOpen, setIsOpen, actions } = useCommandPalette()
  const [search, setSearch] = useState("")

  const filteredActions = actions.filter(action =>
    action.label.toLowerCase().includes(search.toLowerCase()) ||
    action.category.toLowerCase().includes(search.toLowerCase())
  )

  const categories = Array.from(new Set(filteredActions.map(action => action.category)))

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="p-0 max-w-[640px]">
        <Command className="rounded-lg border shadow-md">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <CommandInput
              placeholder="Tìm kiếm hành động... (Ctrl+K)"
              value={search}
              onValueChange={setSearch}
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className="max-h-[400px] overflow-y-auto">
            <CommandEmpty>Không tìm thấy hành động nào.</CommandEmpty>
            
            {categories.map(category => {
              const categoryActions = filteredActions.filter(action => action.category === category)
              const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || FileText
              
              return (
                <CommandGroup key={category} heading={category}>
                  {categoryActions.map(action => (
                    <CommandItem
                      key={action.id}
                      value={action.label}
                      onSelect={() => {
                        action.action()
                        setIsOpen(false)
                      }}
                      className="flex items-center justify-between p-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-4 w-4" />
                        <span>{action.label}</span>
                      </div>
                      {action.shortcut && (
                        <Badge variant="secondary" className="text-xs">
                          {action.shortcut}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
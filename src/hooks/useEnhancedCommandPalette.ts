import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface CommandAction {
  id: string
  label: string
  shortcut?: string
  action: () => void
  category: string
  keywords?: string[]
  icon?: string
  description?: string
}

export function useEnhancedCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()

  const actions: CommandAction[] = [
    // Module A: Dashboard
    {
      id: 'dashboard',
      label: 'Xem tổng quan',
      shortcut: 'Alt+D',
      action: () => navigate('/'),
      category: 'Điều hành',
      keywords: ['dashboard', 'overview', 'tổng quan'],
      icon: 'BarChart3',
      description: 'Xem dashboard tổng quan hệ thống'
    },

    // Module B: Case Management
    {
      id: 'new-case',
      label: 'Nhập ca bệnh mới',
      shortcut: 'Alt+C',
      action: () => navigate('/case-intake'),
      category: 'Nhập liệu',
      keywords: ['case', 'intake', 'ca bệnh', 'nhập'],
      icon: 'UserPlus',
      description: 'Nhập ca bệnh mới (30 giây)'
    },
    {
      id: 'case-list',
      label: 'Danh sách ca bệnh',
      action: () => navigate('/surveillance'),
      category: 'Giám sát',
      keywords: ['cases', 'surveillance', 'ca bệnh', 'giám sát'],
      icon: 'Users',
      description: 'Xem danh sách ca bệnh'
    },

    // Module C: Lab Management
    {
      id: 'import-labs',
      label: 'Import kết quả xét nghiệm',
      shortcut: 'Alt+L',
      action: () => navigate('/lab-import'),
      category: 'Nhập liệu',
      keywords: ['lab', 'import', 'xét nghiệm', 'kết quả'],
      icon: 'FileSpreadsheet',
      description: 'Import file CSV kết quả xét nghiệm'
    },

    // Module D: Alerts
    {
      id: 'alerts',
      label: 'Quản lý cảnh báo',
      shortcut: 'Alt+A',
      action: () => navigate('/alerts'),
      category: 'Cảnh báo',
      keywords: ['alerts', 'warnings', 'cảnh báo'],
      icon: 'AlertTriangle',
      description: 'Xem và xử lý cảnh báo'
    },
    {
      id: 'acknowledge-alert',
      label: 'Xử lý cảnh báo khẩn cấp',
      action: () => {
        navigate('/alerts')
        toast.info('Chuyển đến danh sách cảnh báo khẩn cấp')
      },
      category: 'Cảnh báo',
      keywords: ['acknowledge', 'urgent', 'khẩn cấp'],
      icon: 'Zap',
      description: 'Xử lý cảnh báo ưu tiên cao'
    },

    // Module E: Maps
    {
      id: 'maps',
      label: 'Bản đồ dịch tễ',
      shortcut: 'Alt+M',
      action: () => navigate('/maps'),
      category: 'Giám sát',
      keywords: ['map', 'spatial', 'bản đồ', 'không gian'],
      icon: 'Map',
      description: 'Xem bản đồ phân bố ca bệnh'
    },

    // Module F: Campaigns
    {
      id: 'new-campaign',
      label: 'Tạo chiến dịch mới',
      shortcut: 'Alt+P',
      action: () => navigate('/campaigns'),
      category: 'Chiến dịch',
      keywords: ['campaign', 'vaccination', 'chiến dịch', 'tiêm chủng'],
      icon: 'Megaphone',
      description: 'Lập kế hoạch chiến dịch y tế'
    },

    // Module G: Bed Management
    {
      id: 'bed-update',
      label: 'Cập nhật giường bệnh',
      shortcut: 'Alt+B',
      action: () => navigate('/beds'),
      category: 'Cơ sở y tế',
      keywords: ['beds', 'capacity', 'giường', 'công suất'],
      icon: 'Bed',
      description: 'Quản lý giường bệnh và công suất'
    },

    // Module H: Appointments
    {
      id: 'appointments',
      label: 'Quản lý lịch hẹn',
      action: () => navigate('/appointments'),
      category: 'Lịch hẹn',
      keywords: ['appointments', 'schedule', 'lịch hẹn'],
      icon: 'Calendar',
      description: 'Xem và quản lý lịch hẹn bệnh nhân'
    },

    // Module I: Encounters
    {
      id: 'encounters',
      label: 'Khám bệnh',
      action: () => navigate('/encounters'),
      category: 'Khám bệnh',
      keywords: ['encounter', 'examination', 'khám bệnh'],
      icon: 'Stethoscope',
      description: 'Quản lý ca khám bệnh'
    },

    // Module J: Facilities
    {
      id: 'facilities',
      label: 'Cơ sở y tế',
      action: () => navigate('/facilities'),
      category: 'Cơ sở y tế',
      keywords: ['facilities', 'hospitals', 'cơ sở', 'bệnh viện'],
      icon: 'Building2',
      description: 'Quản lý cơ sở y tế'
    },

    // Module K: Inventory
    {
      id: 'inventory',
      label: 'Quản lý kho',
      action: () => navigate('/inventory'),
      category: 'Kho',
      keywords: ['inventory', 'stock', 'kho', 'vaccine'],
      icon: 'Package',
      description: 'Quản lý kho vaccine và vật tư'
    },

    // Module L: Data Quality
    {
      id: 'data-quality',
      label: 'Chất lượng dữ liệu',
      shortcut: 'Alt+Q',
      action: () => navigate('/data-quality'),
      category: 'Chất lượng dữ liệu',
      keywords: ['quality', 'dq', 'chất lượng', 'dữ liệu'],
      icon: 'ShieldCheck',
      description: 'Kiểm tra và sửa lỗi dữ liệu'
    },
    {
      id: 'fix-dq',
      label: 'Sửa lỗi chất lượng dữ liệu',
      action: () => {
        navigate('/data-quality')
        toast.info('Chuyển đến công cụ sửa lỗi dữ liệu')
      },
      category: 'Chất lượng dữ liệu',
      keywords: ['fix', 'repair', 'sửa lỗi'],
      icon: 'Wrench',
      description: 'Sửa lỗi dữ liệu trực tiếp'
    },

    // Module M: ETL
    {
      id: 'etl',
      label: 'Xử lý dữ liệu ETL',
      action: () => navigate('/etl'),
      category: 'Dữ liệu',
      keywords: ['etl', 'integration', 'tích hợp'],
      icon: 'Database',
      description: 'Quản lý luồng dữ liệu ETL'
    },

    // Module N: User Management
    {
      id: 'users',
      label: 'Quản lý người dùng',
      action: () => navigate('/users'),
      category: 'Quản lý',
      keywords: ['users', 'roles', 'người dùng', 'quyền'],
      icon: 'UserCog',
      description: 'Quản lý người dùng và phân quyền'
    },

    // System Actions
    {
      id: 'sync-offline',
      label: 'Đồng bộ dữ liệu offline',
      action: () => {
        // Trigger sync
        toast.success('Bắt đầu đồng bộ dữ liệu...')
      },
      category: 'Hệ thống',
      keywords: ['sync', 'offline', 'đồng bộ'],
      icon: 'RefreshCw',
      description: 'Đồng bộ dữ liệu đã lưu offline'
    },
    {
      id: 'export-report',
      label: 'Xuất báo cáo',
      action: () => {
        toast.info('Tính năng xuất báo cáo đang phát triển')
      },
      category: 'Báo cáo',
      keywords: ['export', 'report', 'xuất', 'báo cáo'],
      icon: 'FileDown',
      description: 'Xuất báo cáo dữ liệu'
    }
  ]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      
      // Close command palette
      if (e.key === 'Escape') {
        setIsOpen(false)
      }

      // Handle action shortcuts
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        const action = actions.find(a => 
          a.shortcut && a.shortcut.includes(e.key.toUpperCase())
        )
        if (action) {
          e.preventDefault()
          action.action()
          toast.success(`Thực hiện: ${action.label}`)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [actions])

  const searchActions = (query: string) => {
    if (!query.trim()) return actions

    const normalizedQuery = query.toLowerCase().trim()
    
    return actions.filter(action => {
      const searchTargets = [
        action.label,
        action.description || '',
        action.category,
        ...(action.keywords || [])
      ]
      
      return searchTargets.some(target =>
        target.toLowerCase().includes(normalizedQuery)
      )
    }).sort((a, b) => {
      // Sort by relevance: exact matches first, then category matches
      const aExactMatch = a.label.toLowerCase().includes(normalizedQuery)
      const bExactMatch = b.label.toLowerCase().includes(normalizedQuery)
      
      if (aExactMatch && !bExactMatch) return -1
      if (!aExactMatch && bExactMatch) return 1
      
      return a.label.localeCompare(b.label)
    })
  }

  const getActionsByCategory = (query?: string) => {
    const filteredActions = query ? searchActions(query) : actions
    const categorized = filteredActions.reduce((acc, action) => {
      if (!acc[action.category]) {
        acc[action.category] = []
      }
      acc[action.category].push(action)
      return acc
    }, {} as Record<string, CommandAction[]>)

    return categorized
  }

  return {
    isOpen,
    setIsOpen,
    actions,
    searchActions,
    getActionsByCategory
  }
}
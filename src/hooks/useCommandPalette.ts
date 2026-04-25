import { useState, useEffect } from 'react'

interface CommandAction {
  id: string
  label: string
  shortcut?: string
  action: () => void
  category: string
}

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  const actions: CommandAction[] = [
    {
      id: 'new-case',
      label: 'Nhập ca bệnh mới',
      shortcut: 'Alt+C',
      action: () => {
        // Navigate to case intake
        window.location.href = '/case-intake'
      },
      category: 'Nhập liệu'
    },
    {
      id: 'import-labs',
      label: 'Import kết quả xét nghiệm',
      shortcut: 'Alt+L',
      action: () => {
        window.location.href = '/lab-import'
      },
      category: 'Nhập liệu'
    },
    {
      id: 'new-campaign',
      label: 'Tạo chiến dịch mới',
      action: () => {
        window.location.href = '/campaigns'
      },
      category: 'Chiến dịch'
    },
    {
      id: 'acknowledge-alert',
      label: 'Xử lý cảnh báo',
      action: () => {
        window.location.href = '/alerts'
      },
      category: 'Cảnh báo'
    },
    {
      id: 'bed-update',
      label: 'Cập nhật giường bệnh',
      action: () => {
        window.location.href = '/beds'
      },
      category: 'Cơ sở y tế'
    },
    {
      id: 'fix-dq',
      label: 'Sửa lỗi chất lượng dữ liệu',
      action: () => {
        window.location.href = '/data-quality'
      },
      category: 'Chất lượng dữ liệu'
    }
  ]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      
      if (e.key === 'Escape') {
        setIsOpen(false)
      }

      // Handle action shortcuts
      if (e.altKey) {
        const action = actions.find(a => 
          a.shortcut && a.shortcut.includes(e.key.toUpperCase())
        )
        if (action) {
          e.preventDefault()
          action.action()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [actions])

  return {
    isOpen,
    setIsOpen,
    actions
  }
}
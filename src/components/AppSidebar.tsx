import { useState } from "react"
import { 
  Activity, 
  BarChart3, 
  Building2, 
  Calendar, 
  Database, 
  Heart, 
  Shield, 
  Stethoscope, 
  Users, 
  Warehouse,
  AlertTriangle,
  Map,
  Microscope,
  TrendingUp,
  Bell,
  MapPin,
  UserCheck,
  ClipboardList,
  CalendarCheck,
  Target,
  Hospital,
  Package,
  FileCheck,
  Lock
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

const menuItems = [
  {
    title: "Điều hành",
    items: [
      { title: "Tổng quan", url: "/", icon: TrendingUp, color: "text-blue-600" },
      { title: "Giám sát bệnh", url: "/surveillance", icon: Microscope, color: "text-red-600" },
      { title: "Cảnh báo", url: "/alerts", icon: Bell, color: "text-orange-600" },
      { title: "Bản đồ", url: "/maps", icon: MapPin, color: "text-green-600" },
    ]
  },
  {
    title: "Quản lý",
    items: [
      { title: "Bệnh nhân", url: "/patients", icon: UserCheck, color: "text-purple-600" },
      { title: "Khám bệnh", url: "/encounters", icon: ClipboardList, color: "text-cyan-600" },
      { title: "Lịch hẹn", url: "/appointments", icon: CalendarCheck, color: "text-emerald-600" },
      { title: "Chiến dịch", url: "/campaigns", icon: Target, color: "text-pink-600" },
    ]
  },
  {
    title: "Cơ sở vật chất",
    items: [
      { title: "Cơ sở y tế", url: "/facilities", icon: Hospital, color: "text-slate-600" },
      { title: "Kho tồn", url: "/stocks", icon: Package, color: "text-amber-600" },
    ]
  },
  {
    title: "Dữ liệu",
    items: [
      { title: "Chất lượng dữ liệu", url: "/data-quality", icon: FileCheck, color: "text-indigo-600" },
      { title: "Bảo mật", url: "/security", icon: Lock, color: "text-gray-700" },
    ]
  }
]

export function AppSidebar() {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const location = useLocation()
  const currentPath = location.pathname

  const isActive = (path: string) => currentPath === path
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary text-primary-foreground font-semibold shadow-sm border border-primary/20" 
      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"

  return (
    <Sidebar
      className={collapsed ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <SidebarContent>
        <div className="p-4">
          <h2 className={`font-bold text-lg text-primary ${collapsed ? 'hidden' : 'block'}`}>
            HCMC Health Hub
          </h2>
          {collapsed && (
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">H</span>
            </div>
          )}
        </div>

        {menuItems.map((group) => (
          <SidebarGroup key={group.title}>
            {!collapsed && <SidebarGroupLabel>{group.title}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className={getNavCls}>
                        <item.icon className={`h-5 w-5 flex-shrink-0 ${item.color}`} />
                        {!collapsed && <span className="font-medium text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
import {
  LayoutDashboard, Monitor, DoorOpen, Timer, Users,
  Receipt, Wallet, BarChart3, Tag, ScrollText, Settings,
} from 'lucide-react';

const ALL: Role[] = ['owner', 'manager', 'cashier'];

export const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL },
  { href: '/stations', label: 'Stations', icon: Monitor, roles: ALL },
  { href: '/rooms', label: 'Rooms', icon: DoorOpen, roles: ['owner', 'manager'] as Role[] },
  { href: '/sessions', label: 'Sessions', icon: Timer, roles: ALL },
  { href: '/customers', label: 'Customers', icon: Users, roles: ALL },
  { href: '/billing', label: 'Billing', icon: Receipt, roles: ALL },
  { href: '/shifts', label: 'Shifts', icon: Wallet, roles: ALL },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['owner', 'manager'] as Role[] },
  { href: '/pricing', label: 'Pricing', icon: Tag, roles: ['owner'] as Role[] },
  { href: '/activity-log', label: 'Activity Log', icon: ScrollText, roles: ['owner'] as Role[] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['owner'] as Role[] },
];
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Globe2, Wallet, HeartPulse, Users, FolderKanban, Building2, AlertTriangle, Gavel, Timer,
  MessagesSquare, BookOpen, FlaskConical, Handshake, TrendingUp, Radar, Hammer, Rocket, Megaphone, LogOut,
  type LucideIcon,
} from 'lucide-react';
import { clearToken } from '../lib/api';

const NAV: { title: string; items: { href: string; icon: LucideIcon; label: string }[] }[] = [
  {
    title: 'Command',
    items: [
      { href: '/', icon: LayoutDashboard, label: 'Overview' },
      { href: '/world', icon: Globe2, label: 'Company World' },
      { href: '/decisions', icon: Gavel, label: 'Decisions' },
      { href: '/alerts', icon: AlertTriangle, label: 'Alerts' },
      { href: '/simulation', icon: Timer, label: 'Simulation' },
    ],
  },
  {
    title: 'Revenue',
    items: [
      { href: '/sales', icon: TrendingUp, label: 'Sales & BD' },
      { href: '/acquisition', icon: Radar, label: 'Acquisition' },
      { href: '/delivery', icon: Hammer, label: 'Delivery' },
      { href: '/customer-operations', icon: Handshake, label: 'Customer Ops' },
      { href: '/marketing', icon: Megaphone, label: 'Marketing' },
    ],
  },
  {
    title: 'Money',
    items: [
      { href: '/financials', icon: Wallet, label: 'Financials' },
      { href: '/survival', icon: HeartPulse, label: 'Survival' },
    ],
  },
  {
    title: 'Company',
    items: [
      { href: '/employees', icon: Users, label: 'Employees' },
      { href: '/departments', icon: Building2, label: 'Departments' },
      { href: '/projects', icon: FolderKanban, label: 'Projects' },
      { href: '/ventures', icon: Rocket, label: 'Ventures' },
      { href: '/communication', icon: MessagesSquare, label: 'Communication' },
      { href: '/knowledge', icon: BookOpen, label: 'Knowledge Base' },
      { href: '/research', icon: FlaskConical, label: 'AI Lab' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true">A</div>
        <div>
          <h1>AEVORA</h1>
          <p>Chairman Control Center</p>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="Main">
        {NAV.map((group) => (
          <div key={group.title} className="nav-group">
            <div className="nav-group-title">{group.title}</div>
            {group.items.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} className={isActive(href) ? 'active' : ''} aria-current={isActive(href) ? 'page' : undefined}>
                <Icon className="nav-icon" size={17} strokeWidth={1.9} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <button
        type="button"
        className="sidebar-signout"
        onClick={() => { clearToken(); window.dispatchEvent(new Event('aevora:unauthorized')); }}
      >
        <LogOut size={16} aria-hidden="true" /> Sign out
      </button>
    </aside>
  );
}

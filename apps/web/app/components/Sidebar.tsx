'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/',            icon: '◉', label: 'Overview' },
  { href: '/financials',  icon: '💰', label: 'Financials' },
  { href: '/employees',   icon: '👥', label: 'Employees' },
  { href: '/projects',    icon: '📁', label: 'Projects' },
  { href: '/departments', icon: '🏢', label: 'Departments' },
  { href: '/alerts',      icon: '⚠️', label: 'Alerts' },
  { href: '/decisions',   icon: '🔴', label: 'Decisions' },
  { href: '/simulation',  icon: '⏱️', label: 'Simulation' },
  { href: '/world',       icon: '🌍', label: 'Company World' },
  { href: '/communication',icon: '💬', label: 'Communication' },
  { href: '/knowledge',   icon: '🧠', label: 'Knowledge Base' },
  { href: '/research',    icon: '🔬', label: 'AI Lab' },
  { href: '/customer-operations', icon: '🤝', label: 'Customer Ops' },
  { href: '/sales', icon: '📈', label: 'Sales & BD' },
  { href: '/marketing', icon: '📣', label: 'Marketing' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>AEVORA</h1>
        <p>Chairman Control Center</p>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? 'active' : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/api';
import {
  LayoutDashboard, FileText, ShoppingCart, Building2,
  BarChart3, LogOut, Settings, ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/',           label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/quotations', label: 'Quotations',       icon: FileText },
  { to: '/pos',        label: 'Purchase Orders',  icon: ShoppingCart },
  { to: '/suppliers',  label: 'Suppliers',        icon: Building2 },
  { to: '/reports',    label: 'Reports',          icon: BarChart3 },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center mr-3">
          <ShoppingCart size={16} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm leading-tight">PO System</p>
          <p className="text-xs text-gray-400">Microchip Thailand</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-2">Menu</p>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn('sidebar-link', isActive && 'active')}
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
            {user?.name?.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 p-1">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

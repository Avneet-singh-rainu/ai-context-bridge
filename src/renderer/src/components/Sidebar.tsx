import type { NavItem, ViewId } from './navigation';

interface SidebarProps {
  items: readonly NavItem[];
  activeView: ViewId;
  onSelect: (view: ViewId) => void;
}

export function Sidebar({ items, activeView, onSelect }: SidebarProps) {
  return (
    <nav className="sidebar" aria-label="Main">
      <p className="sidebar-title">AI Context Bridge</p>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="nav-button"
              aria-current={item.id === activeView ? 'page' : undefined}
              onClick={() => onSelect(item.id)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

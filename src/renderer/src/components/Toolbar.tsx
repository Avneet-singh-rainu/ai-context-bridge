import type { ReactNode } from 'react';
import { ViewSwitcher } from './ViewSwitcher';

/**
 * The unified toolbar at the top of every view: it doubles as the window's title bar (drag
 * region), with the view title, a one-line summary, and the view's actions on the right.
 */
export function Toolbar({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="toolbar">
      <ViewSwitcher />
      <div className="toolbar-heading">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="toolbar-actions">{children}</div>
    </header>
  );
}

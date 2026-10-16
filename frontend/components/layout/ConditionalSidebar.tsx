'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

/** Hides the global sidebar on the simulator page, which has its own device palette. */
export function ConditionalSidebar() {
  const pathname = usePathname();

  // Simulator manages its own left-panel (device palette)
  if (pathname === '/simulator') return null;

  return <Sidebar />;
}

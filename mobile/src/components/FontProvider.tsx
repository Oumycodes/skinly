import type { ReactNode } from 'react';

/** SF Pro / system fonts need no loading */
export function FontProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

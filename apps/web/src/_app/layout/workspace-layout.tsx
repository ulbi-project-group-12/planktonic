import { WorkspaceSlug } from '@app/contracts';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

interface WorkspaceLayoutProps {
  params: Promise<{ workspaceSlug: string }>;
  children: ReactNode;
}

export async function WorkspaceLayout({ params, children }: WorkspaceLayoutProps) {
  const { workspaceSlug } = await params;

  // Wrong format or reserved slug: 404 without a lookup. Membership check comes in UL-144.
  if (!WorkspaceSlug.safeParse(workspaceSlug).success) {
    notFound();
  }

  return children;
}

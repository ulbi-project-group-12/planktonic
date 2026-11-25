import { WorkspaceSlug } from '@app/contracts';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { WorkspaceAccess } from './workspace-access';

interface WorkspaceLayoutProps {
  params: Promise<{ workspaceSlug: string }>;
  children: ReactNode;
}

export async function WorkspaceLayout({ params, children }: WorkspaceLayoutProps) {
  const { workspaceSlug } = await params;

  if (!WorkspaceSlug.safeParse(workspaceSlug).success) {
    notFound();
  }

  return <WorkspaceAccess slug={workspaceSlug}>{children}</WorkspaceAccess>;
}

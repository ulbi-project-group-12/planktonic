import { ProjectKey } from '@app/contracts';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

interface ProjectLayoutProps {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
  children: ReactNode;
}

export async function ProjectLayout({ params, children }: ProjectLayoutProps) {
  const { projectKey } = await params;

  // Wrong format: 404 without a lookup. Access check comes with the project API.
  if (!ProjectKey.safeParse(projectKey).success) {
    notFound();
  }

  return children;
}

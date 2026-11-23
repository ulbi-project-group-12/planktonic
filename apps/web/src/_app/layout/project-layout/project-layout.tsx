import type { ReactNode } from 'react';

interface ProjectLayoutProps {
  params: Promise<{ workspaceSlug: string; projectKey: string }>;
  children: ReactNode;
}

export async function ProjectLayout({ children }: ProjectLayoutProps) {
  return children;
}

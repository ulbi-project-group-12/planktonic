import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api';

/**
 * Request and response mirror the MSW mock until UL-143 ships the real workspace contract;
 * then these types go away in favour of the generated client.
 */
export interface CreateWorkspaceRequest {
  name: string;
  slug: string;
}

export interface CreatedWorkspace {
  id: string;
  name: string;
  slug: string;
}

export function createWorkspace(input: CreateWorkspaceRequest): Promise<CreatedWorkspace> {
  return apiFetch<CreatedWorkspace>('/api/workspaces', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function useCreateWorkspace() {
  return useMutation({ mutationFn: createWorkspace });
}

import { useWorkspaceList } from '@/shared/api';

export function useWorkspaces(q?: string) {
  const search = q?.trim().toLowerCase();

  return useWorkspaceList({
    query: {
      select: search
        ? (workspaces) =>
            workspaces.filter(
              ({ name, slug }) =>
                name.toLowerCase().includes(search) || slug.toLowerCase().includes(search),
            )
        : undefined,
    },
  });
}

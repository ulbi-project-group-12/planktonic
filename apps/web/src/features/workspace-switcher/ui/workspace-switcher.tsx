'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, ChevronDown, HelpCircle, Plus, Search } from 'lucide-react';
import { WorkspaceSlug } from '@app/contracts';
import { useWorkspaces, type WorkspaceSummary } from '@/entities/workspace';
import { routes } from '@/shared/config';
import {
  Avatar,
  Button,
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownSeparator,
  DropdownTrigger,
  Input,
  Skeleton,
} from '@/shared/ui';

function isCurrentWorkspaceSlug(value: unknown): value is string {
  return typeof value === 'string' && WorkspaceSlug.safeParse(value).success;
}

function CurrentWorkspaceTrigger({
  workspace,
  disabled,
}: {
  workspace?: WorkspaceSummary;
  disabled: boolean;
}) {
  return (
    <Button
      variant="secondary"
      size="m"
      disabled={disabled}
      className="w-full justify-between gap-2 px-2"
    >
      {workspace ? (
        <>
          <span className="flex items-center gap-2 overflow-hidden">
            <Avatar name={workspace.name} size="m" />
            <span className="truncate">{workspace.name}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-fg-muted" />
        </>
      ) : (
        <>
          <span className="flex items-center gap-2 overflow-hidden">
            <HelpCircle className="size-4 shrink-0 text-fg-muted" />
            <span className="truncate text-fg-muted">Выберите пространство</span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-fg-muted" />
        </>
      )}
    </Button>
  );
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const params = useParams();
  const currentSlug = isCurrentWorkspaceSlug(params.workspaceSlug)
    ? params.workspaceSlug
    : undefined;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => {
      clearTimeout(id);
    };
  }, [query]);

  const { data, isPending, error, refetch } = useWorkspaces(debouncedQuery);
  const list = data ?? [];

  const currentWorkspace = currentSlug
    ? list.find((workspace) => workspace.slug === currentSlug)
    : undefined;

  const hasWorkspaces = list.length > 0;
  const triggerDisabled = !isPending && !hasWorkspaces && !debouncedQuery && !error;

  return (
    <Dropdown
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery('');
        }
      }}
    >
      <DropdownTrigger>
        <span>
          <CurrentWorkspaceTrigger workspace={currentWorkspace} disabled={triggerDisabled} />
        </span>
      </DropdownTrigger>
      <DropdownContent className="w-72" align="start">
        <div className="p-2">
          <Input
            placeholder="Поиск пространств"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            icon={<Search className="size-3.5" />}
            aria-label="Поиск пространств"
          />
        </div>

        {isPending ? (
          <div className="flex flex-col gap-2 p-2">
            <Skeleton className="h-7" />
            <Skeleton className="h-7" />
            <Skeleton className="h-7" />
          </div>
        ) : error ? (
          <div className="flex flex-col gap-2 p-2">
            <p className="text-caption text-danger">Не удалось загрузить пространства</p>
            <Button
              type="button"
              size="s"
              onClick={() => {
                void refetch();
              }}
            >
              Повторить
            </Button>
          </div>
        ) : list.length === 0 ? (
          <p className="p-2 text-caption text-fg-muted">Ничего не найдено</p>
        ) : (
          <div className="max-h-64 overflow-auto p-1">
            {list.map((workspace) => {
              const active = workspace.slug === currentSlug;
              return (
                <DropdownItem
                  key={workspace.slug}
                  onClick={() => {
                    router.push(routes.workspace(workspace.slug));
                  }}
                  className="justify-between"
                >
                  <span className="flex items-center gap-2 overflow-hidden">
                    <Avatar name={workspace.name} size="s" />
                    <span className="truncate">{workspace.name}</span>
                  </span>
                  {active ? <Check className="size-4 shrink-0 text-brand-primary" /> : null}
                </DropdownItem>
              );
            })}
          </div>
        )}

        <DropdownSeparator />
        <div className="p-1">
          <DropdownItem
            onClick={() => {
              router.push(routes.workspaceCreate());
            }}
          >
            <Plus className="size-4" />
            Создать пространство
          </DropdownItem>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}

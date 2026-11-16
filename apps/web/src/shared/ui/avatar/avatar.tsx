import Image from 'next/image';
import { cn } from '@/shared/lib';

const avatarSizes = ['sm', 'md', 'lg', 'xl'] as const;
type AvatarSize = (typeof avatarSizes)[number];

const avatarColors = ['brand', 'success', 'warning', 'danger', 'info'] as const;
type AvatarColor = (typeof avatarColors)[number];

/** Размеры по макету: 24 инициалы 10 · 32 списки/сообщения · 40 шапка/presence · 48 профиль. */
const sizeClasses: Record<AvatarSize, string> = {
  sm: 'size-6 text-micro-s',
  md: 'size-8 text-caption',
  lg: 'size-10 text-body-s',
  xl: 'size-12 text-body',
};

/** Размеры в px — для next/image. */
const sizePixels: Record<AvatarSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 48,
};

const colorClasses: Record<AvatarColor, string> = {
  brand: 'bg-brand-primary text-on-brand',
  success: 'bg-success text-on-brand',
  warning: 'bg-warning text-on-brand',
  danger: 'bg-danger text-on-brand',
  info: 'bg-info text-on-brand',
};

const presenceClasses: Record<Presence, string> = {
  online: 'bg-success',
  away: 'bg-warning',
  dnd: 'bg-danger',
  offline: 'bg-fg-muted',
};

const presenceLabels: Record<Presence, string> = {
  online: 'В сети',
  away: 'Отошёл',
  dnd: 'Не беспокоить',
  offline: 'Не в сети',
};

/** Детерминированный цвет аватара по имени. */
function colorByName(name: string): AvatarColor {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 997;
  const index = hash % avatarColors.length;
  return avatarColors[index] ?? 'brand';
}

/** До двух инициалов: первая буква первых двух слов; без имени — «?». */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

const presenceList = ['online', 'away', 'dnd', 'offline'] as const;
type Presence = (typeof presenceList)[number];

interface AvatarProps {
  /** Имя: генерирует инициалы и цвет. */
  name: string;
  src?: string;
  size?: AvatarSize;
  /** Индикатор присутствия: dot 12 · кольцо surface 2 px. */
  presence?: Presence;
  className?: string;
}

/** Аватар по макету «Атомы — аватары»: круг, инициалы 10–16, цвет по имени. */
function Avatar({ name, src, size = 'md', presence, className }: AvatarProps) {
  return (
    <span
      data-slot="avatar"
      data-size={size}
      className={cn('relative inline-block shrink-0', className)}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={sizePixels[size]}
          height={sizePixels[size]}
          unoptimized
          className={cn('rounded-full object-cover', sizeClasses[size])}
        />
      ) : (
        <span
          className={cn(
            'flex items-center justify-center rounded-full font-bold select-none',
            sizeClasses[size],
            colorClasses[colorByName(name)],
          )}
        >
          {initialsOf(name)}
        </span>
      )}
      {presence ? (
        <span
          data-slot="avatar-presence"
          title={presenceLabels[presence]}
          className={cn(
            'absolute right-0 bottom-0 size-3 rounded-full ring-2 ring-surface',
            presenceClasses[presence],
          )}
        />
      ) : null}
    </span>
  );
}

interface AvatarUser {
  name: string;
  src?: string;
  presence?: Presence;
}

interface AvatarGroupProps {
  users: AvatarUser[];
  /** Сколько аватаров показать; остальное — «+N». */
  max?: number;
  size?: AvatarSize;
  className?: string;
}

/** Группа по макету: overlap 10 · «+N» при переполнении. */
function AvatarGroup({ users, max = 3, size = 'md', className }: AvatarGroupProps) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;

  return (
    <div data-slot="avatar-group" className={cn('flex items-center', className)}>
      <div className="flex -space-x-2.5">
        {shown.map((user) => (
          <Avatar
            key={user.name}
            name={user.name}
            src={user.src}
            size={size}
            presence={user.presence}
          />
        ))}
      </div>
      {rest > 0 ? (
        <span
          data-slot="avatar-group-rest"
          className={cn(
            '-ml-2.5 flex items-center justify-center rounded-full bg-sunken font-bold text-fg-secondary',
            sizeClasses[size],
          )}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  );
}

export {
  Avatar,
  avatarColors,
  avatarSizes,
  AvatarGroup,
  presenceList,
  type AvatarColor,
  type AvatarGroupProps,
  type AvatarProps,
  type AvatarSize,
  type AvatarUser,
  type Presence,
};

import Image from 'next/image';
import { User } from 'lucide-react';
import { cn } from '@/shared/lib';

const avatarSizes = ['s', 'm', 'l', 'xl'] as const;
type AvatarSize = (typeof avatarSizes)[number];

const avatarColors = ['brand', 'success', 'warning', 'danger', 'info'] as const;
type AvatarColor = (typeof avatarColors)[number];

/** Mockup sizes: 24 initials 10 · 32 lists/messages · 40 header/presence · 48 profile. */
const sizeClasses: Record<AvatarSize, string> = {
  s: 'size-6 text-micro-s',
  m: 'size-8 text-caption',
  l: 'size-10 text-body-s',
  xl: 'size-12 text-body',
};

const iconSizes: Record<AvatarSize, string> = {
  s: 'size-3',
  m: 'size-4',
  l: 'size-5',
  xl: 'size-6',
};

/** Sizes in px — for next/image. */
const sizePixels: Record<AvatarSize, number> = {
  s: 24,
  m: 32,
  l: 40,
  xl: 48,
};

/** Initials on solid status fills (the constant --*-fill scale): white text is AA in
 *  both themes (5.35-7.44:1), unlike the theme-bound foreground hues of .dark. */
const colorClasses: Record<AvatarColor, string> = {
  brand: 'bg-brand-primary text-on-brand',
  success: 'bg-success-fill text-on-brand',
  warning: 'bg-warning-fill text-on-brand',
  danger: 'bg-danger-fill text-on-brand',
  info: 'bg-info-fill text-on-brand',
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

/** Deterministic avatar color from the name. */
function colorByName(name: string): AvatarColor {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 997;
  const index = hash % avatarColors.length;
  return avatarColors[index] ?? 'brand';
}

/** Up to two initials: first letter of the first two words; no name — "?". */
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
  /** Name: generates initials and color. */
  name: string;
  src?: string;
  size?: AvatarSize;
  /** Presence indicator: dot 12 · surface ring 2 px. */
  presence?: Presence;
  className?: string;
}

/** Avatar per the "Atoms — avatars" mockup: circle, initials 10–16, color by name. */
function Avatar({ name, src, size = 'm', presence, className }: AvatarProps) {
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
      ) : name.trim() === '' ? (
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-sunken text-fg-muted select-none',
            sizeClasses[size],
          )}
        >
          <User className={iconSizes[size]} />
        </span>
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
  /** How many avatars to show; the rest collapses into "+N". */
  max?: number;
  size?: AvatarSize;
  className?: string;
}

/** Group per the mockup: overlap 10 · "+N" on overflow. */
function AvatarGroup({ users, max = 3, size = 'm', className }: AvatarGroupProps) {
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

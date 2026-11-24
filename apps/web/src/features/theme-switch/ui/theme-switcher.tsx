'use client';

import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { Button, Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/shared/ui';
import { type Theme, useTheme } from '../model/use-theme';

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Светлая', icon: Sun },
  { value: 'dark', label: 'Тёмная', icon: Moon },
  { value: 'system', label: 'Как в системе', icon: Monitor },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const CurrentIcon = themeOptions.find((option) => option.value === theme)?.icon ?? Monitor;

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="secondary" size="icon" aria-label="Тема оформления">
          <CurrentIcon className="size-5" />
        </Button>
      </DropdownTrigger>
      <DropdownContent align="end" className="w-44">
        {themeOptions.map((option) => (
          <DropdownItem
            key={option.value}
            // The check icon is visual only; this tells assistive tech which theme is active.
            aria-current={theme === option.value ? 'true' : undefined}
            onClick={() => {
              setTheme(option.value);
            }}
            className="justify-between"
          >
            <span className="flex items-center gap-2">
              <option.icon className="size-4" />
              {option.label}
            </span>
            {theme === option.value ? <Check className="size-4 text-brand-primary" /> : null}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}

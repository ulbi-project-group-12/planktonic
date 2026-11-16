'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/shared/lib';
import { Checkbox } from '@/shared/ui/checkbox';
import { Chip } from '@/shared/ui/chip';
import { Input } from '@/shared/ui/input';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  /** Выбранные значения; в одиночном режиме — массив из одного элемента. */
  value: string[];
  onValueChange: (value: string[]) => void;
  /** Множественный выбор: чипсы в поле, чекбоксы в списке, дропдаун не закрывается при выборе. */
  multiple?: boolean;
  /** Множественный выбор: переносить чипсы на несколько строк (поле растёт по высоте).
   *  По умолчанию выключено — чипсы в одну строку, при нехватке места многоточие. */
  chipsWrap?: boolean;
  placeholder?: string;
  /** Поиск при длинных списках + футер «Показано N из M». */
  searchable?: boolean;
  disabled?: boolean;
  /** Контейнер для портала дропдауна (например, тёмная тема сторис); по умолчанию — body. */
  portalContainer?: HTMLElement | null;
  className?: string;
}

const triggerClass = cn(
  'flex w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm outline-none',
  'cursor-pointer transition-shadow focus-visible:border-brand-primary focus-visible:ring-3 focus-visible:ring-brand-subtle',
  'data-[state=open]:border-brand-primary data-[state=open]:ring-3 data-[state=open]:ring-brand-subtle',
  'disabled:cursor-not-allowed disabled:bg-sunken',
);

/** Селект по макету «Атомы — селекты»: дропдаун под полем, опции 36 px, поиск и скролл при длинных списках. */
function Select({
  options,
  value,
  onValueChange,
  multiple = false,
  chipsWrap = false,
  placeholder = 'Выберите…',
  searchable = false,
  disabled = false,
  portalContainer,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const chipsRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  /** Чипсы не влезают в одну строку — показываем многоточие (режим без переноса). */
  const [chipsOverflow, setChipsOverflow] = useState(false);

  useEffect(() => {
    const element = chipsRef.current;
    if (!element || chipsWrap) {
      setChipsOverflow(false);
      return;
    }
    const update = () => {
      setChipsOverflow(element.scrollWidth > element.clientWidth);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return; // jsdom
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [value, chipsWrap]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized === '') return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  const labelOf = (optionValue: string) =>
    options.find((option) => option.value === optionValue)?.label ?? optionValue;

  const toggle = (optionValue: string) => {
    if (multiple) {
      onValueChange(
        value.includes(optionValue)
          ? value.filter((item) => item !== optionValue)
          : [...value, optionValue],
      );
      return; // в множественном режиме дропдаун не закрывается
    }
    onValueChange([optionValue]);
    setOpen(false);
  };

  const removeOption = (optionValue: string) => {
    onValueChange(value.filter((item) => item !== optionValue));
  };

  const stopPropagation = (event: MouseEvent) => {
    event.stopPropagation();
  };

  /** Клавиатура на div-триггере множественного режима: Enter/Space переключают открытие. */
  const onTriggerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    // не перехватываем нажатия на вложенные элементы (кнопка удаления чипса)
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Space') return;
    event.preventDefault(); // Space иначе прокрутил бы страницу
    setOpen((previous) => !previous);
  };

  /** Фокус на опцию одиночного списка по индексу (индексы выходят за край — гасим). */
  const focusOption = (index: number) => {
    const items = listboxRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
    if (!items || items.length === 0) return;
    items[Math.max(0, Math.min(index, items.length - 1))]?.focus();
  };

  /** Клавиатура одиночного списка: стрелки/Home/End двигают фокус, Enter/Space выбирают. */
  const onListboxKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (multiple) return;
    const target = event.target as HTMLElement;
    if (target.getAttribute('role') !== 'option') return;
    const items = Array.from(
      listboxRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [],
    );
    const index = items.indexOf(target);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(event.key === 'ArrowDown' ? index + 1 : index - 1);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusOption(event.key === 'Home' ? 0 : items.length - 1);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Space') {
      event.preventDefault(); // Space иначе прокрутил бы страницу
      const optionValue = target.dataset.value;
      if (optionValue !== undefined) toggle(optionValue);
    }
  };

  /** При открытии фокус на выбранную опцию (иначе первую); в searchable — на поиск. */
  const onContentOpenAutoFocus = (event: Event) => {
    if (searchable || multiple) return; // дефолтный фокус Radix: поле поиска / триггер
    event.preventDefault();
    const selectedIndex = options.findIndex((option) => option.value === value[0]);
    focusOption(selectedIndex === -1 ? 0 : selectedIndex);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        {multiple ? (
          <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-disabled={disabled || undefined}
            onKeyDown={onTriggerKeyDown}
            data-slot="select"
            className={cn(
              triggerClass,
              chipsWrap ? 'min-h-10 py-1.5' : 'h-10 overflow-hidden',
              disabled && 'pointer-events-none opacity-60',
              className,
            )}
          >
            {value.length === 0 ? (
              <span className="flex-1 text-fg-muted">{placeholder}</span>
            ) : (
              <div
                ref={chipsRef}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-1.5',
                  chipsWrap ? 'flex-wrap' : 'overflow-hidden',
                )}
              >
                {value.map((optionValue) => (
                  <span key={optionValue} className="shrink-0" onClick={stopPropagation}>
                    <Chip
                      palette="brand"
                      onRemove={() => {
                        removeOption(optionValue);
                      }}
                    >
                      {labelOf(optionValue)}
                    </Chip>
                  </span>
                ))}
              </div>
            )}
            {chipsOverflow ? <span className="shrink-0 text-sm text-fg-muted">…</span> : null}
            <ChevronDown className="ml-auto size-4 shrink-0 text-fg-muted transition-transform [[data-state=open]_&]:rotate-180" />
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            data-slot="select"
            className={cn(triggerClass, 'h-10', className)}
          >
            <span
              className={cn('flex-1 truncate text-left', value[0] === undefined && 'text-fg-muted')}
            >
              {value[0] !== undefined ? labelOf(value[0]) : placeholder}
            </span>
            <ChevronDown className="size-4 shrink-0 text-fg-muted transition-transform [[data-state=open]_&]:rotate-180" />
          </button>
        )}
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal container={portalContainer ?? undefined}>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          onOpenAutoFocus={onContentOpenAutoFocus}
          data-slot="select-content"
          className="z-50 flex max-h-72 w-[var(--radix-popover-trigger-width)] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
        >
          {searchable ? (
            <div className="border-b border-line p-2">
              <Input
                aria-label="Поиск по списку"
                placeholder="Найти…"
                icon={<Search className="size-3.5 text-fg-muted" />}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                className="h-9"
              />
            </div>
          ) : null}

          <div
            ref={listboxRef}
            role="listbox"
            aria-multiselectable={multiple || undefined}
            onKeyDown={onListboxKeyDown}
            className="flex-1 overflow-y-auto p-1"
          >
            {filtered.length === 0 ? (
              <div className="flex h-9 items-center px-2 text-sm text-fg-muted">
                Ничего не найдено
              </div>
            ) : multiple ? (
              filtered.map((option) => {
                const selected = value.includes(option.value);
                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={selected}
                    onClick={(event) => {
                      // preventDefault отменяет активацию лейбла чекбокса — иначе браузер
                      // продублировал бы клик на сам чекбокс и строка переключилась бы дважды
                      event.preventDefault();
                      toggle(option.value);
                    }}
                    className={cn(
                      'flex h-9 cursor-pointer items-center rounded-lg px-2 select-none hover:bg-sunken',
                      selected && 'bg-brand-subtle hover:bg-brand-subtle',
                    )}
                  >
                    <Checkbox checked={selected} label={option.label} className="flex-1" />
                  </div>
                );
              })
            ) : (
              filtered.map((option) => {
                const selected = value.includes(option.value);
                return (
                  <div
                    key={option.value}
                    role="option"
                    tabIndex={-1}
                    data-value={option.value}
                    aria-selected={selected}
                    onClick={() => {
                      toggle(option.value);
                    }}
                    className={cn(
                      'flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-fg-primary select-none',
                      'focus-visible:outline-none',
                      selected ? 'bg-brand-subtle' : 'hover:bg-sunken focus:bg-sunken',
                    )}
                  >
                    <span className="flex-1 truncate">{option.label}</span>
                    {selected ? <Check className="size-4 shrink-0 text-brand-primary" /> : null}
                  </div>
                );
              })
            )}
          </div>

          {searchable || multiple ? (
            <div className="flex flex-col gap-0.5 border-t border-line px-3 py-2 text-xs text-fg-muted">
              {multiple ? (
                <span>
                  Выбрано: {value.length} из {options.length}
                </span>
              ) : null}
              {searchable ? (
                <span>
                  Показано {filtered.length} из {options.length} · скролл продолжает
                </span>
              ) : null}
            </div>
          ) : null}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export { Select, type SelectOption, type SelectProps };

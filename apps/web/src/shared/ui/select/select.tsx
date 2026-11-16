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
  /** Selected values; in single mode — an array with one element. */
  value: string[];
  onValueChange: (value: string[]) => void;
  /** Multiple choice: chips in the field, checkboxes in the list, dropdown stays open on select. */
  multiple?: boolean;
  /** Multiple choice: wrap chips onto several rows (the field grows in height).
   *  Disabled by default — chips in one row, ellipsis when out of space. */
  chipsWrap?: boolean;
  placeholder?: string;
  /** Search for long lists + "Showing N of M" footer. */
  searchable?: boolean;
  disabled?: boolean;
  /** DOM id of the trigger — allows linking a label via htmlFor or aria-labelledby. */
  id?: string;
  /** Form field name: selected values are submitted through hidden inputs. */
  name?: string;
  /** Accessible label of the trigger (a visible label is not always present). */
  'aria-label'?: string;
  /** Id of the element labelling the trigger. */
  'aria-labelledby'?: string;
  /** Ids of the elements describing the trigger (Field wires hint/error ids here). */
  'aria-describedby'?: string;
  /** Marks the field invalid; Field sets it when an error is present. */
  'aria-invalid'?: boolean;
  /** Portal container for the dropdown (e.g. a dark-themed story block); defaults to body. */
  portalContainer?: HTMLElement | null;
  className?: string;
}

const triggerClass = cn(
  'flex w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 text-caption outline-none',
  'cursor-pointer transition-shadow focus-visible:border-brand-primary focus-visible:ring-3 focus-visible:ring-brand-subtle',
  'data-[state=open]:border-brand-primary data-[state=open]:ring-3 data-[state=open]:ring-brand-subtle',
  'disabled:cursor-not-allowed disabled:bg-sunken',
);

/** Select per the "Atoms — selects" mockup: dropdown under the field, 36 px options, search and scroll for long lists. */
function Select({
  options,
  value,
  onValueChange,
  multiple = false,
  chipsWrap = false,
  placeholder = 'Выберите…',
  searchable = false,
  disabled = false,
  id,
  name,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
  portalContainer,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const chipsRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  /** Chips overflow a single row — show ellipsis (no-wrap mode). */
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
      return; // in multiple mode the dropdown does not close
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

  /** Focus an option of the single list by index (out-of-range indexes are ignored). */
  const focusOption = (index: number) => {
    const items = listboxRef.current?.querySelectorAll<HTMLElement>('[role="option"]');
    if (!items || items.length === 0) return;
    items[Math.max(0, Math.min(index, items.length - 1))]?.focus();
  };

  /** Single-list keyboard: arrows/Home/End move focus, Enter/Space select. */
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
      event.preventDefault(); // otherwise Space would scroll the page
      const optionValue = target.dataset.value;
      if (optionValue !== undefined) toggle(optionValue);
    }
  };

  /** On open: single mode focuses the selected option (else the first one), searchable — the search input. */
  const onContentOpenAutoFocus = (event: Event) => {
    if (searchable) return; // default Radix focus: the search input
    if (multiple) {
      // keep focus on the trigger so the chips stay reachable by keyboard
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const selectedIndex = options.findIndex((option) => option.value === value[0]);
    focusOption(selectedIndex === -1 ? 0 : selectedIndex);
  };

  /** Accessible name of the multiple trigger: joined chip labels (a hidden label is not visible). */
  const joinedLabels = value.length > 0 ? value.map(labelOf).join(', ') : undefined;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      {name
        ? value.map((optionValue) => (
            <input key={optionValue} type="hidden" name={name} value={optionValue} />
          ))
        : null}
      {multiple ? (
        // The field is a wrapper: a stretched real button opens the dropdown, the chip
        // remove buttons live in a layer above it — no interactive elements are nested.
        // (The trigger must wrap the button itself, not the wrapper: Radix would put
        // aria-haspopup="dialog" on a plain div, which axe flags as aria-allowed-attr.)
        <div
          data-slot="select"
          className={cn(
            'relative flex w-full items-center rounded-xl border border-line bg-surface text-caption outline-none transition-shadow',
            chipsWrap ? 'min-h-10' : 'h-10 overflow-hidden',
            disabled && 'pointer-events-none opacity-60',
            className,
          )}
        >
          <PopoverPrimitive.Trigger asChild>
            <button
              type="button"
              tabIndex={disabled ? -1 : 0}
              disabled={disabled}
              aria-haspopup="listbox"
              aria-expanded={open}
              id={id}
              aria-label={ariaLabel ?? joinedLabels}
              aria-labelledby={ariaLabelledby}
              aria-describedby={ariaDescribedby}
              // spread: jsx-a11y-x mistakenly reports aria-invalid as unsupported on
              // role=button, though it is a global ARIA attribute (Field error wiring)
              {...(ariaInvalid !== undefined ? { 'aria-invalid': ariaInvalid } : null)}
              className={cn(triggerClass, 'absolute inset-0 h-full')}
            >
              {value.length === 0 ? (
                <span className="flex-1 text-left text-fg-muted">{placeholder}</span>
              ) : null}
              <ChevronDown className="ml-auto size-4 shrink-0 text-fg-muted transition-transform [[data-state=open]_&]:rotate-180" />
            </button>
          </PopoverPrimitive.Trigger>
          {value.length > 0 ? (
            <div className="pointer-events-none z-10 flex min-w-0 flex-1 items-center gap-1.5 px-3 py-1.5 pr-9">
              <div
                ref={chipsRef}
                data-slot="select-chips"
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-1.5',
                  chipsWrap ? 'flex-wrap' : 'overflow-hidden',
                )}
              >
                {value.map((optionValue) => (
                  // No pointer-events here: a click on the chip text falls through to the
                  // trigger button and toggles the dropdown; only the remove button inside
                  // the chip re-enables pointer events. stopPropagation keeps the remove
                  // click from bubbling up to that same trigger.
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
              {chipsOverflow ? (
                <span className="shrink-0 text-caption text-fg-muted">…</span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            id={id}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            aria-describedby={ariaDescribedby}
            // spread: jsx-a11y-x mistakenly reports aria-invalid as unsupported on
            // role=button, though it is a global ARIA attribute (Field error wiring)
            {...(ariaInvalid !== undefined ? { 'aria-invalid': ariaInvalid } : null)}
            data-slot="select"
            className={cn(triggerClass, 'h-10', className)}
          >
            <span
              className={cn(
                'flex-1 truncate text-left',
                value[0] === undefined ? 'text-fg-muted' : 'text-fg-primary',
              )}
            >
              {value[0] !== undefined ? labelOf(value[0]) : placeholder}
            </span>
            <ChevronDown className="size-4 shrink-0 text-fg-muted transition-transform [[data-state=open]_&]:rotate-180" />
          </button>
        </PopoverPrimitive.Trigger>
      )}

      <PopoverPrimitive.Portal container={portalContainer ?? undefined}>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          onOpenAutoFocus={onContentOpenAutoFocus}
          data-slot="select-content"
          className="z-50 flex max-h-72 w-[var(--radix-popover-trigger-width)] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-elevation-2"
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
              <div className="flex h-9 items-center px-2 text-caption text-fg-muted">
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
                      // preventDefault cancels the checkbox label activation — otherwise the browser
                      // would duplicate the click onto the checkbox itself and the row would toggle twice
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
                      'flex h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-caption text-fg-primary select-none',
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
            <div className="flex flex-col gap-0.5 border-t border-line px-3 py-2 text-micro text-fg-muted">
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

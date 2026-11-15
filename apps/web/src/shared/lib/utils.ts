import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Склеивает имена классов и разрешает конфликты Tailwind (последний класс побеждает). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

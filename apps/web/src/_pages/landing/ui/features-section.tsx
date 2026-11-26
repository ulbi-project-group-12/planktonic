import {
  Bot,
  CalendarCheck,
  GitPullRequest,
  Kanban,
  ListChecks,
  MessagesSquare,
} from 'lucide-react';
import { Typography } from '@/shared/ui';

const features = [
  {
    icon: MessagesSquare,
    title: 'Каналы и ветки',
    text: 'Открытые и закрытые каналы, а ветки обсуждений не дают темам потеряться в общем потоке.',
  },
  {
    icon: ListChecks,
    title: 'Задачи из сообщений',
    text: 'Любое сообщение становится задачей — с исполнителем, сроком и ссылкой на обсуждение.',
  },
  {
    icon: Kanban,
    title: 'Канбан проекта',
    text: 'Доска задач внутри проекта: от бэклога до релиза, без отдельного трекера.',
  },
  {
    icon: GitPullRequest,
    title: 'Интеграция с GitHub',
    text: 'Пул-реквесты, ревью и статусы CI видны прямо в обсуждении задачи.',
  },
  {
    icon: CalendarCheck,
    title: 'Асинхронные стендапы',
    text: 'Команда отчитывается письменно, когда удобно, — без созвонов и перерывов.',
  },
  {
    icon: Bot,
    title: 'ИИ-помощник',
    text: 'Резюме длинных веток и черновики задач по контексту обсуждения.',
  },
] as const;

/** «Возможности» — six cards with the product's main features from the brief. */
export function FeaturesSection() {
  return (
    <section id="features" className="border-b border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 desktop-s:px-6 desktop-s:py-20">
        <div className="flex flex-col gap-3">
          <Typography
            as="h2"
            size="h4"
            weight="700"
            className="tracking-[-0.015em] desktop-s:text-h2"
          >
            Возможности
          </Typography>
          <Typography as="p" size="body-l" color="text-secondary" className="max-w-2xl">
            Всё, что нужно команде разработки для работы в одном инструменте
          </Typography>
        </div>
        <ul className="grid gap-4 mobile-xl:grid-cols-2 desktop-s:grid-cols-3">
          {features.map((feature) => (
            <li
              key={feature.title}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5"
            >
              <span
                aria-hidden
                className="flex size-10 items-center justify-center rounded-button bg-brand-subtle text-brand-text"
              >
                <feature.icon className="size-5" />
              </span>
              <Typography as="h3" size="h6" weight="700">
                {feature.title}
              </Typography>
              <Typography as="p" size="body-s" color="text-secondary">
                {feature.text}
              </Typography>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

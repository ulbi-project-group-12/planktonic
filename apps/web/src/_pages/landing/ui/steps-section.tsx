import { Typography } from '@/shared/ui';

const steps = [
  {
    title: 'Обсудите',
    text: 'Обсудите задачу в канале или ветке — контекст не теряется в потоке сообщений.',
  },
  {
    title: 'Создайте',
    text: 'Одно действие — и сообщение стало задачей с контекстом обсуждения.',
  },
  {
    title: 'Возьмите в работу',
    text: 'Назначьте исполнителя и двигайте карточку по канбану проекта.',
  },
  {
    title: 'Откройте PR',
    text: 'Ветки, пул-реквесты и статусы ревью подтягиваются из GitHub автоматически.',
  },
  {
    title: 'Узнайте результат',
    text: 'Уведомление о ревью и мерже приходит в тот же чат, где всё началось.',
  },
] as const;

/**
 * «Как это работает» — the main scenario from the product brief in five steps:
 * discuss → create → take → PR → result.
 */
export function StepsSection() {
  return (
    <section id="how" className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 desktop-s:px-6 desktop-s:py-20">
        <div className="flex flex-col gap-3">
          <Typography
            as="h2"
            size="h4"
            weight="700"
            className="tracking-[-0.015em] desktop-s:text-h2"
          >
            Как это работает
          </Typography>
          <Typography as="p" size="body-l" color="text-secondary" className="max-w-2xl">
            Основной сценарий: от обсуждения в чате до влитого кода — без потери контекста
          </Typography>
        </div>
        <ol className="grid gap-4 mobile-xl:grid-cols-2 desktop-s:grid-cols-3 desktop-l:grid-cols-5">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col gap-3 rounded-2xl border border-line bg-app p-5"
            >
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-full bg-brand-subtle text-body-s font-bold text-brand-text"
              >
                {index + 1}
              </span>
              <Typography as="h3" size="h6" weight="700">
                {step.title}
              </Typography>
              <Typography as="p" size="body-s" color="text-secondary">
                {step.text}
              </Typography>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

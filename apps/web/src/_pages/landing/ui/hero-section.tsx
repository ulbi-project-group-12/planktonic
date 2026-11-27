import type { ReactNode } from 'react';
import { GitPullRequest } from 'lucide-react';
import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { Avatar, Typography } from '@/shared/ui';
import { LandingCta, LandingLoginButton } from './landing-cta';

function MockMessage({
  name,
  time,
  children,
}: Readonly<{ name: string; time: string; children: ReactNode }>) {
  return (
    <div className="flex gap-3">
      <Avatar name={name} size="m" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <Typography size="body-xs" weight="700">
            {name}
          </Typography>
          <Typography size="caption" color="text-muted">
            {time}
          </Typography>
        </div>
        <Typography as="p" size="body-s" className="wrap-break-word">
          {children}
        </Typography>
      </div>
    </div>
  );
}

/**
 * The chat mockup: the main product scenario in miniature — a problem is discussed,
 * a task is created from the message, the PR arrives from GitHub. Pure markup on the
 * design tokens, no interactivity: an illustration, not a prototype.
 */
function ChatMockup() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-elevation-1 desktop-s:p-5"
    >
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <Typography weight="700" size="body-s">
          # разработка
        </Typography>
        <Typography size="caption" color="text-muted">
          4 участника
        </Typography>
      </div>
      <MockMessage name="Анна Смирнова" time="12:41">
        Приложение падает при загрузке аватаров у новых пользователей. У кого-нибудь
        воспроизводится?
      </MockMessage>
      <MockMessage name="Игорь Волков" time="12:43">
        Да, воспроизвёл. Создаю задачу прямо из этого сообщения.
      </MockMessage>
      <div className="ml-11 flex flex-col gap-1 rounded-xl border border-line bg-sunken px-3 py-2">
        <div className="flex items-center gap-2">
          <Typography
            size="caption"
            weight="700"
            color="brand-primary"
            className="dark:text-brand-text"
          >
            PL-42
          </Typography>
          <Typography size="caption" weight="700">
            Починить загрузку аватаров
          </Typography>
        </div>
        <Typography size="caption" color="text-secondary">
          Игорь Волков · В работе · ветка fix/avatars
        </Typography>
      </div>
      <MockMessage name="GitHub" time="12:58">
        <span className="inline-flex items-center gap-1">
          <GitPullRequest className="inline size-4 text-success" aria-hidden />
          PR #128 открыт: fix avatar upload — ветка fix/avatars
        </span>
      </MockMessage>
    </div>
  );
}

/** Hero: the promise, the main CTA and the product scenario in one screen. */
export function HeroSection() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 desktop-s:grid-cols-2 desktop-s:gap-16 desktop-s:px-6 desktop-s:py-20">
        <div className="flex flex-col items-start gap-6">
          <Typography
            as="h1"
            size="h3"
            weight="700"
            className="tracking-[-0.02em] desktop-s:text-h1"
          >
            Обсуждения, задачи и код — в одном месте
          </Typography>
          <Typography as="p" size="body-l" color="text-secondary" className="max-w-xl">
            {PRODUCT_DISPLAY_NAME} — рабочий мессенджер для команд разработки: каналы и ветки
            обсуждений, задачи прямо из переписки, канбан и интеграция с GitHub.
          </Typography>
          <div className="flex flex-wrap items-center gap-3">
            <LandingCta />
            <LandingLoginButton />
          </div>
          <Typography as="p" size="caption" color="text-muted">
            Создайте пространство за минуту и пригласите команду ссылкой
          </Typography>
        </div>
        <ChatMockup />
      </div>
    </section>
  );
}

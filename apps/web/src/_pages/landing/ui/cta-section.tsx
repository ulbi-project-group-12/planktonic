import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import { Typography } from '@/shared/ui';
import { LandingCta } from './landing-cta';

/** The closing call to action before the footer. */
export function CtaSection() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-4 py-12 desktop-s:px-6 desktop-s:py-20">
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-brand-primary px-6 py-12 text-center desktop-s:py-16">
          <Typography
            as="h2"
            size="h4"
            weight="700"
            color="on-brand"
            className="max-w-2xl tracking-[-0.015em] desktop-s:text-h2"
          >
            Соберите команду в {PRODUCT_DISPLAY_NAME}
          </Typography>
          <Typography as="p" size="body-l" color="on-brand" className="max-w-xl opacity-80">
            Создайте пространство за минуту и пригласите команду ссылкой
          </Typography>
          {/* secondary sits on bg-sunken, which reads on the brand fill in both themes. */}
          <LandingCta variant="secondary" />
        </div>
      </div>
    </section>
  );
}

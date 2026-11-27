import { PRODUCT_DISPLAY_NAME } from '@app/config/product';
import type { Metadata } from 'next';

const title = `${PRODUCT_DISPLAY_NAME} — рабочий мессенджер для команд разработки`;
const description =
  'Каналы и ветки обсуждений, задачи прямо из переписки, канбан и интеграция с GitHub — в одном месте.';

/** The landing's own title and description: the link preview a messenger shows for the root. */
export const landingMetadata: Metadata = {
  title,
  description,
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: PRODUCT_DISPLAY_NAME,
    title,
    description,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
  },
};

// Single source of the product name (D-33). Import it as `@app/config/product`.
//
// The product name is "planktonic". To rename it, follow the README section
// "Renaming the project"; the code change is this one file plus the PRODUCT_* env values.
//
// release.yml does not read this file: it derives image names from the repository
// (D-34), as ghcr.io/<repository owner>/<vars.PRODUCT_SLUG or repo name>-<app>. The
// owner is never written here. CI (`name-guard`) fails when PRODUCT_IMAGE_PREFIX differs
// from that repo-derived name, so the two cannot drift apart.
//
// The CI check `name-guard` (scripts/check-product-name.mjs) rejects the name in any
// other tracked file, outside a short allowlist.
//
// Erasable TypeScript only, so Node can import this file directly (type stripping).

/** Human-facing product name. */
export const PRODUCT_DISPLAY_NAME = 'planktonic';

/** Lowercase, Docker/GHCR-safe identifier: letters, digits and hyphens only. */
export const PRODUCT_SLUG = 'planktonic';

/**
 * Image name prefix, without registry or owner: the images are
 * `ghcr.io/<repository owner>/${PRODUCT_IMAGE_PREFIX}-web` and `-api`.
 */
export const PRODUCT_IMAGE_PREFIX = PRODUCT_SLUG;

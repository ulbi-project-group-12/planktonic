# API: OpenAPI из zod-контрактов

Схемы API живут в `packages/contracts` (zod 4). OpenAPI строится из них, отдельных DTO-классов нет (UL-137).

## Как описать эндпоинт

- **Тело, query, path-параметры** валидирует глобальный `StandardSchemaValidationPipe` (`apps/api/src/app.setup.ts`), если схема передана в декоратор: `@Body({ schema })`, `@Query({ schema })`, `@Param(name, { schema })`. `@nestjs/swagger` 12 описывает их по той же схеме сам, отдельный декоратор не нужен.
- **Ответы** описываются через `@ApiZodResponse(status, description, Schema)` из `core/openapi/zod-decorators.ts`. Это обёртка над `@ApiResponse({ standardSchema })`: Nest сам вызывает `~standard.jsonSchema` у zod с target `openapi-3.0` (для ответов `output`).
- **Ошибка валидации** — `ValidationErrorResponse` из контрактов: `400` с `statusCode`, `message` и `issues: [{ path, message }]`. Документируйте её у каждого роута со схемами: `@ApiZodResponse(400, '…', ValidationErrorResponse)`. Path-параметры тоже проверяйте схемой (`@Param({ schema: z.object({ channelId: z.uuid() }) })`), а не встроенными пайпами вроде `ParseUUIDPipe`: те отвечают другим телом, без `issues`.
- **Прочие ошибки** (`NotFoundException`, `ConflictException` и т. п.) — `HttpErrorResponse`: стандартное тело Nest `{ statusCode, message, error }`.
- **Имя схемы**: `.meta({ id: 'Name' })` выносит схему в `components.schemas` под этим именем, остальные схемы встраиваются в операцию. `id` должен быть уникальным во всём `z.globalRegistry`.
- **Служебные роуты** скрываются через `@ApiExcludeController()` или `@ApiExcludeEndpoint()` (пример — `debug/realtime`).
- `operationId` — `<Контроллер без Controller>_<метод>`, например `Messages_list`. Из него Orval называет хуки (UL-138).

## Swagger UI и экспорт

- Swagger UI: `/api/docs`, JSON: `/api/docs-json`. Только при `NODE_ENV=development`, в test и production оба адреса отвечают 404.
- `pnpm openapi:export` из корня репозитория записывает `apps/api/dist/openapi.json`. Другой путь передаётся первым аргументом, относительно корня: `pnpm openapi:export ./openapi.json`.
- Экспорт строит документ из всего `AppModule`, тем же кодом, что и Swagger UI (`createOpenApiDocument`). Новый модуль попадает в файл сам, без списков.
- Окружение экспорта фиксировано (`apps/api/src/openapi-export.ts`): `NODE_ENV=production` и адреса базы и Redis, к которым ничего не подключается. PostgreSQL, Redis и `.env` не нужны, результат одинаковый на любой машине и в CI. Тест `src/openapi.spec.ts` проверяет, что два экспорта подряд дают одинаковый файл.

## Ограничения преобразования

Проверено на zod 4.6.7 с target `openapi-3.0`.

| Схема                               | Что получается                                                                                                                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `z.date()`                          | Ошибка `Date cannot be represented in JSON Schema`. В контрактах используем `z.iso.date()` / `z.iso.datetime()`: `type: string`, `format: date` / `date-time` и `pattern`. В `Date` строку превращает код, не контракт.             |
| `z.bigint()`                        | Ошибка `BigInt cannot be represented`. Большие целые передаются строкой (`MessageSeq`).                                                                                                                                             |
| `.transform()`                      | В запросе описывается вход (`io: input`), это нормально (`GetMessagesQuery.limit`). В ответе transform не представим: схемы ответов пишем без него.                                                                                 |
| `z.union([z.string(), z.number()])` | `anyOf`. Порядок веток и transform внутри веток OpenAPI не описывает.                                                                                                                                                               |
| `z.discriminatedUnion`              | `oneOf` без `discriminator`.                                                                                                                                                                                                        |
| `z.literal(400)`                    | `{ type: number, enum: [400] }` (`const` в OpenAPI 3.0 нет).                                                                                                                                                                        |
| `.optional()`                       | Поле есть в `properties`, но не в `required`. `null` отдельно разрешает `.nullable()` (`nullable: true`).                                                                                                                           |
| `z.object` в ответе                 | `additionalProperties: false`. Новое поле в ответе становится ломающим изменением для строгих клиентов и моков.                                                                                                                     |
| `.meta({ id })`, рекурсия           | Сам `z.toJSONSchema` даёт `$ref` на `#/definitions/...` или `#`, в OpenAPI такие ссылки никуда не ведут. Поэтому сами его не вызываем: конвертер Nest переносит такие схемы в `components.schemas` (тест `zod-decorators.spec.ts`). |

## Установка зависимостей

`@nestjs/swagger` подтягивает `swagger-ui-dist`, а тот — `@scarf/scarf` с install-скриптом (телеметрия). pnpm в этом репозитории прерывает установку при незадекларированном скрипте (`ERR_PNPM_IGNORED_BUILDS`), поэтому `'@scarf/scarf': false` в `allowBuilds` явно его отключает. Для Swagger UI и экспорта скрипт не нужен.

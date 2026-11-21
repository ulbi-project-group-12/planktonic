import { Controller, Get } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { createOpenApiDocument } from './swagger.setup.js';
import { ApiZodResponse } from './zod-decorators.js';

// A named schema (`.meta({ id })`) used twice and a recursive one: zod's own JSON Schema puts
// them under `definitions` / `#`, which an OpenAPI document cannot resolve. Nest's converter must
// move them into `components.schemas`.
const Member = z.object({ id: z.uuid(), name: z.string() }).meta({ id: 'SpecMember' });
const Team = z.object({ lead: Member, members: z.array(Member) });
const Node = z
  .object({
    name: z.string(),
    get children() {
      return z.array(Node);
    },
  })
  .meta({ id: 'SpecNode' });

@Controller('spec')
class SpecController {
  @Get('team')
  @ApiZodResponse(200, 'A team', Team)
  team() {
    return undefined;
  }

  @Get('tree')
  @ApiZodResponse(200, 'A tree', Node)
  tree() {
    return undefined;
  }
}

@Module({ controllers: [SpecController] })
class SpecModule {}

it('documents named and recursive schemas through components.schemas', async () => {
  const app = await NestFactory.create(SpecModule, { logger: false });
  try {
    const document = createOpenApiDocument(app);
    const schemaOf = (path: string) =>
      (
        document.paths[path]?.get?.responses['200'] as {
          content: Record<string, { schema: unknown }>;
        }
      ).content['application/json']?.schema;

    expect(schemaOf('/spec/team')).toMatchObject({
      required: ['lead', 'members'],
      properties: {
        lead: { $ref: '#/components/schemas/SpecMember' },
        members: { type: 'array', items: { $ref: '#/components/schemas/SpecMember' } },
      },
    });
    expect(schemaOf('/spec/tree')).toEqual({ $ref: '#/components/schemas/SpecNode' });
    expect(document.components?.schemas).toMatchObject({
      SpecMember: { required: ['id', 'name'] },
      SpecNode: {
        properties: { children: { items: { $ref: '#/components/schemas/SpecNode' } } },
      },
    });
    expect(JSON.stringify(document)).not.toMatch(/"(definitions|\$defs|\$schema)"|"#\/definitions/);
  } finally {
    await app.close();
  }
});

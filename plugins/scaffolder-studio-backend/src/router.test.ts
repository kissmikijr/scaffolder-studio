import { createRouter } from './router';
import type { NextFunction } from 'express';

const invokeRouter = async ({
  router,
  method,
  url,
  body,
}: {
  router: any;
  method: string;
  url: string;
  body?: unknown;
}) =>
  await new Promise<{
    statusCode: number;
    body: unknown;
    error?: Error;
  }>(resolve => {
    const req = {
      method,
      url,
      originalUrl: url,
      path: url,
      body,
      headers: {},
      query: {},
      params: {},
    } as any;
    const res = {
      statusCode: 200,
      body: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.body = payload;
        resolve({ statusCode: this.statusCode, body: payload });
        return this;
      },
      send(payload?: unknown) {
        this.body = payload;
        resolve({ statusCode: this.statusCode, body: payload });
        return this;
      },
      setHeader() {
        return this;
      },
      getHeader() {
        return undefined;
      },
      end(payload?: unknown) {
        this.body = payload;
        resolve({ statusCode: this.statusCode, body: payload });
        return this;
      },
    } as any;
    const next: NextFunction = error => {
      resolve({
        statusCode: error ? 500 : res.statusCode,
        body: res.body,
        error: error as Error | undefined,
      });
    };

    router.handle(req, res, next);
  });

describe('router lint endpoint', () => {
  it('validates the request body and proxies lint results', async () => {
    const scaffolderStudioService = {
      stores: {
        visualTemplateProjectStore: {},
        publishedTemplatesStore: {},
      },
      lintTemplateGraph: jest.fn().mockResolvedValue({
        issues: [],
        summary: {
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
        },
        meta: {
          rulesVersion: '1',
          generatedAt: '2026-03-23T00:00:00.000Z',
        },
      }),
    } as any;

    const router = await createRouter({
      httpAuth: {
        credentials: jest.fn(),
      } as any,
      scaffolderStudioService,
      prefabService: {} as any,
      prefabLibraryService: {} as any,
      permissions: {
        authorize: jest.fn(),
      } as any,
    });

    const okResponse = await invokeRouter({
      router,
      method: 'POST',
      url: '/templates/lint',
      body: {
        templateId: 'template-1',
        nodes: [],
        edges: [],
      },
    });

    expect(okResponse.statusCode).toBe(200);
    expect(scaffolderStudioService.lintTemplateGraph).toHaveBeenCalledWith({
      templateId: 'template-1',
      nodes: [],
      edges: [],
    });

    const invalidResponse = await invokeRouter({
      router,
      method: 'POST',
      url: '/templates/lint',
      body: {
        templateId: 'template-1',
        edges: [],
      },
    });

    expect(invalidResponse.error).toBeDefined();
  });
});

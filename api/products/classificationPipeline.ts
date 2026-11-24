import { createHash, randomUUID } from 'node:crypto';
import type { VercelResponse } from '@vercel/node';
import { createProductDbClient } from './serverDb';
import { withSpan } from '../../src/telemetry/tracer';
import {
  checkAiQuotaOrReject,
  recordAiUsageTokensSafe,
  releaseAiReservationSafe,
} from '../../erp/api/_lib/secureIntegrations/aiQuotaBridge';
import type { CategoryCandidate, NcmCandidate } from './classificationCore';
import {
  CLASSIFICATION_INPUT_TOKEN_LIMIT_PER_MINUTE,
  CLASSIFICATION_MODEL,
  ClassificationBudgetError,
  type ClassificationReservation,
  type ClassificationResult,
  dateInBrazil,
  estimateClassificationInputTokens,
  reserveClassificationInputBudget,
  settleClassificationTokens,
  throwForBudgetDecision,
  validateCachedClassification,
} from './classificationBudgetAndCache';
import {
  type ClassificationQuestionBlock,
  resolveCategoryContextAndCandidates,
  resolveDeterministicNcm,
  resolveNcmCandidates,
  revalidateSelectedCategory,
  revalidateSelectedNcm,
} from './classificationCatalogLookup';

export interface ProductClassificationInput {
  source: 'product' | 'invoice';
  isInvoice: boolean;
  name: string;
  title: string;
  classificationTitle: string;
  description: string;
  material: string;
  categoryId: string;
  categoryHint: string;
  productId: string;
  hasNcm: boolean;
}

interface ParsedModelAnswers {
  category?: { choice?: unknown };
  ncm?: { choice?: unknown };
}

function buildOpenAiClassificationPayload(
  classificationState: Record<string, unknown>,
  questions: Record<string, ClassificationQuestionBlock>,
  categoryOptions: Map<string, CategoryCandidate>,
  ncmOptions: Map<string, NcmCandidate>
) {
  const responseProperties: Record<string, unknown> = {};
  if (questions.category) {
    responseProperties.category = {
      type: 'object',
      properties: { choice: { type: 'string', enum: [...categoryOptions.keys()] } },
      required: ['choice'],
      additionalProperties: false,
    };
  }
  if (questions.ncm) {
    responseProperties.ncm = {
      type: 'object',
      properties: { choice: { type: 'string', enum: [...ncmOptions.keys()] } },
      required: ['choice'],
      additionalProperties: false,
    };
  }

  return {
    model: CLASSIFICATION_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Classifique o produto apenas entre as opções fornecidas. Não invente categoria nem NCM. Responda com a opção mais adequada; a classificação é uma sugestão sujeita à revisão humana.',
      },
      { role: 'user', content: JSON.stringify({ state: classificationState, questions }) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'product_classification_choices',
        strict: true,
        schema: {
          type: 'object',
          properties: responseProperties,
          required: Object.keys(responseProperties),
          additionalProperties: false,
        },
      },
    },
    max_completion_tokens: 256,
  };
}

export async function executeProductClassification(params: {
  db: ReturnType<typeof createProductDbClient>;
  userDb: ReturnType<typeof createProductDbClient>;
  userId: string;
  res: VercelResponse;
  openAiKey: string;
  input: ProductClassificationInput;
}): Promise<ClassificationResult> {
  const { db, userDb, userId, res, openAiKey, input } = params;

  return withSpan(
    'product.ai.classify',
    async (span) => {
      let category: CategoryCandidate | null = null;
      let ncm = await resolveDeterministicNcm(db, input);
      const questions: Record<string, ClassificationQuestionBlock> = {};

      const { categoryName, question: categoryQuestion, categoryOptions } =
        await resolveCategoryContextAndCandidates(db, userDb, {
          isInvoice: input.isInvoice,
          productId: input.productId,
          initialCategoryId: input.categoryId,
          categoryHint: input.categoryHint,
          onCategoryAvailabilityCheck: (available) =>
            span.setAttribute('product.category_available', available),
        });
      if (categoryQuestion) questions.category = categoryQuestion;

      let ncmOptions = new Map<string, NcmCandidate>();
      if (!input.hasNcm && !ncm) {
        const ncmResolution = await resolveNcmCandidates(db, userDb, {
          isInvoice: input.isInvoice,
          name: input.name,
          title: input.title,
          categoryName,
          material: input.material,
          description: input.description,
        });
        ncmOptions = ncmResolution.ncmOptions;
        if (ncmResolution.question) questions.ncm = ncmResolution.question;
      }

      if (!Object.keys(questions).length) {
        return {
          category: null,
          ncm: ncm && { code: ncm.code, description: ncm.official_description },
        };
      }

      const classificationState = input.isInvoice
        ? { title: input.title }
        : {
            name: input.name,
            title: input.title,
            description: input.description,
            material: input.material,
            ...(categoryName ? { category: categoryName } : {}),
          };

      const serializedRequest = JSON.stringify(
        buildOpenAiClassificationPayload(classificationState, questions, categoryOptions, ncmOptions)
      );
      const estimatedInputTokens = estimateClassificationInputTokens(serializedRequest);
      if (estimatedInputTokens > CLASSIFICATION_INPUT_TOKEN_LIMIT_PER_MINUTE) {
        throw new ClassificationBudgetError(
          413,
          'request_too_large',
          'Dados demais para classificar em uma única chamada.'
        );
      }

      const fingerprint = createHash('sha256')
        .update(
          JSON.stringify({
            userId,
            source: input.source,
            model: CLASSIFICATION_MODEL,
            state: classificationState,
            hasNcm: input.hasNcm,
            questions,
          })
        )
        .digest('hex');

      const requestId = randomUUID();
      const quota = await checkAiQuotaOrReject(
        userDb,
        'openai',
        'openai_gpt',
        estimatedInputTokens + 256,
        'product_ncm',
        res
      );
      if (!quota.allowed) throw new Error('ai_quota_blocked');

      let quotaCommitted = false;
      const startedAt = Date.now();
      let reservation: ClassificationReservation;
      try {
        reservation = await reserveClassificationInputBudget(
          db,
          requestId,
          fingerprint,
          estimatedInputTokens,
          false
        );
        if (reservation.allowed && reservation.reason === 'cached') {
          const cached = await validateCachedClassification(db, reservation.cached_response);
          if (cached) {
            releaseAiReservationSafe(userDb, quota.reservationId);
            quotaCommitted = true;
            return cached;
          }
          // O catálogo mudou desde o cache; reserve a nova chamada sem reaproveitar a resposta.
          reservation = await reserveClassificationInputBudget(
            db,
            requestId,
            fingerprint,
            estimatedInputTokens,
            true
          );
        }
        throwForBudgetDecision(reservation);
      } catch (error) {
        if (!quotaCommitted) releaseAiReservationSafe(userDb, quota.reservationId);
        quotaCommitted = true;
        throw error;
      }

      span.setAttribute('classification.input_tokens.estimated', estimatedInputTokens);
      span.setAttribute(
        'classification.input_tokens.limit_per_minute',
        CLASSIFICATION_INPUT_TOKEN_LIMIT_PER_MINUTE
      );

      try {
        let response: Response;
        try {
          response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
            body: serializedRequest,
            signal: AbortSignal.timeout(8000),
          });
        } catch (error) {
          if (ncm) {
            return { category: null, ncm: { code: ncm.code, description: ncm.official_description } };
          }
          throw error;
        }

        const payload = (await response.json()) as {
          usage?: {
            prompt_tokens?: unknown;
            completion_tokens?: unknown;
            total_tokens?: unknown;
            prompt_tokens_details?: { cached_tokens?: unknown };
          };
          choices?: Array<{ message?: { content?: unknown } }>;
        };

        const usage = payload?.usage || {};
        const reportedInputTokens = Number(usage.prompt_tokens);
        const completionTokens = Number(usage.completion_tokens || 0);
        const totalTokens =
          Number(usage.total_tokens || 0) || reportedInputTokens + completionTokens;

        recordAiUsageTokensSafe(userDb, {
          provider: 'openai',
          service: 'openai_gpt',
          operation: 'product_classify',
          promptTokens:
            Number.isInteger(reportedInputTokens) && reportedInputTokens >= 0
              ? reportedInputTokens
              : 0,
          completionTokens,
          totalTokens,
          moduleSource: 'product_ncm',
          responseTimeMs: Date.now() - startedAt,
          ok: response.ok,
          reservationId: quota.reservationId,
          cachedTokens: Number(usage.prompt_tokens_details?.cached_tokens || 0),
        });
        quotaCommitted = true;

        if (!response.ok) {
          if (ncm) {
            return { category: null, ncm: { code: ncm.code, description: ncm.official_description } };
          }
          throw new Error(response.status === 429 ? 'rate_limited' : 'openai_http');
        }

        const messageContent = payload?.choices?.[0]?.message?.content;
        if (typeof messageContent !== 'string') throw new Error('openai_response');

        let answers: ParsedModelAnswers;
        try {
          const parsed = JSON.parse(messageContent) as unknown;
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('openai_response');
          }
          answers = parsed as ParsedModelAnswers;
        } catch {
          throw new Error('openai_response');
        }

        const today = dateInBrazil();
        if (questions.category) {
          const { category: validatedCategory, choiceInOptions } = await revalidateSelectedCategory(
            db,
            answers.category?.choice,
            categoryOptions
          );
          span.setAttribute('category.choice_in_options', choiceInOptions);
          category = validatedCategory;
        }

        if (questions.ncm) {
          const { ncm: validatedNcm, choiceInOptions } = await revalidateSelectedNcm(
            db,
            answers.ncm?.choice,
            ncmOptions,
            today
          );
          span.setAttribute('ncm.choice_in_options', choiceInOptions);
          ncm = validatedNcm;
        }

        span.setAttribute('category.validated', Boolean(category));
        span.setAttribute('ncm.validated', Boolean(ncm));

        const classified: ClassificationResult = {
          category: category && { id: category.id, name: category.name },
          ncm: ncm && { code: ncm.code, description: ncm.official_description },
        };
        const actualInputTokens =
          Number.isInteger(reportedInputTokens) && reportedInputTokens >= 0
            ? reportedInputTokens
            : estimatedInputTokens;
        await settleClassificationTokens(db, requestId, actualInputTokens, classified);
        span.setAttribute('classification.input_tokens.actual', actualInputTokens);
        return classified;
      } finally {
        if (!quotaCommitted) releaseAiReservationSafe(userDb, quota.reservationId);
      }
    },
    { module: 'Products', operation: 'classify' }
  );
}

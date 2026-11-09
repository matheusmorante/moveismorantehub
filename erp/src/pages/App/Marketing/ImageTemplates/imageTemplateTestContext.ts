import { getTestArtifactContext } from '../../../../../../shared-utils/testArtifactContext';
import { IMAGE_TEMPLATE_TEST_SCENARIO, imageTemplateTestArtifactSchema,
  type ImageTemplateTestArtifact } from '../../../../../../shared-utils/catalogImageTemplate';

export function imageTemplateTestContext() {
  const context = getTestArtifactContext();
  return context?.scenarioKey === IMAGE_TEMPLATE_TEST_SCENARIO ? context : null;
}

export function assertImageTemplateTestWrite(metadata?: unknown): ImageTemplateTestArtifact | null {
  const context = imageTemplateTestContext();
  if (metadata == null && !context) return null;
  const parsed = imageTemplateTestArtifactSchema.safeParse(metadata);
  if (!parsed.success || !context || parsed.data.runId !== context.runId || parsed.data.ownerId !== context.ownerId) {
    throw new Error('O modelo de teste deve pertencer à execução e ao operador autenticado atuais.');
  }
  return parsed.data;
}

export function applyImageTemplateTestScope(applyFilter: (column: string, value: string) => void): void {
  const context = imageTemplateTestContext();
  if (context) {
    applyFilter('design->testArtifact->>runId', context.runId);
    applyFilter('design->testArtifact->>ownerId', context.ownerId);
    applyFilter('design->testArtifact->>scenarioKey', IMAGE_TEMPLATE_TEST_SCENARIO);
  }
}

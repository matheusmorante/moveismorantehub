import { beforeEach, expect, it, vi } from 'vitest';
import { imageTemplateFormSchema, startImageTemplate } from '../../../../../../shared-utils/catalogImageTemplate';
import { applyImageTemplateTestScope, assertImageTemplateTestWrite } from './imageTemplateTestContext';

const mocks = vi.hoisted(() => ({ context: null as { runId: string; ownerId: string; scenarioKey: string } | null }));
vi.mock('../../../../../../shared-utils/testArtifactContext', () => ({ getTestArtifactContext: () => mocks.context }));
const identity = { runId: '00000000-0000-4000-8000-000000000011', ownerId: '00000000-0000-4000-8000-000000000012',
  scenarioKey: 'image_template_crud' as const };
const metadata = { is_test: true as const, ...identity };
beforeEach(() => { mocks.context = null; });

it('mantém o desenho antigo compatível e preserva a identidade do modelo de teste', () => {
  const values = { name: 'Modelo', description: '', design: startImageTemplate('blank') };
  expect(imageTemplateFormSchema.parse(values).design.testArtifact).toBeUndefined();
  expect(imageTemplateFormSchema.parse({ ...values, design: { ...values.design, testArtifact: metadata } }).design.testArtifact).toEqual(metadata);
});

it('recusa gravação marcada sem contexto e recusa gravação normal durante a execução de testes', () => {
  expect(() => assertImageTemplateTestWrite(metadata)).toThrow('execução');
  mocks.context = identity;
  expect(() => assertImageTemplateTestWrite()).toThrow('execução');
  expect(assertImageTemplateTestWrite(metadata)).toEqual(metadata);
});

it.each([
  { ...metadata, runId: '00000000-0000-4000-8000-000000000099' },
  { ...metadata, ownerId: '00000000-0000-4000-8000-000000000099' },
  { ...metadata, scenarioKey: 'outro_cenario' },
  { ...metadata, is_test: false },
])('recusa identidade incompatível com a execução: %j', (invalid) => {
  mocks.context = identity;
  expect(() => assertImageTemplateTestWrite(invalid)).toThrow('operador');
});

it('limita operações de teste à execução, ao operador e ao cenário antes de acessar o banco', () => {
  const applyFilter = vi.fn();
  applyImageTemplateTestScope(applyFilter);
  expect(applyFilter).not.toHaveBeenCalled();
  mocks.context = identity;
  applyImageTemplateTestScope(applyFilter);
  expect(applyFilter.mock.calls).toEqual([
    ['design->testArtifact->>runId', identity.runId], ['design->testArtifact->>ownerId', identity.ownerId],
    ['design->testArtifact->>scenarioKey', identity.scenarioKey],
  ]);
});

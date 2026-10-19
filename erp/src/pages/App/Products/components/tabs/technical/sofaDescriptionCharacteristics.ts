import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';

type SofaDescriptionFact = 'height' | 'width' | 'openDepth' | 'closedDepth' | 'seatHeight' | 'weight' | 'retractable';
type SofaDescriptionFacts = Partial<Record<SofaDescriptionFact, number | string>>;

const NUMBER_TOKEN = String.raw`(\d+(?:[.,]\d+)?)\s*(mm|cm|m|kg)?`;

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

const normalizeFieldName = (value: string): string =>
  normalizeText(value).replace(/[?¿!.,:;]/g, '').trim();

const parseMeasure = (value: string, unit: string | undefined, isWeight = false): number => {
  let parsed = Number(value.replace(',', '.'));
  const normalizedUnit = unit?.toLowerCase();

  if (normalizedUnit === 'm' || (!normalizedUnit && !isWeight && parsed > 0 && parsed < 3)) {
    parsed *= 100;
  } else if (normalizedUnit === 'mm') {
    parsed /= 10;
  }

  return Math.round(parsed * 100) / 100;
};

const findLabeledMeasurement = (
  description: string,
  label: string,
  isWeight = false
): number | undefined => {
  const match = description.match(
    new RegExp(String.raw`(?:^|[^a-z0-9])${label}\s*[:=]?\s*${NUMBER_TOKEN}`, 'im')
  );
  if (!match) return undefined;
  return parseMeasure(match[1], match[2], isWeight);
};

const findDepthFacts = (description: string): Pick<SofaDescriptionFacts, 'openDepth' | 'closedDepth'> => {
  let openDepth: number | undefined;
  let closedDepth: number | undefined;

  for (const line of description.split(/[\r\n]+/)) {
    if (!line.includes('profundidade')) continue;

    const labeledOpen = line.match(
      new RegExp(String.raw`profundidade\s+(?:do\s+)?abert[oa]\s*[:=]?\s*${NUMBER_TOKEN}`, 'i')
    );
    const labeledClosed = line.match(
      new RegExp(String.raw`profundidade\s+(?:do\s+)?fechad[oa]\s*[:=]?\s*${NUMBER_TOKEN}`, 'i')
    );
    if (labeledOpen && openDepth === undefined) {
      openDepth = parseMeasure(labeledOpen[1], labeledOpen[2]);
    }
    if (labeledClosed && closedDepth === undefined) {
      closedDepth = parseMeasure(labeledClosed[1], labeledClosed[2]);
    }

    const markedOpen = line.match(
      new RegExp(
        String.raw`${NUMBER_TOKEN}\s*(?:\(\s*)?(?:abert[oa]|esticad[oa]|estendid[oa])\s*\)?`,
        'i'
      )
    );
    const markedClosed = line.match(
      new RegExp(
        String.raw`${NUMBER_TOKEN}\s*(?:\(\s*)?(?:fechad[oa]|recolhid[oa])\s*\)?`,
        'i'
      )
    );
    const valueAfterOpenState = new RegExp(
      String.raw`(?:abert[oa]|esticad[oa]|estendid[oa])\s*[:=]?\s*${NUMBER_TOKEN}`,
      'i'
    );
    const valueAfterClosedState = new RegExp(
      String.raw`(?:fechad[oa]|recolhid[oa])\s*[:=]?\s*${NUMBER_TOKEN}`,
      'i'
    );
    const openFollowingState = line.match(valueAfterOpenState);
    const closedFollowingState = line.match(valueAfterClosedState);

    if (!labeledOpen && openDepth === undefined) {
      if (markedOpen) {
        openDepth = parseMeasure(markedOpen[1], markedOpen[2]);
      } else if (openFollowingState) {
        openDepth = parseMeasure(openFollowingState[1], openFollowingState[2]);
      }
    }
    if (!labeledClosed && closedDepth === undefined) {
      if (markedClosed) {
        closedDepth = parseMeasure(markedClosed[1], markedClosed[2]);
      } else if (closedFollowingState) {
        closedDepth = parseMeasure(closedFollowingState[1], closedFollowingState[2]);
      }
    }

    const hasDedicatedDepthLabels = /profundidade\s+(?:do\s+)?(?:abert[oa]|fechad[oa])/i.test(
      line
    );
    if (openDepth !== undefined && closedDepth === undefined && !hasDedicatedDepthLabels) {
      const baseDepth = line.match(
        new RegExp(String.raw`profundidade(?:\s+total)?\s*[:=]?\s*${NUMBER_TOKEN}`, 'i')
      );
      if (baseDepth) {
        const parsedBase = parseMeasure(baseDepth[1], baseDepth[2]);
        if (parsedBase !== openDepth) closedDepth = parsedBase;
      }
    }
  }

  return { openDepth, closedDepth };
};

const extractFacts = (description: string): SofaDescriptionFacts => {
  const normalizedDescription = normalizeText(description);
  const facts: SofaDescriptionFacts = {
    height: findLabeledMeasurement(
      normalizedDescription,
      String.raw`altura(?!\s+(?:do\s+)?(?:assento|acento))(?:\s+total)?`
    ),
    width: findLabeledMeasurement(normalizedDescription, String.raw`largura(?:\s+total)?`),
    seatHeight: findLabeledMeasurement(
      normalizedDescription,
      String.raw`altura\s+(?:do\s+)?(?:assento|acento)(?:\s+(?:ao|ate)\s+(?:chao|assento))?`
    ),
    weight: findLabeledMeasurement(
      normalizedDescription,
      String.raw`peso(?!\s+(?:suportado|maximo|por\s+assento))`,
      true
    ),
  };

  const depthFacts = findDepthFacts(normalizedDescription);
  facts.openDepth = depthFacts.openDepth;
  facts.closedDepth = depthFacts.closedDepth;

  if (/\bnao\s+(?:e\s+|possui\s+|tem\s+)?(?:sistema\s+)?retratil\b/.test(normalizedDescription)) {
    facts.retractable = 'Não';
  } else if (/\bretratil\b/.test(normalizedDescription)) {
    facts.retractable = 'Sim';
  }

  return facts;
};

const FACT_FIELD_ALIASES: Record<SofaDescriptionFact, readonly string[]> = {
  height: ['altura total', 'altura'],
  width: ['largura total', 'largura'],
  openDepth: ['profundidade aberto', 'profundidade aberta'],
  closedDepth: ['profundidade fechado', 'profundidade fechada'],
  seatHeight: ['altura do assento ao chao', 'altura do chao ate o assento'],
  weight: ['peso'],
  retractable: ['retratil', 'retratil?', 'possui retratil'],
};

export const extractSofaDescriptionCharacteristics = (
  description: string,
  fields: readonly TechnicalFieldDefinition[],
  categoryIds: readonly string[]
): Record<string, number | string> => {
  if (!description.trim()) return {};

  const facts = extractFacts(normalizeText(description));
  const values: Record<string, number | string> = {};

  (Object.entries(facts) as Array<[SofaDescriptionFact, number | string | undefined]>).forEach(
    ([factName, value]) => {
      if (value === undefined) return;

      const aliases = new Set(FACT_FIELD_ALIASES[factName].map(normalizeFieldName));
      const matchingFields = fields.filter(
        (field) =>
          field.active !== false &&
          aliases.has(normalizeFieldName(field.name))
      );
      const field =
        matchingFields.find((candidate) =>
          candidate.requiredCategoryIds?.some((id) => categoryIds.includes(id))
        ) ||
        matchingFields.find((candidate) =>
          candidate.categoryIds?.some((id) => categoryIds.includes(id))
        ) ||
        matchingFields[0];

      if (field) values[field.name] = value;
    }
  );

  return values;
};

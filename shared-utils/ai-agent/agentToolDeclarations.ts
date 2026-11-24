// Catálogo Central e Compartilhado de Function Calling entre o Assistente do ERP e do App Mobile

import { sharedExtendedFinanceToolDeclarations } from './agentFinanceDeclarations';
import { sharedOrderAndPeopleToolDeclarations } from './agentOrderDeclarations';
import { sharedProductToolDeclarations } from './agentProductDeclarations';

export {
  sharedExtendedFinanceToolDeclarations,
  sharedOrderAndPeopleToolDeclarations,
  sharedProductToolDeclarations,
};

export const sharedAllAgentTools = [
  ...sharedExtendedFinanceToolDeclarations,
  ...sharedOrderAndPeopleToolDeclarations,
  ...sharedProductToolDeclarations,
];

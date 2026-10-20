import type Person from '../../../types/person.type';
import { mapFromDB } from '../personMapper';
import {
  isIdentifiedTestArtifact,
  readTestArtifactIdentity,
  type TestArtifactIdentity,
} from '../../../../../../shared-utils/testArtifactPolicy';
import {
  isTestOperator,
  isTestOperatorVisibleToUser,
} from '../../../../../../shared-utils/testOperatorVisibility';

export const isTestPerson = (person: any): boolean => {
  if (!person) return false;
  if (isTestOperator(person)) return false;
  if (isIdentifiedTestArtifact(person)) return true;
  const name = person.fullName || person.tradeName || person.name || '';
  if (/\[?\s*HML\s*NF\s*TEST\b/i.test(name)) return true;
  if (/^\s*(?:TEST_AUT_|playwright\.test)/i.test(name)) return true;
  if (/^\s*TEST_AUT_/i.test(String(person.id || ''))) return true;
  return false;
};

export const matchesPersonQueryContext = (
  person: Person,
  testContext?: TestArtifactIdentity
): boolean => {
  if (!testContext) return !isTestPerson(person);
  const identity = readTestArtifactIdentity(person);
  return identity?.runId === testContext.runId && identity.ownerId === testContext.ownerId;
};

export const mapAndSortPeople = (
  collectionName: string,
  peopleData: any[],
  includeDeleted = false,
  currentUserEmail = ''
): Person[] => {
  let people = peopleData.map(mapFromDB);

  if (!includeDeleted) {
    people = people.filter((p) => !isTestPerson(p));
  }

  if (collectionName === 'employees') {
    people = people.filter((person) => isTestOperatorVisibleToUser(person, currentUserEmail));
  }

  if (collectionName === 'employees') {
    const uniqueMap = new Map<string, Person>();
    for (const employee of people) {
      const emailKey = employee.email?.toLowerCase().trim();
      const key = emailKey || String(employee.id);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, employee);
      } else {
        const existing = uniqueMap.get(key)!;
        const existingScore =
          (existing.phone ? 10 : 0) + (existing.fullAddress?.street ? 10 : 0);
        const currentScore =
          (employee.phone ? 10 : 0) + (employee.fullAddress?.street ? 10 : 0);
        if (currentScore > existingScore) uniqueMap.set(key, employee);
      }
    }
    people = Array.from(uniqueMap.values());
  }

  return people.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
};

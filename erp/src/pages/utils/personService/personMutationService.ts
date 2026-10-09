import { supabase } from '@/pages/utils/supabaseConfig';
import Person from '../../types/person.type';
import { TABLE_NAME, mapToDB, mapFromDB } from './personMapper';
import { queryClient } from '@/lib/queryClient';
import {
  assertOwnedByTestContext,
  getTestArtifactContext,
  stampTestArtifact,
} from '../../../../../shared-utils/testArtifactContext';


const invalidatePeopleQueryCache = () => {
  try {
    queryClient.invalidateQueries({ queryKey: ['people'] });
  } catch (err) {
    // Failsafe caso queryClient não esteja disponível em mock de teste headless
  }
};

const stampPersonAddress = <T extends Record<string, any>>(person: T): T => {
  if (!getTestArtifactContext()) return person;
  let address = person.address;
  if (typeof address === 'string') {
    try {
      const parsed = JSON.parse(address);
      address = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : { street: address };
    } catch {
      address = { street: address };
    }
  }
  return {
    ...person,
    address: stampTestArtifact({ address }, 'address').address,
  };
};

export type SavePersonOptions = { insertOnly?: boolean };

export const savePerson = async (
  collectionName: string,
  person: Person,
  options: SavePersonOptions = {}
): Promise<Person> => {
  if (person.id && !options.insertOnly) {
    return await updatePerson(collectionName, person.id, person);
  }

  if (options.insertOnly && !person.id) {
    throw new Error('A criação protegida exige o UUID reservado da fixture.');
  }

  try {
    const dbPerson = stampPersonAddress(mapToDB(collectionName, person));
    if (options.insertOnly && person.id) dbPerson.id = person.id;
    const { data, error } = await supabase.from(TABLE_NAME).insert([dbPerson]).select();

    if (error) throw error;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('people_updated', { detail: { collectionName } }));
    }
    invalidatePeopleQueryCache();
    return mapFromDB(data[0]);
  } catch (error) {
    console.error(`Erro ao salvar em ${collectionName}: `, error);
    throw error;
  }
};

export const savePeopleBatch = async (
  collectionName: string,
  people: Partial<Person>[]
): Promise<void> => {
  try {
    const dbPeople = people.map((p) => stampPersonAddress(mapToDB(collectionName, p)));
    const { error } = await supabase.from(TABLE_NAME).insert(dbPeople);

    if (error) throw error;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('people_updated', { detail: { collectionName } }));
    }
    invalidatePeopleQueryCache();
  } catch (error) {
    console.error(`Erro ao salvar lote em ${collectionName}: `, error);
    throw error;
  }
};

export const updatePerson = async (
  collectionName: string,
  id: string,
  personToUpdate: Partial<Person>
): Promise<Person> => {
  try {
    const dbPerson = mapToDB(collectionName, personToUpdate);
    if (getTestArtifactContext()) {
      const { data: currentPerson, error: readError } = await supabase
        .from(TABLE_NAME)
        .select('id,address')
        .eq('id', id)
        .maybeSingle();
      if (readError) throw readError;
      if (!currentPerson) throw new Error('O cadastro não existe para esta execução de teste.');
      assertOwnedByTestContext(currentPerson);
    }
    const { data, error } = await supabase.from(TABLE_NAME).update(dbPerson).eq('id', id).select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return {} as Person;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('people_updated', { detail: { collectionName } }));
    }
    invalidatePeopleQueryCache();
    return mapFromDB(data[0]);
  } catch (error) {
    console.error(`Erro ao atualizar em ${collectionName}: `, error);
    throw error;
  }
};

export const moveToTrash = async (collectionName: string, id: string): Promise<void> => {
  try {
    invalidatePeopleQueryCache();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let result = null;

    if (!isUUID) {
      result = await updatePerson(collectionName, id, {
        deleted: true,
        deletedAt: new Date().toLocaleString('pt-BR'),
        active: false,
      });
    }

    if ((!result || !result.id) && collectionName === 'employees') {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ position: null })
        .eq('id', id);

      if (profileError) throw profileError;
    }
  } catch (error) {
    console.error(`Erro ao mover para lixeira em ${collectionName}: `, error);
    throw error;
  }
};

export const restorePerson = async (collectionName: string, id: string): Promise<void> => {
  try {
    invalidatePeopleQueryCache();
    await updatePerson(collectionName, id, {
      deleted: false,
      deletedAt: undefined,
      active: true,
    });
  } catch (error) {
    console.error(`Erro ao restaurar em ${collectionName}: `, error);
    throw error;
  }
};

export const permanentDeletePerson = async (collectionName: string, id: string): Promise<void> => {
  try {
    invalidatePeopleQueryCache();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let deletedInPeople = false;

    if (!isUUID) {
      const { data, error } = await supabase.from(TABLE_NAME).delete().eq('id', id).select();

      if (error) throw error;
      deletedInPeople = data && data.length > 0;
    }

    if (!deletedInPeople && collectionName === 'employees') {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ position: null })
        .eq('id', id);

      if (profileError) throw profileError;
    }
  } catch (error) {
    console.error(`Erro ao deletar permanentemente em ${collectionName}: `, error);
    throw error;
  }
};

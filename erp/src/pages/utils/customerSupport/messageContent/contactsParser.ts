import type { ExtractedMessageContent } from './types';

export function parseContactsMessage(
  contactsInput: any,
  replyToWamid?: string,
  type = 'contacts'
): ExtractedMessageContent {
  const contacts = Array.isArray(contactsInput) ? contactsInput : [];
  const summaries = contacts
    .map((contact: any) => {
      const name =
        contact?.name?.formatted_name ||
        [contact?.name?.first_name, contact?.name?.middle_name, contact?.name?.last_name]
          .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
          .join(' ');
      const phones = Array.isArray(contact?.phones)
        ? contact.phones
            .map((phone: any) => {
              const value = phone?.phone || phone?.wa_id;
              return value ? `${phone?.type ? `${phone.type}: ` : ''}${value}` : '';
            })
            .filter((phone: unknown): phone is string => typeof phone === 'string' && phone.trim().length > 0)
        : [];
      const emails = Array.isArray(contact?.emails)
        ? contact.emails
            .map((item: any) =>
              item?.email ? `E-mail${item.type ? ` (${item.type})` : ''}: ${item.email}` : ''
            )
            .filter(Boolean)
        : [];
      const addresses = Array.isArray(contact?.addresses)
        ? contact.addresses
            .map((item: any) => {
              const value = [item?.street, item?.city, item?.state, item?.zip, item?.country]
                .filter(Boolean)
                .join(', ');
              return value ? `Endereço${item.type ? ` (${item.type})` : ''}: ${value}` : '';
            })
            .filter(Boolean)
        : [];
      const urls = Array.isArray(contact?.urls)
        ? contact.urls
            .map((item: any) => (item?.url ? `URL${item.type ? ` (${item.type})` : ''}: ${item.url}` : ''))
            .filter(Boolean)
        : [];
      const organization = contact?.org
        ? [contact.org.company, contact.org.department, contact.org.title].filter(Boolean).join(' — ')
        : '';
      const otherDetails = [
        ...emails,
        ...addresses,
        ...urls,
        organization ? `Organização: ${organization}` : '',
        contact?.birthday ? `Aniversário: ${contact.birthday}` : '',
      ];
      const vcard = typeof contact?.vcard === 'string' ? contact.vcard.trim() : '';
      return [
        name,
        ...phones,
        ...otherDetails,
        ...(!name && phones.length === 0 && otherDetails.length === 0 && vcard ? [`vCard:\n${vcard}`] : []),
      ]
        .filter((detail): detail is string => typeof detail === 'string' && detail.trim().length > 0)
        .join(' — ');
    })
    .filter((summary: string) => summary.length > 0);

  const title = summaries.length === 1 ? '👤 Contato compartilhado' : '👤 Contatos compartilhados';
  return {
    type: 'contacts',
    text: summaries.length > 0 ? `${title}:\n${summaries.join('\n')}` : '👤 Contato compartilhado',
    replyToWamid,
    rawPayload: { provider_message_type: type, contacts },
  };
}

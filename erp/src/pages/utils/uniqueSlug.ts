export const normalizeSlug = (value: string) => value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'item';

export const resolveUniqueSlug = async (
    client: any,
    table: string,
    requestedSlug: string,
    excludeId?: string
) => {
    const baseSlug = normalizeSlug(requestedSlug);
    let query = client
        .from(table)
        .select('id, slug')
        .like('slug', `${baseSlug}%`);

    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query;
    if (error) throw error;

    const occupied = new Set(
        (data || []).map((row: any) => String(row.slug || '').toLowerCase())
    );
    if (!occupied.has(baseSlug)) return baseSlug;

    let suffix = 2;
    while (occupied.has(`${baseSlug}-${suffix}`)) suffix += 1;
    return `${baseSlug}-${suffix}`;
};

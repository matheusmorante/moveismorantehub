const meta_catalog_id = '949184464866249';
const meta_access_token = 'EAATYyXkZAGHIBSL8qHqs8u2LsTvZALv4fyoLZChqG6wBQMHYsrJKvKScwiRZBYzhQrY9CZAZAQKZACT5ZAZB8eMOsnxSEzfAzYGqUPoYPZBxggyuhLpjPJ8WDuZA8xdwteFh4OH60LcfFQwaMeZC0ZA3YbfMXvAubuZAeAK1lLB639Kbla2sKv9t5DGqbz6crYZCXoGegZDZD';

async function main() {
  let nextUrl = `https://graph.facebook.com/v26.0/${meta_catalog_id}/products?fields=id,retailer_id,name&limit=100`;
  const all = [];

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${meta_access_token}` }
    });
    const json = await res.json();
    if (json.error) {
      console.error('Meta API error:', json.error);
      break;
    }
    all.push(...(json.data || []));
    nextUrl = json.paging?.next || null;
  }

  console.log(`Total: ${all.length}`);
  for (const item of all) {
    console.log(`${item.retailer_id} | ${item.name}`);
  }
}

main().catch(console.error);

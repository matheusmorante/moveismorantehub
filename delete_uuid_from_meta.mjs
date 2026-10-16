const meta_catalog_id = '949184464866249';
const meta_access_token = 'EAATYyXkZAGHIBSL8qHqs8u2LsTvZALv4fyoLZChqG6wBQMHYsrJKvKScwiRZBYzhQrY9CZAZAQKZACT5ZAZB8eMOsnxSEzfAzYGqUPoYPZBxggyuhLpjPJ8WDuZA8xdwteFh4OH60LcfFQwaMeZC0ZA3YbfMXvAubuZAeAK1lLB639Kbla2sKv9t5DGqbz6crYZCXoGegZDZD';

async function main() {
  const batchRequest = {
    item_type: 'PRODUCT_ITEM',
    requests: [
      {
        method: 'DELETE',
        retailer_id: '6be30515-9326-41f9-b029-344c8611ccf2',
        data: { id: '6be30515-9326-41f9-b029-344c8611ccf2' }
      }
    ]
  };

  const res = await fetch(`https://graph.facebook.com/v26.0/${meta_catalog_id}/items_batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${meta_access_token}`
    },
    body: JSON.stringify(batchRequest)
  });

  const json = await res.json();
  console.log('Delete response:', JSON.stringify(json, null, 2));

  if (json.handles && json.handles[0]) {
    console.log('Checking batch status...');
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(`https://graph.facebook.com/v26.0/${meta_catalog_id}/check_batch_request_status?handle=${json.handles[0]}`, {
      headers: { Authorization: `Bearer ${meta_access_token}` }
    });
    const statusJson = await statusRes.json();
    console.log('Batch status:', JSON.stringify(statusJson, null, 2));
  }
}

main().catch(console.error);

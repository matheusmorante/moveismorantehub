const meta_catalog_id = '949184464866249';
const meta_access_token = 'EAATYyXkZAGHIBSL8qHqs8u2LsTvZALv4fyoLZChqG6wBQMHYsrJKvKScwiRZBYzhQrY9CZAZAQKZACT5ZAZB8eMOsnxSEzfAzYGqUPoYPZBxggyuhLpjPJ8WDuZA8xdwteFh4OH60LcfFQwaMeZC0ZA3YbfMXvAubuZAeAK1lLB639Kbla2sKv9t5DGqbz6crYZCXoGegZDZD';

async function main() {
  const batchRequest = {
    item_type: 'PRODUCT_ITEM',
    requests: [
      {
        method: 'UPDATE',
        retailer_id: '000224-02',
        data: {
          id: '000224-02',
          title: 'Guarda Roupa Florida 2,07 6 Portas 2 Gavetas Freijó/Off White',
          description: 'Guarda Roupa Florida 2,07 6 Portas 2 Gavetas Mopar',
          price: '1649.00 BRL',
          availability: 'in stock',
          image_link: 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/1786500888013-1786500888013.jpg',
          additional_image_link: 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/1786500894090-1786500894090.jpg,https://pub-389127050a434f568c29dc66bdce2567.r2.dev/1786500900431-1786500900431.jpg',
          brand: 'Móveis Morante',
          link: 'https://moveismorante.com.br/produto/guarda-roupa-florida-207-6-portas-2-gavetas-mopar?var=6be30515-9326-41f9-b029-344c8611ccf2',
          condition: 'new',
          color: 'Freijó/Off White',
          product_type: 'Quarto > Guarda-Roupa',
          item_group_id: '',
          custom_label_0: 'Quarto > Guarda-Roupa',
          custom_label_1: '1649,00'
        }
      },
      {
        method: 'UPDATE',
        retailer_id: '000224-01',
        data: {
          id: '000224-01',
          title: 'Guarda Roupa Florida 2,07 6 Portas 2 Gavetas Freijó/Grafite',
          description: 'Guarda Roupa Florida 2,07 6 Portas 2 Gavetas Mopar',
          price: '1649.00 BRL',
          availability: 'in stock',
          image_link: 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/1786500858162-1786500858162.jpg',
          additional_image_link: 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev/1786500868153-1786500868153.jpg,https://pub-389127050a434f568c29dc66bdce2567.r2.dev/1786500874052-1786500874052.jpg',
          brand: 'Móveis Morante',
          link: 'https://moveismorante.com.br/produto/guarda-roupa-florida-207-6-portas-2-gavetas-mopar?var=c7b744aa-dd1a-4be0-a337-ad6d34e68e4c',
          condition: 'new',
          color: 'Freijó/Grafite',
          product_type: 'Quarto > Guarda-Roupa',
          item_group_id: '',
          custom_label_0: 'Quarto > Guarda-Roupa',
          custom_label_1: '1649,00'
        }
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
  console.log('Update batch response:', JSON.stringify(json, null, 2));

  if (json.handles && json.handles[0]) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(`https://graph.facebook.com/v26.0/${meta_catalog_id}/check_batch_request_status?handle=${json.handles[0]}`, {
      headers: { Authorization: `Bearer ${meta_access_token}` }
    });
    const statusJson = await statusRes.json();
    console.log('Batch status:', JSON.stringify(statusJson, null, 2));
  }
}

main().catch(console.error);

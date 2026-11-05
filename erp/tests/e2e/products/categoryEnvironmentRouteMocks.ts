import type { Page } from '@playwright/test';
import { createCategoryEnvironmentFixtures } from './categoryEnvironmentFixtures';

const availableAttributes = [
  { id: 'attr-cor', name: 'Cor' },
  { id: 'attr-material', name: 'Material' },
  { id: 'attr-dimensoes', name: 'Dimens\u00f5es' }
];

export const createCategoryEnvironmentRouteMocks = (testRunId: string) => {
  let currentEnvironments: any[] = [];
  let currentCategories: any[] = [];
  let currentRelationships: { parent_id: string; child_id: string }[] = [];
  let currentProductCategories: { product_id: string; category_id: string }[] = [];
  let currentCategoryAttributes: { category_id: string; attribute_id: string; is_required: boolean }[] = [];
  let productVariationMutationCount = 0;
  const fixtures = createCategoryEnvironmentFixtures(testRunId);
  currentEnvironments = fixtures.environments;
  currentCategories = fixtures.categories;
  currentRelationships = fixtures.relationships;
  currentProductCategories = fixtures.productCategories;

  return {
    get currentCategories() { return currentCategories; },
    get currentRelationships() { return currentRelationships; },
    get currentCategoryAttributes() { return currentCategoryAttributes; },
    get productVariationMutationCount() { return productVariationMutationCount; },
    install: async (page: Page) => {
      await page.route('**/rest/v1/categories*', async route => {
          const req = route.request();
          const method = req.method().toUpperCase();
          const url = req.url();

          if (method === 'GET' || method === 'HEAD') {
              if (url.includes('type=eq.environment')) {
                  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentEnvironments) });
              } else if (url.includes('type=eq.category')) {
                  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentCategories) });
              } else {
                  await route.fulfill({
                      status: 200,
                      contentType: 'application/json',
                      body: JSON.stringify([...currentEnvironments, ...currentCategories])
                  });
              }
          } else if (method === 'POST') {
              const postData = req.postDataJSON();
              const items = Array.isArray(postData) ? postData : [postData];
              const inserted = items.map((item: any, idx: number) => ({
                  id: item.id || `created-${Date.now()}-${idx}`,
                  name: item.name,
                  slug: item.slug || `slug-${Date.now()}`,
                  type: item.type || 'category'
              }));

              inserted.forEach(item => {
                  if (item.type === 'environment') {
                      currentEnvironments.push(item);
                  } else {
                      currentCategories.push(item);
                  }
              });

              await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(inserted) });
          } else if (method === 'PATCH') {
              const patchData = req.postDataJSON();
              const matchId = url.match(/id=eq\.([^&]+)/);
              if (matchId) {
                  const targetId = decodeURIComponent(matchId[1]);
                  const envIndex = currentEnvironments.findIndex(e => e.id === targetId);
                  if (envIndex >= 0) {
                      currentEnvironments[envIndex] = { ...currentEnvironments[envIndex], ...patchData };
                  }
                  const catIndex = currentCategories.findIndex(c => c.id === targetId);
                  if (catIndex >= 0) {
                      currentCategories[catIndex] = { ...currentCategories[catIndex], ...patchData };
                  }
              }
              await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
          } else if (method === 'DELETE') {
              const matchId = url.match(/id=eq\.([^&]+)/);
              if (matchId) {
                  const targetId = decodeURIComponent(matchId[1]);
                  currentEnvironments = currentEnvironments.filter(e => e.id !== targetId);
                  currentCategories = currentCategories.filter(c => c.id !== targetId);
              }
              await route.fulfill({ status: 204, body: '' });
          } else {
              await route.continue();
          }
      });

      await page.route('**/rest/v1/category_relationships*', async route => {
          const req = route.request();
          const method = req.method().toUpperCase();
          const url = req.url();

          if (method === 'GET' || method === 'HEAD') {
              const isHead = method === 'HEAD' || req.headers()['prefer']?.includes('count=exact') || url.includes('count=exact');
              if (url.includes('parent_id=eq.')) {
                  const match = url.match(/parent_id=eq\.([^&]+)/);
                  const pid = match ? decodeURIComponent(match[1]) : '';
                  const filtered = currentRelationships.filter(r => r.parent_id === pid);
                  if (isHead) {
                      await route.fulfill({
                          status: 200,
                          headers: { 'content-range': `0-${filtered.length}/${filtered.length}` },
                          body: JSON.stringify(filtered)
                      });
                      return;
                  }
                  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(filtered) });
                  return;
              }

              await route.fulfill({
                  status: 200,
                  contentType: 'application/json',
                  body: JSON.stringify(currentRelationships)
              });
          } else if (method === 'POST') {
              const postData = req.postDataJSON();
              const items = Array.isArray(postData) ? postData : [postData];
              items.forEach(it => currentRelationships.push(it));
              await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(items) });
          } else if (method === 'DELETE') {
              const matchParent = url.match(/parent_id=eq\.([^&]+)/);
              const matchChild = url.match(/child_id=eq\.([^&]+)/);

              if (matchParent && matchChild) {
                  const pId = decodeURIComponent(matchParent[1]);
                  const cId = decodeURIComponent(matchChild[1]);
                  currentRelationships = currentRelationships.filter(r => !(r.parent_id === pId && r.child_id === cId));
              } else if (matchParent) {
                  const pId = decodeURIComponent(matchParent[1]);
                  currentRelationships = currentRelationships.filter(r => r.parent_id !== pId);
              } else if (matchChild) {
                  const cId = decodeURIComponent(matchChild[1]);
                  currentRelationships = currentRelationships.filter(r => r.child_id !== cId);
              }
              await route.fulfill({ status: 204, body: '' });
          } else {
              await route.continue();
          }
      });

      await page.route('**/rest/v1/product_categories*', async route => {
          const req = route.request();
          const method = req.method().toUpperCase();
          const url = req.url();
          const matchCat = url.match(/category_id=eq\.([^&]+)/);

          if (matchCat) {
              const cId = decodeURIComponent(matchCat[1]);
              const filtered = currentProductCategories.filter(pc => pc.category_id === cId);
              await route.fulfill({
                  status: 200,
                  headers: { 'content-range': `0-${filtered.length}/${filtered.length}` },
                  contentType: 'application/json',
                  body: JSON.stringify(filtered)
              });
              return;
          }

          await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(currentProductCategories)
          });
      });

      await page.route('**/rest/v1/products*', async route => {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      });

      await page.route('**/rest/v1/product_variations*', async route => {
          if (!['GET', 'HEAD'].includes(route.request().method().toUpperCase())) {
              productVariationMutationCount++;
          }
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      });

      await page.route('**/rest/v1/attributes*', async route => {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(availableAttributes) });
      });

      await page.route('**/rest/v1/category_attributes*', async route => {
          const req = route.request();
          const method = req.method().toUpperCase();
          const url = req.url();

          if (method === 'GET' || method === 'HEAD') {
              const matchCat = url.match(/category_id=eq\.([^&]+)/);
              if (matchCat) {
                  const cId = decodeURIComponent(matchCat[1]);
                  const filtered = currentCategoryAttributes.filter(ca => ca.category_id === cId);
                  // enriquece com o objeto attributes
                  const enriched = filtered.map(ca => ({
                      ...ca,
                      attributes: availableAttributes.find(a => a.id === ca.attribute_id) || null
                  }));
                  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(enriched) });
                  return;
              }
              await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentCategoryAttributes) });
          } else if (method === 'POST') {
              const postData = req.postDataJSON();
              const items = Array.isArray(postData) ? postData : [postData];
              items.forEach((it: any) => currentCategoryAttributes.push(it));
              await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(items) });
          } else if (method === 'DELETE') {
              const matchCat = url.match(/category_id=eq\.([^&]+)/);
              if (matchCat) {
                  const cId = decodeURIComponent(matchCat[1]);
                  currentCategoryAttributes = currentCategoryAttributes.filter(ca => ca.category_id !== cId);
              }
              await route.fulfill({ status: 204, body: '' });
          } else {
              await route.continue();
          }
      });

    },
  };
};

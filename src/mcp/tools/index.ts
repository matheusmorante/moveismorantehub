import { buildPostPromptContextTool } from './buildPostPromptContext.js';
import { getCampaignTool } from './getCampaign.js';
import { getCampaignPromptsTool } from './getCampaignPrompts.js';
import { getGeneratedPostReferencesTool } from './getGeneratedPostReferences.js';
import { getPostGenerationContextTool } from './getPostGenerationContext.js';
import { getProductTool } from './getProduct.js';
import { getProductImagesTool } from './getProductImages.js';
import { getStoreAssetsTool } from './getStoreAssets.js';
import { searchProductsTool } from './searchProducts.js';

export const ALL_MCP_TOOLS = [
  searchProductsTool,
  getProductTool,
  getProductImagesTool,
  getCampaignTool,
  getCampaignPromptsTool,
  getStoreAssetsTool,
  getGeneratedPostReferencesTool,
  getPostGenerationContextTool,
  buildPostPromptContextTool,
] as const;

export type McpToolName = (typeof ALL_MCP_TOOLS)[number]['name'];

export function getMcpToolByName(name: string) {
  return ALL_MCP_TOOLS.find(t => t.name === name);
}

export {
  buildPostPromptContextTool,
  getCampaignTool,
  getCampaignPromptsTool,
  getGeneratedPostReferencesTool,
  getPostGenerationContextTool,
  getProductTool,
  getProductImagesTool,
  getStoreAssetsTool,
  searchProductsTool,
};

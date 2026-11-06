# @channel3/ai-sdk-tools

[Channel3](https://channel3.ai) product search tools for the [Vercel AI SDK](https://ai-sdk.dev). Give your agent search across 100M+ products from thousands of retailers, with every retailer's offer and live price.

Works with AI SDK v6 and v7.

## Installation

```bash
npm install ai @channel3/ai-sdk-tools
# or
pnpm add ai @channel3/ai-sdk-tools
```

## Setup

Set `CHANNEL3_API_KEY` in your environment. [Create a free API key](https://channel3.ai/sign-up/developer): every account gets 1,000 free credits a month. A search uses one credit; product details by ID are free, and each retailer URL lookup uses one credit.

## Usage

```typescript
import { generateText, isStepCount } from 'ai';
import { searchProductsTool, getProductsTool } from '@channel3/ai-sdk-tools';

const { text } = await generateText({
  model: 'anthropic/claude-sonnet-5-5',
  prompt: 'Find me a leather golf glove under $40 and tell me which retailer has it cheapest.',
  tools: {
    search_products: searchProductsTool,
    get_products: getProductsTool,
  },
  stopWhen: isStepCount(5),
});

console.log(text);
```

`channel3Tools()` returns both tools in one object, ready to spread into `tools`:

```typescript
import { channel3Tools } from '@channel3/ai-sdk-tools';

const tools = { ...channel3Tools(), ...yourOtherTools };
```

## Tools

### `search_products`

Searches for one product type and returns in-stock products, each with up to two images and every retailer's offer.

**Input:**

- `query`: one product type and its constraints in natural language, such as `"red leather jacket under $200"`.
- `image_url`: a public image URL for visual search. Combine it with `query` for text plus image.

At least one of `query` or `image_url` is required.

**Output:** `{ products: ProductSummary[] }`. The model sees a short text version, one line per product with title, brand, best price and ID. The full structured result stays available to your app, for example to render product cards from the tool part.

### `get_products`

Gets full product data (description, attributes, variants, images and offers) for up to 40 products in parallel.

**Input:**

- `product_ids`: product IDs from `search_products`, or retailer product URLs.

**Output:** `{ products: ProductDetail[], unresolved?: string[] }`. Inputs that can't be resolved are listed in `unresolved`. The call fails only when none resolve.

Offer URLs are Channel3 buy links, so purchases earn affiliate commission for the API key's account.

## Options

`createSearchProductsTool(options)`, `createGetProductsTool(options)` and `channel3Tools(options)` accept:

| Option | Description |
| --- | --- |
| `apiKey` | Channel3 API key. Defaults to `CHANNEL3_API_KEY`. |
| `conversationId` | Groups one chat's calls together in your Channel3 analytics. |
| `limit` | Products per search, from 1 to 30. Defaults to 8. Search tool only. |
| `baseUrl` | Overrides the API base URL. |

```typescript
import { createSearchProductsTool } from '@channel3/ai-sdk-tools';

const search_products = createSearchProductsTool({
  apiKey: process.env.MY_CHANNEL3_KEY,
  conversationId: chatId,
  limit: 12,
});
```

## Using the SDK directly

For the rest of the Channel3 API (browse, similar products, brands, price tracking and more), use [`@channel3/sdk`](https://www.npmjs.com/package/@channel3/sdk) inside your own `tool()`.

## Links

- [Documentation](https://channel3.ai/docs/ai-sdk)
- [Channel3 MCP server](https://github.com/channel3-ai/mcp-server), which serves the same two tools to MCP clients
- [API reference](https://channel3.ai/docs)

## License

MIT

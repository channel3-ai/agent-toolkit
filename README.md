# @channel3/agent-toolkit

[Channel3](https://channel3.ai) product search tools for AI agents. Give your agent search across 100M+ products from thousands of retailers, with every retailer's offer and live price.

| Framework | Import |
| --- | --- |
| [Vercel AI SDK](https://ai-sdk.dev) v6 and v7 | `@channel3/agent-toolkit/ai-sdk` |
| [LangChain.js](https://js.langchain.com) v1 | `@channel3/agent-toolkit/langchain` |

The tools are the same ones the [Channel3 MCP server](https://github.com/channel3-ai/mcp-server) serves to MCP clients: `search_products` and `get_products`.

## Setup

Set `CHANNEL3_API_KEY` in your environment. [Create a free API key](https://channel3.ai/sign-up/developer): every account gets 1,000 free credits a month. A search uses one credit; product details by ID are free, and each retailer URL lookup uses one credit.

## Vercel AI SDK

```bash
npm install ai @channel3/agent-toolkit
```

```typescript
import { generateText, isStepCount } from 'ai';
import { searchProductsTool, getProductsTool } from '@channel3/agent-toolkit/ai-sdk';

const { text } = await generateText({
  model: 'anthropic/claude-sonnet-5.5',
  prompt: 'Find me a leather golf glove under $40 and tell me which retailer has it cheapest.',
  tools: {
    search_products: searchProductsTool,
    get_products: getProductsTool,
  },
  stopWhen: isStepCount(5),
});

console.log(text);
```

`channel3Tools()` returns both tools in one object: `tools: { ...channel3Tools(), ...yourOtherTools }`.

For `search_products`, the model receives a short text version of the result, one line per product with title, brand, best price and ID. The full structured result stays in the tool output, so your app can render product cards from the tool part.

## LangChain.js

```bash
npm install langchain @langchain/core @langchain/anthropic @channel3/agent-toolkit
```

```typescript
import { createAgent } from 'langchain';
import { channel3Tools } from '@channel3/agent-toolkit/langchain';

const agent = createAgent({
  model: 'anthropic:claude-sonnet-5-5',
  tools: channel3Tools(),
});

const result = await agent.invoke({
  messages: [{ role: 'user', content: 'Find me a leather golf glove under $40.' }],
});
```

Both tools use `responseFormat: "content_and_artifact"`. The model sees a summary for `search_products` and JSON for `get_products`. The full structured result is on the `ToolMessage` as `artifact`.

## Tools

### `search_products`

Searches for one product type and returns in-stock products, each with up to two images and every retailer's offer.

- `query`: one product type and its constraints in natural language, such as `"red leather jacket under $200"`.
- `image_url`: a public image URL for visual search. Combine it with `query` for text plus image.

At least one is required. Returns `{ products: ProductSummary[] }`.

### `get_products`

Gets full product data (description, attributes, variants, images and offers) for up to 40 products in parallel.

- `product_ids`: product IDs from `search_products`, or retailer product URLs.

Returns `{ products: ProductDetail[], unresolved?: string[] }`. Inputs that can't be resolved are listed in `unresolved`. The call fails only when none resolve.

Offer URLs are Channel3 buy links, so purchases earn affiliate commission for the API key's account.

## Options

Each framework entry exports `createSearchProductsTool(options)`, `createGetProductsTool(options)` and `channel3Tools(options)`:

| Option | Description |
| --- | --- |
| `apiKey` | Channel3 API key. Defaults to `CHANNEL3_API_KEY`. |
| `conversationId` | Groups one chat's calls together in your Channel3 analytics. |
| `limit` | Products per search, from 1 to 30. Defaults to 8. Search tool only. |
| `baseUrl` | Overrides the API base URL. |

## Other frameworks

The root export, `@channel3/agent-toolkit`, has the framework-free pieces: `searchProducts()`, `getProducts()`, the zod input schemas, and the tool names and descriptions. Use them to wrap the same tools for any other agent framework.

For the rest of the Channel3 API (browse, similar products, brands, price tracking and more), use [`@channel3/sdk`](https://www.npmjs.com/package/@channel3/sdk).

## Links

- [Vercel AI SDK guide](https://channel3.ai/docs/ai-sdk)
- [Channel3 docs](https://channel3.ai/docs)

## License

MIT

import { Channel3 } from "@channel3/sdk";
import type { Product } from "@channel3/sdk/resources";

export interface Channel3ToolOptions {
	/** Channel3 API key. Defaults to the `CHANNEL3_API_KEY` environment variable. */
	apiKey?: string;
	/** Override the API base URL. */
	baseUrl?: string;
	/** Groups the calls of one chat together in your Channel3 analytics. Sent as `X-Conversation-Id`. */
	conversationId?: string;
}

const CONVERSATION_ID_HEADER = "X-Conversation-Id";

export function createClient(options: Channel3ToolOptions): Channel3 {
	const apiKey = options.apiKey ?? process.env.CHANNEL3_API_KEY;
	if (!apiKey) {
		throw new Error(
			"Missing Channel3 API key. Set CHANNEL3_API_KEY or pass `apiKey`. " +
				"Create a free key at https://channel3.ai/sign-up/developer.",
		);
	}
	return new Channel3({
		apiKey,
		baseUrl: options.baseUrl,
		...(options.conversationId
			? { headers: { [CONVERSATION_ID_HEADER]: options.conversationId } }
			: {}),
	});
}

/** Channel3 product page or buy-link URLs carry the product ID in their path. */
function channel3ProductId(url: URL): string | null {
	const host = url.hostname.toLowerCase().replace(/^www\./, "");
	const parts = url.pathname.split("/").filter(Boolean);
	if (host === "buy.trychannel3.com") {
		return parts[0]?.split("-")[0] || null;
	}
	if ((host === "trychannel3.com" || host === "channel3.ai") && parts[0] === "products") {
		return parts[1] || null;
	}
	return null;
}

/** Resolves a product ID, a Channel3 product URL, or any retailer URL to a product. */
export async function resolveProduct(client: Channel3, input: string): Promise<Product> {
	const value = input.trim();
	let url: URL | null = null;
	if (/^https?:\/\//i.test(value)) {
		try {
			url = new URL(value);
		} catch {
			url = null;
		}
	}
	if (!url) {
		return client.products.retrieve({ product_id: value });
	}
	const productId = channel3ProductId(url);
	if (productId) {
		return client.products.retrieve({ product_id: productId });
	}
	const response = await client.products.lookup({ url: value });
	return response.product;
}

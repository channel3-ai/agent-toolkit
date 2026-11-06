import { type Tool, tool } from "ai";
import { z } from "zod";

import { type Channel3ToolOptions, createClient, resolveProduct } from "./client";
import {
	formatProductDetail,
	formatProductSummary,
	type ProductDetail,
	type ProductSummary,
	productLine,
} from "./format";

export type { Channel3ToolOptions } from "./client";
export type { Offer, ProductDetail, ProductSummary } from "./format";

export interface SearchProductsToolOptions extends Channel3ToolOptions {
	/** Maximum products per search, from 1 to 30. Defaults to 8. */
	limit?: number;
}

export interface SearchProductsResult {
	products: ProductSummary[];
}

export interface GetProductsResult {
	products: ProductDetail[];
	/** Inputs that could not be resolved to a product. */
	unresolved?: string[];
}

const searchInputSchema = z
	.object({
		query: z
			.string()
			.trim()
			.min(1)
			.optional()
			.describe(
				"One product type and its constraints in natural language " +
					"(brand, color, material, size, price, gender).\n" +
					'Good: "red leather jacket under $200"; "leather golf glove under $40".\n' +
					'Bad: "gift ideas for dad"; "cool sneakers"; "golf glove or rangefinder".',
			),
		image_url: z
			.string()
			.optional()
			.describe("Public image URL for visual search. Combine with `query` for text + image."),
	})
	.refine((input) => Boolean(input.query || input.image_url), {
		message: "At least one of `query` or `image_url` is required.",
	});

const getProductsInputSchema = z.object({
	product_ids: z
		.array(z.string().describe("Product ID (from a `search_products` result) or URL."))
		.min(1)
		.max(40)
		.describe("Products to fetch in parallel."),
});

export type SearchProductsInput = z.infer<typeof searchInputSchema>;
export type GetProductsInput = z.infer<typeof getProductsInputSchema>;
export type SearchProductsTool = Tool<SearchProductsInput, SearchProductsResult>;
export type GetProductsTool = Tool<GetProductsInput, GetProductsResult>;

/** Creates the `search_products` tool: one product type per call, in-stock results only. */
export function createSearchProductsTool(
	options: SearchProductsToolOptions = {},
): SearchProductsTool {
	const limit = options.limit ?? 8;
	return tool({
		description:
			"Search 100M+ products across thousands of retailers for one product type. " +
			"Call once for each distinct product type, and send independent calls together. " +
			"Put relevant constraints in `query`.\n" +
			`Returns up to ${limit} products with their retailer offers and live prices.`,
		inputSchema: searchInputSchema,
		execute: async ({ query, image_url }): Promise<SearchProductsResult> => {
			const page = await createClient(options).products.search({
				query,
				image_url,
				filters: { availability: ["InStock"] },
				limit,
				config: { mode: "agentic" },
			});
			return { products: page.data.map(formatProductSummary) };
		},
		toModelOutput: ({ input, output }) => {
			const what = input.query ? ` for "${input.query}"` : " for the image";
			return {
				type: "text",
				value: [
					`Found ${output.products.length} products${what}.`,
					...output.products.map(productLine),
				].join("\n"),
			};
		},
	});
}

/** Creates the `get_products` tool: full details by product ID or retailer URL. */
export function createGetProductsTool(options: Channel3ToolOptions = {}): GetProductsTool {
	return tool({
		description:
			"Get full product data (offers, description, attributes, images) by product ID " +
			"from a search result, or by retailer URL. Pass several IDs in one call to compare.\n" +
			"Use search_products to find products.",
		inputSchema: getProductsInputSchema,
		execute: async ({ product_ids }): Promise<GetProductsResult> => {
			const client = createClient(options);
			const results = await Promise.allSettled(
				product_ids.map((id) => resolveProduct(client, id)),
			);
			const products: ProductDetail[] = [];
			const unresolved: string[] = [];
			product_ids.forEach((id, index) => {
				const result = results[index];
				if (result?.status === "fulfilled") {
					products.push(formatProductDetail(result.value));
				} else {
					unresolved.push(id);
				}
			});
			if (products.length === 0) {
				const firstFailure = results.find(
					(result): result is PromiseRejectedResult => result.status === "rejected",
				);
				throw firstFailure?.reason instanceof Error
					? firstFailure.reason
					: new Error(String(firstFailure?.reason));
			}
			return unresolved.length > 0 ? { products, unresolved } : { products };
		},
	});
}

/** `search_products` with default options, reading `CHANNEL3_API_KEY` at call time. */
export const searchProductsTool: SearchProductsTool = createSearchProductsTool();

/** `get_products` with default options, reading `CHANNEL3_API_KEY` at call time. */
export const getProductsTool: GetProductsTool = createGetProductsTool();

/** Both Channel3 tools, keyed by their MCP names, ready to spread into `tools`. */
export function channel3Tools(options: SearchProductsToolOptions = {}): {
	search_products: SearchProductsTool;
	get_products: GetProductsTool;
} {
	return {
		search_products: createSearchProductsTool(options),
		get_products: createGetProductsTool(options),
	};
}

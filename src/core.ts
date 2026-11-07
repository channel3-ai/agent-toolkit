import { z } from "zod";

import { type Channel3ToolOptions, createClient, resolveProduct } from "./client";
import {
	formatProductDetail,
	formatProductSummary,
	type ProductDetail,
	type ProductSummary,
	productLine,
} from "./format";

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

export const SEARCH_PRODUCTS_NAME = "search_products";
export const GET_PRODUCTS_NAME = "get_products";

export const searchProductsInputSchema = z
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

export const getProductsInputSchema = z.object({
	product_ids: z
		.array(z.string().describe("Product ID (from a `search_products` result) or URL."))
		.min(1)
		.max(40)
		.describe("Products to fetch in parallel."),
});

export type SearchProductsInput = z.infer<typeof searchProductsInputSchema>;
export type GetProductsInput = z.infer<typeof getProductsInputSchema>;

export function searchProductsDescription(limit: number): string {
	return (
		"Search 100M+ products across thousands of retailers for one product type. " +
		"Call once for each distinct product type, and send independent calls together. " +
		"Put relevant constraints in `query`.\n" +
		`Returns up to ${limit} products with their retailer offers and live prices.`
	);
}

export const GET_PRODUCTS_DESCRIPTION =
	"Get full product data (offers, description, attributes, images) by product ID " +
	"from a search result, or by retailer URL. Pass several IDs in one call to compare.\n" +
	"Use search_products to find products.";

export function searchLimit(options: SearchProductsToolOptions): number {
	return options.limit ?? 8;
}

/** In-stock agentic search for one product type. */
export async function searchProducts(
	options: SearchProductsToolOptions,
	input: SearchProductsInput,
): Promise<SearchProductsResult> {
	const page = await createClient(options).products.search({
		query: input.query,
		image_url: input.image_url,
		filters: { availability: ["InStock"] },
		limit: searchLimit(options),
		config: { mode: "agentic" },
	});
	return { products: page.data.map(formatProductSummary) };
}

/** Fetches every input in parallel; fails only when none resolve. */
export async function getProducts(
	options: Channel3ToolOptions,
	input: GetProductsInput,
): Promise<GetProductsResult> {
	const client = createClient(options);
	const results = await Promise.allSettled(
		input.product_ids.map((id) => resolveProduct(client, id)),
	);
	const products: ProductDetail[] = [];
	const unresolved: string[] = [];
	input.product_ids.forEach((id, index) => {
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
}

/** The compact text the model sees for a search: one line per product. */
export function summarizeSearch(
	input: Partial<SearchProductsInput> | undefined,
	result: SearchProductsResult,
): string {
	const what = input?.query ? ` for "${input.query}"` : input?.image_url ? " for the image" : "";
	return [
		`Found ${result.products.length} products${what}.`,
		...result.products.map(productLine),
	].join("\n");
}

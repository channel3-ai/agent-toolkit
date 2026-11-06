import { type Tool, tool } from "ai";

import type { Channel3ToolOptions } from "./client";
import {
	GET_PRODUCTS_DESCRIPTION,
	type GetProductsInput,
	type GetProductsResult,
	getProducts,
	getProductsInputSchema,
	type SearchProductsInput,
	type SearchProductsResult,
	type SearchProductsToolOptions,
	searchLimit,
	searchProducts,
	searchProductsDescription,
	searchProductsInputSchema,
	summarizeSearch,
} from "./core";

export * from "./types";

export type SearchProductsTool = Tool<SearchProductsInput, SearchProductsResult>;
export type GetProductsTool = Tool<GetProductsInput, GetProductsResult>;

/** Creates the `search_products` tool: one product type per call, in-stock results only. */
export function createSearchProductsTool(
	options: SearchProductsToolOptions = {},
): SearchProductsTool {
	return tool({
		description: searchProductsDescription(searchLimit(options)),
		inputSchema: searchProductsInputSchema,
		execute: (input) => searchProducts(options, input),
		toModelOutput: ({ input, output }) => ({
			type: "text",
			value: summarizeSearch(input, output),
		}),
	});
}

/** Creates the `get_products` tool: full details by product ID or retailer URL. */
export function createGetProductsTool(options: Channel3ToolOptions = {}): GetProductsTool {
	return tool({
		description: GET_PRODUCTS_DESCRIPTION,
		inputSchema: getProductsInputSchema,
		execute: (input) => getProducts(options, input),
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

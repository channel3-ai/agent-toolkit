import { type DynamicStructuredTool, tool } from "@langchain/core/tools";

import type { Channel3ToolOptions } from "./client";
import {
	GET_PRODUCTS_DESCRIPTION,
	GET_PRODUCTS_NAME,
	getProducts,
	getProductsInputSchema,
	SEARCH_PRODUCTS_NAME,
	type SearchProductsToolOptions,
	searchLimit,
	searchProducts,
	searchProductsDescription,
	searchProductsInputSchema,
	summarizeSearch,
} from "./core";

export * from "./types";

/**
 * Creates the `search_products` tool. The model receives a one-line-per-product summary;
 * the full `SearchProductsResult` is the ToolMessage artifact.
 */
export function createSearchProductsTool(
	options: SearchProductsToolOptions = {},
): DynamicStructuredTool {
	return tool(
		async (input) => {
			const result = await searchProducts(options, input);
			return [summarizeSearch(input, result), result];
		},
		{
			name: SEARCH_PRODUCTS_NAME,
			description: searchProductsDescription(searchLimit(options)),
			schema: searchProductsInputSchema,
			responseFormat: "content_and_artifact",
		},
	) as DynamicStructuredTool;
}

/**
 * Creates the `get_products` tool. The model receives the result as JSON;
 * the parsed `GetProductsResult` is the ToolMessage artifact.
 */
export function createGetProductsTool(options: Channel3ToolOptions = {}): DynamicStructuredTool {
	return tool(
		async (input) => {
			const result = await getProducts(options, input);
			return [JSON.stringify(result), result];
		},
		{
			name: GET_PRODUCTS_NAME,
			description: GET_PRODUCTS_DESCRIPTION,
			schema: getProductsInputSchema,
			responseFormat: "content_and_artifact",
		},
	) as DynamicStructuredTool;
}

/** Both Channel3 tools, ready to pass to `createAgent({ tools })` or `model.bindTools()`. */
export function channel3Tools(options: SearchProductsToolOptions = {}): DynamicStructuredTool[] {
	return [createSearchProductsTool(options), createGetProductsTool(options)];
}

import type { Product, ProductImage, ProductOffer } from "@channel3/sdk/resources";

const CDN_IMAGE_PREFIX = "https://cdn.trychannel3.com/";

export type Offer = Omit<ProductOffer, "max_commission_rate">;

export type ProductSummary = {
	id: string;
	title: string;
	brands: Product["brands"];
	images: ProductImage[];
	offers: Offer[];
};

export type ProductDetail = Omit<Product, "offers"> & { offers: Offer[] };

function cdnImages(images: ProductImage[] | undefined): ProductImage[] {
	return (images ?? []).filter((image) => image.url.startsWith(CDN_IMAGE_PREFIX));
}

function withCleanedUrl(image: ProductImage): ProductImage {
	return image.cleaned_url ? { ...image, url: image.cleaned_url } : image;
}

/** Up to two display images: the background-removed or main image first, then one other. */
function summaryImages(product: Product): ProductImage[] {
	const images = cdnImages(product.images);
	const primarySource =
		images.find((image) => image.cleaned_url != null) ??
		images.find((image) => image.is_main_image) ??
		images[0];
	if (!primarySource) {
		return [];
	}
	const primary = withCleanedUrl(primarySource);
	const second = images.find(
		(image) =>
			image !== primarySource && image.url !== primary.url && image.cleaned_url !== primary.url,
	);
	return second ? [primary, withCleanedUrl(second)] : [primary];
}

function formatOffers(offers: ProductOffer[] | undefined): Offer[] {
	return (offers ?? []).map(({ max_commission_rate: _, ...offer }) => offer);
}

export function formatProductSummary(product: Product): ProductSummary {
	return {
		id: product.id,
		title: product.title,
		brands: product.brands,
		images: summaryImages(product),
		offers: formatOffers(product.offers),
	};
}

export function formatProductDetail(product: Product): ProductDetail {
	return {
		...product,
		images: cdnImages(product.images).slice(0, 5),
		offers: formatOffers(product.offers),
	};
}

/** The lowest-priced in-stock offer, or the lowest-priced offer when none are in stock. */
function leadOffer(offers: Offer[]): Offer | undefined {
	const byPrice = [...offers].sort((a, b) => a.price.price - b.price.price);
	return byPrice.find((offer) => offer.availability === "InStock") ?? byPrice[0];
}

function formatCurrency(amount: number, currency: string): string {
	try {
		return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
	} catch {
		return `${currency} ${amount.toFixed(2)}`;
	}
}

/** One line per product for the model: title, brands, best price and retailer, and the ID. */
export function productLine(product: { id: string; title: string; brands?: Product["brands"]; offers: Offer[] }): string {
	const parts = [`"${product.title}"`];
	const brands = (product.brands ?? []).map((brand) => brand.name).join(", ");
	if (brands) {
		parts.push(brands);
	}
	const best = leadOffer(product.offers);
	if (best) {
		parts.push(`${formatCurrency(best.price.price, best.price.currency)} at ${best.domain}`);
	}
	return `- ${parts.join(" — ")} [id: ${product.id}]`;
}

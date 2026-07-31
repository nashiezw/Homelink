import type { Metadata } from "next";
import {
  enabledLibraryFormats,
  type LibraryProduct,
} from "@/lib/library/catalog";
import type { LibraryStoreSettings } from "@/lib/library/settings-shared";
import { getCanonicalSiteUrl } from "@/lib/seo/site-url";

const SITE_NAME = "HouseLink Zimbabwe";
const LIBRARY_NAME = "HouseLink Library";

export type LibraryPublicReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string;
  createdAt: string;
};

export function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function libraryAbsoluteUrl(pathOrUrl?: string | null) {
  const siteUrl = getCanonicalSiteUrl();
  if (!pathOrUrl?.trim()) return `${siteUrl}/images/houselink-hero.webp`;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${siteUrl}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function truncateMeta(text: string, max = 160) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

function productDescription(product: LibraryProduct) {
  return truncateMeta(
    product.metaDescription?.trim() ||
      product.shortDescription?.trim() ||
      product.description?.trim() ||
      `${product.title} from ${LIBRARY_NAME} — professional property resources for Zimbabwe.`,
  );
}

function productImage(product: LibraryProduct) {
  return product.seoImageUrl || product.gallery[0]?.url || "/images/houselink-hero.webp";
}

function indexableRobots(index: boolean): Metadata["robots"] {
  return index
    ? { index: true, follow: true, googleBot: { index: true, follow: true } }
    : { index: false, follow: false, googleBot: { index: false, follow: false } };
}

export function buildLibraryStoreMetadata(settings: LibraryStoreSettings): Metadata {
  const title = settings.seo.storeTitle?.trim() || `${LIBRARY_NAME} | ${SITE_NAME}`;
  const description = truncateMeta(
    settings.seo.storeDescription?.trim() ||
      "Buy property books, manuals, contracts, forms, templates and digital toolkits for Zimbabwe real estate professionals.",
  );
  const image = settings.seo.storeOgImage?.trim() || "/images/houselink-hero.webp";
  const keywords = [
    settings.seo.focusKeyword,
    "property books Zimbabwe",
    "real estate manuals Zimbabwe",
    "property contracts Zimbabwe",
    "HouseLink Library",
  ].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,
    alternates: { canonical: "/library" },
    robots: indexableRobots(settings.seo.robotsIndex),
    openGraph: {
      title,
      description,
      type: "website",
      url: "/library",
      siteName: SITE_NAME,
      locale: "en_ZW",
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function buildLibraryProductMetadata(
  product: LibraryProduct,
  options?: { robotsIndex?: boolean },
): Metadata {
  const title = product.seoTitle?.trim() || `${product.title} | ${LIBRARY_NAME}`;
  const description = productDescription(product);
  const image = productImage(product);
  const keywords = Array.from(
    new Set(
      [
        product.seoFocusKeyword,
        product.title,
        product.author,
        product.category,
        product.collection,
        ...product.tags,
        "HouseLink Library",
        "Zimbabwe property",
      ].filter(Boolean) as string[],
    ),
  );
  const index = options?.robotsIndex !== false && product.status === "PUBLISHED";

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/library/${product.slug}` },
    robots: indexableRobots(index),
    openGraph: {
      title,
      description,
      type: "website",
      url: `/library/${product.slug}`,
      siteName: SITE_NAME,
      locale: "en_ZW",
      images: [{ url: image, alt: product.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function buildLibraryStoreJsonLd(input: {
  settings: LibraryStoreSettings;
  products: LibraryProduct[];
}) {
  const siteUrl = getCanonicalSiteUrl();
  const libraryUrl = `${siteUrl}/library`;
  const title = input.settings.seo.storeTitle?.trim() || LIBRARY_NAME;
  const description = input.settings.seo.storeDescription?.trim() || "";
  const image = libraryAbsoluteUrl(input.settings.seo.storeOgImage || "/images/houselink-hero.webp");
  const listed = input.products.filter((product) => product.status === "PUBLISHED").slice(0, 24);

  return [
    {
      "@context": "https://schema.org",
      "@type": ["CollectionPage", "Store"],
      "@id": `${libraryUrl}#store`,
      name: title,
      description,
      url: libraryUrl,
      image,
      inLanguage: "en-ZW",
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: siteUrl },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Library", item: libraryUrl },
        ],
      },
      potentialAction: {
        "@type": "SearchAction",
        target: `${libraryUrl}?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${libraryUrl}#catalogue`,
      name: `${LIBRARY_NAME} catalogue`,
      numberOfItems: listed.length,
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      itemListElement: listed.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteUrl}/library/${product.slug}`,
        name: product.title,
        image: libraryAbsoluteUrl(productImage(product)),
      })),
    },
  ];
}

export function buildLibraryProductJsonLd(input: {
  product: LibraryProduct;
  reviews?: LibraryPublicReview[];
}) {
  const siteUrl = getCanonicalSiteUrl();
  const product = input.product;
  const url = `${siteUrl}/library/${product.slug}`;
  const image = libraryAbsoluteUrl(productImage(product));
  const formats = enabledLibraryFormats(product);
  const isBookLike = ["PRINTED_BOOK", "PDF", "DIGITAL_BOOK", "TRAINING_MANUAL"].includes(product.productType);
  const priceValidUntil = new Date();
  priceValidUntil.setFullYear(priceValidUntil.getFullYear() + 1);

  const offers = formats.map((format) => ({
    "@type": "Offer",
    "@id": `${url}#offer-${format.id}`,
    name: format.label,
    sku: format.sku || product.sku,
    price: Number(format.price.toFixed(2)),
    priceCurrency: product.currency || "USD",
    priceValidUntil: priceValidUntil.toISOString().slice(0, 10),
    availability:
      format.type === "PRINTED_BOOK" && product.stock === 0
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    url,
    itemCondition: "https://schema.org/NewCondition",
    seller: {
      "@type": "Organization",
      name: SITE_NAME,
      url: siteUrl,
    },
  }));

  const aggregateRating =
    product.reviewCount > 0 && product.rating > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: Number(product.rating.toFixed(1)),
          reviewCount: product.reviewCount,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  const reviewNodes = (input.reviews ?? []).slice(0, 8).map((review) => ({
    "@type": "Review",
    author: { "@type": "Person", name: review.authorName || "HouseLink customer" },
    datePublished: review.createdAt,
    reviewBody: [review.title, review.body].filter(Boolean).join(". ").trim() || undefined,
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
  }));

  const productNode: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isBookLike ? ["Product", "Book"] : "Product",
    "@id": `${url}#product`,
    name: product.title,
    description: productDescription(product),
    image: [image],
    sku: product.sku,
    gtin13: product.isbn || undefined,
    isbn: product.isbn || undefined,
    url,
    category: product.category || undefined,
    brand: {
      "@type": "Brand",
      name: product.publisher || SITE_NAME,
    },
    author: product.author
      ? { "@type": "Person", name: product.author }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: product.publisher || SITE_NAME,
    },
    inLanguage: product.language || "en",
    numberOfPages: product.pages || undefined,
    datePublished: product.publicationDate || product.publishedAt || undefined,
    offers: offers.length === 1 ? offers[0] : offers,
    aggregateRating,
    review: reviewNodes.length ? reviewNodes : undefined,
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Library", item: `${siteUrl}/library` },
      ...(product.category
        ? [{ "@type": "ListItem", position: 3, name: product.category, item: `${siteUrl}/library` }]
        : []),
      {
        "@type": "ListItem",
        position: product.category ? 4 : 3,
        name: product.title,
        item: url,
      },
    ],
  };

  return [productNode, breadcrumb];
}

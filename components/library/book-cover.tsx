import Image from "next/image";
import Link from "next/link";
import { displayImageUrl } from "@/lib/images/display-image";
import type { LibraryProduct } from "@/lib/library/catalog";
import { cn } from "@/lib/utils";

const coverStyles = [
  { accent: "bg-[#007f68]", spine: "bg-[#0b2f2a]", paper: "from-[#fffdf7] to-[#e8f4ef]", text: "text-[#0b2f2a]" },
  { accent: "bg-[#29526f]", spine: "bg-[#172033]", paper: "from-[#ffffff] to-[#edf3f8]", text: "text-[#172033]" },
  { accent: "bg-[#9a6231]", spine: "bg-[#342014]", paper: "from-[#fffaf1] to-[#f1e4d2]", text: "text-[#342014]" },
  { accent: "bg-[#5b5577]", spine: "bg-[#25243a]", paper: "from-[#ffffff] to-[#f0eff7]", text: "text-[#25243a]" },
  { accent: "bg-[#c49a3a]", spine: "bg-[#102024]", paper: "from-[#fffdf6] to-[#f5edda]", text: "text-[#102024]" },
];

function styleFor(product: LibraryProduct) {
  const sum = product.id.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return coverStyles[sum % coverStyles.length];
}

function coverImageUrl(product: LibraryProduct, imageUrl?: string) {
  if (imageUrl) return imageUrl;
  return product.gallery.find((item) => item.kind === "cover")?.url ?? product.gallery[0]?.url;
}

export function BookCover({
  product,
  className,
  priority = false,
  imageUrl,
  interactive = true,
  sizes = "(max-width: 768px) 70vw, 320px",
  variant = "default",
}: {
  product: LibraryProduct;
  className?: string;
  priority?: boolean;
  imageUrl?: string;
  interactive?: boolean;
  sizes?: string;
  variant?: "default" | "shop";
}) {
  const style = styleFor(product);
  const coverTitle = getCoverTitle(product);
  const shop = variant === "shop";
  const coverUrl = displayImageUrl(coverImageUrl(product, imageUrl), { width: shop ? 520 : 760, height: shop ? 694 : 1014, crop: "fill" });
  const content = (
    <>
      {coverUrl ? (
        <>
          <Image
            src={coverUrl}
            alt={product.title}
            fill
            sizes={sizes}
            className="object-cover"
            priority={priority}
          />
          {!shop && (
            <>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),transparent_28%,transparent_62%,rgba(15,23,42,0.45))]" />
              <div className="absolute inset-x-0 bottom-0 z-10 p-3">
                <p className="line-clamp-2 text-[13px] font-bold leading-snug text-white drop-shadow">{product.title}</p>
                <p className="mt-1 line-clamp-1 text-[11px] font-medium text-white/85">{product.author}</p>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className={cn("absolute inset-0 bg-gradient-to-br", style.paper)} />
          <div className={cn("absolute inset-y-0 left-0 w-[13%]", style.spine)} />
          <div className="absolute inset-y-0 left-[13%] w-px bg-slate-950/10" />
          <div className="relative z-10 flex h-full flex-col justify-between p-4 pl-[21%]">
            <div>
              <div className={cn("h-1.5 w-14 rounded-full", style.accent)} />
              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{product.category}</p>
              <h3 className={cn("mt-4 line-clamp-4 text-balance text-[1.1rem] font-black leading-[1.02] sm:text-[1.2rem]", style.text)}>
                {coverTitle}
              </h3>
            </div>
            <div>
              <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-slate-600">{product.author}</p>
              {!shop && (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">HouseLink</p>
                  <span className="rounded-full border border-slate-950/10 bg-white/70 px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em] text-slate-600">
                    {product.productType.replace(/_/g, " ")}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.08),transparent_16%,transparent_84%,rgba(0,0,0,0.05))]" />
        </>
      )}
    </>
  );

  const frameClassName = cn(
    "group/book relative block aspect-[3/4] overflow-hidden bg-white",
    shop
      ? "rounded-sm shadow-[0_10px_28px_rgba(16,32,36,0.10)] ring-1 ring-black/[0.04]"
      : "rounded-md shadow-[0_18px_42px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/10",
    interactive && !shop && "transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_56px_rgba(15,23,42,0.2)]",
    interactive && shop && "transition duration-500 ease-out group-hover/tile:-translate-y-1 group-hover/tile:shadow-[0_18px_40px_rgba(16,32,36,0.14)]",
    className,
  );

  if (!interactive) {
    return (
      <div className={frameClassName} data-priority={priority ? "true" : undefined}>
        {content}
      </div>
    );
  }

  return (
    <Link href={`/library/${product.slug}`} className={frameClassName} data-priority={priority ? "true" : undefined}>
      {content}
    </Link>
  );
}

function getCoverTitle(product: LibraryProduct) {
  if (product.category === "Property Law") return "Property Law";
  if (product.category === "Toolkits") return "Agent Toolkit";
  if (product.category === "Investment") return "Investor Basics";
  if (product.category === "Legal Documents") return "Lease Pack";
  if (product.category === "Courses") return "Development Course";
  return product.title.split(" ").slice(0, 3).join(" ");
}

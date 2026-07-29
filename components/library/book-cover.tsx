import Link from "next/link";
import type { LibraryProduct } from "@/lib/library/catalog";
import { cn } from "@/lib/utils";

const coverStyles = [
  { bg: "from-[#12312f] via-[#0f766e] to-[#d8b45f]", band: "bg-[#f4d06f]", text: "text-white", accent: "text-[#f4d06f]" },
  { bg: "from-[#172033] via-[#2563eb] to-[#67e8f9]", band: "bg-[#67e8f9]", text: "text-white", accent: "text-[#bae6fd]" },
  { bg: "from-[#2f1728] via-[#be185d] to-[#f9a8d4]", band: "bg-[#f9a8d4]", text: "text-white", accent: "text-[#fce7f3]" },
  { bg: "from-[#1f2937] via-[#475569] to-[#cbd5e1]", band: "bg-[#cbd5e1]", text: "text-white", accent: "text-[#e2e8f0]" },
  { bg: "from-[#102024] via-[#047857] to-[#a7f3d0]", band: "bg-[#a7f3d0]", text: "text-white", accent: "text-[#d1fae5]" },
];

function styleFor(product: LibraryProduct) {
  const sum = product.id.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return coverStyles[sum % coverStyles.length];
}

export function BookCover({ product, className, priority = false }: { product: LibraryProduct; className?: string; priority?: boolean }) {
  const style = styleFor(product);
  const titleParts = product.title.split(" ");
  const primaryTitle = titleParts.slice(0, Math.ceil(titleParts.length / 2)).join(" ");
  const secondaryTitle = titleParts.slice(Math.ceil(titleParts.length / 2)).join(" ");

  return (
    <Link
      href={`/library/${product.slug}`}
      className={cn(
        "group/book relative block aspect-[3/4] overflow-hidden rounded-md bg-slate-900 shadow-[0_18px_42px_rgba(15,23,42,0.22)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.26)]",
        className,
      )}
      data-priority={priority ? "true" : undefined}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", style.bg)} />
      <div className="absolute inset-y-0 left-0 w-[10%] bg-black/18" />
      <div className="absolute inset-y-0 left-[10%] w-px bg-white/20" />
      <div className="absolute right-4 top-4 rounded-full border border-white/35 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/90">
        {product.productType.replace(/_/g, " ")}
      </div>
      <div className={cn("absolute left-[14%] right-5 top-[16%]", style.text)}>
        <p className={cn("text-xs font-black uppercase tracking-[0.2em]", style.accent)}>{product.collection}</p>
        <h3 className="mt-4 text-balance text-2xl font-black leading-[0.98] sm:text-3xl">{primaryTitle}</h3>
        {secondaryTitle && <p className="mt-2 text-balance text-lg font-semibold leading-tight text-white/88">{secondaryTitle}</p>}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5 pl-[14%]">
        <div className={cn("mb-4 h-2 w-20 rounded-full", style.band)} />
        <p className="line-clamp-2 text-xs font-semibold leading-5 text-white/82">{product.author}</p>
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/65">HouseLink Library</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/32 to-transparent" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/18" />
    </Link>
  );
}

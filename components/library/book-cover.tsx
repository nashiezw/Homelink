import Link from "next/link";
import type { LibraryProduct } from "@/lib/library/catalog";
import { cn } from "@/lib/utils";

const coverStyles = [
  { bg: "from-[#0f2e2a] via-[#0f766e] to-[#c9a34d]", foil: "text-[#f7d66e]", line: "bg-[#f7d66e]" },
  { bg: "from-[#172033] via-[#334155] to-[#9fb2c8]", foil: "text-[#dbeafe]", line: "bg-[#93c5fd]" },
  { bg: "from-[#291624] via-[#8f2d56] to-[#f0b5c9]", foil: "text-[#ffe4ef]", line: "bg-[#f9a8d4]" },
  { bg: "from-[#211a16] via-[#6b4428] to-[#d7ad5f]", foil: "text-[#ffe6a8]", line: "bg-[#f4c95d]" },
  { bg: "from-[#102024] via-[#155e75] to-[#8dd6c9]", foil: "text-[#cffafe]", line: "bg-[#67e8f9]" },
];

function styleFor(product: LibraryProduct) {
  const sum = product.id.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return coverStyles[sum % coverStyles.length];
}

export function BookCover({ product, className, priority = false }: { product: LibraryProduct; className?: string; priority?: boolean }) {
  const style = styleFor(product);
  const coverTitle = getCoverTitle(product);
  const subtitle = getCoverSubtitle(product);

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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(255,255,255,0.2),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent_34%,rgba(0,0,0,0.24))]" />
      <div className="absolute inset-y-0 left-0 w-[12%] bg-black/22" />
      <div className="absolute inset-y-0 left-[12%] w-px bg-white/22" />
      <div className="absolute left-[17%] top-5 rounded-full border border-white/25 bg-black/12 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/85">
        {product.productType.replace(/_/g, " ")}
      </div>
      <div className="absolute left-[17%] right-6 top-[24%] text-white">
        <p className={cn("text-[10px] font-black uppercase tracking-[0.24em]", style.foil)}>{product.category}</p>
        <div className={cn("mt-4 h-1.5 w-16 rounded-full", style.line)} />
        <h3 className="mt-5 text-balance text-[1.72rem] font-black leading-[0.92] sm:text-[2rem]">{coverTitle}</h3>
        <p className="mt-4 max-w-[12rem] text-balance text-sm font-semibold leading-5 text-white/82">{subtitle}</p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-5 pl-[17%]">
        <p className="line-clamp-2 text-xs font-semibold leading-5 text-white/78">{product.author}</p>
        <p className="mt-3 text-[9px] font-black uppercase tracking-[0.24em] text-white/58">HouseLink Library</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/42 to-transparent" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/20" />
    </Link>
  );
}

function getCoverTitle(product: LibraryProduct) {
  if (product.category === "Property Law") return "Property Law";
  if (product.category === "Toolkits") return "Agent Field Toolkit";
  if (product.category === "Investment") return "Investor Basics";
  if (product.category === "Legal Documents") return "Lease Pack";
  if (product.category === "Courses") return "Development Course";
  return product.title.split(" ").slice(0, 4).join(" ");
}

function getCoverSubtitle(product: LibraryProduct) {
  if (product.category === "Property Law") return "Development, title and transaction practice";
  if (product.category === "Toolkits") return "Forms, scripts and field checklists";
  if (product.category === "Investment") return "Yield, risk and suburb selection";
  if (product.category === "Legal Documents") return "Editable landlord and tenancy documents";
  if (product.category === "Courses") return "Guided property development foundations";
  return product.subtitle;
}

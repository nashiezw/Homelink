import Link from "next/link";
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

export function BookCover({ product, className, priority = false }: { product: LibraryProduct; className?: string; priority?: boolean }) {
  const style = styleFor(product);
  const coverTitle = getCoverTitle(product);

  return (
    <Link
      href={`/library/${product.slug}`}
      className={cn(
        "group/book relative block aspect-[3/4] overflow-hidden rounded-md bg-white shadow-[0_18px_42px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/10 transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_56px_rgba(15,23,42,0.2)]",
        className,
      )}
      data-priority={priority ? "true" : undefined}
    >
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
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">HouseLink</p>
            <span className="rounded-full border border-slate-950/10 bg-white/70 px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em] text-slate-600">
              {product.productType.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.08),transparent_16%,transparent_84%,rgba(0,0,0,0.05))]" />
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

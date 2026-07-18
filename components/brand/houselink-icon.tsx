import Image from "next/image";
import { cn } from "@/lib/utils";

/** Brand colours from official HouseLink artwork */
export const HL_NAVY = "#1a3560";
export const HL_GREEN = "#22a54b";

export const HOUSELINK_ICON_SRC = "/brand/houselink-icon.png";

type HouseLinkIconProps = {
  className?: string;
  title?: string;
};

/** Official HouseLink house mark — gradient H/L icon from brand artwork */
export function HouseLinkIcon({ className, title }: HouseLinkIconProps) {
  const alt = title ?? "HouseLink Zimbabwe";
  return (
    <Image
      src={HOUSELINK_ICON_SRC}
      alt={alt}
      width={128}
      height={128}
      priority={false}
      decoding="async"
      className={cn("block shrink-0 object-contain", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    />
  );
}

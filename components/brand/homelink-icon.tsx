import Image from "next/image";
import { cn } from "@/lib/utils";

/** Brand colours from official HomeLink artwork */
export const HL_NAVY = "#1a3560";
export const HL_GREEN = "#22a54b";

export const HOMELINK_ICON_SRC = "/brand/homelink-icon.png";

type HomeLinkIconProps = {
  className?: string;
  title?: string;
};

/** Official HomeLink house mark — gradient H/L icon from brand artwork */
export function HomeLinkIcon({ className, title }: HomeLinkIconProps) {
  return (
    <Image
      src={HOMELINK_ICON_SRC}
      alt={title ?? ""}
      width={1024}
      height={1024}
      priority={false}
      decoding="async"
      className={cn("block shrink-0 object-contain", className)}
      aria-hidden={!title}
      role={title ? "img" : undefined}
    />
  );
}

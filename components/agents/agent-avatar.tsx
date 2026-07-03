"use client";

import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

const SIZE_PX = { md: 64, lg: 128, xl: 176 } as const;

const SIZE_CLASS = {
  md: "size-16 rounded-xl text-lg",
  lg: "size-28 rounded-2xl text-3xl sm:size-32",
  xl: "size-36 rounded-3xl text-4xl sm:size-44",
} as const;

type AgentAvatarProps = {
  name: string;
  photoUrl?: string;
  size?: keyof typeof SIZE_CLASS;
  verified?: boolean;
  className?: string;
  priority?: boolean;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export function AgentAvatar({
  name,
  photoUrl,
  size = "lg",
  verified = true,
  className,
  priority,
}: AgentAvatarProps) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(photoUrl) && !failed;

  return (
    <div className={cn("relative shrink-0", className)}>
      <div
        className={cn(
          "relative overflow-hidden shadow-hero ring-4 ring-white dark:ring-slate-900",
          SIZE_CLASS[size],
        )}
      >
        {showPhoto ? (
          <Image
            src={photoUrl!}
            alt={name}
            fill
            className="object-cover"
            sizes={`${SIZE_PX[size]}px`}
            priority={priority}
            onError={() => setFailed(true)}
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 font-bold text-white",
              SIZE_CLASS[size],
            )}
          >
            {initials(name)}
          </div>
        )}
      </div>
      {verified && (
        <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow-md dark:border-slate-900">
          <BadgeCheck className="size-4" aria-label="Verified agent" />
        </span>
      )}
    </div>
  );
}

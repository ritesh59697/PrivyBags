// src/components/creator/CreatorCard.tsx

import Image from "next/image";
import { User } from "lucide-react";
import type { BagsCreator } from "@/lib/bags/client";
import { clsx } from "clsx";

interface CreatorCardProps {
  creator: BagsCreator;
  compact?: boolean;
}

export function CreatorCard({ creator, compact = false }: CreatorCardProps) {
  const initials = creator.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={clsx("flex items-center gap-3", compact ? "px-4 py-3" : "p-5")}>
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {creator.avatarUrl ? (
          <Image
            src={creator.avatarUrl}
            alt={creator.displayName}
            width={compact ? 36 : 48}
            height={compact ? 36 : 48}
            className="rounded-full object-cover ring-2 ring-purple-900/50"
          />
        ) : (
          <div
            className={clsx(
              "rounded-full flex items-center justify-center font-semibold text-purple-300 ring-2 ring-purple-900/50",
              compact ? "w-9 h-9 text-xs" : "w-12 h-12 text-sm"
            )}
            style={{ background: "linear-gradient(135deg, #3b0764 0%, #1e1b4b 100%)" }}
          >
            {initials || <User className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />}
          </div>
        )}
        {/* Online indicator dot */}
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-gray-950" />
      </div>

      {/* Info */}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <p className="font-semibold text-sm text-white truncate leading-tight">
          {creator.displayName}
        </p>
        <p className="text-xs text-gray-500 truncate">@{creator.slug}</p>
        {!compact && creator.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
            {creator.description}
          </p>
        )}
      </div>

      {!compact && (
        <div className="flex-shrink-0">
          <span className="text-xs text-gray-600 bg-gray-800 rounded-lg px-2.5 py-1 font-medium">
            Tip →
          </span>
        </div>
      )}
    </div>
  );
}

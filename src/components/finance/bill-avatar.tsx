"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { avatarColor, merchantInitials } from "./bills-calendar-helpers"

interface BillAvatarProps {
  merchantName: string
  logoUrl?: string | null
  /** Tailwind size classes for width/height, e.g. "w-6 h-6" */
  size?: "sm" | "md" | "lg"
  className?: string
}

const SIZE_MAP = {
  sm: { dims: "w-5 h-5", text: "text-[7px]", ring: "ring-1" },
  md: { dims: "w-6 h-6", text: "text-[8px]", ring: "" },
  lg: { dims: "w-7 h-7", text: "text-[9px]", ring: "" },
} as const

export function BillAvatar({ merchantName, logoUrl, size = "md", className }: BillAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const s = SIZE_MAP[size]

  if (logoUrl && !imgFailed) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={cn(s.dims, "rounded-full object-cover flex-shrink-0 bg-background-secondary", className)}
        onError={() => setImgFailed(true)}
      />
    )
  }

  return (
    <div className={cn(s.dims, "rounded-full flex items-center justify-center flex-shrink-0", avatarColor(merchantName), className)}>
      <span className={cn(s.text, "font-bold text-white leading-none")}>
        {merchantInitials(merchantName)}
      </span>
    </div>
  )
}

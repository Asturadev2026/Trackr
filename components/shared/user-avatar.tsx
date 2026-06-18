import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getInitials, cn } from "@/lib/utils"

interface UserAvatarProps {
  user: { name?: string | null; image?: string | null }
  size?: "xs" | "sm" | "md" | "lg"
  showTooltip?: boolean
  className?: string
}

const sizeClasses = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
}

export function UserAvatar({ user, size = "md", showTooltip = false, className }: UserAvatarProps) {
  const avatar = (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={user.image ?? undefined} alt={user.name ?? ""} />
      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
    </Avatar>
  )

  if (!showTooltip) return avatar

  return (
    <Tooltip>
      <TooltipTrigger asChild>{avatar}</TooltipTrigger>
      <TooltipContent>{user.name ?? "Unknown"}</TooltipContent>
    </Tooltip>
  )
}

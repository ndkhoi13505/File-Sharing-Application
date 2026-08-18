"use client";

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const BG_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-purple-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-red-600",
  "from-cyan-500 to-blue-600",
  "from-violet-600 to-purple-800",
];

export default function UserAvatar({
  name = "User",
  avatarUrl,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs font-semibold",
    md: "w-12 h-12 text-base font-bold",
    lg: "w-14 h-14 text-xl font-bold",
    xl: "w-24 h-24 text-3xl font-extrabold",
  };

  const trimmedName = name.trim();
  const firstLetter = (trimmedName.charAt(0) || "U").toUpperCase();

  let hash = 0;
  for (let i = 0; i < trimmedName.length; i++) {
    hash = trimmedName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % BG_GRADIENTS.length;
  const gradientClass = BG_GRADIENTS[colorIndex];

  return (
    <div
      className={`${sizeClasses[size]} bg-linear-to-br ${gradientClass} text-white rounded-full flex items-center justify-center shadow-sm select-none border-2 border-white ${className}`}
    >
      {firstLetter}
    </div>
  );
}
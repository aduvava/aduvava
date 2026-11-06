import { clsx } from "clsx";

type MascotAvatarProps = {
  className?: string;
  variant?: "default" | "chat";
};

export function MascotAvatar({ className, variant = "default" }: MascotAvatarProps) {
  return (
    <img
      src={variant === "chat" ? "/brand/educhi-chat-logo.webp" : "/brand/educhi-logo.webp"}
      alt="Linh vật chó Shiba Educhi cầm sách và bút chì"
      className={clsx("h-full w-full object-contain", className)}
    />
  );
}

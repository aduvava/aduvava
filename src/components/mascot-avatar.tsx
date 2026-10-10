import { clsx } from "clsx";

export function MascotAvatar({ className }: { className?: string }) {
  return (
    <img
      src="/brand/slowedu-mascot-transparent.png"
      alt="Linh vật chó Shiba của Ava"
      className={clsx("h-full w-full object-contain", className)}
    />
  );
}

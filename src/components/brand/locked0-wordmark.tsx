import Link from "next/link";

import { brand } from "@/config/brand";
import { routes } from "@/config/routes";
import { cn } from "@/shared/utils/cn";

import { Locked0Logo } from "./locked0-logo";

type Locked0WordmarkProps = Readonly<{
  className?: string;
  imageClassName?: string;
}>;

export function Locked0Wordmark({
  className,
  imageClassName,
}: Locked0WordmarkProps) {
  return (
    <Link
      href={routes.home}
      className={cn(
        "inline-flex w-fit items-center overflow-hidden rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-black/5 transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      aria-label={`${brand.name} — início`}
    >
      <Locked0Logo
        alt=""
        className={imageClassName ?? "w-32 sm:w-36"}
      />
    </Link>
  );
}

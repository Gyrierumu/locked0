import Image from "next/image";

import { brand } from "@/config/brand";
import { cn } from "@/shared/utils/cn";

type BrandImageProps = Readonly<{
  alt?: string;
  className?: string;
}>;

export function Locked0Logo({ alt = brand.name, className }: BrandImageProps) {
  return (
    <Image
      src={brand.assets.logo}
      alt={alt}
      width={393}
      height={381}
      loading="eager"
      className={cn("h-auto", className)}
    />
  );
}

export function Locked0Symbol({ alt = brand.name, className }: BrandImageProps) {
  return (
    <Image
      src={brand.assets.symbol}
      alt={alt}
      width={274}
      height={274}
      className={cn("h-auto", className)}
    />
  );
}

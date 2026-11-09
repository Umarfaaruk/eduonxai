import Image from "next/image";

/** Renders the right wordmark for the active theme (visibility is driven by CSS tokens). */
export function Logo({ width, height, priority = false }: { width: number; height: number; priority?: boolean }) {
  return (
    <>
      <Image src="/logo-dark.svg" alt="Eduonxai" width={width} height={height} priority={priority} className="logo-on-dark" />
      <Image src="/logo-light.svg" alt="Eduonxai" width={width} height={height} priority={priority} className="logo-on-light" />
    </>
  );
}

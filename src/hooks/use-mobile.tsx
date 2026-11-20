import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Dibaca langsung saat render pertama: kalau awalnya dianggap desktop, tampilan desktop yang lebar
  // sempat dirender di HP dan browser HP memperlebar layar (halaman jadi kecil/ter-zoom out).
  const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;
  const [isMobile, setIsMobile] = React.useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return isMobile;
}

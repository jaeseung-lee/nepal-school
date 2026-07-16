export function isInternalPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/unauthorized" ||
    pathname.startsWith("/sales") ||
    pathname.startsWith("/auth/")
  );
}

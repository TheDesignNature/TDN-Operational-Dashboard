/**
 * Lightweight class name utility.
 * Merges strings, filters falsy values.
 * For a larger project, swap this with `clsx` + `tailwind-merge`.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

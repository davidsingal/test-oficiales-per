import Link from "next/link";

export function BackButton() {
  return (
    <Link
      href="/"
      className="mt-4 inline-flex rounded-full border border-[var(--line)] bg-white px-3 py-1.5 font-semibold text-[var(--ink)] no-underline hover:border-[var(--accent)]"
    >
      Volver
    </Link>
  );
}

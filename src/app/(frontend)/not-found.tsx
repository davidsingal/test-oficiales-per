import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";

const NotFound = () => (
  <main className="mx-auto w-full max-w-5xl space-y-4 px-4 py-16 text-center">
    <h1 className="text-3xl font-semibold">No encontramos esta página</h1>
    <p className="text-muted-foreground">
      Puede que el enlace esté mal o que el examen o el tema ya no existan.
    </p>
    <Link href="/" className={buttonVariants({ size: "lg" })}>
      Ir al inicio
    </Link>
  </main>
);

export default NotFound;

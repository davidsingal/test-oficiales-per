import { notFound } from "next/navigation";

// URLs that match no route get the site's own 404 page (with the navbar)
// instead of Next's default one, which sits outside the frontend layout.
const UnknownPage = () => notFound();

export default UnknownPage;

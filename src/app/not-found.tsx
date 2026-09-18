import Link from "next/link";

// App-wide 404. Renders inside the root layout, so the local fonts and design
// tokens from globals.css are already in scope.
export default function NotFound() {
  return (
    <main className="notfound">
      <span className="notfound-wordmark font-array">pinto</span>
      <p className="notfound-code font-bebas">404</p>
      <p className="notfound-message">This page could not be found.</p>
      <Link href="/main" className="notfound-link">
        Back to the deck
      </Link>
    </main>
  );
}

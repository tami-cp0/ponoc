import Link from "next/link";

// App-wide 404. Renders inside the root layout, so the local fonts and design
// tokens from globals.css are already in scope. The .deck-page-3d wrapper puts
// the "Back to the deck" link in the same context as the deck controls, so it
// can reuse the reset key's exact neumorphic styling verbatim.
export default function NotFound() {
  return (
    <main className="notfound deck-page-3d">
      <span className="notfound-wordmark font-array">ponoc</span>
      <p className="notfound-code font-bebas">404</p>
      <p className="notfound-message">This page could not be found.</p>
      <Link href="/main" className="pill-btn ctrl-reset">
        back to deck
      </Link>
    </main>
  );
}

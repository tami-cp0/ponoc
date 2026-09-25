import { Button } from "@/components/Button";

export default function NotFound() {
  return (
    <main className="notfound">
      <span className="notfound-wordmark font-array">ponoc</span>
      <p className="notfound-code font-bebas">404</p>
      <p className="notfound-message">This page could not be found.</p>
      <Button href="/app">back to deck</Button>
    </main>
  );
}

import Link from "next/link";
import { AutoRefresh } from "./AutoRefresh";

export function AdminHeader({ query = "" }: { query?: string }) {
  return (
    <header className="admin-header">
      <Link href="/admin" className="admin-wordmark">
        <span className="font-array">ponoc</span>
        <span className="admin-wordmark-tag">admin</span>
      </Link>
      <form action="/admin/users" className="admin-search" role="search">
        <label className="settings-row login-field admin-field">
          <input
            className="login-input"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search users by email or name"
            aria-label="Search users"
          />
        </label>
      </form>
      <AutoRefresh />
    </header>
  );
}

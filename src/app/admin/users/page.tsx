import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { credits, fullTime, timeAgo } from "@/components/admin/format";
import { requireAdmin } from "@/server/admin/access";
import { searchUsers, USERS_PER_PAGE } from "@/server/admin/users";

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

function pageUrl(q: string, page: number): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

export default async function AdminUsersPage({ searchParams }: Props) {
  await requireAdmin();
  const { q = "", page: pageParam } = await searchParams;
  const page = Math.max(1, Math.floor(Number(pageParam)) || 1);
  const { users, total, pages } = await searchUsers(q, page);
  const first = (page - 1) * USERS_PER_PAGE + 1;

  return (
    <main className="admin-page">
      <AdminHeader query={q} />
      <section className="admin-well" aria-labelledby="results">
        <h2 id="results" className="admin-heading font-array">
          {q ? `Users matching “${q}”` : "All users"}
          <span className="admin-count">{total.toLocaleString()}</span>
        </h2>
        {users.length === 0 ? (
          <p className="admin-empty">{page > 1 ? "No users on this page." : "No users match that search."}</p>
        ) : (
          <table className="admin-table admin-table-list">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Name</th>
                <th scope="col">Credits</th>
                <th scope="col">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <th scope="row">
                    <Link href={`/admin/users/${u.id}`} className="admin-link">
                      {u.email}
                    </Link>
                    {u.isAdmin && <span className="admin-badge">admin</span>}
                  </th>
                  <td>{u.name}</td>
                  <td>{credits(u.credits)}</td>
                  <td title={fullTime(u.createdAt)}>{timeAgo(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pages > 1 && (
          <nav className="admin-pager" aria-label="Pages">
            <span>
              {first.toLocaleString()}–{Math.min(first + users.length - 1, total).toLocaleString()} of{" "}
              {total.toLocaleString()}
            </span>
            {page > 1 ? (
              <Link href={pageUrl(q, page - 1)} className="admin-link">
                Previous
              </Link>
            ) : (
              <span className="admin-pager-off">Previous</span>
            )}
            {page < pages ? (
              <Link href={pageUrl(q, page + 1)} className="admin-link">
                Next
              </Link>
            ) : (
              <span className="admin-pager-off">Next</span>
            )}
          </nav>
        )}
      </section>
    </main>
  );
}

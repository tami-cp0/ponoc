import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityList } from "@/components/admin/ActivityList";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CreditForm } from "@/components/admin/CreditForm";
import { credits, duration, fullTime, timeAgo, usd } from "@/components/admin/format";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { requireAdmin } from "@/server/admin/access";
import { getUserDetail } from "@/server/admin/users";

export default async function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const { profile, totals, sessions, timeline } = detail;
  const status = detail.listening ? "Listening now" : detail.signedIn ? "Signed in" : "Signed out";

  return (
    <main className="admin-page">
      <AdminHeader />

      <div className="admin-columns">
        <div className="admin-main">
          <section className="admin-well" aria-labelledby="profile">
            <h2 id="profile" className="admin-heading admin-heading-plain">
              {profile.email}
              {profile.isAdmin && <span className="admin-badge">admin</span>}
            </h2>
            <dl className="admin-facts admin-facts-inline">
              <div>
                <dt>Name</dt>
                <dd>{profile.name}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd title={fullTime(profile.createdAt)}>{timeAgo(profile.createdAt)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd className="admin-health" data-ok={detail.listening || detail.signedIn}>
                  <span className="admin-dot" aria-hidden />
                  {status}
                </dd>
              </div>
              <div>
                <dt>Sessions</dt>
                <dd>{totals.sessions.toLocaleString()}</dd>
              </div>
              <div>
                <dt>Listening time</dt>
                <dd>{duration(totals.seconds)}</dd>
              </div>
              <div>
                <dt>Credits used</dt>
                <dd>{credits(totals.creditsUsed)}</dd>
              </div>
              <div>
                <dt>Provider cost</dt>
                <dd>{usd(totals.costUsd)}</dd>
              </div>
            </dl>
          </section>

          <section className="admin-well" aria-labelledby="sessions">
            <h2 id="sessions" className="admin-heading font-array">
              Sessions
            </h2>
            {sessions.length === 0 ? (
              <p className="admin-empty">No sessions yet.</p>
            ) : (
              <table className="admin-table admin-table-list">
                <thead>
                  <tr>
                    <th scope="col">Started</th>
                    <th scope="col">Listened</th>
                    <th scope="col">True / false / failed</th>
                    <th scope="col">Credits</th>
                    <th scope="col">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <th scope="row" title={fullTime(s.startedAt)}>
                        {timeAgo(s.startedAt)}
                        {!s.endedAt && detail.listening && <span className="admin-badge">live</span>}
                      </th>
                      <td>{duration(s.audioSeconds)}</td>
                      <td>
                        {s.claimsTrue} / {s.claimsFalse} / {s.claimsError}
                      </td>
                      <td>{credits(s.creditsUsed)}</td>
                      <td>{usd(s.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="admin-well" aria-labelledby="activity">
            <h2 id="activity" className="admin-heading font-array">
              Activity
            </h2>
            <ActivityList items={timeline} />
          </section>
        </div>

        <aside className="admin-side">
          <section className="admin-well" aria-labelledby="balance">
            <h2 id="balance" className="admin-heading font-array">
              Balance
            </h2>
            <p className="admin-balance">
              {credits(profile.credits)} <span>credits</span>
            </p>
            <CreditForm userId={profile.id} />
          </section>

          <section className="admin-well" aria-labelledby="access">
            <h2 id="access" className="admin-heading font-array">
              Access
            </h2>
            <p className="admin-note">
              Ends every sign-in for this account. A live session stops within a minute.
            </p>
            <SignOutButton userId={profile.id} />
          </section>

          <Link href="/admin/users" className="admin-link admin-more">
            All users
          </Link>
        </aside>
      </div>
    </main>
  );
}

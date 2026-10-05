import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { credits, duration, usd } from "@/components/admin/format";
import { requireAdmin } from "@/server/admin/access";
import { getHealth, type Check } from "@/server/admin/health";
import { getOverview, type Period } from "@/server/admin/overview";

const REPO = "https://github.com/tami-cp0/ponoc";

export default async function AdminPage() {
  await requireAdmin();
  const [overview, health] = await Promise.all([getOverview(), getHealth()]);
  const periods: [Period, Period] = [overview.lastDay, overview.lastWeek];

  return (
    <main className="admin-page">
      <AdminHeader />

      <div className="admin-columns">
        <div className="admin-main">
          <section className="admin-well" aria-labelledby="listening">
            <h2 id="listening" className="admin-heading font-array">
              Listening now <span className="admin-count">{overview.listening.length}</span>
            </h2>
            {overview.listening.length === 0 ? (
              <p className="admin-empty">Nobody is listening.</p>
            ) : (
              <ul className="admin-chips">
                {overview.listening.map((u) => (
                  <li key={u.id}>
                    <Link href={`/admin/users/${u.id}`} className="admin-link">
                      {u.email}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="admin-well" aria-labelledby="usage">
            <h2 id="usage" className="admin-heading font-array">
              Usage
            </h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col" />
                  <th scope="col">Last 24 hours</th>
                  <th scope="col">Last 7 days</th>
                </tr>
              </thead>
              <tbody>
                <UsageRow periods={periods} label="Sessions" pick={(p) => p.sessions.toLocaleString()} />
                <UsageRow periods={periods} label="Listening time" pick={(p) => duration(p.seconds)} />
                <UsageRow periods={periods} label="Claims true" pick={(p) => p.claimsTrue.toLocaleString()} />
                <UsageRow periods={periods} label="Claims false" pick={(p) => p.claimsFalse.toLocaleString()} />
                <UsageRow periods={periods} label="Checks failed" pick={(p) => p.claimsFailed.toLocaleString()} />
                <UsageRow periods={periods} label="Credits used" pick={(p) => credits(p.creditsUsed)} />
                <UsageRow periods={periods} label="Charged" pick={(p) => usd(p.chargedUsd)} />
                <UsageRow periods={periods} label="Provider cost" pick={(p) => usd(p.costUsd)} />
                <UsageRow periods={periods} label="Margin" pick={(p) => usd(p.marginUsd)} strong />
              </tbody>
            </table>
          </section>

        </div>

        <aside className="admin-side">
          <section className="admin-well" aria-labelledby="health">
            <h2 id="health" className="admin-heading font-array">
              Health
            </h2>
            <dl className="admin-facts">
              <HealthRow label="Database" check={health.database} />
              <HealthRow label="OpenAI" check={health.openai} />
              <HealthRow label="Deepgram" check={health.deepgram} />
              <div>
                <dt>Uptime</dt>
                <dd>{duration(health.uptimeSeconds)}</dd>
              </div>
              <div>
                <dt>Memory</dt>
                <dd>{health.memoryMb} MB</dd>
              </div>
              <div>
                <dt>Commit</dt>
                <dd>
                  {health.commit ? (
                    <a href={`${REPO}/commit/${health.commit}`} className="admin-link" target="_blank" rel="noreferrer">
                      {health.commit}
                    </a>
                  ) : (
                    "local"
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="admin-well" aria-labelledby="users">
            <h2 id="users" className="admin-heading font-array">
              Users
            </h2>
            <dl className="admin-facts">
              <div>
                <dt>Total</dt>
                <dd>{overview.users.total.toLocaleString()}</dd>
              </div>
              <div>
                <dt>New, last 24 hours</dt>
                <dd>{overview.users.lastDay.toLocaleString()}</dd>
              </div>
              <div>
                <dt>New, last 7 days</dt>
                <dd>{overview.users.lastWeek.toLocaleString()}</dd>
              </div>
            </dl>
            <Link href="/admin/users" className="admin-link admin-more">
              Browse all users
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}

interface UsageRowProps {
  label: string;
  periods: [Period, Period];
  pick: (p: Period) => string;
  strong?: boolean;
}

function UsageRow({ label, periods, pick, strong }: UsageRowProps) {
  return (
    <tr data-strong={strong || undefined}>
      <th scope="row">{label}</th>
      <td>{pick(periods[0])}</td>
      <td>{pick(periods[1])}</td>
    </tr>
  );
}

function HealthRow({ label, check }: { label: string; check: Check }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="admin-health" data-ok={check.ok} title={check.detail}>
        <span className="admin-dot" aria-hidden />
        {check.ok ? `OK · ${check.ms} ms` : `Down · ${check.detail ?? "no response"}`}
      </dd>
    </div>
  );
}

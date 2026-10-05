import { ACTIVITY_LABELS, fullTime, timeAgo } from "./format";

interface Item {
  id: string;
  createdAt: Date;
  type: string;
  message: string;
}

// One user's account events, newest first.
export function ActivityList({ items }: { items: Item[] }) {
  if (items.length === 0) return <p className="admin-empty">Nothing yet.</p>;

  return (
    <ol className="admin-activity">
      {items.map((item) => (
        <li key={item.id} className="admin-activity-row">
          <time className="admin-activity-time" dateTime={item.createdAt.toISOString()} title={fullTime(item.createdAt)}>
            {timeAgo(item.createdAt)}
          </time>
          <span className="admin-activity-type" data-type={item.type}>
            {ACTIVITY_LABELS[item.type] ?? item.type}
          </span>
          <span className="admin-activity-message">{item.message}</span>
        </li>
      ))}
    </ol>
  );
}

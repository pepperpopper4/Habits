type Tab = 'boards' | 'feed' | 'rankings' | 'profile';

const TABS: { id: Tab; label: string }[] = [
  { id: 'boards', label: 'Boards' },
  { id: 'feed', label: 'Feed' },
  { id: 'rankings', label: 'Rankings' },
  { id: 'profile', label: 'Profile' },
];

export type { Tab };

type Props = {
  tab: Tab;
  onChange: (tab: Tab) => void;
};

export function TabBar({ tab, onChange }: Props) {
  return (
    <nav className="tabbar" aria-label="Sections">
      <div className="tabbar-inner">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'tab on' : 'tab'}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

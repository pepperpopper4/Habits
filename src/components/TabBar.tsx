type Tab = 'boards' | 'feed' | 'rankings' | 'profile';

const TABS: { id: Tab; label: string }[] = [
  { id: 'boards', label: 'boards' },
  { id: 'feed', label: 'feed' },
  { id: 'rankings', label: 'rankings' },
  { id: 'profile', label: 'profile' },
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

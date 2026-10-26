import type { Offer } from '../types';

type Props = {
  offer: Offer;
  waiting: boolean;
  title: string;
  busy: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onCounter?: () => void;
  onWithdraw?: () => void;
};

export function OfferCard({ offer, waiting, title, busy, onAccept, onDecline, onCounter, onWithdraw }: Props) {
  const kindLabel = offer.kind === 'habit' ? 'Habit' : 'Vice';
  const hasActions = Boolean(onAccept || onCounter || onDecline || onWithdraw);

  return (
    <article className={waiting ? 'offer waiting' : 'offer'}>
      <div>
        <p className="offer-title">{title}</p>
        <p className="track-meta">
          {kindLabel}
          <span aria-hidden="true"> · </span>
          {offer.name}
          <span aria-hidden="true"> · </span>+{offer.gain} / −{offer.loss}
        </p>
      </div>
      {hasActions ? <div className="offer-actions">
        {onAccept ? (
          <button type="button" className="button primary" onClick={onAccept} disabled={busy}>
            Accept
          </button>
        ) : null}
        {onCounter ? (
          <button type="button" className="button" onClick={onCounter} disabled={busy}>
            Counter
          </button>
        ) : null}
        {onDecline ? (
          <button type="button" className="button danger" onClick={onDecline} disabled={busy}>
            Decline
          </button>
        ) : null}
        {onWithdraw ? (
          <button type="button" className="button danger" onClick={onWithdraw} disabled={busy}>
            Withdraw
          </button>
        ) : null}
      </div> : null}
    </article>
  );
}

import { LMS_PLATFORM } from '../lmsPlatform';
import { learningLink, useMyLearning } from '../myLearning';
import { Badge, btnClass, BtnLabel, Empty } from '../ui';

const FAILED = {
  'signed-out': 'Your sign-in for Learning has ended. Sign out and in again to see your courses.',
  forbidden: 'Learning didn’t let your account in. Ask an admin if you think this is a mistake.',
  unavailable: 'We couldn’t reach the LMS Platform. Try again in a moment.',
};

/**
 * "My learning" (owner's 6A, 2026-10-26): the courses someone is enrolled in on the LMS Platform, with how far they
 * are; each opens its player in a new tab, signed in (lmsHandoff.ts hands over for every page of the platform).
 * Nothing shows when the platform isn't set up.
 */
export function MyLearningPanel() {
  const { state, retry } = useMyLearning();
  if (state.kind === 'off' || !LMS_PLATFORM) return null;
  const platform = LMS_PLATFORM;
  return (
    <section className="p-card p-learning" aria-labelledby="my-learning" aria-busy={state.kind === 'loading' || undefined}>
      <div className="p-card-head">
        <div>
          <h2 id="my-learning" className="p-card-title">
            My learning
          </h2>
          <p className="p-muted">Your courses on the LMS Platform. Each one opens in a new tab.</p>
        </div>
        <a href={platform} target="_blank" rel="noreferrer" className={btnClass('light', { small: true })}>
          <BtnLabel icon="book">Browse courses</BtnLabel>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      {state.kind === 'loading' ? (
        <p className="p-muted" role="status">
          Loading your courses…
        </p>
      ) : state.kind === 'error' ? (
        <div role="alert">
          <Empty icon="alert" title="Your courses didn’t load">
            {FAILED[state.reason]}
          </Empty>
          {state.reason === 'unavailable' && (
            <button type="button" className={btnClass('light', { small: true })} onClick={retry}>
              <BtnLabel icon="refresh">Try again</BtnLabel>
            </button>
          )}
        </div>
      ) : state.courses.length ? (
        <ul className="p-learning-list">
          {state.courses.map((c) => (
            <li key={c.id}>
              <a href={learningLink(platform, c.id)} target="_blank" rel="noreferrer" className="p-enrolled">
                <span className="p-enrolled-text">
                  <span className="is-strong">{c.title}</span>
                  {c.educator && <span className="p-dim">By {c.educator}</span>}
                  <span className="p-enrolled-bar" role="progressbar" aria-label={`${c.title} progress`} aria-valuemin={0} aria-valuemax={c.total} aria-valuenow={c.done}>
                    <i style={{ scale: `${c.percent / 100} 1` }} />
                  </span>
                </span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              {c.completed ? (
                <Badge kind="done">Completed</Badge>
              ) : (
                <span className="p-learning-count">
                  {c.done} / {c.total} {c.total === 1 ? 'lecture' : 'lectures'}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty icon="book" title="No courses yet">
          Every course is free. Choose Browse courses to find one and enroll.
        </Empty>
      )}
    </section>
  );
}

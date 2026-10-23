import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { ApiErrorKind } from '../api';
import { ID_DOC_MAX_MB, ID_DOCS, ID_RETENTION_DAYS, PERSON_STATUS_LABEL, ROLE_LABEL, STREAM_LABEL, type IdDocument, type PersonRole } from '../data';
import { useMyPhoto } from '../myPhoto';
import { useAccountProfile, type ProfileState } from '../profile';
import { formatDate, formatSize, usePortal } from '../store';
import { Badge, btnClass, BtnLabel, Empty, initials, PageHead, PIcon, SampleDataBar, useNotice } from '../ui';

const LOAD_FAILED: Record<ApiErrorKind, string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again to see your details.',
  forbidden: 'Your account isn’t allowed to see these details. Please ask your administrator.',
  'not-found': 'Your account isn’t in the employee records yet. Please ask your administrator.',
  conflict: 'We couldn’t load your details. Please try again.',
  'bad-request': 'We couldn’t load your details. Please try again.',
  unavailable: 'We couldn’t reach the employee records. Check your connection and try again.',
};
const NOT_SET = 'Not set yet';

/**
 * The signed-in person's own profile, opened from their name in the top bar. With the real sign-in, the details come
 * from the backend's account record (src/portal/profile.ts); with the demo sign-in, from the demo directory. Its
 * documents section is where the upload link from an employee verification lands (?docs=1): the employee uploads
 * their Aadhaar and PAN here, and only admins see them in HR OPS. That part has no backend yet, so it stays a demo.
 * Name and photo are changed in Settings.
 */
export function Profile() {
  const photo = useMyPhoto();
  const [account, retry] = useAccountProfile();
  const { me, verifications, documents, uploadDocument } = usePortal();
  const [params] = useSearchParams();
  const docsRef = useRef<HTMLElement>(null);
  const [notice, notify] = useNotice();
  const request = verifications.find((v) => v.kind === 'employee' && v.personId === me.id && v.status === 'pending');
  const mine = documents.filter((d) => d.personId === me.id);

  // the upload link opens straight onto the documents
  useEffect(() => {
    if (params.get('docs')) docsRef.current?.scrollIntoView({ block: 'start' });
  }, [params]);

  return (
    <>
      <PageHead title="My profile" sub="Your details as the portal has them.">
        <Link to="/portal/settings?tab=profile" className={btnClass('light')}>
          <BtnLabel icon="edit">Edit name or photo</BtnLabel>
        </Link>
      </PageHead>
      {notice}
      <div className="p-split">
        {account.kind === 'off' ? (
          <DetailsCard
            name={me.name}
            badge={me.role}
            photo={photo}
            facts={[
              ['Employee ID', me.id],
              ['Email', me.email],
              ['Role', ROLE_LABEL[me.role]],
              ['Stream', STREAM_LABEL[me.stream]],
              ['Team', me.team],
              ['Status', PERSON_STATUS_LABEL[me.status]],
            ]}
          />
        ) : account.kind === 'ready' ? (
          <DetailsCard
            name={account.profile.name}
            badge={account.profile.role}
            badgeLabel={account.profile.roleLabel}
            photo={photo}
            facts={[
              ['Employee ID', account.profile.employeeId],
              ['Email', account.profile.email],
              ['Role', account.profile.roleLabel],
              ['Stream', account.profile.stream && STREAM_LABEL[account.profile.stream]],
              ['Team', account.profile.team],
              ['Status', PERSON_STATUS_LABEL[account.profile.status]],
              ['Phone', account.profile.phone],
              ['Work phone', account.profile.workPhone],
            ]}
          />
        ) : (
          <AccountPending state={account} onRetry={retry} />
        )}

        <section className="p-card" ref={docsRef} aria-labelledby="me-docs">
          <div className="p-card-head is-start">
            <span className="p-tile-icon">
              <PIcon name="shield" />
            </span>
            <div>
              <h2 id="me-docs" className="p-card-title">
                Verification documents
              </h2>
              <p className="p-muted">{request ? 'HR has asked for your documents. Upload both to finish your verification.' : 'Documents HR asks for appear here.'}</p>
            </div>
          </div>
          <SampleDataBar>this part isn’t connected to the company system yet, so uploads stay in this browser tab and are gone after a reload.</SampleDataBar>
          {request || mine.length ? (
            <fieldset className="p-docs" disabled={!request}>
              <legend>Government ID</legend>
              {ID_DOCS.map((d) => (
                <DocRow
                  key={d.id}
                  label={d.label}
                  hint={d.hint}
                  doc={mine.find((m) => m.kind === d.id)}
                  canUpload={!!request}
                  onPick={(file) => {
                    uploadDocument(d.id, file);
                    notify(`${d.label} uploaded. HR can see it now.`);
                  }}
                />
              ))}
            </fieldset>
          ) : (
            <Empty icon="shield" title="Nothing requested">
              When HR starts your verification, you'll upload your documents here.
            </Empty>
          )}
          <p className="p-field-hint">
            Only admins can open these files. They're deleted automatically {ID_RETENTION_DAYS} days after your last working day; we keep only your name, dates and role.
          </p>
          {account.kind === 'off' && <p className="p-field-hint">Demo: there's no server yet, so files stay in this browser tab only and are gone after a reload.</p>}
        </section>
      </div>
    </>
  );
}

function DetailsCard({ name, badge, badgeLabel, photo, facts }: { name: string; badge: PersonRole; badgeLabel?: string; photo?: string; facts: [string, string | undefined][] }) {
  return (
    <section className="p-card" aria-label="Your details">
      <div className="p-me-head">
        {photo ? (
          <img className="p-avatar is-large" src={photo} alt="" />
        ) : (
          <span className="p-avatar is-large" aria-hidden="true">
            {initials(name)}
          </span>
        )}
        <div>
          <h2 className="p-card-title">{name}</h2>
          <Badge kind={badge}>{badgeLabel ?? ROLE_LABEL[badge]}</Badge>
        </div>
      </div>
      <dl className="p-file-facts">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd title={v ?? NOT_SET} className={v ? undefined : 'is-unset'}>
              {v ?? NOT_SET}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** The details card while the account record loads, or when it couldn't be loaded. */
function AccountPending({ state, onRetry }: { state: Exclude<ProfileState, { kind: 'off' } | { kind: 'ready' }>; onRetry: () => void }) {
  let body: ReactNode;
  if (state.kind === 'loading') {
    body = (
      <p className="p-muted" role="status">
        Loading your details…
      </p>
    );
  } else {
    body = (
      <div role="alert">
        <Empty icon="alert" title="Your details didn’t load">
          {LOAD_FAILED[state.error.kind]}
        </Empty>
        {state.error.kind !== 'signed-out' && (
          <button type="button" className={btnClass('light', { small: true })} onClick={onRetry}>
            <BtnLabel icon="refresh">Try again</BtnLabel>
          </button>
        )}
      </div>
    );
  }
  return (
    <section className="p-card" aria-label="Your details" aria-busy={state.kind === 'loading' || undefined}>
      {body}
    </section>
  );
}

function DocRow({ label, hint, doc, canUpload, onPick }: { label: string; hint: string; doc?: IdDocument; canUpload: boolean; onPick: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const pick = (file?: File) => {
    if (input.current) input.current.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) return setError('Only PDF files can be uploaded.');
    if (file.size > ID_DOC_MAX_MB * 1024 * 1024) return setError(`The file is over ${ID_DOC_MAX_MB} MB. Scan it at a lower resolution and try again.`);
    setError('');
    onPick(file);
  };
  return (
    <div className="p-doc-row" data-done={doc ? '' : undefined}>
      <span className="p-doc-mark" aria-hidden="true">
        <PIcon name={doc ? 'check' : 'file'} size={16} />
      </span>
      <div className="p-doc-main">
        <strong>
          {label} <span className="p-dim">(required, PDF up to {ID_DOC_MAX_MB} MB)</span>
        </strong>
        {doc ? (
          <span>
            <a href={doc.url} target="_blank" rel="noreferrer">
              {doc.fileName}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>{' '}
            · {formatSize(doc.size)} · uploaded {formatDate(doc.uploaded)}
          </span>
        ) : (
          <span>{hint}</span>
        )}
        {error && (
          <span className="p-error" role="alert">
            {error}
          </span>
        )}
      </div>
      {canUpload && (
        <>
          <button type="button" className={btnClass(doc ? 'ghost' : 'primary', { small: true })} onClick={() => input.current?.click()}>
            <BtnLabel icon="upload">
              {doc ? 'Replace' : 'Upload'}
              <span className="sr-only"> {label}</span>
            </BtnLabel>
          </button>
          <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pick(e.target.files?.[0])} />
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { ApiError, ApiErrorKind } from '../api';
import { BUSY_MESSAGE, failedText } from '../api';
import { certificateTitle, matchesCertificate, useCertificates, type IssuedCertificate } from '../certificates';
import { PdfModal } from '../PdfModal';
import { useDirectory } from '../people';
import { useSession } from '../session';
import { formatDate } from '../store';
import { btnClass, BtnLabel, Empty, Modal, PageHead, PIcon, SearchField, Stat, useNotice } from '../ui';
import { IssueWizard } from './Certificates';

/**
 * Certificates with the real sign-in (src/portal/certificates.ts). Admins and superadmins issue certificates and see
 * every one; everyone else sees their own. The backend allows only those two roles to issue or delete, so sub admins
 * see their own certificates too. A PDF is made fresh by the backend each time it's opened.
 */

const LOAD_FAILED: Record<ApiErrorKind, string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again to see your certificates.',
  forbidden: 'Your account isn’t allowed to see these certificates.',
  'not-found': 'Certificates weren’t found on the server.',
  conflict: 'We couldn’t load the certificates. Please try again.',
  'bad-request': 'We couldn’t load the certificates. Please try again.',
  busy: BUSY_MESSAGE,
  unavailable: 'We couldn’t reach the employee records. Check your connection and try again.',
};
const ACTION_FAILED: Record<ApiErrorKind, string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  forbidden: 'Your role isn’t allowed to do that.',
  'not-found': 'That certificate or person isn’t in the records any more. The list has been refreshed.',
  conflict: 'That clashes with an existing certificate. Please try again.',
  'bad-request': 'Choose a certificate type and a person first.',
  busy: BUSY_MESSAGE,
  unavailable: 'We couldn’t reach the employee records, so nothing was changed. Try again in a moment.',
};

// a refusal (a missing or too-long title, someone blocked or removed) is told in the backend's words
const actionFailed = (e: ApiError) => ((e.kind === 'bad-request' || e.kind === 'conflict') && e.message !== e.kind ? e.message : failedText(e, ACTION_FAILED));

export function ConnectedCertificates() {
  // the portal's admin view is the backend's Admin or Superadmin, the two roles it lets issue and delete
  const canIssue = useSession()!.role === 'admin';
  const certificates = useCertificates(canIssue ? 'all' : 'mine');
  const [tab, setTab] = useState<'issue' | 'history'>(canIssue ? 'issue' : 'history');
  const [notice, notify] = useNotice();
  const count = certificates.state.kind === 'ready' ? certificates.state.certificates.length : undefined;

  return (
    <>
      <PageHead title="Certificates" sub={canIssue ? 'Generate certificates and keep track of every one issued.' : 'Certificates issued to you.'} />
      {canIssue && (
        <div className="p-tabs" role="tablist" aria-label="Certificates">
          <button type="button" role="tab" aria-selected={tab === 'issue'} onClick={() => setTab('issue')}>
            <PIcon name="plus" size={16} /> Issue certificate
          </button>
          <button type="button" role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>
            <PIcon name="clock" size={16} /> History {count !== undefined && <span className="p-count">{count}</span>}
          </button>
        </div>
      )}
      {canIssue && tab === 'issue' ? (
        <IssueTab
          issue={async (type, personId) => {
            try {
              await certificates.issue(personId, type);
            } catch (e) {
              throw new Error(actionFailed(e as ApiError));
            }
          }}
          onIssued={(name, title) => {
            notify(`${title} generated for ${name}. It’s now in the history.`);
            setTab('history');
          }}
        />
      ) : (
        <History canManage={canIssue} certificates={certificates} notify={notify} />
      )}
      {notice}
    </>
  );
}

/** The wizard, with the real directory to choose from. */
function IssueTab({ issue, onIssued }: { issue: Parameters<typeof IssueWizard>[0]['issue']; onIssued: (name: string, title: string) => void }) {
  const { state, retry } = useDirectory();
  if (state.kind === 'loading') {
    return (
      <section className="p-card" aria-busy="true">
        <p className="p-muted" role="status">
          Loading the people you can issue to…
        </p>
      </section>
    );
  }
  if (state.kind !== 'ready') {
    return (
      <section className="p-card" role="alert">
        <Empty icon="alert" title="The people list didn’t load">
          {state.kind === 'error' ? failedText(state.error, LOAD_FAILED) : LOAD_FAILED.unavailable}
        </Empty>
        <button type="button" className={btnClass('light', { small: true })} onClick={retry}>
          <BtnLabel icon="refresh">Try again</BtnLabel>
        </button>
      </section>
    );
  }
  return <IssueWizard people={state.people} issue={issue} onIssued={(name, type) => onIssued(name, certificateTitle(type))} />;
}

function History({ canManage, certificates, notify }: { canManage: boolean; certificates: ReturnType<typeof useCertificates>; notify: (t: string) => void }) {
  const { state } = certificates;
  const [q, setQ] = useState('');
  const [viewing, setViewing] = useState<IssuedCertificate | null>(null);
  const [deleting, setDeleting] = useState<IssuedCertificate | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const list = state.kind === 'ready' ? state.certificates : [];
  const rows = list.filter((c) => matchesCertificate(c, q));
  const latest = list[0];

  const remove = async (c: IssuedCertificate) => {
    setBusy(c.id);
    try {
      await certificates.remove(c.id);
      notify('Certificate deleted.');
    } catch (e) {
      notify(actionFailed(e as ApiError));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="p-stats is-two">
        <Stat icon="award" label={canManage ? 'Total issued' : 'Issued to you'} value={state.kind === 'ready' ? list.length : '…'} />
        <Stat icon="calendar" label="Latest" value={latest?.issuedAt ? formatDate(latest.issuedAt) : state.kind === 'ready' ? 'None yet' : '…'} tone="saffron" />
      </div>
      <section className="p-card" aria-labelledby="cert-history" aria-busy={state.kind === 'loading' || undefined}>
        <div className="p-card-head is-start">
          <span className="p-tile-icon">
            <PIcon name="clock" />
          </span>
          <div>
            <h2 id="cert-history" className="p-card-title">
              Certificate history
            </h2>
            <p className="p-muted">{canManage ? 'View and manage issued certificates.' : 'View the certificates issued to you.'}</p>
          </div>
        </div>
        <SearchField value={q} onChange={setQ} label="Search certificates" placeholder="Search by type, person, email or number" />
        {state.kind === 'loading' ? (
          <p className="p-muted" role="status">
            Loading certificates…
          </p>
        ) : state.kind === 'error' ? (
          <div role="alert">
            <Empty icon="alert" title="Certificates didn’t load">
              {failedText(state.error, LOAD_FAILED)}
            </Empty>
            {state.error.kind !== 'signed-out' && (
              <button type="button" className={btnClass('light', { small: true })} onClick={certificates.retry}>
                <BtnLabel icon="refresh">Try again</BtnLabel>
              </button>
            )}
          </div>
        ) : rows.length ? (
          <div className="p-table-wrap">
            <table className="p-table">
              <thead>
                <tr>
                  <th scope="col">Certificate type</th>
                  {canManage && <th scope="col">Issued to</th>}
                  <th scope="col">Issued by</th>
                  <th scope="col">Date</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="is-strong">{c.title}</td>
                    {canManage && <td>{c.recipient?.name ?? <span className="p-dim">Removed user</span>}</td>}
                    <td>{c.issuedBy ?? <span className="p-dim">-</span>}</td>
                    <td>{c.issuedAt ? formatDate(c.issuedAt) : '-'}</td>
                    <td className="is-end">
                      <div className="p-row is-end">
                        <button type="button" className={btnClass('ghost', { small: true })} onClick={() => setViewing(c)}>
                          <BtnLabel icon="eye">
                            View<span className="sr-only"> {c.title}</span>
                          </BtnLabel>
                        </button>
                        {canManage && (
                          <button type="button" className={btnClass('ghost', { small: true })} disabled={busy === c.id} onClick={() => setDeleting(c)}>
                            <BtnLabel>
                              Delete<span className="sr-only"> {c.title}</span>
                            </BtnLabel>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="award" title={list.length ? 'Nothing matches that search' : 'No certificates yet'}>
            {list.length ? (
              <button type="button" className="p-text-btn" onClick={() => setQ('')}>
                Clear search
              </button>
            ) : !canManage ? (
              'Certificates an admin issues to you will be listed here.'
            ) : undefined}
          </Empty>
        )}
      </section>
      {viewing && (
        <PdfModal
          title={viewing.title}
          fileName={`${viewing.number || 'certificate'}.pdf`}
          load={() => certificates.openPdf(viewing.id)}
          failure={(kind) => (kind === 'forbidden' ? 'You can only open your own certificates.' : ACTION_FAILED[kind])}
          details={[`No. ${viewing.number || '-'}`, viewing.recipient?.name, viewing.issuedAt && `issued ${formatDate(viewing.issuedAt)}`].filter(Boolean).join(' · ')}
          onClose={() => setViewing(null)}
        />
      )}
      {deleting && (
        <Modal
          title="Delete this certificate?"
          icon="alert"
          onClose={() => setDeleting(null)}
          onSubmit={() => {
            const c = deleting;
            setDeleting(null);
            void remove(c);
          }}
          footer={
            <>
              <button type="button" className={btnClass('ghost')} onClick={() => setDeleting(null)}>
                <BtnLabel>Cancel</BtnLabel>
              </button>
              <button type="submit" className={btnClass('primary')}>
                <BtnLabel>Delete certificate</BtnLabel>
              </button>
            </>
          }
        >
          <p>
            {deleting.title} for {deleting.recipient?.name ?? 'a removed user'} (No. {deleting.number}) will be removed, and it can’t be opened any more.
          </p>
        </Modal>
      )}
    </>
  );
}

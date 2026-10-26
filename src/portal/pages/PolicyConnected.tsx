import { useState } from 'react';
import type { ApiError, ApiErrorKind } from '../api';
import { BUSY_MESSAGE } from '../api';
import { PdfModal } from '../PdfModal';
import { READ_CONFIRMATION, usePolicies, type PolicyDocument } from '../policies';
import { useSession } from '../session';
import { formatDate } from '../store';
import { Badge, btnClass, BtnLabel, Empty, Modal, PageHead, PIcon, Stat, useNotice } from '../ui';
import { UploadModal } from './Policy';

/**
 * Policy & Compliance with the real sign-in (src/portal/policies.ts). Admins and superadmins upload, delete and see
 * who accepted what; everyone else reads and accepts. The backend lets only those two roles upload or delete, so sub
 * admins read and accept like everyone else. Accepting unlocks once the person has opened that document, and asks for
 * their “I have read and understood this policy” tick, which the backend requires too.
 */

const LOAD_FAILED: Record<ApiErrorKind, string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again to see the documents.',
  forbidden: 'Your account isn’t allowed to see these documents.',
  'not-found': 'Documents weren’t found on the server.',
  conflict: 'We couldn’t load the documents. Please try again.',
  'bad-request': 'We couldn’t load the documents. Please try again.',
  busy: BUSY_MESSAGE,
  unavailable: 'We couldn’t reach the employee records. Check your connection and try again.',
};
const ACTION_FAILED: Record<ApiErrorKind, string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  forbidden: 'Your role isn’t allowed to do that.',
  'not-found': 'That document isn’t there any more. The list has been refreshed.',
  conflict: 'That clashes with another document. Please try again.',
  'bad-request': 'That wasn’t accepted.',
  busy: BUSY_MESSAGE,
  unavailable: 'We couldn’t reach the employee records, so nothing was changed. Try again in a moment.',
};

export function ConnectedPolicy() {
  // the portal's admin view is the backend's Admin or Superadmin, the two roles it lets upload and delete
  const canManage = useSession()!.role === 'admin';
  const policies = usePolicies();
  const { state } = policies;
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<PolicyDocument | null>(null);
  const [deleting, setDeleting] = useState<PolicyDocument | null>(null);
  const [accepting, setAccepting] = useState<PolicyDocument | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // documents opened in this visit: accepting is only offered for something the person has actually opened
  const [opened, setOpened] = useState<Set<string>>(() => new Set());
  const [notice, notify] = useNotice();
  const documents = state.kind === 'ready' ? state.documents : [];
  const acceptances = documents.flatMap((d) => d.acceptances.map((a) => ({ ...a, document: d.name, documentId: d.id })));

  const run = async (id: string, change: () => Promise<unknown>, done: string) => {
    setBusy(id);
    try {
      await change();
      notify(done);
    } catch (e) {
      const failure = e as ApiError;
      notify(failure.kind === 'bad-request' && failure.message !== failure.kind ? failure.message : ACTION_FAILED[failure.kind]);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHead title="Policy & Compliance" sub={canManage ? 'Publish internal policies and see who has accepted them.' : 'Read and accept the internal policies that apply to you.'}>
        {canManage && state.kind === 'ready' && (
          <button type="button" className={btnClass('light')} onClick={() => setUploading(true)}>
            <BtnLabel icon="upload">Upload document</BtnLabel>
          </button>
        )}
      </PageHead>
      <div className="p-stats is-two">
        <Stat icon="file" label="Policies" hint="Company policy documents" value={state.kind === 'ready' ? documents.filter((d) => d.category === 'policy').length : '…'} />
        <Stat icon="shield" label="Compliances" hint="Compliance reports & files" value={state.kind === 'ready' ? documents.filter((d) => d.category === 'compliance').length : '…'} tone="saffron" />
      </div>

      <section className="p-card" aria-labelledby="docs" aria-busy={state.kind === 'loading' || undefined}>
        <div className="p-card-head">
          <h2 id="docs" className="p-card-title">
            Documents
          </h2>
        </div>
        {state.kind === 'loading' ? (
          <p className="p-muted" role="status">
            Loading documents…
          </p>
        ) : state.kind === 'error' ? (
          <div role="alert">
            <Empty icon="alert" title="Documents didn’t load">
              {LOAD_FAILED[state.error.kind]}
            </Empty>
            {state.error.kind !== 'signed-out' && (
              <button type="button" className={btnClass('light', { small: true })} onClick={policies.retry}>
                <BtnLabel icon="refresh">Try again</BtnLabel>
              </button>
            )}
          </div>
        ) : documents.length ? (
          <div className="p-table-wrap">
            <table className="p-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Name</th>
                  <th scope="col">Category</th>
                  <th scope="col">File</th>
                  <th scope="col">Pages</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d, i) => (
                  <tr key={d.id}>
                    <td className="is-mono">{i + 1}</td>
                    <td className="is-strong">{d.name}</td>
                    <td>
                      <Badge kind={d.category ?? 'soft'}>{d.categoryLabel}</Badge>
                    </td>
                    <td>
                      <button type="button" className="p-link" onClick={() => setViewing(d)}>
                        {d.fileName}
                        <span className="sr-only"> (opens the document)</span>
                      </button>
                    </td>
                    <td>{d.pages || '-'}</td>
                    <td>
                      {canManage ? (
                        <span className="p-dim">{d.acceptances.length === 1 ? '1 acceptance' : `${d.acceptances.length} acceptances`}</span>
                      ) : d.acceptedByMe ? (
                        <Badge kind="done">Accepted</Badge>
                      ) : (
                        <Badge kind="doing">To review</Badge>
                      )}
                    </td>
                    <td className="is-end">
                      {canManage ? (
                        <button type="button" className={btnClass('ghost', { small: true })} disabled={busy === d.id} onClick={() => setDeleting(d)}>
                          <BtnLabel>
                            Delete<span className="sr-only"> {d.name}</span>
                          </BtnLabel>
                        </button>
                      ) : (
                        !d.acceptedByMe &&
                        (opened.has(d.id) ? (
                          <button
                            type="button"
                            className={btnClass('primary', { small: true })}
                            disabled={busy === d.id}
                            onClick={() => setAccepting(d)}
                          >
                            <BtnLabel icon="check">
                              {busy === d.id ? 'Accepting…' : 'Accept'}
                              <span className="sr-only"> {d.name}</span>
                            </BtnLabel>
                          </button>
                        ) : (
                          <button type="button" className={btnClass('ghost', { small: true })} onClick={() => setViewing(d)} title="Open it first; accepting unlocks once you have">
                            <BtnLabel icon="eye">
                              Read to accept<span className="sr-only"> {d.name}</span>
                            </BtnLabel>
                          </button>
                        ))
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="file" title="No documents yet">
            {canManage ? 'Upload a policy or compliance PDF to publish it.' : 'Nothing to review right now.'}
          </Empty>
        )}
        {notice}
      </section>

      {canManage && state.kind === 'ready' && (
        <section className="p-card" aria-labelledby="accepted">
          <div className="p-card-head">
            <h2 id="accepted" className="p-card-title">
              <PIcon name="check" /> Accepted policies
            </h2>
          </div>
          {acceptances.length ? (
            <div className="p-table-wrap">
              <table className="p-table">
                <thead>
                  <tr>
                    <th scope="col">Person</th>
                    <th scope="col">Role</th>
                    <th scope="col">Document</th>
                    <th scope="col">Accepted on</th>
                  </tr>
                </thead>
                <tbody>
                  {acceptances.map((a) => (
                    <tr key={`${a.documentId}-${a.personId}`}>
                      <td className="is-strong">{a.name}</td>
                      <td>
                        <Badge kind={a.role}>{a.roleLabel}</Badge>
                      </td>
                      <td>{a.document}</td>
                      <td>{a.acceptedAt ? formatDate(a.acceptedAt) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon="check" title="Nobody has accepted a policy yet" />
          )}
        </section>
      )}

      {uploading && (
        <UploadModal
          onClose={() => setUploading(false)}
          onAdd={async (draft) => {
            try {
              await policies.upload(draft);
            } catch (e) {
              const failure = e as ApiError;
              // the backend's own words for a refused file ("over 20 MB", "isn't a real PDF") say exactly what to fix
              throw new Error(failure.kind === 'bad-request' || failure.message.includes('MB') ? failure.message : ACTION_FAILED[failure.kind]);
            }
            notify(`${draft.name} was published.`);
          }}
        />
      )}
      {viewing && (
        <PdfModal
          title={viewing.name}
          fileName={viewing.fileName}
          load={() => policies.openPdf(viewing.id)}
          failure={(kind) => (kind === 'not-found' ? 'This document’s file isn’t on the server any more. An admin needs to upload it again.' : ACTION_FAILED[kind])}
          details={[viewing.categoryLabel, viewing.pages ? `${viewing.pages} pages` : '', viewing.uploadedAt && `published ${formatDate(viewing.uploadedAt)}`].filter(Boolean).join(' · ')}
          onOpened={() => setOpened((s) => new Set(s).add(viewing.id))}
          onClose={() => setViewing(null)}
        />
      )}
      {accepting && (
        <AcceptPolicyModal
          document={accepting}
          onClose={() => setAccepting(null)}
          onAccept={() => {
            const d = accepting;
            setAccepting(null);
            void run(d.id, () => policies.accept(d.id), `You accepted ${d.name}.`);
          }}
        />
      )}
      {deleting && (
        <Modal
          title={`Delete ${deleting.name}?`}
          icon="alert"
          onClose={() => setDeleting(null)}
          onSubmit={() => {
            const d = deleting;
            setDeleting(null);
            void run(d.id, () => policies.remove(d.id), `${d.name} was deleted.`);
          }}
          footer={
            <>
              <button type="button" className={btnClass('ghost')} onClick={() => setDeleting(null)}>
                <BtnLabel>Cancel</BtnLabel>
              </button>
              <button type="submit" className={btnClass('primary')}>
                <BtnLabel>Delete document</BtnLabel>
              </button>
            </>
          }
        >
          <p>
            The document and its file are removed for everyone{deleting.acceptances.length ? `, along with ${deleting.acceptances.length === 1 ? 'its 1 acceptance' : `its ${deleting.acceptances.length} acceptances`}` : ''}. This
            can’t be undone.
          </p>
        </Modal>
      )}
    </>
  );
}

/** Accepting is recorded with the person's name, so it waits for their own tick. */
function AcceptPolicyModal({ document, onClose, onAccept }: { document: PolicyDocument; onClose: () => void; onAccept: () => void }) {
  const [ticked, setTicked] = useState(false);
  return (
    <Modal
      title={`Accept ${document.name}?`}
      icon="check"
      onClose={onClose}
      onSubmit={() => ticked && onAccept()}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')} disabled={!ticked}>
            <BtnLabel icon="check">Accept</BtnLabel>
          </button>
        </>
      }
    >
      <p>Your acceptance is saved with your name and today’s date, and admins can see it.</p>
      <label className="p-doc">
        <input type="checkbox" checked={ticked} onChange={(e) => setTicked(e.target.checked)} />
        <span className="p-doc-box" aria-hidden="true">
          <PIcon name="check" size={12} />
        </span>
        <span>{READ_CONFIRMATION}</span>
      </label>
    </Modal>
  );
}

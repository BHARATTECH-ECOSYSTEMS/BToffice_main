import { useState } from 'react';
import type { ApiError, ApiErrorKind } from '../api';
import type { LinkResource } from '../data';
import { useDirectory, type DirectoryState } from '../people';
import { audience, isWebLink, useResources } from '../resources';
import { useSession } from '../session';
import { btnClass, BtnLabel, Empty, Modal, PageHead, PIcon, useNotice } from '../ui';
import { AddLink, ToolCard, visibleTools } from './Resources';

/**
 * Resources with the real sign-in (src/portal/resources.ts). The tool cards are the website's own; the shared links come
 * from the backend. Only admins and superadmins add, assign and delete (the backend's rule), so sub admins only view.
 * A link assigned to nobody is visible to everyone; once assigned, only those people see it.
 */

type Resources = ReturnType<typeof useResources>;

const LOAD_FAILED: Record<ApiErrorKind, string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again to see the shared links.',
  forbidden: 'Your account isn’t allowed to see the shared links.',
  'not-found': 'Shared links weren’t found on the server.',
  conflict: 'We couldn’t load the shared links. Please try again.',
  'bad-request': 'We couldn’t load the shared links. Please try again.',
  unavailable: 'We couldn’t reach the server. Check your connection and try again.',
};
const ACTION_FAILED: Record<ApiErrorKind, string> = {
  'signed-out': 'Your sign-in has ended. Sign out and sign in again, then try once more.',
  forbidden: 'Only admins and superadmins can change shared links.',
  'not-found': 'That link or person isn’t in the records any more. The list has been refreshed.',
  conflict: 'That clashes with a change someone else made. The list has been refreshed.',
  'bad-request': 'The server didn’t accept that. Check the name and address and try again.',
  unavailable: 'We couldn’t reach the server, so nothing was changed. Try again in a moment.',
};
// the backend explains a refused name or address itself ("Enter a full web address starting with http://…")
const failure = (e: unknown) => {
  const error = e as ApiError;
  return error.kind === 'bad-request' && error.message !== 'bad-request' ? error.message : ACTION_FAILED[error.kind];
};

export function ConnectedResources() {
  const role = useSession()!.role;
  // the portal's admin view is the backend's Admin or Superadmin, the two roles it lets manage links
  const canManage = role === 'admin';
  const resources = useResources();
  const [adding, setAdding] = useState(false);
  const [notice, notify] = useNotice();

  return (
    <>
      <PageHead title="Resources" sub="Every tool and reference the team works with.">
        {canManage && (
          <button type="button" className={btnClass('light')} onClick={() => setAdding(true)}>
            <BtnLabel icon="plus">Add resource</BtnLabel>
          </button>
        )}
      </PageHead>
      <div className="p-grid">
        {visibleTools(role).map((t) => (
          <ToolCard key={t.id} tool={t} />
        ))}
        {canManage ? <ManagedLinks resources={resources} notify={notify} /> : <Links resources={resources} notify={notify} />}
      </div>
      {notice}
      {adding && (
        <AddLink
          onClose={() => setAdding(false)}
          onAdd={async (name, url) => {
            try {
              await resources.add(name, url);
            } catch (e) {
              throw new Error(failure(e));
            }
            notify(`${name} was added. Everyone can see it until you assign it to someone.`);
          }}
        />
      )}
    </>
  );
}

/** Admins also need the directory, to name and pick the people a link is assigned to. */
function ManagedLinks({ resources, notify }: { resources: Resources; notify: (t: string) => void }) {
  const directory = useDirectory();
  return <Links resources={resources} notify={notify} directory={directory.state} retryDirectory={directory.retry} />;
}

function Links({
  resources,
  notify,
  directory,
  retryDirectory,
}: {
  resources: Resources;
  notify: (t: string) => void;
  /** Set for admins only. */
  directory?: DirectoryState;
  retryDirectory?: () => void;
}) {
  const { state } = resources;
  const canManage = !!directory;
  if (state.kind === 'loading' || state.kind === 'off') {
    return (
      <article className="p-card p-resource" aria-busy="true">
        <p className="p-muted" role="status">
          Loading shared links…
        </p>
      </article>
    );
  }
  if (state.kind === 'error') {
    return (
      <article className="p-card p-resource" role="alert">
        <Empty icon="alert" title="Shared links didn’t load">
          {LOAD_FAILED[state.error.kind]}
        </Empty>
        {state.error.kind !== 'signed-out' && (
          <button type="button" className={btnClass('light', { small: true })} onClick={resources.retry}>
            <BtnLabel icon="refresh">Try again</BtnLabel>
          </button>
        )}
      </article>
    );
  }
  if (!state.links.length) {
    return (
      <article className="p-card p-resource">
        <Empty icon="link" title="No shared links yet">
          {canManage ? 'Add one with Add resource. A link nobody is assigned to is visible to everyone.' : 'Links an admin shares with you will appear here.'}
        </Empty>
      </article>
    );
  }
  return (
    <>
      {state.links.map((l) => (
        <LinkCard key={l.id} link={l} resources={resources} notify={notify} directory={directory} retryDirectory={retryDirectory} />
      ))}
    </>
  );
}

function LinkCard({
  link,
  resources,
  notify,
  directory,
  retryDirectory,
}: {
  link: LinkResource;
  resources: Resources;
  notify: (t: string) => void;
  directory?: DirectoryState;
  retryDirectory?: () => void;
}) {
  const [who, setWho] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const people = directory?.kind === 'ready' ? directory.people : [];
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name;
  const safe = isWebLink(link.url);

  const run = async (change: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await change();
      notify(done);
    } catch (e) {
      notify(failure(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="p-card p-resource" aria-busy={busy || undefined}>
      <span className="p-tile-icon">
        <PIcon name="link" />
      </span>
      <h2 className="p-card-title">{link.name}</h2>
      <p className="p-muted p-url">{link.url}</p>
      <div className="p-resource-foot">
        <div className="p-row">
          {safe ? (
            <a className={btnClass('primary')} href={link.url} target="_blank" rel="noreferrer">
              <BtnLabel arrow="up-right">Open</BtnLabel>
              <span className="sr-only">{link.name} (opens in a new tab)</span>
            </a>
          ) : (
            <p className="p-error">
              This address can’t be opened safely.{directory && ' Delete it and add it again with an https:// address.'}
            </p>
          )}
          {directory && (
            <button type="button" className={btnClass('ghost')} disabled={busy} onClick={() => setDeleting(true)}>
              <BtnLabel>
                Delete<span className="sr-only"> {link.name}</span>
              </BtnLabel>
            </button>
          )}
        </div>
        {directory && (
          <>
            <form
              className="p-assign"
              onSubmit={(e) => {
                e.preventDefault();
                if (!who || busy) return;
                const name = nameOf(who);
                void run(() => resources.assign(link.id, who), `${link.name} was assigned to ${name}. Now only the people listed can see it.`).then(() => setWho(''));
              }}
            >
              <label className="p-field is-tight">
                <span>Assign user</span>
                <select className="p-select" value={who} onChange={(e) => setWho(e.target.value)} disabled={directory.kind !== 'ready' || busy}>
                  <option value="">{directory.kind === 'ready' ? 'Select user' : directory.kind === 'error' ? 'People didn’t load' : 'Loading people…'}</option>
                  {people
                    .filter((p) => !link.assignedTo.includes(p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              {directory.kind === 'error' ? (
                <button type="button" className={btnClass('ghost')} onClick={retryDirectory}>
                  <BtnLabel icon="refresh">Load people again</BtnLabel>
                </button>
              ) : (
                <button type="submit" className={btnClass('ghost')} disabled={!who || busy}>
                  <BtnLabel icon="users">Assign</BtnLabel>
                </button>
              )}
            </form>
            <p className="p-dim">{audience(link.assignedTo, nameOf)}</p>
            {link.assignedTo.length > 0 && (
              <ul className="p-access" aria-label={`People who can see ${link.name}`}>
                {link.assignedTo.map((id) => {
                  const name = nameOf(id) ?? 'a removed account';
                  return (
                    <li key={id}>
                      {name}
                      <button
                        type="button"
                        aria-label={`Remove ${name} from ${link.name}`}
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => resources.unassign(link.id, id),
                            link.assignedTo.length === 1 ? `${name} was removed. Everyone can see ${link.name} again.` : `${name} was removed from ${link.name}.`,
                          )
                        }
                      >
                        <PIcon name="close" size={12} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
      {deleting && (
        <Modal
          title="Delete this link?"
          icon="alert"
          onClose={() => setDeleting(false)}
          onSubmit={() => {
            setDeleting(false);
            void run(() => resources.remove(link.id), `${link.name} was deleted.`);
          }}
          footer={
            <>
              <button type="button" className={btnClass('ghost')} onClick={() => setDeleting(false)}>
                <BtnLabel>Cancel</BtnLabel>
              </button>
              <button type="submit" className={btnClass('primary')}>
                <BtnLabel>Delete link</BtnLabel>
              </button>
            </>
          }
        >
          <p>
            <strong>{link.name}</strong> will be removed for everyone who can see it. This can’t be undone.
          </p>
        </Modal>
      )}
    </article>
  );
}

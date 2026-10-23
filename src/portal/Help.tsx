import { useState } from 'react';
import { Link } from 'react-router';
import { api } from './api';
import { helpAdmins, helpGroups } from './helpTopics';
import { useDirectory } from './people';
import { useSession } from './session';
import { usePortal } from './store';
import { btnClass, BtnLabel, Empty, Modal, PIcon, SearchField } from './ui';

/** The demo names its sample admins; connected, Help asks the real directory (any signed-in role may read it). */
function useDemoAdmins() {
  const { people, me } = usePortal();
  return people.filter((p) => p.role === 'admin' && p.id !== me.id).map((p) => p.name);
}

function useDirectoryAdmins() {
  const email = useSession()!.email;
  const { state } = useDirectory();
  return state.kind === 'ready' ? helpAdmins(state.people, email) : [];
}

// `api` is fixed for the page's whole life, so Help always calls the same hooks
const useAdmins = api ? useDirectoryAdmins : useDemoAdmins;

export function HelpModal({ onClose }: { onClose: () => void }) {
  const role = useSession()!.role;
  const [q, setQ] = useState('');
  const query = q.trim();
  const groups = helpGroups(!!api, role, query);
  // real names to ask, taken from the directory instead of a made-up support address
  const admins = useAdmins();

  return (
    <Modal
      title="How can we help?"
      icon="help"
      onClose={onClose}
      footer={
        <button type="button" className={btnClass('primary')} onClick={onClose}>
          <BtnLabel>Done</BtnLabel>
        </button>
      }
    >
      <SearchField value={q} onChange={setQ} label="Search help" placeholder="Search, for example “password”" />
      <div className="p-help" data-lenis-prevent>
        {groups.length ? (
          groups.map((g) => (
            <section key={g.title} className="p-help-group" aria-labelledby={`help-${g.icon}`}>
              <h3 id={`help-${g.icon}`}>
                <PIcon name={g.icon} size={16} /> {g.title}
              </h3>
              {g.topics.map((t, i) => (
                // while searching, every match opens so the answer is visible at once
                <details key={t.q} className="p-help-item" open={!!query || (i === 0 && g === groups[0]) || undefined}>
                  <summary>
                    {t.q}
                    <PIcon name="chevron" size={14} />
                  </summary>
                  <p>{t.a}</p>
                  {t.link && (
                    <Link to={t.link.to} className="p-help-link" onClick={onClose}>
                      {t.link.label} <PIcon name="chevron" size={12} />
                    </Link>
                  )}
                </details>
              ))}
            </section>
          ))
        ) : (
          <Empty icon="search" title="No help topics match">
            Try another word, or ask an admin.
          </Empty>
        )}
      </div>
      <p className="p-help-contact">
        <PIcon name="users" size={16} />
        <span>
          Still stuck? {role === 'admin' ? 'Other admins' : 'Your admins'}
          {admins.length ? (
            <>
              : <strong>{admins.join(', ')}</strong>
            </>
          ) : (
            ' can help'
          )}
          .
        </span>
      </p>
    </Modal>
  );
}

import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { TOOLS, toolById, type LinkResource, type Tool } from '../data';
import { managesPortal, useSession } from '../session';
import { usePeopleById, usePortal } from '../store';
import { btnClass, BtnLabel, DeleteButton, Empty, Modal, PageHead, PIcon, useNotice } from '../ui';
import { NotConnected, ToolButton } from './Dashboard';

// The cards keep the old portal's order, which differs from the sidebar's.
const CARD_ORDER = ['coder', 'huly', 'librechat', 'chatwoot', 'invoice', 'plane', 'securo', 'screego', 'excalidraw', 'lobehub'];

export function Resources() {
  const role = useSession()!.role;
  const isManager = managesPortal(role);
  const { links, me, addLink } = usePortal();
  const [adding, setAdding] = useState(false);
  const [notice, notify] = useNotice();
  const tools = TOOLS.filter((t) => t.id !== 'hrms' && !t.navOnly && (!t.adminOnly || role === 'admin')).sort((a, b) => CARD_ORDER.indexOf(a.id) - CARD_ORDER.indexOf(b.id));
  // Employees see shared links that were assigned to them; admins see them all.
  const visibleLinks = isManager ? links : links.filter((l) => l.assignedTo.includes(me.id));

  return (
    <>
      <PageHead title="Resources" sub="Every tool and reference the team works with.">
        {isManager && (
          <button type="button" className={btnClass('light')} onClick={() => setAdding(true)}>
            <BtnLabel icon="plus">Add resource</BtnLabel>
          </button>
        )}
      </PageHead>
      <div className="p-grid">
        {tools.map((t) => (
          <ToolCard key={t.id} tool={t} />
        ))}
        {visibleLinks.map((l) => (
          <LinkCard key={l.id} link={l} isManager={isManager} canDelete={role === 'admin'} notify={notify} />
        ))}
      </div>
      {notice}
      {adding && (
        <AddLink
          onClose={() => setAdding(false)}
          onAdd={(name, url) => {
            addLink(name, url);
            notify(`${name} was added.`);
          }}
        />
      )}
    </>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  return (
    <article className="p-card p-resource">
      <span className="p-tile-icon">
        <PIcon name={tool.icon} />
      </span>
      <div>
        <h2 className="p-card-title">{tool.name}</h2>
        <p className="p-card-meta">{tool.category}</p>
      </div>
      <p className="p-muted">{tool.body}</p>
      <div className="p-resource-foot">
        <ToolButton url={tool.url} label={tool.openLabel ?? 'Open Platform'} name={tool.name} />
        {tool.caption && <p className="p-resource-caption">{tool.caption}</p>}
        {tool.secondary && <ToolButton url={tool.secondary.url} label={tool.secondary.label} name={tool.name} icon={tool.secondary.icon} variant="ghost" />}
        <p className="p-tags">
          {tool.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </p>
        {!tool.url && <NotConnected />}
      </div>
    </article>
  );
}

function LinkCard({ link, isManager, canDelete, notify }: { link: LinkResource; isManager: boolean; canDelete: boolean; notify: (t: string) => void }) {
  const { people, removeLink, assignLink } = usePortal();
  const byId = usePeopleById();
  const [who, setWho] = useState('');
  return (
    <article className="p-card p-resource">
      <span className="p-tile-icon">
        <PIcon name="link" />
      </span>
      <h2 className="p-card-title">{link.name}</h2>
      <p className="p-muted p-url">{link.url}</p>
      <div className="p-resource-foot">
        <div className="p-row">
          <a className={btnClass('primary')} href={link.url} target="_blank" rel="noreferrer">
            <BtnLabel arrow="up-right">Open</BtnLabel>
            <span className="sr-only">{link.name} (opens in a new tab)</span>
          </a>
          {canDelete && (
            <DeleteButton srText={link.name} onDone={() => (removeLink(link.id), notify(`${link.name} was deleted.`))} />
          )}
        </div>
        {isManager && (
          <form
            className="p-assign"
            onSubmit={(e) => {
              e.preventDefault();
              if (!who) return;
              assignLink(link.id, who);
              notify(`${link.name} was assigned to ${byId.get(who)?.name}.`);
              setWho('');
            }}
          >
            <label className="p-field is-tight">
              <span>Assign user</span>
              <select className="p-select" value={who} onChange={(e) => setWho(e.target.value)}>
                <option value="">Select user</option>
                {people
                  .filter((p) => !link.assignedTo.includes(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <button type="submit" className={btnClass('ghost')} disabled={!who}>
              <BtnLabel icon="users">Assign</BtnLabel>
            </button>
          </form>
        )}
        {isManager && link.assignedTo.length > 0 && <p className="p-dim">Assigned to {link.assignedTo.map((id) => byId.get(id)?.name ?? 'removed user').join(', ')}</p>}
      </div>
    </article>
  );
}

function AddLink({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string, url: string) => void }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  return (
    <Modal
      title="Add resource"
      icon="link"
      onClose={onClose}
      onSubmit={() => {
        if (!name.trim()) return setError('Give the resource a name.');
        let parsed: URL;
        try {
          parsed = new URL(url.trim());
        } catch {
          return setError('Enter a full web address, starting with https://');
        }
        // only web links: a javascript: or data: address would run code when someone clicks Open
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return setError('Only http and https addresses can be added.');
        onAdd(name.trim(), parsed.href);
        onClose();
      }}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')}>
            <BtnLabel>Add resource</BtnLabel>
          </button>
        </>
      }
    >
      <label className="p-field">
        <span>Name</span>
        <input value={name} onChange={(e) => (setName(e.target.value), setError(''))} placeholder="React documentation" autoFocus />
      </label>
      <label className="p-field">
        <span>Web address</span>
        <input type="url" value={url} onChange={(e) => (setUrl(e.target.value), setError(''))} placeholder="https://" />
      </label>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

/** One self-hosted tool, opened from the sidebar. */
export function ToolPage() {
  const { id = '' } = useParams();
  const isAdmin = useSession()!.role === 'admin';
  const tool = toolById(id);
  if (!tool || (tool.adminOnly && !isAdmin)) return <PortalNotFound />;
  return (
    <>
      <PageHead title={tool.navLabel ?? tool.name} sub={tool.body} />
      <section className="p-card p-tool">
        <span className="p-tile-icon is-large">
          <PIcon name={tool.icon} size={26} />
        </span>
        <div>
          <h2 className="p-card-title">{tool.name}</h2>
          <p className="p-card-meta">{tool.category}</p>
        </div>
        <p className="p-tags">
          {tool.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </p>
        <ToolButton url={tool.url} label="Open" name={tool.name} wide={false} />
      </section>
    </>
  );
}

/** A section that is planned but not built yet. */
export function Soon({ title, sub, body }: { title: string; sub: string; body: string }) {
  return (
    <>
      <PageHead title={title} sub={sub} />
      <section className="p-card">
        <Empty icon="clock" title="Coming next">
          {body}
        </Empty>
      </section>
    </>
  );
}

export function PortalNotFound() {
  return (
    <section className="p-card">
      <Empty icon="alert" title="This page doesn't exist">
        <Link to="/portal">Go to the dashboard</Link>
      </Empty>
    </section>
  );
}

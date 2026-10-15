import { useState } from 'react';
import type { PolicyCategory, PolicyDoc } from '../data';
import { useSession } from '../session';
import { formatDate, usePeopleById, usePortal } from '../store';
import { Badge, btnClass, BtnLabel, ConfirmDelete, Empty, Modal, PageHead, PIcon, Stat, useNotice } from '../ui';

const CATEGORY: Record<PolicyCategory, string> = { policy: 'Policy', compliance: 'Compliance' };
const MAX_MB = 20;

export function Policy() {
  const isAdmin = useSession()!.role === 'admin';
  const { policies, acceptances, me, acceptPolicy, addPolicy, removePolicy } = usePortal();
  const byId = usePeopleById();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<PolicyDoc | null>(null);
  const [notice, notify] = useNotice();
  const accepted = (docId: string) => acceptances.some((a) => a.docId === docId && a.personId === me.id);
  const docName = (id: string) => policies.find((d) => d.id === id)?.name ?? 'Removed document';

  return (
    <>
      <PageHead title="Policy & Compliance" sub={isAdmin ? 'Publish internal policies and see who has accepted them.' : 'Read and accept the internal policies that apply to you.'}>
        {isAdmin && (
          <button type="button" className={btnClass('light')} onClick={() => setUploading(true)}>
            <BtnLabel icon="upload">Upload document</BtnLabel>
          </button>
        )}
      </PageHead>
      <div className="p-stats is-two">
        <Stat icon="file" label="Policies" hint="Company policy documents" value={policies.filter((d) => d.category === 'policy').length} />
        <Stat icon="shield" label="Compliances" hint="Compliance reports & files" value={policies.filter((d) => d.category === 'compliance').length} tone="saffron" />
      </div>

      <section className="p-card" aria-labelledby="docs">
        <div className="p-card-head">
          <h2 id="docs" className="p-card-title">
            Documents
          </h2>
        </div>
        {policies.length ? (
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
                {policies.map((d, i) => {
                  const count = acceptances.filter((a) => a.docId === d.id).length;
                  return (
                    <tr key={d.id}>
                      <td className="is-mono">{i + 1}</td>
                      <td className="is-strong">{d.name}</td>
                      <td>
                        <Badge kind={d.category}>{CATEGORY[d.category]}</Badge>
                      </td>
                      <td>
                        {d.fileUrl ? (
                          <a href={d.fileUrl} target="_blank" rel="noreferrer" className="p-link">
                            {d.fileName}
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        ) : (
                          <span className="p-dim" title="Sample entry: there is no file behind it">
                            {d.fileName}
                          </span>
                        )}
                      </td>
                      <td>{d.pages}</td>
                      <td>
                        {isAdmin ? (
                          <span className="p-dim">{count === 1 ? '1 acceptance' : `${count} acceptances`}</span>
                        ) : accepted(d.id) ? (
                          <Badge kind="done">Accepted</Badge>
                        ) : (
                          <Badge kind="doing">To review</Badge>
                        )}
                      </td>
                      <td className="is-end">
                        {isAdmin ? (
                          <button type="button" className={btnClass('danger', { small: true })} onClick={() => setDeleting(d)}>
                            <BtnLabel icon="trash">
                              Delete<span className="sr-only"> {d.name}</span>
                            </BtnLabel>
                          </button>
                        ) : (
                          !accepted(d.id) &&
                          // accepting a document nobody can open would record agreement to something unread
                          (d.fileUrl ? (
                            <button type="button" className={btnClass('primary', { small: true })} onClick={() => (acceptPolicy(d.id), notify(`You accepted ${d.name}.`))}>
                              <BtnLabel icon="check">
                                Accept<span className="sr-only"> {d.name}</span>
                              </BtnLabel>
                            </button>
                          ) : (
                            <span className="p-dim">File not available yet</span>
                          ))
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="file" title="No documents yet">
            {isAdmin ? 'Upload a policy or compliance PDF to publish it.' : 'Nothing to review right now.'}
          </Empty>
        )}
        {notice}
      </section>

      {isAdmin && (
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
                  {acceptances.map((a) => {
                    const p = byId.get(a.personId);
                    return (
                      <tr key={`${a.docId}-${a.personId}`}>
                        <td className="is-strong">{p?.name ?? 'Removed user'}</td>
                        <td>{p && <Badge kind={p.role}>{p.role}</Badge>}</td>
                        <td>{docName(a.docId)}</td>
                        <td>{formatDate(a.date)}</td>
                      </tr>
                    );
                  })}
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
          onAdd={(doc) => {
            addPolicy(doc);
            notify(`${doc.name} was published. It's kept only until this page reloads.`);
          }}
        />
      )}
      {deleting && <ConfirmDelete what={deleting.name} onClose={() => setDeleting(null)} onConfirm={() => (removePolicy(deleting.id), notify(`${deleting.name} was deleted.`))} />}
    </>
  );
}

function UploadModal({ onClose, onAdd }: { onClose: () => void; onAdd: (doc: Omit<PolicyDoc, 'id'>) => void }) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState('');
  const [category, setCategory] = useState<PolicyCategory | ''>('');
  const [error, setError] = useState('');
  return (
    <Modal
      eyebrow="Document"
      title="Add document"
      icon="upload"
      onClose={onClose}
      onSubmit={() => {
        const n = Number(pages);
        if (!name.trim()) return setError('Give the document a name.');
        if (!file) return setError('Choose a PDF to upload.');
        // the browser's own type plus the extension: either alone is easy to get wrong
        if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) return setError('Only PDF files can be uploaded.');
        if (file.size > MAX_MB * 1024 * 1024) return setError(`The file is over ${MAX_MB} MB.`);
        if (!Number.isInteger(n) || n < 1 || n > 2000) return setError('Enter the number of pages (a whole number).');
        if (!category) return setError('Pick a category.');
        onAdd({ name: name.trim(), category, pages: n, fileName: file.name, fileUrl: URL.createObjectURL(file) });
        onClose();
      }}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')}>
            <BtnLabel>Add</BtnLabel>
          </button>
        </>
      }
    >
      <label className="p-field">
        <span>Name</span>
        <input value={name} onChange={(e) => (setName(e.target.value), setError(''))} placeholder="Document name" autoFocus />
      </label>
      <label className="p-field">
        <span>PDF file (up to {MAX_MB} MB)</span>
        <input type="file" accept="application/pdf,.pdf" onChange={(e) => (setFile(e.target.files?.[0] ?? null), setError(''))} />
      </label>
      <label className="p-field">
        <span>Pages</span>
        <input type="number" min={1} inputMode="numeric" value={pages} onChange={(e) => (setPages(e.target.value), setError(''))} placeholder="Total pages" />
      </label>
      <label className="p-field">
        <span>Category</span>
        <select className="p-select" value={category} onChange={(e) => (setCategory(e.target.value as PolicyCategory), setError(''))}>
          <option value="">Select a category</option>
          <option value="policy">Policy</option>
          <option value="compliance">Compliance</option>
        </select>
      </label>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

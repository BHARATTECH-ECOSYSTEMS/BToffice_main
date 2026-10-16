import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ID_DOC_MAX_MB, ID_DOCS, ID_RETENTION_DAYS, STREAM_LABEL, type IdDocument, type PersonRole } from '../data';
import { useSession } from '../session';
import { formatDate, usePortal } from '../store';
import { Badge, btnClass, BtnLabel, Empty, initials, PageHead, PIcon, useNotice } from '../ui';

const ROLE_LABEL: Record<PersonRole, string> = { admin: 'Admin', subadmin: 'Sub Admin', employee: 'Employee', intern: 'Intern' };
const STATUS_LABEL = { active: 'Active', inactive: 'Inactive', invited: 'Invited' } as const;

export const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/**
 * The signed-in person's own profile, opened from their name in the top bar. Its documents section is where the
 * upload link from an employee verification lands (?docs=1): the employee uploads their Aadhaar and PAN here, and
 * only admins see them in HR OPS. The details come from the directory; name and photo are changed in Settings.
 */
export function Profile() {
  const photo = useSession()!.photo;
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

  const facts: [string, string][] = [
    ['Employee ID', me.id],
    ['Email', me.email],
    ['Role', ROLE_LABEL[me.role]],
    ['Stream', STREAM_LABEL[me.stream]],
    ['Team', me.team],
    ['Status', STATUS_LABEL[me.status]],
  ];

  return (
    <>
      <PageHead title="My profile" sub="Your details as the portal has them.">
        <Link to="/portal/settings?tab=profile" className={btnClass('light')}>
          <BtnLabel icon="edit">Edit name or photo</BtnLabel>
        </Link>
      </PageHead>
      {notice}
      <div className="p-split">
        <section className="p-card p-me" aria-label="Your details">
          <div className="p-me-head">
            {photo ? (
              <img className="p-avatar is-large" src={photo} alt="" />
            ) : (
              <span className="p-avatar is-large" aria-hidden="true">
                {initials(me.name)}
              </span>
            )}
            <div>
              <h2 className="p-card-title">{me.name}</h2>
              <Badge kind={me.role}>{ROLE_LABEL[me.role]}</Badge>
            </div>
          </div>
          <dl className="p-file-facts">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd title={v}>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="p-card" id="documents" ref={docsRef} aria-labelledby="me-docs">
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
          <p className="p-field-hint">Demo: there's no server yet, so files stay in this browser tab only and are gone after a reload.</p>
        </section>
      </div>
    </>
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

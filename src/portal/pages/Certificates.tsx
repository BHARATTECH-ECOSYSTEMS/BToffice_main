import { useState } from 'react';
import { CERTIFICATE_TYPES, type Certificate, type CertificateType } from '../data';
import { managesPortal, useSession } from '../session';
import { formatDate, usePeopleById, usePortal } from '../store';
import { btnClass, BtnLabel, DeleteButton, Empty, Modal, PageHead, PIcon, SearchField, Stat, useNotice } from '../ui';
import type { PortalIconName } from '../data';

const TYPE_ICON: Record<CertificateType, PortalIconName> = { bonafide: 'file', character: 'shield', transfer: 'cap', completion: 'book' };
const typeOf = (id: CertificateType) => CERTIFICATE_TYPES.find((t) => t.id === id)!;

export function Certificates() {
  const isManager = managesPortal(useSession()!.role);
  const { certificates } = usePortal();
  const [tab, setTab] = useState<'issue' | 'history'>(isManager ? 'issue' : 'history');
  const [notice, notify] = useNotice();

  return (
    <>
      <PageHead title="Certificates" sub={isManager ? 'Generate certificates and keep track of every one issued.' : 'Certificates issued to you.'} />
      {isManager && (
        <div className="p-tabs" role="tablist" aria-label="Certificates">
          <button type="button" role="tab" aria-selected={tab === 'issue'} onClick={() => setTab('issue')}>
            <PIcon name="plus" size={16} /> Issue certificate
          </button>
          <button type="button" role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}>
            <PIcon name="clock" size={16} /> History <span className="p-count">{certificates.length}</span>
          </button>
        </div>
      )}
      {isManager && tab === 'issue' ? (
        <IssueWizard
          onIssued={(name, type) => {
            notify(`${typeOf(type).name} generated for ${name}. It's now in the history.`);
            setTab('history');
          }}
        />
      ) : (
        <History isManager={isManager} notify={notify} />
      )}
      {notice}
    </>
  );
}

function IssueWizard({ onIssued }: { onIssued: (name: string, type: CertificateType) => void }) {
  const { people, issueCertificate } = usePortal();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<CertificateType | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const person = people.find((p) => p.id === personId);
  const query = q.trim().toLowerCase();
  const matches = people.filter((p) => !query || p.name.toLowerCase().includes(query) || p.email.toLowerCase().includes(query));
  const canNext = (step === 0 && type) || (step === 1 && person);
  const steps = ['Certificate type', 'Person', 'Review'];
  const percent = Math.round(((step + 1) / 3) * 100);

  return (
    <section className="p-card p-wizard" aria-labelledby="wiz-title">
      <div className="p-progress">
        <p className="p-progress-line">
          <span>
            Step {step + 1} of 3 <span className="p-dim">· {steps[step]}</span>
          </span>
          <span className="p-progress-pct">{percent}%</span>
        </p>
        <div className="p-progress-bar" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1} aria-label="Certificate steps">
          <i style={{ scale: `${(step + 1) / 3} 1` }} />
        </div>
      </div>

      {step === 0 && (
        <fieldset className="p-step">
          <legend id="wiz-title" className="p-card-title">
            Select certificate type
          </legend>
          <p className="p-muted">Choose the type of certificate you want to generate.</p>
          <div className="p-choices">
            {CERTIFICATE_TYPES.map((t) => (
              <label key={t.id} className="p-choice">
                <input type="radio" name="cert-type" value={t.id} checked={type === t.id} onChange={() => setType(t.id)} />
                <span className="p-tile-icon">
                  <PIcon name={TYPE_ICON[t.id]} />
                </span>
                <span>
                  <strong>{t.name}</strong>
                  <span className="p-muted">{t.body}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {step === 1 && (
        <fieldset className="p-step">
          <legend id="wiz-title" className="p-card-title">
            Select person
          </legend>
          <p className="p-muted">Search and choose the person this certificate is for.</p>
          <SearchField value={q} onChange={setQ} label="Find user" placeholder="Search by name or email" showLabel />
          <div className="p-choices is-list" data-lenis-prevent>
            {matches.map((p) => (
              <label key={p.id} className="p-choice">
                <input type="radio" name="cert-person" value={p.id} checked={personId === p.id} onChange={() => setPersonId(p.id)} />
                <span className="p-avatar is-soft" aria-hidden="true">
                  {p.name[0]}
                </span>
                <span>
                  <strong>{p.name}</strong>
                  <span className="p-muted">{p.email}</span>
                </span>
              </label>
            ))}
            {!matches.length && <Empty icon="users" title="Nobody matches that search" />}
          </div>
        </fieldset>
      )}

      {step === 2 && type && person && (
        <div className="p-step">
          <h2 id="wiz-title" className="p-card-title">
            Review and generate
          </h2>
          <p className="p-muted">Review the details before generating the certificate.</p>
          <dl className="p-review">
            <div>
              <dt>Certificate type</dt>
              <dd>{typeOf(type).name}</dd>
            </div>
            <div>
              <dt>Issued to</dt>
              <dd>
                {person.name} <span className="p-muted">{person.email}</span>
              </dd>
            </div>
          </dl>
          <p className="p-hint">Check the details first. Once generated, the certificate appears in the history, where it can be viewed.</p>
        </div>
      )}

      <div className="p-wizard-foot">
        <button type="button" className={btnClass('ghost')} onClick={() => setStep((s) => s - 1)} disabled={step === 0}>
          <BtnLabel arrow="left">Back</BtnLabel>
        </button>
        {step < 2 ? (
          <button type="button" className={btnClass('primary')} onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            <BtnLabel arrow="right">Next</BtnLabel>
          </button>
        ) : (
          <button
            type="button"
            className={btnClass('primary')}
            onClick={() => {
              issueCertificate(type!, person!.id);
              onIssued(person!.name, type!);
            }}
          >
            <BtnLabel icon="award">Generate certificate</BtnLabel>
          </button>
        )}
      </div>
    </section>
  );
}

function History({ isManager, notify }: { isManager: boolean; notify: (t: string) => void }) {
  const canDelete = useSession()!.role === 'admin';
  const { certificates, me, removeCertificate } = usePortal();
  const byId = usePeopleById();
  const [q, setQ] = useState('');
  const [viewing, setViewing] = useState<Certificate | null>(null);
  const mine = isManager ? certificates : certificates.filter((c) => c.recipientId === me.id);
  const query = q.trim().toLowerCase();
  const rows = mine.filter((c) => !query || [typeOf(c.type).name, byId.get(c.recipientId)?.name ?? '', c.issuedBy].some((v) => v.toLowerCase().includes(query)));
  const latest = mine[0];

  return (
    <>
      <div className="p-stats is-two">
        <Stat icon="award" label={isManager ? 'Total issued' : 'Issued to you'} value={mine.length} />
        <Stat icon="calendar" label="Latest" value={latest ? formatDate(latest.date) : 'None yet'} tone="saffron" />
      </div>
      <section className="p-card" aria-labelledby="cert-history">
        <div className="p-card-head is-start">
          <span className="p-tile-icon">
            <PIcon name="clock" />
          </span>
          <div>
            <h2 id="cert-history" className="p-card-title">
              Certificate history
            </h2>
            <p className="p-muted">{isManager ? 'View and manage issued certificates.' : 'View the certificates issued to you.'}</p>
          </div>
        </div>
        <SearchField value={q} onChange={setQ} label="Search certificates" placeholder="Search by type or person" />
        {rows.length ? (
          <div className="p-table-wrap">
            <table className="p-table">
              <thead>
                <tr>
                  <th scope="col">Certificate type</th>
                  {isManager && <th scope="col">Issued to</th>}
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
                    <td className="is-strong">{typeOf(c.type).name}</td>
                    {isManager && <td>{byId.get(c.recipientId)?.name ?? 'Removed user'}</td>}
                    <td>{c.issuedBy}</td>
                    <td>{formatDate(c.date)}</td>
                    <td className="is-end">
                      <div className="p-row is-end">
                        <button type="button" className={btnClass('ghost', { small: true })} onClick={() => setViewing(c)}>
                          <BtnLabel icon="eye">
                            View<span className="sr-only"> {typeOf(c.type).name}</span>
                          </BtnLabel>
                        </button>
                        {canDelete && (
                          <DeleteButton small srText={typeOf(c.type).name} onDone={() => (removeCertificate(c.id), notify('Certificate deleted.'))} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="award" title={mine.length ? 'Nothing matches that search' : 'No certificates yet'}>
            {!mine.length && !isManager ? 'Certificates an admin issues to you will be listed here.' : undefined}
          </Empty>
        )}
      </section>
      {viewing && (
        <Modal
          title={typeOf(viewing.type).name}
          icon="award"
          onClose={() => setViewing(null)}
          footer={
            <button type="button" className={btnClass('ghost')} onClick={() => setViewing(null)}>
              <BtnLabel>Close</BtnLabel>
            </button>
          }
        >
          <div className="p-cert">
            <p className="cell-label">Bharattech Origin</p>
            <p className="p-cert-type">{typeOf(viewing.type).name}</p>
            <p className="p-muted">This is to certify that</p>
            <p className="p-cert-name">{byId.get(viewing.recipientId)?.name ?? 'Removed user'}</p>
            <p className="p-muted">{typeOf(viewing.type).body}</p>
            <p className="p-cert-meta">
              <span>Issued {formatDate(viewing.date)}</span>
              <span>By {viewing.issuedBy}</span>
              <span>No. {viewing.id}</span>
            </p>
          </div>
          <p className="p-hint">Preview only. PDF download arrives with the backend.</p>
        </Modal>
      )}
    </>
  );
}

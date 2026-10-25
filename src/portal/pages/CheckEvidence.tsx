import { useState } from 'react';
import { ApiError } from '../api';
import { NA_REASON_MAX, VERIFICATION_FILES, type FileKind } from '../data';
import { localDay } from '../eoffice';
import { formatDate, formatSize } from '../store';
import { btnClass, BtnLabel, Modal, PIcon } from '../ui';
import { notApplicableProblem, verificationFailedMessage, type NotApplicableMark } from '../verifications';
import type { Upload } from './verificationSource';
import '../../styles/check-evidence.css';

/**
 * What the employee uploaded for one check of their HR OPS verification, in the case file (Verification.tsx): a short
 * summary at the end of the check's row, and the details under it (the education certificates, a not-applicable
 * reason). Files open in the portal's PDF window when connected (the opening is logged), or as the demo's in-tab links.
 */

const LABEL = new Map<string, string>(VERIFICATION_FILES.map((f) => [f.id, f.label]));

function FileLink({ file, onOpen }: { file: Upload; onOpen: ((kind: FileKind) => void) | null }) {
  return onOpen ? (
    <button type="button" className="p-link" title={file.fileName} onClick={() => onOpen(file.kind)}>
      {file.fileName}
      <span className="sr-only"> (opens the PDF)</span>
    </button>
  ) : (
    <a href={file.url} target="_blank" rel="noreferrer" title={file.fileName}>
      {file.fileName}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

interface Evidence {
  check: string;
  files: Upload[];
  mark?: NotApplicableMark;
  onOpen: ((kind: FileKind) => void) | null;
}

/** The end of the row: one file itself, a count, "Not applicable", or what it's still waiting for (`missing`). */
export function EvidenceSummary({ id, check, files, mark, onOpen, missing }: Evidence & { id: string; missing: string }) {
  if (mark) {
    return (
      <span id={id} className="p-doc-file">
        Not applicable
      </span>
    );
  }
  if (files.length === 1 && check !== 'education') {
    return (
      <span id={id} className="p-doc-file">
        <FileLink file={files[0]} onOpen={onOpen} />
        <span>{formatSize(files[0].size)}</span>
      </span>
    );
  }
  if (files.length) {
    return (
      <span id={id} className="p-doc-file">
        {files.length} uploaded
      </span>
    );
  }
  return (
    <span id={id} className="p-doc-file" data-missing="">
      <PIcon name="clock" size={13} />
      {missing}
    </span>
  );
}

/** Under the row, when there's more than fits at its end; nothing otherwise. */
export function EvidenceDetail({ check, files, mark, onOpen }: Evidence) {
  if (mark) {
    return (
      <ul className="p-evidence">
        <li>
          {mark.byEmployee ? 'They said this is their first job' : `${mark.reason} (${mark.by})`} · {formatDate(localDay(Date.parse(mark.at)))}
        </li>
      </ul>
    );
  }
  if (check === 'education' && files.length) {
    return (
      <ul className="p-evidence" aria-label="Education certificates">
        {files.map((f) => (
          <li key={f.kind}>
            {LABEL.get(f.kind)}: <FileLink file={f} onOpen={onOpen} /> · {formatSize(f.size)}
          </li>
        ))}
      </ul>
    );
  }
  return null;
}

/** Asks why a check doesn't apply; the reason goes into the request's activity. A refusal stays in the window. */
export function NotApplicableWindow({ check, subject, onClose, onSave }: { check: string; subject: string; onClose: () => void; onSave: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (saving) return;
    const problem = notApplicableProblem(reason);
    if (problem) return setError(problem);
    setSaving(true);
    try {
      await onSave(reason);
    } catch (e) {
      setError(verificationFailedMessage(e instanceof ApiError ? e : new ApiError('unavailable')));
      setSaving(false);
    }
  };
  return (
    <Modal
      title={`Mark ${check} not applicable?`}
      icon="shield"
      onClose={onClose}
      onSubmit={() => void submit()}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')} disabled={saving}>
            <BtnLabel>Mark not applicable</BtnLabel>
          </button>
        </>
      }
    >
      <p className="p-modal-text">It then counts as checked for {subject}. Unticking it later takes this back.</p>
      <label className="p-field">
        <span>Why doesn’t it apply?</span>
        <textarea
          value={reason}
          onChange={(e) => (setReason(e.target.value), setError(''))}
          rows={3}
          maxLength={NA_REASON_MAX}
          placeholder="For example: joined straight from college"
          autoFocus
        />
      </label>
      <p className="p-field-hint">It’s written to this request’s activity with your name.</p>
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

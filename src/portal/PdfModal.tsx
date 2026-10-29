import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ApiError, ApiErrorKind } from './api';
import type { PortalIconName } from './data';
import { pdfViewUrl } from './pdfView';
import { btnClass, BtnLabel, Modal, PIcon } from './ui';

/**
 * A PDF from the backend in the large document window, with a download link. The file is fetched with the sign-in
 * token (so it can't be a plain link), kept in this tab's memory while the window is open, and let go when it closes.
 * The page sits on a quiet stage; a one-page document (`wholePage`, a certificate) is shown whole without Chrome's
 * toolbar, a longer one keeps the toolbar for paging and zoom.
 */
export function PdfModal({
  title,
  fileName,
  load,
  failure,
  icon = 'file',
  facts,
  wholePage = false,
  details,
  onOpened,
  onClose,
}: {
  title: string;
  fileName: string;
  /** Called when the window opens, and again on Try again. */
  load: () => Promise<Blob>;
  failure: (kind: ApiErrorKind) => string;
  icon?: PortalIconName;
  /** Short facts shown under the title (number, name, date). */
  facts?: (string | false | null | undefined)[];
  wholePage?: boolean;
  /** A note under the document. */
  details?: ReactNode;
  /** The PDF is on screen (used to unlock accepting a policy); called once. */
  onOpened?: () => void;
  onClose: () => void;
}) {
  const [pdf, setPdf] = useState<{ url: string } | { error: ApiErrorKind } | null>(null);
  const [attempt, setAttempt] = useState(0);
  // the load and onOpened the window opened with; later re-renders don't fetch again, only Try again does
  const first = useRef({ load, onOpened, opened: false });

  useEffect(() => {
    let url = '';
    let current = true;
    first.current.load().then(
      (blob) => {
        url = URL.createObjectURL(blob);
        if (!current) return URL.revokeObjectURL(url);
        setPdf({ url });
        if (!first.current.opened) {
          first.current.opened = true;
          first.current.onOpened?.();
        }
      },
      (e: ApiError) => current && setPdf({ error: e.kind }),
    );
    return () => {
      current = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attempt]);

  const shown = facts?.filter((f): f is string => Boolean(f)) ?? [];
  const ready = pdf && 'url' in pdf ? pdf : null;

  return (
    <Modal
      title={title}
      icon={icon}
      size="doc"
      meta={
        shown.length > 0 && (
          <ul className="p-doc-facts" aria-label="Details">
            {shown.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )
      }
      onClose={onClose}
      footer={
        <>
          {ready && (
            <>
              <a className={btnClass('primary')} href={ready.url} download={fileName}>
                <BtnLabel icon="download">Download PDF</BtnLabel>
              </a>
              <a className={btnClass('ghost')} href={ready.url} target="_blank" rel="noreferrer">
                <BtnLabel arrow="up-right">Open in new tab</BtnLabel>
              </a>
            </>
          )}
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Close</BtnLabel>
          </button>
        </>
      }
    >
      <div className="p-doc-stage" data-whole={wholePage || undefined}>
        {!pdf ? (
          <div className="p-doc-sheet is-loading" role="status">
            <span>Opening the document…</span>
          </div>
        ) : 'error' in pdf ? (
          <div className="p-doc-sheet is-error" role="alert">
            <PIcon name="alert" size={22} />
            <p>{failure(pdf.error)}</p>
            <button
              type="button"
              className={btnClass('ghost', { small: true })}
              onClick={() => {
                setPdf(null);
                setAttempt((n) => n + 1);
              }}
            >
              <BtnLabel icon="refresh">Try again</BtnLabel>
            </button>
          </div>
        ) : (
          <iframe className="p-doc-frame" src={pdfViewUrl(pdf.url, wholePage)} title={title} />
        )}
      </div>
      {details && <p className="p-hint">{details}</p>}
    </Modal>
  );
}

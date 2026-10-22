import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ApiError, ApiErrorKind } from './api';
import { btnClass, BtnLabel, Modal } from './ui';

/**
 * A PDF from the backend in a pop-up, with a download link. The file is fetched with the sign-in token (so it can't be
 * a plain link), kept in this tab's memory while the window is open, and let go when it closes.
 */
export function PdfModal({
  title,
  fileName,
  load,
  failure,
  details,
  onOpened,
  onClose,
}: {
  title: string;
  fileName: string;
  /** Called once, when the window opens. */
  load: () => Promise<Blob>;
  failure: (kind: ApiErrorKind) => string;
  details?: ReactNode;
  /** The PDF is on screen (used to unlock accepting a policy). */
  onOpened?: () => void;
  onClose: () => void;
}) {
  const [pdf, setPdf] = useState<{ url: string } | { error: ApiErrorKind } | null>(null);
  // the first load and onOpened are the ones the window opened with; later re-renders don't fetch again
  const first = useRef({ load, onOpened });

  useEffect(() => {
    let url = '';
    let current = true;
    first.current.load().then(
      (blob) => {
        url = URL.createObjectURL(blob);
        if (!current) return URL.revokeObjectURL(url);
        setPdf({ url });
        first.current.onOpened?.();
      },
      (e: ApiError) => current && setPdf({ error: e.kind }),
    );
    return () => {
      current = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  return (
    <Modal
      title={title}
      icon="file"
      onClose={onClose}
      footer={
        <>
          {pdf && 'url' in pdf && (
            <a className={btnClass('primary')} href={pdf.url} download={fileName}>
              <BtnLabel icon="download">Download PDF</BtnLabel>
            </a>
          )}
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Close</BtnLabel>
          </button>
        </>
      }
    >
      {!pdf ? (
        <p className="p-muted" role="status">
          Opening the document…
        </p>
      ) : 'error' in pdf ? (
        <p className="p-error" role="alert">
          {failure(pdf.error)}
        </p>
      ) : (
        <iframe className="p-cert-pdf" src={pdf.url} title={title} />
      )}
      {details && <p className="p-hint">{details}</p>}
    </Modal>
  );
}

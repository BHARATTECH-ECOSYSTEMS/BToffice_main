import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { formatMinutes, plural, totalMinutes, youtubeId, type Lecture } from '../../lmsData';
import { usePortal } from '../../store';
import { btnClass, BtnLabel, DeleteButton, Modal, PIcon } from '../../ui';

const MAX_THUMB_MB = 2;
const THUMB_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

interface DraftChapter {
  id: string;
  title: string;
  open: boolean;
  lectures: Lecture[];
}

const newId = () => crypto.randomUUID();

/** The first paragraph, cut at a word near 120 characters: the one-line summary under the course title. */
function summarise(paragraph: string) {
  if (paragraph.length <= 120) return paragraph;
  return `${paragraph.slice(0, 120).replace(/\s+\S*$/, '')}…`;
}

export function AddCourse() {
  const { addCourse } = usePortal();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [thumb, setThumb] = useState<{ file: File; url: string } | null>(null);
  const [chapters, setChapters] = useState<DraftChapter[]>([]);
  const [addingChapter, setAddingChapter] = useState(false);
  const [lectureFor, setLectureFor] = useState<string | null>(null);
  const [error, setError] = useState('');

  // The cover preview is an object URL; free it when it's replaced or the form is left, unless the course kept it.
  const published = useRef(false);
  const thumbUrl = useRef('');
  useEffect(() => () => void (!published.current && thumbUrl.current && URL.revokeObjectURL(thumbUrl.current)), []);

  const pickThumb = (file: File | undefined) => {
    setError('');
    if (!file) return;
    if (!THUMB_TYPES.includes(file.type)) return setError('The thumbnail must be a PNG, JPG or WebP image.');
    if (file.size > MAX_THUMB_MB * 1024 * 1024) return setError(`The thumbnail is over ${MAX_THUMB_MB} MB.`);
    if (thumbUrl.current) URL.revokeObjectURL(thumbUrl.current);
    thumbUrl.current = URL.createObjectURL(file);
    setThumb({ file, url: thumbUrl.current });
  };

  const updateChapter = (id: string, change: (c: DraftChapter) => DraftChapter) => setChapters((list) => list.map((c) => (c.id === id ? change(c) : c)));

  const submit = () => {
    const priceN = Number(price);
    const discountN = Number(discount);
    const paragraphs = description
      .split(/\n\s*\n/)
      .map((p) => p.trim().replace(/\s+/g, ' '))
      .filter(Boolean);
    if (!title.trim()) return setError('Give the course a title.');
    if (!paragraphs.length) return setError('Write a short description of the course.');
    if (price.trim() === '' || !Number.isFinite(priceN) || priceN < 0 || priceN > 10000) return setError('Enter a price of 0 or more (0 makes the course free).');
    if (!Number.isInteger(discountN) || discountN < 0 || discountN > 100) return setError('The discount is a whole number from 0 to 100.');
    if (!chapters.length) return setError('Add at least one chapter.');
    const empty = chapters.find((c) => !c.lectures.length);
    if (empty) return setError(`Add a lecture to "${empty.title}", or remove that chapter.`);

    const course = addCourse({
      title: title.trim(),
      summary: summarise(paragraphs[0]),
      description: paragraphs,
      price: Math.round(priceN * 100) / 100,
      discount: discountN,
      icon: 'book',
      tone: 'violet',
      thumbUrl: thumb?.url,
      chapters: chapters.map(({ id, title: t, lectures }) => ({ id, title: t, lectures })),
    });
    published.current = true;
    navigate('/portal/lms/educator/courses', { state: { created: course.title } });
  };

  return (
    <section className="p-card p-course-form" aria-labelledby="create-course">
      <div>
        <h1 id="create-course" className="p-lms-h1">
          Create new course
        </h1>
        <p className="p-muted">Add the details, structure the content, and publish the course.</p>
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="p-field">
          <span>Course title</span>
          <input value={title} onChange={(e) => (setTitle(e.target.value), setError(''))} placeholder="Enter course title" maxLength={120} />
        </label>
        <label className="p-field">
          <span>Course description</span>
          <textarea value={description} onChange={(e) => (setDescription(e.target.value), setError(''))} rows={6} placeholder="What will people learn? Leave a blank line between paragraphs." maxLength={4000} />
        </label>
        <div className="p-form-row">
          <label className="p-field">
            <span>Course price ($)</span>
            <input type="number" min={0} step="0.01" inputMode="decimal" value={price} onChange={(e) => (setPrice(e.target.value), setError(''))} placeholder="0" />
          </label>
          <label className="p-field">
            <span>Discount (%)</span>
            <input type="number" min={0} max={100} step={1} inputMode="numeric" value={discount} onChange={(e) => (setDiscount(e.target.value), setError(''))} />
          </label>
        </div>
        <div className="p-field">
          <span>Thumbnail (optional)</span>
          <label className="p-drop">
            <input type="file" accept={THUMB_TYPES.join(',')} onChange={(e) => pickThumb(e.target.files?.[0])} />
            {thumb ? (
              <img src={thumb.url} alt="" />
            ) : (
              <>
                <PIcon name="upload" size={22} />
                <span>Click to upload a thumbnail</span>
                <span className="p-dim">
                  PNG, JPG or WebP, up to {MAX_THUMB_MB} MB. Without one, the course gets a generated cover.
                </span>
              </>
            )}
            {thumb && <span className="sr-only">Selected: {thumb.file.name}. Choose another file to replace it.</span>}
          </label>
        </div>

        <fieldset className="p-course-content">
          <legend className="p-card-title">Course content</legend>
          {chapters.map((c, i) => (
            <section key={c.id} className="p-draft-chapter" aria-label={`Chapter ${i + 1}: ${c.title}`}>
              <div className="p-draft-head">
                <button type="button" className="p-draft-toggle" aria-expanded={c.open} onClick={() => updateChapter(c.id, (x) => ({ ...x, open: !x.open }))}>
                  <PIcon name="chevron" size={16} />
                  <span className="is-strong">
                    {i + 1}. {c.title}
                  </span>
                  <span className="p-dim">
                    {plural(c.lectures.length, 'lecture')}
                    {c.lectures.length > 0 && ` · ${formatMinutes(totalMinutes(c.lectures))}`}
                  </span>
                </button>
                <button type="button" className="p-text-btn is-danger" onClick={() => setChapters((list) => list.filter((x) => x.id !== c.id))}>
                  Remove<span className="sr-only"> chapter {c.title}</span>
                </button>
              </div>
              {c.open && (
                <div className="p-draft-body">
                  {c.lectures.length > 0 && (
                    <ul className="p-draft-lectures">
                      {c.lectures.map((l, j) => (
                        <li key={l.id}>
                          <PIcon name="play" size={15} />
                          <span className="p-lecture-title">
                            {j + 1}. {l.title}
                          </span>
                          {l.preview && <span className="p-badge is-soft">Free preview</span>}
                          <span className="p-dim">{formatMinutes(l.minutes)}</span>
                          <DeleteButton
                            small
                            srText={`lecture ${l.title}`}
                            onDone={() => updateChapter(c.id, (x) => ({ ...x, lectures: x.lectures.filter((y) => y.id !== l.id) }))}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button" className={btnClass('ghost', { small: true })} onClick={() => setLectureFor(c.id)}>
                    <BtnLabel icon="plus">
                      Add lecture<span className="sr-only"> to {c.title}</span>
                    </BtnLabel>
                  </button>
                </div>
              )}
            </section>
          ))}
          <button type="button" className={btnClass('light', { wide: true })} onClick={() => setAddingChapter(true)}>
            <BtnLabel icon="plus">Add chapter</BtnLabel>
          </button>
        </fieldset>

        {error && (
          <p className="p-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className={btnClass('primary', { wide: true })}>
          <BtnLabel>Create course</BtnLabel>
        </button>
      </form>

      {addingChapter && (
        <ChapterModal
          onClose={() => setAddingChapter(false)}
          onAdd={(t) => {
            setChapters((list) => [...list, { id: newId(), title: t, open: true, lectures: [] }]);
            setError('');
          }}
        />
      )}
      {lectureFor && (
        <LectureModal
          onClose={() => setLectureFor(null)}
          onAdd={(lecture) => {
            updateChapter(lectureFor, (x) => ({ ...x, open: true, lectures: [...x.lectures, lecture] }));
            setError('');
          }}
        />
      )}
    </section>
  );
}

function ChapterModal({ onClose, onAdd }: { onClose: () => void; onAdd: (title: string) => void }) {
  const [title, setTitle] = useState('');
  return (
    <Modal
      title="Add chapter"
      icon="book"
      onClose={onClose}
      onSubmit={() => {
        if (!title.trim()) return;
        onAdd(title.trim());
        onClose();
      }}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')} disabled={!title.trim()}>
            <BtnLabel>Confirm</BtnLabel>
          </button>
        </>
      }
    >
      <label className="p-field">
        <span>Chapter title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter title" maxLength={120} autoFocus />
      </label>
    </Modal>
  );
}

function LectureModal({ onClose, onAdd }: { onClose: () => void; onAdd: (lecture: Lecture) => void }) {
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('');
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(false);
  const minutesN = Number(minutes);
  const minutesOk = Number.isInteger(minutesN) && minutesN >= 1 && minutesN <= 600;
  const urlOk = youtubeId(url.trim()) !== null;
  const valid = title.trim() !== '' && minutesOk && urlOk;

  return (
    <Modal
      title="Add lecture"
      icon="play"
      onClose={onClose}
      onSubmit={() => {
        if (!valid) return;
        onAdd({ id: newId(), title: title.trim(), minutes: minutesN, videoUrl: url.trim(), preview });
        onClose();
      }}
      footer={
        <>
          <button type="button" className={btnClass('ghost')} onClick={onClose}>
            <BtnLabel>Cancel</BtnLabel>
          </button>
          <button type="submit" className={btnClass('primary')} disabled={!valid}>
            <BtnLabel>Add lecture</BtnLabel>
          </button>
        </>
      }
    >
      <label className="p-field">
        <span>Lecture title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introduction to React hooks" maxLength={120} autoFocus />
      </label>
      <label className="p-field">
        <span>Duration (minutes)</span>
        <input type="number" min={1} max={600} step={1} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="e.g. 15" />
        {minutes !== '' && !minutesOk && <span className="p-field-hint is-bad">A whole number of minutes, from 1 to 600.</span>}
      </label>
      <fieldset className="p-source">
        <legend>Video source</legend>
        <label className="p-source-option">
          <input type="radio" name="video-source" checked readOnly />
          <PIcon name="screen" size={18} /> YouTube
        </label>
        {/* there's nowhere to store uploaded video files yet */}
        <label className="p-source-option is-off" title="Not connected yet">
          <input type="radio" name="video-source" disabled />
          <PIcon name="upload" size={18} /> Upload <span className="p-dim">Not connected</span>
        </label>
      </fieldset>
      <label className="p-field">
        <span>YouTube video URL</span>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
        {url.trim() !== '' && !urlOk && <span className="p-field-hint is-bad">Paste a youtube.com/watch, youtu.be or youtube.com/embed link.</span>}
      </label>
      <label className="p-toggle">
        <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} />
        <span>
          <strong>Free preview</strong>
          <span className="p-dim">Let people watch this lecture before enrolling.</span>
        </span>
      </label>
    </Modal>
  );
}

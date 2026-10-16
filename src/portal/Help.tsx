import { useState } from 'react';
import { Link } from 'react-router';
import type { PortalIconName } from './data';
import { managesPortal, useSession, type Role } from './session';
import { usePortal } from './store';
import { btnClass, BtnLabel, Empty, Modal, PIcon, SearchField } from './ui';

/** Who a topic is for: everyone, admins and sub admins ("manager"), or admins only. */
type Audience = 'all' | 'manager' | 'admin';

interface Topic {
  q: string;
  a: string;
  link?: { to: string; label: string };
  audience?: Audience;
  /** Only for the role named here (e.g. the employee's own status switch). */
  only?: Role;
}

// Every answer describes what the portal does today; anything not connected yet says so.
const GROUPS: { title: string; icon: PortalIconName; topics: Topic[] }[] = [
  {
    title: 'Getting started',
    icon: 'grid',
    topics: [
      { q: 'Where do I start?', a: 'Your dashboard shows your tasks, your calendar and your workspace tools. The bar along the top lists every section, and the ones with an arrow, like Resources, open a menu of their own. Settings, Help and Sign out are under your name in the top right.', link: { to: '/portal', label: 'Open the dashboard' } },
      { q: 'How do I mark myself active or inactive?', a: 'Use the Active / Inactive switch at the top of your dashboard. Green means active, red means inactive, and your admins see the same colour in their team list.', only: 'employee', link: { to: '/portal', label: 'Go to my dashboard' } },
      { q: 'How do I update a task?', a: 'Under My tasks on your dashboard, change a task’s status to To do, In progress or Done. Your progress figure updates as you go.', only: 'employee' },
    ],
  },
  {
    title: 'Your account',
    icon: 'users',
    topics: [
      { q: 'How do I change my name or photo?', a: 'Open Settings, then Profile. Upload a PNG, JPG or WebP photo up to 5 MB; it’s cropped to a square. Save changes to update your name everywhere.', link: { to: '/portal/settings?tab=profile', label: 'Open Profile settings' } },
      { q: 'How do I change my password?', a: 'Open Settings, then Password. The checklist shows what the new password still needs. Password changes aren’t connected to the sign-in system yet, so for now your password stays the same.', link: { to: '/portal/settings?tab=password', label: 'Open Password settings' } },
      { q: 'Can I choose which emails I get?', a: 'Yes, under Settings, then Notifications. Your choices are saved in this browser. Emails aren’t being sent yet, so the switches take effect once email is connected.', link: { to: '/portal/settings?tab=notifications', label: 'Open Notification settings' } },
      { q: 'Why can’t I change my email or role?', a: 'Both come from your company account. Ask an admin if your role is wrong.' },
    ],
  },
  {
    title: 'Tools and learning',
    icon: 'book',
    topics: [
      { q: 'A tool says “Not connected yet”', a: 'Its web address hasn’t been set up yet. Once it is, the button opens the tool directly in a new tab.', link: { to: '/portal/resources', label: 'See all resources' } },
      { q: 'What is Workspace?', a: 'Workspace opens Huly.io, the team’s place for projects, chat and documents. You can also reach it from Integrated Workspace on the dashboard.' },
      { q: 'How do courses work?', a: 'In the LMS Platform, open a course and enroll. Preview lectures are open to everyone; the rest unlock once you enroll. Mark lectures as done to track your progress, and rate the course when you finish.', link: { to: '/portal/lms', label: 'Open the LMS' } },
      { q: 'Where do I accept company policies?', a: 'Open Policy & Compliance, read each document and accept it. Documents waiting for you are marked To review.', link: { to: '/portal/policy', label: 'Open Policy & Compliance' } },
    ],
  },
  {
    title: 'Managing the team',
    icon: 'shield',
    topics: [
      { q: 'What can admins and sub admins do?', a: 'Both can add people, create and assign tasks, issue certificates, publish policies and add resources.', audience: 'manager' },
      { q: 'What can’t a sub admin do?', a: 'Sub admins can’t delete anything, change anyone’s role, or open admin-only tools such as Invoice Builder and HR OPS. Those stay with admins.', audience: 'manager' },
      { q: 'How do I verify a company or an employee?', a: 'Under HR OPS, open Verification. Start a new request, tick off each document as you check it, then mark it verified. Verifying needs every document ticked, a rejection needs a note, and every step is recorded in the file’s activity.', audience: 'admin', link: { to: '/portal/verification/company', label: 'Open Company Verification' } },
    ],
  },
  {
    title: 'Good to know',
    icon: 'alert',
    topics: [
      { q: 'Why did my changes disappear?', a: 'The portal isn’t connected to a server yet, so changes last only until the page reloads or you sign out. Nothing you do here is lost from a real system.' },
    ],
  },
];

const visibleTo = (t: Topic, role: Role) =>
  (!t.only || t.only === role) && (!t.audience || t.audience === 'all' || (t.audience === 'manager' ? managesPortal(role) : role === 'admin'));

export function HelpModal({ onClose }: { onClose: () => void }) {
  const role = useSession()!.role;
  const { people, me } = usePortal();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const groups = GROUPS.map((g) => ({ ...g, topics: g.topics.filter((t) => visibleTo(t, role) && (!query || `${t.q} ${t.a}`.toLowerCase().includes(query))) })).filter((g) => g.topics.length);
  // real names to ask, taken from the directory instead of a made-up support address
  const admins = people.filter((p) => p.role === 'admin' && p.id !== me.id).map((p) => p.name);

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

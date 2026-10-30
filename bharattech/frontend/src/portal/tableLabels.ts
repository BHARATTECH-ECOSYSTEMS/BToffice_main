import { useEffect, type RefObject } from 'react';

/**
 * On phones each table row becomes a small card (portal.css, max-width 640px), so every value needs its column's
 * name beside it. The names come from the table's own headings: one place for all the portal's tables.
 */

/** Each cell's label for a row whose cells span `spans` columns: its column's heading, or none for a cell spanning
 *  several columns (an empty-state row) or under an empty heading (an actions column). */
export function labelsForRow(headers: string[], spans: number[]): (string | null)[] {
  let column = 0;
  return spans.map((span) => {
    const heading = span === 1 ? headers[column]?.trim() : '';
    column += span;
    return heading ? heading : null;
  });
}

function labelTables(root: HTMLElement) {
  for (const table of root.querySelectorAll<HTMLTableElement>('table.p-table')) {
    const headers = [...table.querySelectorAll('thead th')].flatMap((th) => {
      const text = th.textContent ?? '';
      // a heading spanning columns names each of them
      return Array.from({ length: (th as HTMLTableCellElement).colSpan || 1 }, () => text);
    });
    for (const row of table.querySelectorAll('tbody tr')) {
      const cells = [...row.children] as HTMLTableCellElement[];
      labelsForRow(headers, cells.map((c) => c.colSpan || 1)).forEach((label, i) => {
        const cell = cells[i];
        if (label === null) cell.removeAttribute('data-label');
        else if (cell.getAttribute('data-label') !== label) cell.setAttribute('data-label', label);
      });
    }
  }
}

/** Keeps the labels on every table inside `root`, as pages render and rows arrive. */
export function useTableLabels(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    labelTables(el);
    // only rows and cells coming and going matter; the labels it writes itself are attributes, so they don't
    // set it off again. One pass per frame however many changes arrive.
    let raf = 0;
    const mo = new MutationObserver(() => {
      if (!raf) raf = requestAnimationFrame(() => ((raf = 0), labelTables(el)));
    });
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [root]);
}

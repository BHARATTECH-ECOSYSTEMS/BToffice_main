/**
 * How many of the home page's sections below the opening story are built (Home.tsx). On desktop none at first and
 * one more at each quiet moment; phones and tablets get them all at once. The first input, or a link to one of the
 * sections, builds the whole page, and it never shrinks again.
 */
export const firstBuilt = (total: number, staged: boolean) => (staged ? 0 : total);

export const nextBuilt = (built: number, total: number, why: 'quiet' | 'input') => (why === 'input' ? total : Math.min(built + 1, total));

export const isWhole = (built: number, total: number, jump: boolean) => jump || built >= total;

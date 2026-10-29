/**
 * The address the document window shows a PDF at. A one-page document (a certificate) is shown whole, with Chrome's
 * toolbar and side panel hidden; a longer one keeps them, since paging and zoom need them.
 */
export const pdfViewUrl = (url: string, wholePage: boolean) => (wholePage ? `${url}#toolbar=0&navpanes=0&view=Fit` : url);

import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import 'highlight.js/styles/atom-one-dark.css';

hljs.registerLanguage('typescript', typescript);

/** Returns escaped, highlighted HTML for a demo module source. */
export function highlightSource(source: string): string {
    return hljs.highlight(source, { language: 'typescript' }).value;
}

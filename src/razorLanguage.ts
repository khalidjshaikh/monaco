import type { Monaco } from '@monaco-editor/react';
import type { languages } from 'monaco-editor';

export const RAZOR_LANGUAGE_ID = 'razor';

const CS_KEYWORDS = [
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char',
  'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate',
  'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false',
  'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit',
  'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace',
  'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private',
  'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed',
  'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch',
  'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked',
  'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while',
  // contextual keywords common in component code
  'async', 'await', 'dynamic', 'get', 'init', 'nameof', 'partial', 'record',
  'required', 'set', 'value', 'var', 'when', 'where', 'with', 'yield',
];

/** Razor directives that are followed by a C# block: `@code { ... }`, `@if (...) { ... }`. */
const BLOCK_DIRECTIVES = [
  'code', 'functions', 'section', 'if', 'else', 'for', 'foreach', 'while',
  'do', 'switch', 'try', 'catch', 'finally', 'lock', 'using',
];

/** Razor directives that take arguments but no C# block: `@page "/x"`, `@inject IFoo Foo`. */
const DIRECTIVES = [
  'page', 'model', 'inject', 'inherits', 'implements', 'layout', 'namespace',
  'attribute', 'typeparam', 'rendermode', 'preservewhitespace', 'addTagHelper',
  'removeTagHelper', 'tagHelperPrefix',
];

export const razorLanguageConfiguration: languages.LanguageConfiguration = {
  comments: { blockComment: ['@*', '*@'] },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ['<', '>'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '<', close: '>' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '<', close: '>' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
};

const blockDirectivePattern = new RegExp(`@(?:${BLOCK_DIRECTIVES.join('|')})\\b`, 'i');
const directivePattern = new RegExp(`@(?:${DIRECTIVES.join('|')})\\b`, 'i');

export const razorTokens: languages.IMonarchLanguage = {
  defaultToken: '',
  ignoreCase: true,
  brackets: [
    { open: '{', close: '}', token: 'delimiter.curly' },
    { open: '[', close: ']', token: 'delimiter.square' },
    { open: '(', close: ')', token: 'delimiter.parenthesis' },
    { open: '<', close: '>', token: 'delimiter.angle' },
  ],
  keywords: CS_KEYWORDS,
  tokenizer: {
    root: [
      [blockDirectivePattern, { token: 'keyword', next: '@controlTail' }],
      [directivePattern, 'keyword'],
      [/@\*/, { token: 'comment', next: '@razorComment' }],
      [/<!--/, { token: 'comment', next: '@markupComment' }],
      // `@@` renders a literal `@`. Monarch treats `@@` in a pattern as an
      // escaped literal `@`, so it is spelled with `\x40` here.
      [/@\x40/, 'string.escape'],
      // `@{ ... }` code block and `@(...)` explicit expression.
      [/@\{/, { token: 'delimiter.curly', next: '@code' }],
      [/@\(/, { token: 'delimiter.parenthesis', next: '@paren' }],
      // Implicit expression such as `@Model.Name`.
      [/@[A-Za-z_]\w*/, 'variable'],
      [/<\/?[\w.:-]+/, { token: 'tag', next: '@tag' }],
      [/"[^"\n]*"/, 'string'],
      [/'[^'\n]*'/, 'string'],
      [/&[a-zA-Z#][\w#]*;/, 'string.escape'],
      [/@/, 'keyword'],
      [/\s+/, 'white'],
      [/[A-Za-z_][\w.-]*/, ''],
      [/./, ''],
    ],

    // Between a Razor block directive and its C# body: `@if (x)` / `@code {`.
    controlTail: [
      [/\s+/, 'white'],
      [/\(/, { token: 'delimiter.parenthesis', next: '@paren' }],
      [/\{/, { token: 'delimiter.curly', next: '@code' }],
      // `@section Name {` and friends.
      [/[A-Za-z_]\w*/, 'identifier'],
      [/./, { token: '@rematch', next: '@pop' }],
    ],

    code: [
      [/\{/, { token: 'delimiter.curly', next: '@code' }],
      [/\}/, { token: 'delimiter.curly', next: '@pop' }],
      { include: '@codeInner' },
    ],

    paren: [
      [/\(/, { token: 'delimiter.parenthesis', next: '@paren' }],
      [/\)/, { token: 'delimiter.parenthesis', next: '@pop' }],
      { include: '@codeInner' },
    ],

    codeInner: [
      [/\s+/, 'white'],
      [/\/\/.*$/, 'comment'],
      [/\/\*/, { token: 'comment', next: '@blockComment' }],
      [/@\*/, { token: 'comment', next: '@razorComment' }],
      // Razor expressions in markup that appears inside a C# block.
      [/@[A-Za-z_]\w*/, 'variable'],
      [/@"/, { token: 'string', next: '@verbatimString' }],
      [/\$?"/, { token: 'string', next: '@csString' }],
      [/'([^'\\]|\\.)*'/, 'string'],
      [/\d[\d_]*(\.\d[\d_]*)?([eE][+-]?\d+)?[fFdDmMuUlL]*/, 'number'],
      [/[A-Za-z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
      [/=>|[<>!=]=?|&&|\|\||\?\?=?|\?\.|[+\-*/%&|^]=?|[!~]/, 'operator'],
      [/[{}()[\]]/, '@brackets'],
      [/[;,.:?]/, 'delimiter'],
      [/./, ''],
    ],

    tag: [
      [/\s+/, 'white'],
      [/\/?>/, { token: 'tag', next: '@pop' }],
      [/@\*/, { token: 'comment', next: '@razorComment' }],
      // Blazor event/complement attributes: `@onclick`, `@bind-Value`.
      [/@[\w:-]+/, 'keyword'],
      [/"[^"\n]*"/, 'attribute.value'],
      [/='[^'\n]*'/, 'attribute.value'],
      [/[\w.:-]+(?=\s*=)/, 'attribute.name'],
      [/[\w.:-]+/, 'attribute.name'],
      [/=/, 'delimiter'],
      [/./, 'attribute.name'],
    ],

    csString: [
      [/[^"\\]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, { token: 'string', next: '@pop' }],
      [/./, 'string'],
    ],

    verbatimString: [
      [/[^"]+/, 'string'],
      [/""/, 'string.escape'],
      [/"/, { token: 'string', next: '@pop' }],
    ],

    blockComment: [
      [/\*\//, { token: 'comment', next: '@pop' }],
      [/[^*/]+/, 'comment'],
      [/[*/]/, 'comment'],
    ],

    razorComment: [
      [/\*@/, { token: 'comment', next: '@pop' }],
      [/[^*]+/, 'comment'],
      [/\*/, 'comment'],
    ],

    markupComment: [
      [/-->/, { token: 'comment', next: '@pop' }],
      [/[^-]+/, 'comment'],
      [/-/, 'comment'],
    ],
  },
};

let registered = false;

/** Registers the `razor` language (`.razor` / `.cshtml`) with the given Monaco instance. */
export function registerRazorLanguage(monaco: Monaco): void {
  if (registered) return;
  const { languages } = monaco;
  if (languages.getLanguages().some((l: { id: string }) => l.id === RAZOR_LANGUAGE_ID)) {
    registered = true;
    return;
  }
  registered = true;
  languages.register({
    id: RAZOR_LANGUAGE_ID,
    aliases: ['Razor', 'razor'],
    extensions: ['.razor', '.cshtml'],
  });
  languages.setLanguageConfiguration(RAZOR_LANGUAGE_ID, razorLanguageConfiguration);
  languages.setMonarchTokensProvider(RAZOR_LANGUAGE_ID, razorTokens);
}

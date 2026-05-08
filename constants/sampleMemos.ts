import type { Memo } from '../types/Memo';

const NOW = Date.now();

export const SAMPLE_MEMOS: Memo[] = [
  {
    id: 'memo-welcome',
    title: 'メモへようこそ',
    body:
      'URL・画像・PDF を 1 つのメモにまとめて保存できます。\n\n+ ボタンから新しいメモを作成、各メモ内の URL / 画像 / PDF / その他ボタンで添付を追加できます。',
    attachments: [
      {
        id: 'sample-att-1',
        kind: 'url',
        uri: 'https://docs.expo.dev',
        name: 'docs.expo.dev',
      },
    ],
    createdAt: NOW - 1000 * 60 * 60 * 24 * 2,
    updatedAt: NOW - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: 'memo-links',
    title: '便利なリンク集',
    body: '勉強や調べものでよく使うサイトをまとめておけます。',
    attachments: [
      {
        id: 'sample-att-2',
        kind: 'url',
        uri: 'https://www.google.com',
        name: 'Google',
      },
      {
        id: 'sample-att-3',
        kind: 'url',
        uri: 'https://www.wikipedia.org',
        name: 'Wikipedia',
      },
      {
        id: 'sample-att-4',
        kind: 'url',
        uri: 'https://scholar.google.com',
        name: 'Google Scholar',
      },
    ],
    createdAt: NOW - 1000 * 60 * 60 * 24,
    updatedAt: NOW - 1000 * 60 * 60 * 24,
  },
  {
    id: 'memo-study',
    title: '勉強メモ',
    body:
      '授業中の気づきや、試験対策メモ、参考資料の置き場として使えます。\n\n講義スライド (PDF) や黒板の写真を一緒に保存しておくと後で見返せて便利です。',
    attachments: [],
    createdAt: NOW - 1000 * 60 * 60 * 3,
    updatedAt: NOW - 1000 * 60 * 60 * 3,
  },
];

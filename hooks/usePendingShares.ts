import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
// @ts-ignore - no TypeScript types ship with this library
import SharedGroupPreferences from 'react-native-shared-group-preferences';
import type { Memo, MemoAttachment } from '../types/Memo';
import { makeUrlAttachment } from '../utils/attachments';

const APP_GROUP_ID = 'group.com.shoasano.scheduleapp';
const KEY = 'pending_shares';

interface PendingShare {
  url?: string;
  title?: string;
  ts?: number;
}

function makeId() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

interface Hooks {
  createMemoFromShare: (share: PendingShare) => Memo;
}

async function readPending(): Promise<PendingShare[]> {
  if (Platform.OS !== 'ios') return [];
  try {
    const raw = await SharedGroupPreferences.getItem(KEY, APP_GROUP_ID);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

async function clearPending(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    await SharedGroupPreferences.setItem(KEY, '[]', APP_GROUP_ID);
  } catch {}
}

export function usePendingShares(
  onIngest: (memos: Memo[]) => void,
  ingestMemoBuilder: (share: PendingShare) => Memo
) {
  const lastFlushRef = useRef<number>(0);

  useEffect(() => {
    const flush = async () => {
      const items = await readPending();
      if (items.length === 0) return;
      const now = Date.now();
      if (now - lastFlushRef.current < 500) return; // dedupe rapid foregrounds
      lastFlushRef.current = now;

      const memos = items
        .filter((s) => !!s.url)
        .map((s) => ingestMemoBuilder(s));
      if (memos.length > 0) onIngest(memos);
      await clearPending();
    };

    void flush();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flush();
    });

    return () => sub.remove();
  }, [onIngest, ingestMemoBuilder]);
}

export function buildMemoFromShare(share: PendingShare): Memo {
  const now = Date.now();
  const url = share.url ?? '';
  const titleHint = share.title?.trim() ?? '';
  const attachments: MemoAttachment[] = [];
  const att = makeUrlAttachment(url);
  if (att) attachments.push(att);
  const title = titleHint && titleHint !== url ? titleHint : `共有: ${att?.name ?? url}`;
  return {
    id: makeId(),
    title: title.slice(0, 80),
    body: '',
    attachments,
    createdAt: now,
    updatedAt: now,
  };
}

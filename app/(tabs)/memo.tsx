import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FolderManageSheet } from '../../components/FolderManageSheet';
import { MemoEditorSheet } from '../../components/MemoEditorSheet';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useMemoFolders } from '../../hooks/useMemoFolders';
import { useMemos } from '../../hooks/useMemos';
import { useTheme } from '../../hooks/useTheme';
import type { Memo, MemoAttachment } from '../../types/Memo';

const FILTER_ALL = '__all__';
const FILTER_UNCATEGORIZED = '__none__';

export default function MemoScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { memos, createMemo, updateMemo, removeMemo } = useMemos();
  const { folders, createFolder, renameFolder, removeFolder } = useMemoFolders();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [folderSheetOpen, setFolderSheetOpen] = useState(false);
  const [filter, setFilter] = useState<string>(FILTER_ALL);

  const editing = editingId ? memos.find((m) => m.id === editingId) ?? null : null;

  const handleAdd = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const m = createMemo();
    // 新規メモは現在のフィルタフォルダに自動配置 (未分類/全件以外)
    if (filter !== FILTER_ALL && filter !== FILTER_UNCATEGORIZED) {
      updateMemo(m.id, { folderId: filter });
    }
    setEditingId(m.id);
    setEditorOpen(true);
  }, [createMemo, filter, updateMemo]);

  const handleOpen = useCallback((id: string) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setEditingId(id);
    setEditorOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    const target = editingId ? memos.find((m) => m.id === editingId) : null;
    if (target && !target.title.trim() && !target.body.trim() && target.attachments.length === 0) {
      removeMemo(target.id);
    }
    setEditorOpen(false);
    setEditingId(null);
  }, [editingId, memos, removeMemo]);

  const handleChange = useCallback(
    (patch: Partial<Omit<Memo, 'id' | 'createdAt'>>) => {
      if (!editingId) return;
      updateMemo(editingId, patch);
    },
    [editingId, updateMemo]
  );

  const handleDelete = useCallback(() => {
    if (!editingId) return;
    removeMemo(editingId);
    setEditorOpen(false);
    setEditingId(null);
  }, [editingId, removeMemo]);

  const handleDeleteFolder = useCallback(
    (id: string) => {
      // フォルダ削除時、所属メモを未分類に戻す
      memos.forEach((m) => {
        if (m.folderId === id) updateMemo(m.id, { folderId: null });
      });
      removeFolder(id);
      if (filter === id) setFilter(FILTER_ALL);
    },
    [memos, updateMemo, removeFolder, filter]
  );

  const filteredMemos = useMemo(() => {
    if (filter === FILTER_ALL) return memos;
    if (filter === FILTER_UNCATEGORIZED) {
      return memos.filter((m) => !m.folderId);
    }
    return memos.filter((m) => m.folderId === filter);
  }, [memos, filter]);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let uncategorized = 0;
    for (const m of memos) {
      if (m.folderId) counts[m.folderId] = (counts[m.folderId] ?? 0) + 1;
      else uncategorized += 1;
    }
    return { counts, uncategorized, total: memos.length };
  }, [memos]);

  const folderById = useMemo(() => {
    const map = new Map<string, (typeof folders)[number]>();
    for (const f of folders) map.set(f.id, f);
    return map;
  }, [folders]);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <ScreenHeader
        title="メモ"
        theme={theme}
        onAdd={handleAdd}
        rightExtra={
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              setFolderSheetOpen(true);
            }}
            hitSlop={8}
            style={({ pressed }) => [
              styles.folderBtn,
              {
                backgroundColor: theme.bgSecondary,
                borderColor: theme.separator,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="folder-outline" size={18} color={theme.text} />
          </Pressable>
        }
        bottom={
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <FilterChip
              label="すべて"
              count={folderCounts.total}
              active={filter === FILTER_ALL}
              theme={theme}
              onPress={() => setFilter(FILTER_ALL)}
            />
            <FilterChip
              label="未分類"
              count={folderCounts.uncategorized}
              active={filter === FILTER_UNCATEGORIZED}
              theme={theme}
              onPress={() => setFilter(FILTER_UNCATEGORIZED)}
            />
            {folders.length > 0 ? (
              <View style={[styles.filterDivider, { backgroundColor: theme.separator }]} />
            ) : null}
            {folders.map((f) => (
              <FilterChip
                key={f.id}
                label={f.name}
                count={folderCounts.counts[f.id] ?? 0}
                color={f.color}
                active={filter === f.id}
                theme={theme}
                onPress={() => setFilter(f.id)}
              />
            ))}
          </ScrollView>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.list, { paddingBottom: 24 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {filteredMemos.length === 0 ? (
          <View
            style={[
              styles.empty,
              { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
            ]}
          >
            <Ionicons name="document-text-outline" size={36} color={theme.textTertiary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {memos.length === 0 ? 'まだメモがありません' : 'このフォルダは空です'}
            </Text>
            <Text style={[styles.emptySub, { color: theme.textTertiary }]}>
              右上の + から URL・画像・PDF を保存できます
            </Text>
          </View>
        ) : (
          filteredMemos.map((m) => (
            <MemoCard
              key={m.id}
              memo={m}
              theme={theme}
              folder={m.folderId ? folderById.get(m.folderId) ?? null : null}
              onPress={() => handleOpen(m.id)}
            />
          ))
        )}
      </ScrollView>

      <MemoEditorSheet
        visible={editorOpen}
        theme={theme}
        memo={editing}
        folders={folders}
        onClose={handleClose}
        onChange={handleChange}
        onDelete={handleDelete}
        onCreateFolder={createFolder}
      />

      <FolderManageSheet
        visible={folderSheetOpen}
        theme={theme}
        folders={folders}
        onClose={() => setFolderSheetOpen(false)}
        onCreate={(n) => createFolder(n)}
        onRename={renameFolder}
        onDelete={handleDeleteFolder}
      />
    </View>
  );
}

function FilterChip({
  label,
  count,
  active,
  color,
  theme,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  color?: string;
  theme: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.accent : theme.bgSecondary,
          borderColor: active ? theme.accent : theme.separator,
        },
      ]}
    >
      {color ? (
        <View style={[styles.chipDot, { backgroundColor: active ? '#fff' : color }]} />
      ) : null}
      <Text style={[styles.chipText, { color: active ? '#fff' : theme.text }]}>{label}</Text>
      <Text
        style={[
          styles.chipCount,
          { color: active ? 'rgba(255,255,255,0.85)' : theme.textTertiary },
        ]}
      >
        {count}
      </Text>
    </Pressable>
  );
}

function MemoCard({
  memo,
  theme,
  folder,
  onPress,
}: {
  memo: Memo;
  theme: any;
  folder: { name: string; color: string } | null;
  onPress: () => void;
}) {
  const title = memo.title.trim() || '無題のメモ';
  const snippet = memo.body.trim().slice(0, 120);
  const counts = countAttachments(memo.attachments);
  const firstImage = memo.attachments.find((a) => a.kind === 'image');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.bgSecondary,
          borderColor: theme.separator,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {firstImage ? (
        <Image source={{ uri: firstImage.uri }} style={styles.cardImage} />
      ) : null}
      <View style={{ flex: 1 }}>
        {folder ? (
          <View style={styles.folderTagRow}>
            <View style={[styles.folderTagDot, { backgroundColor: folder.color }]} />
            <Text style={[styles.folderTagText, { color: folder.color }]} numberOfLines={1}>
              {folder.name}
            </Text>
          </View>
        ) : null}
        <Text
          style={[
            styles.cardTitle,
            { color: memo.title.trim() ? theme.text : theme.textTertiary },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {snippet ? (
          <Text style={[styles.cardBody, { color: theme.textSecondary }]} numberOfLines={2}>
            {snippet}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={[styles.cardDate, { color: theme.textTertiary }]}>
            {formatDate(memo.updatedAt)}
          </Text>
          {counts.total > 0 ? (
            <View style={styles.cardChips}>
              {counts.url > 0 ? <ChipDot icon="link" count={counts.url} theme={theme} /> : null}
              {counts.image > 0 ? <ChipDot icon="image" count={counts.image} theme={theme} /> : null}
              {counts.pdf > 0 ? (
                <ChipDot icon="document-text" count={counts.pdf} theme={theme} />
              ) : null}
              {counts.file > 0 ? (
                <ChipDot icon="document" count={counts.file} theme={theme} />
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function ChipDot({ icon, count, theme }: { icon: any; count: number; theme: any }) {
  return (
    <View style={[styles.attachChip, { backgroundColor: theme.accentBg }]}>
      <Ionicons name={icon} size={11} color={theme.accent} />
      <Text style={[styles.attachChipText, { color: theme.accent }]}>{count}</Text>
    </View>
  );
}

function countAttachments(list: MemoAttachment[]) {
  const c = { url: 0, image: 0, pdf: 0, file: 0, total: list.length };
  for (const a of list) c[a.kind] += 1;
  return c;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const same =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  if (same) return `今日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  folderBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  filterRow: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
    paddingRight: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipCount: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  filterDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 8,
    marginVertical: 4,
    opacity: 0.6,
  },
  list: {
    paddingHorizontal: 16,
    gap: 10,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  cardImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  folderTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  folderTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  folderTagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardBody: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cardChips: {
    flexDirection: 'row',
    gap: 4,
  },
  attachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  attachChipText: {
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});

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
  TextInput,
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
  const [search, setSearch] = useState('');

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

  const togglePin = useCallback(
    (id: string) => {
      const target = memos.find((m) => m.id === id);
      if (!target) return;
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      updateMemo(id, { pinned: !target.pinned });
    },
    [memos, updateMemo]
  );

  // タグ収集 (本文中の #tag からも抽出)
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const m of memos) {
      m.tags?.forEach((t) => set.add(t));
      const matches = m.body.matchAll(/#([\p{Letter}\p{Number}_]+)/gu);
      for (const mm of matches) set.add(mm[1]);
    }
    return Array.from(set).sort();
  }, [memos]);

  const filteredMemos = useMemo(() => {
    let list = memos;

    // フォルダ フィルタ
    if (filter === FILTER_UNCATEGORIZED) {
      list = list.filter((m) => !m.folderId);
    } else if (filter !== FILTER_ALL && !filter.startsWith('tag:')) {
      list = list.filter((m) => m.folderId === filter);
    }

    // タグ フィルタ
    if (filter.startsWith('tag:')) {
      const tag = filter.slice(4);
      list = list.filter((m) => {
        if (m.tags?.includes(tag)) return true;
        // 本文の #tag も対象
        return new RegExp(`(^|\\s)#${escapeRegex(tag)}(\\s|$)`, 'u').test(m.body);
      });
    }

    // 全文検索
    const kw = search.trim().toLowerCase();
    if (kw) {
      list = list.filter((m) => {
        if (m.title.toLowerCase().includes(kw)) return true;
        if (m.body.toLowerCase().includes(kw)) return true;
        if (m.attachments.some((a) => a.name.toLowerCase().includes(kw))) return true;
        if (m.tags?.some((t) => t.toLowerCase().includes(kw))) return true;
        return false;
      });
    }

    return list;
  }, [memos, filter, search]);

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
          <>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: theme.bgSecondary, borderColor: theme.separator },
              ]}
            >
              <Ionicons name="search" size={16} color={theme.textTertiary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="メモ・タグを検索"
                placeholderTextColor={theme.textTertiary}
                style={[styles.searchInput, { color: theme.text }]}
                autoCorrect={false}
                returnKeyType="search"
              />
              {search ? (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={theme.textTertiary} />
                </Pressable>
              ) : null}
            </View>

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
              {allTags.length > 0 ? (
                <View style={[styles.filterDivider, { backgroundColor: theme.separator }]} />
              ) : null}
              {allTags.map((t) => (
                <FilterChip
                  key={`tag:${t}`}
                  label={`#${t}`}
                  count={memos.filter(
                    (m) =>
                      m.tags?.includes(t) ||
                      new RegExp(`(^|\\s)#${escapeRegex(t)}(\\s|$)`, 'u').test(m.body)
                  ).length}
                  active={filter === `tag:${t}`}
                  theme={theme}
                  onPress={() => setFilter(`tag:${t}`)}
                />
              ))}
            </ScrollView>
          </>
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
              onTogglePin={() => togglePin(m.id)}
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
  onTogglePin,
}: {
  memo: Memo;
  theme: any;
  folder: { name: string; color: string } | null;
  onPress: () => void;
  onTogglePin: () => void;
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
          backgroundColor: memo.pinned ? theme.accentBg : theme.bgSecondary,
          borderColor: memo.pinned ? theme.accent : theme.separator,
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
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.cardTitle,
              { color: memo.title.trim() ? theme.text : theme.textTertiary, flex: 1 },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onTogglePin();
            }}
            hitSlop={8}
            style={styles.pinBtn}
          >
            <Ionicons
              name={memo.pinned ? 'pin' : 'pin-outline'}
              size={16}
              color={memo.pinned ? theme.accent : theme.textTertiary}
            />
          </Pressable>
        </View>
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

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countAttachments(list: MemoAttachment[]) {
  const c = { url: 0, image: 0, pdf: 0, file: 0, audio: 0, total: list.length };
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinBtn: {
    paddingLeft: 6,
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

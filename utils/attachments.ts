import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { AttachmentKind, MemoAttachment } from '../types/Memo';

function makeAttachmentId() {
  return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const MEMO_DIR = `${FileSystem.documentDirectory ?? ''}memos/`;

async function ensureMemoDir(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const info = await FileSystem.getInfoAsync(MEMO_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(MEMO_DIR, { intermediates: true });
    }
  } catch {
    // ignore
  }
}

async function copyToAppDir(srcUri: string, hint: string): Promise<string> {
  if (Platform.OS === 'web') return srcUri;
  await ensureMemoDir();
  const ext = (() => {
    const m = hint.match(/\.([a-zA-Z0-9]{1,5})$/);
    if (m) return m[1].toLowerCase();
    const fromSrc = srcUri.match(/\.([a-zA-Z0-9]{1,5})(\?|$)/);
    return fromSrc ? fromSrc[1].toLowerCase() : 'bin';
  })();
  const target = `${MEMO_DIR}${makeAttachmentId()}.${ext}`;
  try {
    await FileSystem.copyAsync({ from: srcUri, to: target });
    return target;
  } catch {
    return srcUri;
  }
}

export async function pickImageAttachment(): Promise<MemoAttachment | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
    base64: false,
    exif: false,
  });
  if (result.canceled || !result.assets || result.assets.length === 0) return null;
  const asset = result.assets[0];
  const name = asset.fileName ?? `image-${Date.now()}.jpg`;
  const uri = await copyToAppDir(asset.uri, name);
  return {
    id: makeAttachmentId(),
    kind: 'image',
    uri,
    name,
    mimeType: asset.mimeType ?? 'image/jpeg',
    size: asset.fileSize,
  };
}

export async function pickDocumentAttachment(filter: 'pdf' | 'any' = 'any'): Promise<MemoAttachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: filter === 'pdf' ? 'application/pdf' : '*/*',
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets || result.assets.length === 0) return null;
  const asset = result.assets[0];
  const name = asset.name ?? 'file';
  const mime = asset.mimeType ?? '';
  const kind: AttachmentKind = mime.includes('pdf') || name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'file';
  const uri = await copyToAppDir(asset.uri, name);
  return {
    id: makeAttachmentId(),
    kind,
    uri,
    name,
    mimeType: mime,
    size: asset.size,
  };
}

/**
 * 録音 → 音声添付に変換 (uri をアプリ管理ディレクトリへコピー)。
 * 呼び出し側で expo-av の Recording を停止して uri を取得する想定。
 */
export async function audioAttachmentFromRecording(
  recordingUri: string,
  durationSec: number
): Promise<MemoAttachment> {
  const name = `voice-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.m4a`;
  const uri = await copyToAppDir(recordingUri, name);
  return {
    id: makeAttachmentId(),
    kind: 'audio',
    uri,
    name,
    mimeType: 'audio/mp4',
    durationSec,
  };
}

export function makeUrlAttachment(rawUrl: string): MemoAttachment | null {
  const url = rawUrl.trim();
  if (!url) return null;
  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  let host = '';
  try {
    host = new URL(withScheme).host;
  } catch {
    return null;
  }
  return {
    id: makeAttachmentId(),
    kind: 'url',
    uri: withScheme,
    name: host || withScheme,
  };
}

export async function openAttachment(att: MemoAttachment): Promise<void> {
  try {
    if (att.kind === 'url') {
      await WebBrowser.openBrowserAsync(att.uri);
      return;
    }
    if (Platform.OS === 'web') {
      // On web we can simply open the URI (blob/data/file) in a new tab
      await Linking.openURL(att.uri);
      return;
    }
    // Native: try Sharing API which lets the user open the file in another app
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(att.uri, {
        mimeType: att.mimeType,
        dialogTitle: att.name,
        UTI: att.kind === 'pdf' ? 'com.adobe.pdf' : undefined,
      });
    } else {
      await Linking.openURL(att.uri);
    }
  } catch {
    // best-effort
  }
}

export async function deleteAttachmentFile(att: MemoAttachment): Promise<void> {
  if (Platform.OS === 'web') return;
  if (att.kind === 'url') return;
  if (!att.uri.startsWith(MEMO_DIR)) return;
  try {
    await FileSystem.deleteAsync(att.uri, { idempotent: true });
  } catch {
    // ignore
  }
}

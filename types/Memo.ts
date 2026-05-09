export type AttachmentKind = 'url' | 'image' | 'pdf' | 'file' | 'audio';

export interface MemoAttachment {
  id: string;
  kind: AttachmentKind;
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
  /** 音声ファイルの再生時間 (秒) */
  durationSec?: number;
}

export interface Memo {
  id: string;
  title: string;
  body: string;
  attachments: MemoAttachment[];
  folderId?: string | null;
  tags?: string[];
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MemoFolder {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

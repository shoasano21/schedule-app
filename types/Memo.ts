export type AttachmentKind = 'url' | 'image' | 'pdf' | 'file';

export interface MemoAttachment {
  id: string;
  kind: AttachmentKind;
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export interface Memo {
  id: string;
  title: string;
  body: string;
  attachments: MemoAttachment[];
  folderId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface MemoFolder {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

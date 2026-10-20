/**
 * Privacy: deleting a swing, or all data, removes the stored files as well as the records.
 * expo-file-system is replaced by an in-memory file tree here (no device file system in Jest);
 * the same calls are checked on the iPhone with the Settings storage figures (device test P-1/P-2).
 */
const mockFiles = new Map<string, number>();

jest.mock('expo-file-system', () => {
  const join = (...parts: string[]) => parts.join('/').replace(/([^:/])\/+/g, '$1/');
  const pathOf = (x: unknown): string => (typeof x === 'string' ? x : (x as { uri: string }).uri);
  class File {
    uri: string;
    constructor(...p: unknown[]) {
      this.uri = join(...p.map(pathOf));
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    get size() {
      return mockFiles.get(this.uri) ?? null;
    }
    delete() {
      mockFiles.delete(this.uri);
    }
    async copy(dest: File) {
      mockFiles.set(dest.uri, mockFiles.get(this.uri) ?? 0);
    }
  }
  class Directory {
    uri: string;
    constructor(...p: unknown[]) {
      this.uri = join(...p.map(pathOf));
    }
    get exists() {
      return [...mockFiles.keys()].some((k) => k.startsWith(`${this.uri}/`));
    }
    create() {}
    delete() {
      for (const k of [...mockFiles.keys()]) if (k.startsWith(`${this.uri}/`)) mockFiles.delete(k);
    }
    list() {
      return [...mockFiles.keys()].filter((k) => k.startsWith(`${this.uri}/`) && !k.slice(this.uri.length + 1).includes('/')).map((k) => new File(k));
    }
  }
  return { File, Directory, Paths: { document: new Directory('file:///Documents'), cache: new Directory('file:///Caches') } };
});
jest.mock('expo-image-picker', () => ({}));
jest.mock('../../modules/golf-vision', () => ({ GolfVision: null }));

// eslint-disable-next-line import/first
import { deleteSwingVideo, deleteSwingVideoFiles, swingStorageUsage } from '@/services/swingAnalysis';

const seed = () => {
  mockFiles.clear();
  mockFiles.set('file:///Documents/swing-videos/a.mov', 40_000_000);
  mockFiles.set('file:///Documents/swing-videos/b.mov', 20_000_000);
  mockFiles.set('file:///Caches/golfvision-frames/frame-1.jpg', 200_000);
  mockFiles.set('file:///Caches/ImagePicker/tmp.mov', 40_000_000);
  mockFiles.set('file:///Documents/SQLite/adaptive-golf-coach.db', 1_000);
};

describe('swing video files', () => {
  it('reports what is stored', () => {
    seed();
    expect(swingStorageUsage()).toEqual({ videoFiles: 2, videoBytes: 60_000_000, cachedFiles: 2, cachedBytes: 40_200_000 });
  });

  it('deleting one video removes its file, the frame cache and its records, and keeps other videos', async () => {
    seed();
    const deleteRecords = jest.fn();
    await deleteSwingVideo({ swingVideos: { delete: deleteRecords } } as never, { id: 'v1', relativePath: 'swing-videos/a.mov' });
    expect(mockFiles.has('file:///Documents/swing-videos/a.mov')).toBe(false);
    expect(mockFiles.has('file:///Documents/swing-videos/b.mov')).toBe(true);
    expect([...mockFiles.keys()].some((k) => k.includes('golfvision-frames'))).toBe(false);
    expect(deleteRecords).toHaveBeenCalledWith('v1');
  });

  it('Delete all my data removes every video, frame and picker copy, but not the database file', () => {
    seed();
    deleteSwingVideoFiles();
    expect([...mockFiles.keys()]).toEqual(['file:///Documents/SQLite/adaptive-golf-coach.db']);
    expect(swingStorageUsage()).toEqual({ videoFiles: 0, videoBytes: 0, cachedFiles: 0, cachedBytes: 0 });
  });
});

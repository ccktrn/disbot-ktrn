import path from 'path';

// 型定義
interface PCloudFileMetadata {
    fileid: number;
    folderid: number;
    name: string;
    size: number;
    contenttype: string;
    created: string;
    isfolder: boolean;
}

export class PCloudService {
    private readonly authToken: string;
    private readonly apiBase: string;

    constructor() {
        this.authToken = process.env.PCLOUD_API_TOKEN || '';
        this.apiBase = process.env.PCLOUD_API_BASE || 'https://api.pcloud.com'; 
    }

    /**
     * 認証トークンを取得
     */
    private getAuthToken(): string {
        if (!this.authToken) {
            throw new Error('PCloud auth token is not configured. Set PCLOUD_API_TOKEN.');
        }

        return this.authToken;
    }

    /**
     * 📤 アップロード (Bun Native版)
     * fs.createReadStream の代わりに Bun.file を使用して安定化
     */
    public async uploadFile(localPath: string, targetFolderId: string = '0'): Promise<PCloudFileMetadata | null> {
        try {
            const token = this.getAuthToken();
            const fileName = path.basename(localPath);
            
            // Bunのファイルオブジェクトを作成
            const bunFile = Bun.file(localPath);
            
            // ファイル存在確認 (非同期)
            if (!(await bunFile.exists())) {
                console.error(`❌ File not found: ${localPath}`);
                return null;
            }

            // 標準のFormDataを使用 (Bunはこれをネイティブサポート)
            const form = new FormData();
            form.append('access_token', token);
            form.append('folderid', targetFolderId);
            form.append('nopartial', '1');
            form.append('filename', fileName);
            form.append('file', bunFile); // BunFileを直接渡せる

            // console.log(`📤 Uploading: ${fileName}...`);

            const response = await fetch(`${this.apiBase}/uploadfile`, {
                method: 'POST',
                body: form,
                // BunのfetchはContent-Type (multipart/form-data) を自動設定します
            });

            const data = await response.json() as any;

            if (data.result === 0) {
                return data.metadata[0] as PCloudFileMetadata;
            } else {
                console.error(`❌ Upload API Error: ${data.error}`);
                return null;
            }

        } catch (error) {
            console.error('Upload Exception:', error);
            return null;
        }
    }

    /**
     * 📂 フォルダ内のファイル一覧を取得 (Bun fetch版)
     */
    public async listFolder(folderId: string = '0'): Promise<PCloudFileMetadata[]> {
        try {
            const token = this.getAuthToken();
            const params = new URLSearchParams({
                access_token: token,
                folderid: folderId
            });

            const response = await fetch(`${this.apiBase}/listfolder?${params}`);
            const data = await response.json() as any;

            if (data.result === 0) {
                return data.metadata.contents;
            }
            return [];
        } catch (error) {
            console.error('ListFolder Exception:', error);
            return [];
        }
    }

    /**
     * 🔍 ファイルが存在するか確認
     */
    public async isFileExists(fileName: string, folderId: string = '0'): Promise<boolean> {
        const files = await this.listFolder(folderId);
        return files.some(f => f.name === fileName && !f.isfolder);
    }

    public getUploadDirID(format: string): string {
      let folderId = process.env.PCLOUD_FOLDER_ID || '0';
      if (/^(mp3|flac|wav|m4a)$/i.test(format)) {
          folderId = process.env.PCLOUD_FOLDER_ID_MUSIC || folderId;
      } else if (/^(mp4|mkv|avi|mov)$/i.test(format)) {
          folderId = process.env.PCLOUD_FOLDER_ID_VIDEO || folderId;
      }
      return folderId;
    }
}
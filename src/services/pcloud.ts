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
    private authKey: string | null = null;
    private readonly email: string;
    private readonly password: string;
    private readonly apiBase: string;

    constructor() {
        this.email = process.env.PCLOUD_EMAIL || '';
        this.password = process.env.PCLOUD_PASSWORD || '';
        // エラーログが eapi (EU) だったのでデフォルトを eapi にしておくと安全です
        this.apiBase = process.env.PCLOUD_API_BASE || 'https://eapi.pcloud.com'; 
    }

    /**
     * ログイン処理 (Bun fetch版)
     */
    private async login(): Promise<string> {
        if (this.authKey) return this.authKey;

        try {
            const params = new URLSearchParams({
                getauth: '1',
                logout: '1',
                username: this.email,
                password: this.password
            });

            const res = await fetch(`${this.apiBase}/userinfo?${params}`);
            const data = await res.json() as any;

            if (data.result === 0) {
                this.authKey = data.auth;
                return this.authKey!;
            }
            throw new Error(`Login Failed: ${data.error}`);
        } catch (error) {
            console.error('PCloud Login Error:', error);
            throw error;
        }
    }

    /**
     * 📤 アップロード (Bun Native版)
     * fs.createReadStream の代わりに Bun.file を使用して安定化
     */
    public async uploadFile(localPath: string, targetFolderId: number = 0): Promise<PCloudFileMetadata | null> {
        try {
            const token = await this.login();
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
            form.append('auth', token);
            form.append('folderid', targetFolderId.toString());
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
    public async listFolder(folderId: number = 0): Promise<PCloudFileMetadata[]> {
        try {
            const token = await this.login();
            const params = new URLSearchParams({
                auth: token,
                folderid: folderId.toString()
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
    public async isFileExists(fileName: string, folderId: number = 0): Promise<boolean> {
        const files = await this.listFolder(folderId);
        return files.some(f => f.name === fileName && !f.isfolder);
    }

    public getUploadDirID(format: string): number {
      let folderId = parseInt(process.env.PCLOUD_FOLDER_ID || '0', 10);
      if (/^(mp3|flac|wav|m4a)$/i.test(format)) {
          folderId = parseInt(process.env.PCLOUD_FOLDER_ID_MUSIC || folderId.toString(), 10);
      } else if (/^(mp4|mkv|avi|mov)$/i.test(format)) {
          folderId = parseInt(process.env.PCLOUD_FOLDER_ID_VIDEO || folderId.toString(), 10);
      }
      return folderId;
    }
}
// import { SQLiteService } from '../sqlite';

// export class HistoryManager {
//     private db: SQLiteService;

//     constructor() {
//         this.db = SQLiteService.getInstance();
//         this.initTable();
//     }

//     private initTable() {
//         // 必要に応じてテーブルを作成
//         this.db.exec(`
//             CREATE TABLE IF NOT EXISTS download_history (
//                 video_id TEXT,
//                 format TEXT,
//                 pcloud_file_id INTEGER,
//                 file_name TEXT,
//                 title TEXT,
//                 created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//                 PRIMARY KEY (video_id, format)
//             )
//         `);
//     }

//     /**
//      * ダウンロード済みかどうか確認
//      */
//     public isDownloaded(videoId: string, format: string): boolean {
//         const row = this.db.get(
//             `SELECT 1 FROM download_history WHERE video_id = $id AND format = $fmt`,
//             { $id: videoId, $fmt: format }
//         );
//         return !!row;
//     }

//     /**
//      * 履歴に追加
//      */
//     public addEntry(videoId: string, format: string, pCloudFileId: number, fileName: string, title: string): void {
//         this.db.run(`
//             INSERT OR REPLACE INTO download_history (video_id, format, pcloud_file_id, file_name, title)
//             VALUES ($id, $fmt, $pid, $name, $title)
//         `, {
//             $id: videoId,
//             $fmt: format,
//             $pid: pCloudFileId,
//             $name: fileName,
//             $title: title
//         });
//         console.log(`[DB] Added history: ${videoId} (${format})`);
//     }

//     /**
//      * 履歴情報の取得 (URL生成などに使える)
//      */
//     public getEntry(videoId: string, format: string): any {
//         return this.db.get(
//             `SELECT * FROM download_history WHERE video_id = $id AND format = $fmt`,
//             { $id: videoId, $fmt: format }
//         );
//     }
// }
// import { Database } from "bun:sqlite";
// import fs from 'fs';
// import path from 'path';

// export class SQLiteService {
//     private db: Database;
//     private static instance: SQLiteService;

//     private constructor() {
//         // 環境変数からパスを取得、なければデフォルト値
//         const dbPath = process.env.DB_PATH || './data/db.sqlite';
        
//         // ディレクトリがない場合は作成 (これがないとエラーになる)
//         const dir = path.dirname(dbPath);
//         if (!fs.existsSync(dir)) {
//             fs.mkdirSync(dir, { recursive: true });
//         }

//         console.log(`Loading SQLite DB from: ${dbPath}`);
//         this.db = new Database(dbPath, { create: true });
//     }

//     // シングルトンパターン（アプリ内でDB接続を1つに保つ）
//     public static getInstance(): SQLiteService {
//         if (!SQLiteService.instance) {
//             SQLiteService.instance = new SQLiteService();
//         }
//         return SQLiteService.instance;
//     }

//     /**
//      * SELECT などの結果を返すクエリ (単一レコード)
//      */
//     public get(sql: string, params: any = {}): any {
//         return this.db.query(sql).get(params);
//     }

//     /**
//      * SELECT などの結果を返すクエリ (複数レコード)
//      */
//     public all(sql: string, params: any = {}): any[] {
//         return this.db.query(sql).all(params);
//     }

//     /**
//      * INSERT, UPDATE, DELETE などの実行 (結果を返さない)
//      */
//     public run(sql: string, params: any = {}): void {
//         this.db.query(sql).run(params);
//     }

//     /**
//      * テーブル作成などのDDL実行
//      */
//     public exec(sql: string): void {
//         this.db.run(sql);
//     }
// }
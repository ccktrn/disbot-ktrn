import { SQLiteService } from "../lib/sqlite";

export class MemoryRepository {
    private db: SQLiteService;

    constructor() {
        this.db = SQLiteService.getInstance();
        this.init();
    }

    private init() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS llm_memory (
                user_id TEXT PRIMARY KEY,
                memory TEXT
            )
        `);
    }

    public getMemory(userId: string): any {
        const result = this.db.get("SELECT memory FROM llm_memory WHERE user_id = $userId", { $userId: userId });
        if (!result || !result.memory) return {};
        try {
            return JSON.parse(result.memory);
        } catch (e) {
            return {};
        }
    }

    public updateMemory(userId: string, memoryObj: any): void {
        const memoryStr = JSON.stringify(memoryObj);
        this.db.run(`
            INSERT INTO llm_memory (user_id, memory)
            VALUES ($userId, $memory)
            ON CONFLICT(user_id) DO UPDATE SET memory = excluded.memory
        `, { $userId: userId, $memory: memoryStr });
    }
}

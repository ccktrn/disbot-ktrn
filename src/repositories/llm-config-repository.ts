import { SQLiteService } from "../services/sqlite";

export class LLMConfigRepository {
    private db: SQLiteService;

    constructor() {
        this.db = SQLiteService.getInstance();
        this.init();
    }

    private init() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS llm_config (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);
    }

    public getConfig(key: string): string | null {
        const result = this.db.get("SELECT value FROM llm_config WHERE key = $key", { $key: key });
        return result ? result.value : null;
    }

    public setConfig(key: string, value: string): void {
        this.db.run(`
            INSERT INTO llm_config (key, value)
            VALUES ($key, $value)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `, { $key: key, $value: value });
    }

    public getKeywords(): string[] {
        const value = this.getConfig("keywords");
        if (!value) return [];
        try {
            return JSON.parse(value);
        } catch (e) {
            return [];
        }
    }

    public addKeyword(keyword: string): void {
        const keywords = this.getKeywords();
        if (!keywords.includes(keyword)) {
            keywords.push(keyword);
            this.setConfig("keywords", JSON.stringify(keywords));
        }
    }

    public removeKeyword(keyword: string): boolean {
        const keywords = this.getKeywords();
        const index = keywords.indexOf(keyword);
        if (index !== -1) {
            keywords.splice(index, 1);
            this.setConfig("keywords", JSON.stringify(keywords));
            return true;
        }
        return false;
    }
}

import { SQLiteService } from "../services/sqlite";

export interface Reminder {
    id: number;
    user_id: string;
    channel_id: string;
    content: string;
    trigger_at: number;
}

export class ReminderRepository {
    private db: SQLiteService;

    constructor() {
        this.db = SQLiteService.getInstance();
        this.init();
    }

    private init() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                content TEXT NOT NULL,
                trigger_at INTEGER NOT NULL
            )
        `);
    }

    public addReminder(userId: string, channelId: string, content: string, triggerAt: number): void {
        this.db.run(`
            INSERT INTO reminders (user_id, channel_id, content, trigger_at)
            VALUES ($user_id, $channel_id, $content, $trigger_at)
        `, { $user_id: userId, $channel_id: channelId, $content: content, $trigger_at: triggerAt });
    }

    public getRemindersForUser(userId: string): Reminder[] {
        return this.db.all(
            "SELECT * FROM reminders WHERE user_id = $user_id ORDER BY trigger_at ASC",
            { $user_id: userId }
        ) as Reminder[];
    }

    public removeReminder(id: number, userId: string): boolean {
        // Bun SQLite doesn't natively return changes on run from abstract layer without accessing the db object directly
        // So we can check if it exists first, or just run it.
        const existing = this.db.get("SELECT id FROM reminders WHERE id = $id AND user_id = $user_id", { $id: id, $user_id: userId });
        if (existing) {
            this.db.run("DELETE FROM reminders WHERE id = $id AND user_id = $user_id", { $id: id, $user_id: userId });
            return true;
        }
        return false;
    }

    public getPendingReminders(now: number): Reminder[] {
        return this.db.all(
            "SELECT * FROM reminders WHERE trigger_at <= $now",
            { $now: now }
        ) as Reminder[];
    }

    public removeReminderById(id: number): void {
        this.db.run("DELETE FROM reminders WHERE id = $id", { $id: id });
    }
}

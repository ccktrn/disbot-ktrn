import { Client } from "discord.js";
import { ReminderRepository } from "../repositories/reminder-repository";

export class ReminderService {
    private repo: ReminderRepository;
    private timer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.repo = new ReminderRepository();
    }

    public addReminder(userId: string, channelId: string, content: string, triggerAt: number): void {
        this.repo.addReminder(userId, channelId, content, triggerAt);
    }

    public getRemindersForUser(userId: string) {
        return this.repo.getRemindersForUser(userId);
    }

    public removeReminder(id: number, userId: string): boolean {
        return this.repo.removeReminder(id, userId);
    }

    public startChecker(client: Client, intervalMs: number = 10000): void {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.timer = setInterval(() => this.checkReminders(client), intervalMs);
        console.log(`[ReminderService] Started checking reminders every ${intervalMs}ms.`);
    }

    public stopChecker(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            console.log(`[ReminderService] Stopped reminder checker.`);
        }
    }

    private async checkReminders(client: Client): Promise<void> {
        const now = Date.now();
        const pending = this.repo.getPendingReminders(now);

        for (const r of pending) {
            try {
                const channel = await client.channels.fetch(r.channel_id);
                if (channel && 'send' in channel && typeof channel.send === 'function') {
                    await (channel as any).send(`🔔 <@${r.user_id}> リマインダーの時間です！\n> ${r.content}`);
                }
            } catch (err) {
                console.error(`[ReminderService] Failed to send reminder ${r.id}:`, err);
            } finally {
                // 成功しても失敗しても時間が過ぎたものは削除する
                this.repo.removeReminderById(r.id);
            }
        }
    }
}

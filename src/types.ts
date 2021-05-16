import { Message, Client } from 'discord.js';

export default interface CommandOptions {
    name: string;
    aliases?: string[];
    description?: string;
    execute: (msg: Message, args: string[], client: Client) => unknown;
}

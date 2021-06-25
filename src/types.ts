import { Message } from 'discord.js';
import Client from './client/Client';

export default interface CommandOptions {
    name: string;
    aliases?: string[];
    description?: string;
    execute: (msg: Message, args: string[], client: Client) => unknown;
}

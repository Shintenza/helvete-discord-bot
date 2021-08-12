import { Message } from 'discord.js';
import Client from './classes/Client';
import { ShoukakuSocket } from 'shoukaku';

export default interface CommandOptions {
    name: string;
    aliases?: string[];
    description?: string;
    execute: (msg: Message, args: string[], client: Client, node: ShoukakuSocket) => unknown;
}

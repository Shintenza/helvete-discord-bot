import { Message } from 'discord.js';
import Client from './classes/Client';
import { ShoukakuSocket } from 'shoukaku';

interface Command {
    name: string;
    cooldown: number;
    aliases?: string[];
    description?: string;
    execute: (msg: Message, args: string[], client: Client, node: ShoukakuSocket) => unknown;
}
interface UserCooldown {
    date: Date;
    count: number;
    sentFirstWarn: boolean;
    sentSecondWarn: boolean;
}
interface BlockedUser {
    id: string;
    date: Date;
}

export { Command, UserCooldown, BlockedUser };

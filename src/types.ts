import { Message } from 'discord.js';
import Client from './classes/Client';

interface Command {
    name: string;
    cooldown: number;
    aliases?: string[];
    description?: string;
    execute: (msg: Message, args: string[], client: Client, optional?: any) => unknown;
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

interface Song {
    title: string;
    author: string;
    duration: number;
    uri: string;
    thumbnail: string;
    requester: string;
    track: string;
    resolved: boolean;
}
interface Track {
    track: string;
    title: string;
    identifier: string;
    author: string;
    duration: number;
    isSeekable: boolean;
    isStream: boolean;
    uri: string;
    thumbnail: string;
    displayThumbnail: any;
    requester: string | undefined;
}

export { Command, UserCooldown, BlockedUser, Song };

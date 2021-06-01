import { Message, Client } from 'discord.js';
import SpotifyWebApi from 'spotify-web-api-node';

export default interface CommandOptions {
    name: string;
    aliases?: string[];
    description?: string;
    execute: (msg: Message, args: string[], client: Client, spotifyApp?: SpotifyWebApi) => unknown;
}

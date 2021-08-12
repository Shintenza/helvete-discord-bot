import { Client, ClientOptions, Collection, Message, TextChannel, User, MessageEmbed, Guild } from 'discord.js';
import { Shoukaku, ShoukakuSocket } from 'shoukaku';
import { connect } from 'mongoose';
import CommandOptions from '../types';
import dotenv from 'dotenv';
import fs from 'fs';
import { Queue } from './../models/queue_schema';
import antispam from '../utils/antispam';

import stop from './../functions/stop';
import skip from './../functions/skip';
import shuffle from './../functions/shuffle';
import pause from './../functions/pause';
import loop from './../functions/loop';

dotenv.config();

class Bot extends Client {
    public token: string;
    public commands = new Collection<string, CommandOptions>();
    private initializedGuilds: string[] = [];
    private textChannelId = new Map();
    private prefix: string = process.env.PREFIX || '';
    private LavalinkServer = [{ name: 'shz-remote', host: '140.238.175.110', port: 2333, auth: 'youshallnotpass' }];
    private ShoukakuOptions = {
        moveOnDisconnect: false,
        resumable: false,
        resumableTimeout: 30,
        reconnectTries: 2,
        restTimeout: 10000,
    };
    public shoukaku = new Shoukaku(this, this.LavalinkServer, this.ShoukakuOptions);
    public node!: ShoukakuSocket;

    public constructor(options?: ClientOptions) {
        super(options);
        this.token = process.env.DISCORD_TOKEN || '';
    }
    isPlayerActive(guildId: string) {
        const player = this.shoukaku.getPlayer(guildId);
        if (player) {
            return true;
        } else {
            return false;
        }
    }
    getPlayer(guildId: string) {
        return this.shoukaku.getPlayer(guildId);
    }
    private _setupShoukakuEvents() {
        this.shoukaku.on('ready', name => {
            console.log(`Lavalink ${name}: Ready!`);
            this.node = this.shoukaku.getNode();
        });
        this.shoukaku.on('error', (name, error) => console.error(`Lavalink ${name}: Error Caught,`, error));
        this.shoukaku.on('close', (name, code, reason) =>
            console.warn(`Lavalink ${name}: Closed, Code ${code}, Reason ${reason || 'No reason'}`)
        );
        this.shoukaku.on('disconnected', (name, reason) =>
            console.warn(`Lavalink ${name}: Disconnected, Reason ${reason || 'No reason'}`)
        );
    }
    private async _dbConnect() {
        const db = process.env.DB_CONNECTION;
        if (!db) {
            throw 'chuju dawaj link do bazy';
        }
        await connect(db, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
            .then(() => {
                console.log('Database is connected');
            })
            .catch(err => {
                console.log(err);
            });
    }
    private _setupClientEvents() {
        this.on('ready', async () => {
            console.log('I am ready to pop');
            const commandFiles = fs.readdirSync(__dirname + '/../commands').filter(file => {
                if (file.endsWith('.js')) return file;
                if (file.endsWith('.ts')) return file;
            });
            for (const file of commandFiles) {
                const command = await import(`./../commands/${file}`);
                this.commands.set(command.name, command);
            }
        });
        this.on('messageReactionAdd', async (reaction, user) => {
            if (user.bot) return;
            if (!reaction.message.guild) return;
            const serverQueue = await Queue.findOne({
                guildId: reaction.message.guild.id,
            });
            if (!serverQueue) return;
            if (reaction.message.id != serverQueue.playerMessageId) return;
            if (reaction.emoji.name == '⏹️') {
                console.log('stop');
                stop(reaction.message.channel as TextChannel, user as User, this);
            } else if (reaction.emoji.name == '⏭️') {
                console.log('skip');
                skip(reaction.message.channel as TextChannel, user as User, this);
            } else if (reaction.emoji.name == '⏯️') {
                console.log('pause');
                pause(reaction.message.channel as TextChannel, user as User, this);
            } else if (reaction.emoji.name == '🔀') {
                console.log('shuffle');
                shuffle(reaction.message.channel as TextChannel, user as User);
            } else if (reaction.emoji.name == '🔄') {
                console.log('loop');
                loop(reaction.message.channel as TextChannel, user as User, this);
            }
            reaction.users.remove(user as User);
        });
        this.on('message', async (message: Message) => {
            if (!this.token) return;
            if (message.author.bot) return;
            if (!message.guild) return;

            if (!this.initializedGuilds.includes(message.guild.id)) {
                const serverQueue = await Queue.findOne({ guildId: message.guild.id });
                if (serverQueue) this.initializedGuilds.push(message.guild.id);
            }
            const [command, ...args] = message.content.slice(this.prefix.length).split(/ +/);
            console.log(this.initializedGuilds);
            if (!this.initializedGuilds.includes(message.guild.id)) {
                if (!this.commands.has(command)) return;
                if (command != 'init') {
                    return message.channel.send(`U have to use ${this.prefix}init first!`);
                }
                try {
                    this.commands.get(command)?.execute(message, args, this, this.node);
                } catch (error) {
                    console.error(error);
                    message.reply('there was an error trying to execute that command!');
                }
            } else {
                if (!this.textChannelId.has(message.guild.id)) {
                    const serverQueue = await Queue.findOne({
                        guildId: message.guild.id,
                    });
                    if (!serverQueue) return;
                    this.textChannelId.set(message.guild.id, {
                        textChannel: serverQueue.textChannelId,
                    });
                }
                const validTextChannel = this.textChannelId.get(message.guild.id);
                if (message.channel.id != validTextChannel.textChannel) {
                    return;
                }
                const usersMap: Map<string, any> = new Map();
                const limit = 7;
                const diff = 5000;
                const time = 1000;
                antispam(message, usersMap, time, diff, limit);
                if (message.content.startsWith(this.prefix) && !message.content.includes('bmp')) {
                    try {
                        await message.delete();
                        this.commands.get(command)?.execute(message, args, this, this.node);
                    } catch (error) {
                        return console.log(error);
                    }
                } else {
                    try {
                        this.commands.get('play')?.execute(message, args, this, this.node);
                    } catch (err) {
                        return;
                    }
                }
            }
        });
        this.on('guildCreate', (guild: Guild) => {
            const infoChannel: TextChannel = guild.channels.cache
                .filter(channel => channel.permissionsFor(this.user as User)?.has('SEND_MESSAGES') as boolean)
                .filter(channel => channel.type === 'text')
                .first() as TextChannel;
            const helloMessage = new MessageEmbed()
                .setTitle('Helvete notifier')
                .setDescription(
                    `Hello, I am here to play some good music but first, you need to type ${this.prefix}init`
                );
            infoChannel.send(helloMessage);
        });
    }

    public start(): Promise<string> {
        if (this.token == '') {
            throw new Error('token in not provided');
        }
        this._dbConnect();
        this._setupClientEvents();
        this._setupShoukakuEvents();
        return super.login();
    }
}
export default Bot;

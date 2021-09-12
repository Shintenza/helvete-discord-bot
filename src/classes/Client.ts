import {
    Client,
    ClientOptions,
    Collection,
    Message,
    TextChannel,
    User,
    MessageEmbed,
    Guild,
    VoiceState,
} from 'discord.js';
import { Shoukaku, ShoukakuSocket } from 'shoukaku';
import { connect } from 'mongoose';
import { BlockedUser, Command, UserCooldown } from '../types';
import dotenv from 'dotenv';
import fs from 'fs';
import { Queue, IQueue } from './../models/queue_schema';
import Player from './../models/player_schema';

import commandLauncher from '../utils/commandLauncher';
import autoUnblock from '../utils/autoUnblock';
import reactionHandler from '../utils/reactionHandler';

dotenv.config();

class Bot extends Client {
    public token: string;
    public commands = new Collection<string, Command>();
    public initializedGuilds: string[] = [];
    public textChannelId = new Map();
    private prefix: string = process.env.PREFIX || '';
    public cooldowns = new Collection<string, Map<string, UserCooldown>>();
    public blockedUsers: Array<BlockedUser> = [];
    private ShoukakuOptions = {
        moveOnDisconnect: false,
        resumable: false,
        resumableTimeout: 30,
        reconnectTries: 2,
        restTimeout: 10000,
    };
    public shoukaku!: Shoukaku;
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
    private _setupShoukaku() {
        const LAVALINK_HOST = process.env.LAVALINK_HOST;
        const LAVALINK_PORT = parseInt(process.env.LAVALINK_PORT!);
        const LAVALINK_PASS = process.env.LAVALINK_PASS;
        if (!LAVALINK_HOST || !LAVALINK_PORT || !LAVALINK_PASS) {
            throw 'Mising lavalink connection credentials';
        }

        const lavalinkServer = [{ name: 'shz-remote', host: LAVALINK_HOST, port: LAVALINK_PORT, auth: LAVALINK_PASS }];
        this.shoukaku = new Shoukaku(this, lavalinkServer, this.ShoukakuOptions);
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
            this.guilds.cache.forEach(async guild => {
                const serverQueue = await Queue.findOne({ guildId: guild.id });
                if (serverQueue) {
                    serverQueue.blockedUsers.map(blockedUser => {
                        this.blockedUsers.push(blockedUser);
                    });
                    if (serverQueue.textChannelId) {
                        this.initializedGuilds.push(serverQueue.guildId);
                    }
                }
            });
            await autoUnblock(this);
            this.setInterval(() => autoUnblock(this), 1000 * 60 * 10);
        });
        this.on('voiceStateUpdate', async (oldState: VoiceState, newState: VoiceState) => {
            if (oldState.channelID === null || typeof oldState.channelID == 'undefined') return;
            if (newState.id !== this.user?.id) return;
            if (!newState.channel) {
                await Queue.updateOne(
                    { guildId: newState.guild.id },
                    {
                        $unset: { voiceChannelId: 1 },
                        queue: [],
                    }
                );
                await Queue.findOne({ guildId: newState.guild.id }, async (err: Error, serverQueue: IQueue) => {
                    if (serverQueue) {
                        const textChannel: TextChannel | undefined = newState.guild.channels.cache.get(
                            serverQueue.textChannelId
                        ) as TextChannel;
                        if (!textChannel) return;
                        const playerEmbedMessage: Message | undefined = await textChannel.messages
                            .fetch(serverQueue.playerMessageId)
                            .catch(err => undefined);
                        if (!playerEmbedMessage) return;
                        playerEmbedMessage.edit(new Player());

                        const queueEmbedMessage = await textChannel.messages
                            .fetch(serverQueue.queueTextMessageId)
                            .catch(err => undefined);
                        if (!queueEmbedMessage) return;
                        try {
                            queueEmbedMessage.delete();
                        } catch (err) {
                            console.log(err);
                        }
                    }
                });
                const player = this.getPlayer(newState.guild.id);
                if (!player) return;
                player.disconnect();
                return;
            }
            const serverQueue = await Queue.findOne({ guildId: newState.guild.id });
            if (!serverQueue) return;
            const player = this.getPlayer(newState.guild.id);
            if (!player) return;

            // this part is crappy but works, that makes the music play again afterd the bot is moved
            setTimeout(async () => {
                await player.setPaused(true);
                setTimeout(async () => await player.setPaused(false), this.ws.ping * 4);
            }, this.ws.ping * 4);

            serverQueue.voiceChannelId = newState.channel.id;
            return await serverQueue.save();
        });

        this.on('messageReactionAdd', async (reaction, user) => {
            reactionHandler(this, reaction, user);
        });
        this.on('message', async (message: Message) => {
            if (!this.token) return;
            if (message.author.bot) return;
            if (!message.guild) return;

            const [cmd, ...args] = message.content.slice(this.prefix.length).split(/ +/);

            console.log(this.initializedGuilds);
            if (!this.initializedGuilds.includes(message.guild.id)) {
                if (!this.commands.has(cmd)) return;
                if (cmd != 'init') {
                    return message.channel.send(`U have to use ${this.prefix}init first!`);
                }
                console.log(`"init" command has been run on guild ${message.guild.id} - ${message.guild.name}`);
                const command = this.commands.get(cmd);
                if (!command) return;
                return commandLauncher(this, message, command, this.node, args);
            } else if (this.initializedGuilds.includes(message.guild.id) && cmd == 'init') {
                const serverQueue = await Queue.findOne({ guildId: message.guild.id });
                if (!serverQueue) return;
                const textChannelId = serverQueue.textChannelId;

                const doesChannelExist = message.guild.channels.cache.get(textChannelId);
                if (doesChannelExist) {
                    return message.reply('You cannot do this, my channel already exists!');
                } else {
                    const command = this.commands.get(cmd);
                    if (!command) return;
                    return commandLauncher(this, message, command, this.node, args, true);
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
                if (message.channel.id != validTextChannel.textChannel) return;
                const isBlocked = this.blockedUsers.filter(blockedUser => blockedUser.id === message.author.id);
                if (isBlocked.length >= 1) {
                    try {
                        message.delete();
                    } catch (err) {
                        console.log(err);
                    }
                    return;
                }
                if (message.content.startsWith(this.prefix)) {
                    const command = this.commands.get(cmd);
                    if (!command) return;
                    commandLauncher(this, message, command, this.node, args);
                } else {
                    const command = this.commands.get('play');
                    if (!command) return;
                    commandLauncher(this, message, command, this.node, args);
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
        this._setupShoukaku();
        return super.login();
    }
}
export default Bot;

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
    MessageReaction,
} from 'discord.js';
import { connect } from 'mongoose';
import { BlockedUser, Command, UserCooldown } from '../types';
import dotenv from 'dotenv';
import fs from 'fs';
import { Queue, IQueue } from './../models/queue_schema';
import Player from './../models/player_schema';
import { ConnectEvent, DisconnectEvent, Node } from 'lavaclient';

import commandLauncher from '../utils/commandLauncher';
import autoUnblock from '../utils/autoUnblock';
import reactionHandler from '../utils/reactionHandler';

dotenv.config();

class Bot extends Client {
    public token: string;
    public bannerUrl: string;
    private dbConnectionString: string;
    private lavalinkHost: string;
    private lavalinkPort: number;
    private lavalinkPass: string;

    public commands = new Collection<string, Command>();
    public initializedGuilds: string[] = [];
    public textChannelId = new Map();
    public prefix: string = process.env.PREFIX || '';
    public cooldowns = new Collection<string, Map<string, UserCooldown>>();
    public blockedUsers: Array<BlockedUser> = [];

    public lavalink!: Node;

    public constructor(options: ClientOptions) {
        super(options);
        const discordToken = process.env.DISCORD_TOKEN;
        const dbConnectionString = process.env.DB_CONNECTION;
        const bannerLink = process.env.BANNER_LINK;
        const prefix = process.env.PREFIX;
        const lavalinkHost = process.env.LAVALINK_HOST;
        const lavalinkPort = process.env.LAVALINK_PORT;
        const lavalinkPass = process.env.LAVALINK_PASS;

        if (
            !discordToken ||
            !dbConnectionString ||
            !bannerLink ||
            !prefix ||
            !lavalinkHost ||
            !lavalinkPort ||
            !lavalinkPass
        )
            throw 'Missing env vars. Check .env.example';
        this.token = discordToken;
        this.dbConnectionString = dbConnectionString;
        this.bannerUrl = bannerLink;
        this.prefix = prefix;
        this.lavalinkHost = lavalinkHost;
        this.lavalinkPort = parseInt(lavalinkPort);
        this.lavalinkPass = lavalinkPass;
    }
    isPlayerActive(guildId: string) {
        const player = this.lavalink.players.get(guildId);
        if (player) {
            return true;
        } else {
            return false;
        }
    }
    getPlayer(guildId: string) {
        return this.lavalink.players.get(guildId);
    }

    private async dbConnect() {
        await connect(this.dbConnectionString)
            .then(() => {
                console.log('>>>>>Database is connected');
            })
            .catch(err => {
                console.log(err);
            });
    }
    private setupLavalink() {
        this.lavalink = new Node({
            connection: { host: this.lavalinkHost, port: this.lavalinkPort, password: this.lavalinkPass },
            sendGatewayPayload: (id, payload) => this.guilds.cache.get(id)?.shard?.send(payload),
        });

        this.lavalink.connect(this.user!.id);

        this.ws.on('VOICE_SERVER_UPDATE', data => this.lavalink.handleVoiceUpdate(data));
        this.ws.on('VOICE_STATE_UPDATE', data => this.lavalink.handleVoiceUpdate(data));

        this.lavalink.on('connect', (node: ConnectEvent) => {
            console.log('>>>>>Lavalink connection established', node);
        });
        this.lavalink.on('disconnect', (res: DisconnectEvent) => {
            console.log('>>>>>Lavalink connection lost', res);
        });
        this.lavalink.on('error', (res: Error) => {
            console.log('>>>>>Lavalink error occured', res);
        });
    }
    private setupClientEvents() {
        this.on('ready', async () => {
            console.log(`>>>>>I'm ready to go ${this.user!.tag}`);
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
            this.setupLavalink();
            await autoUnblock(this);
            setInterval(() => autoUnblock(this), 1000 * 60 * 10);
        });
        this.on('voiceStateUpdate', async (oldState: VoiceState, newState: VoiceState): Promise<void> => {
            if (oldState.channelId === null || typeof oldState.channelId == 'undefined') return;
            if (newState.id !== this.user?.id) return;
            if (!newState.channel) {
                const serverQueue = await Queue.findOne({ guildId: newState.guild.id });
                if (!serverQueue) return;
                serverQueue.voiceChannelId = undefined;
                serverQueue.queue = [];
                await Queue.updateOne(
                    { guildId: newState.guild.id },
                    {
                        $unset: { voiceChannelId: 1 },
                        queue: [],
                    }
                );
                const textChannel: TextChannel | undefined = newState.guild.channels.cache.get(
                    serverQueue.textChannelId
                ) as TextChannel;
                if (!textChannel) return;
                const playerEmbedMessage: Message | undefined = await textChannel.messages
                    .fetch(serverQueue.playerMessageId)
                    .catch(err => undefined);
                if (!playerEmbedMessage) return;
                playerEmbedMessage.edit({ embeds: [new Player()] });

                const queueEmbedMessage = await textChannel.messages
                    .fetch(serverQueue.queueTextMessageId)
                    .catch(err => undefined);
                if (!queueEmbedMessage) return;
                try {
                    queueEmbedMessage.delete();
                } catch (err) {
                    console.log(err);
                }
                await serverQueue.save();
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
                await player.pause();
                setTimeout(async () => await player.resume(), this.ws.ping * 4);
            }, this.ws.ping * 4);

            serverQueue.voiceChannelId = newState.channel.id;
            await serverQueue.save();
            return;
        });

        this.on('messageReactionAdd', async (reaction, user) => {
            reactionHandler(this, reaction as MessageReaction, user);
        });
        this.on('messageCreate', async (message: Message): Promise<void> => {
            if (!this.token) return;
            if (message.author.bot) return;
            if (!message.guild) return;

            const [cmd, ...args] = message.content.slice(this.prefix.length).split(/ +/);

            if (!this.initializedGuilds.includes(message.guild.id)) {
                if (!this.commands.has(cmd)) return;
                if (cmd != 'init') {
                    message.channel.send(`U have to use ${this.prefix}init first!`);
                    return;
                }
                console.log(`[log] "init" command has been run on guild ${message.guild.id} - ${message.guild.name}`);

                const command = this.commands.get(cmd);
                if (!command) return;
                commandLauncher(this, message, command, args);
                return;
            } else if (this.initializedGuilds.includes(message.guild.id) && cmd == 'init') {
                const serverQueue = await Queue.findOne({ guildId: message.guild.id });
                if (!serverQueue) return;
                const textChannelId = serverQueue.textChannelId;

                const doesChannelExist = message.guild.channels.cache.get(textChannelId);
                if (doesChannelExist) {
                    message.reply('You cannot do this, my channel already exists!');
                    return;
                } else {
                    const command = this.commands.get(cmd);
                    if (!command) return;
                    commandLauncher(this, message, command, args, true);
                    return;
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
                    commandLauncher(this, message, command, args);
                } else {
                    const command = this.commands.get('play');
                    if (!command) return;
                    commandLauncher(this, message, command, args);
                }
            }
        });
        this.on('guildCreate', (guild: Guild) => {
            const infoChannel: TextChannel = guild.channels.cache
                .filter(channel => channel.permissionsFor(this.user as User)?.has('SEND_MESSAGES') as boolean)
                .filter(channel => channel.type === 'GUILD_TEXT')
                .first() as TextChannel;
            const helloMessage = new MessageEmbed()
                .setTitle('Helvete notifier')
                .setDescription(
                    `Hello, I am here to play some good music but first, you need to type ${this.prefix}init`
                );
            if (!infoChannel) return;
            try {
                infoChannel.send({ embeds: [helloMessage] });
            } catch (err) {
                console.log('missing permissions to send a hello message', err);
            }
        });
    }

    public start(): Promise<string> {
        this.dbConnect();
        this.setupClientEvents();
        return super.login();
    }
}
export default Bot;

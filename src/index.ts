import { Guild, Message, MessageEmbed, TextChannel, User, VoiceState } from 'discord.js';
import { Queue, IQueue } from './models/queue_schema';
import { connect } from 'mongoose';
import Client from './client/Client';
import * as fs from 'fs';
import stop from './functions/stop';
import skip from './functions/skip';
import shuffle from './functions/shuffle';
import pause from './functions/pause';
import Player from './models/player_schema';
import loop from './functions/loop';
import antispam from './functions/antispam';
import { Manager } from 'erela.js';
import updatePlayer from './functions/updatePlayer';
const client: Client = new Client({
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});
client.manager = new Manager({
    nodes: [
        {
            host: 'localhost', // Optional if Lavalink is local
            port: 2333, // Optional if Lavalink is set to default
        },
    ],
    send(id, payload) {
        const guild = client.guilds.cache.get(id);
        if (guild) guild.shard.send(payload);
    },
})
    .on('nodeConnect', node => console.log(`Node ${node.options.identifier} connected`))
    .on('nodeError', (node, error) => console.log(`Node ${node.options.identifier} had an error: ${error.message}`))
    .on('trackStart', async (player, track) => {
        if (!player.textChannel) return;
        const channel = client.channels.cache.get(player.textChannel) as TextChannel;
        if (!channel) return;
        const serverQueue = await Queue.findOne({ guildId: channel.guild.id });
        if (!serverQueue) return;
        console.log(track.title);
    })
    .on('trackEnd', async (player, track) => {
        console.log('track finished');
        if (!player.textChannel) return;
        const channel = client.channels.cache.get(player.textChannel) as TextChannel;
        if (!channel) return;
        const serverQueue = await Queue.findOne({ guildId: channel.guild.id });
        if (!serverQueue) return;
        if (!serverQueue.isLooped) {
            serverQueue.queue.shift();
            await serverQueue.save();
            await updatePlayer(client, serverQueue);
        }
    })
    .on('queueEnd', async player => {
        if (!player.textChannel) return;
        const channel = client.channels.cache.get(player.textChannel) as TextChannel;
        if (!channel) return;
        const serverQueue = await Queue.findOne({ guildId: channel.guild.id });
        if (!serverQueue) return;
        const guild = channel.guild;
        if (!guild) return;
        const textChannel: TextChannel | undefined = guild.channels.cache.get(serverQueue.textChannelId) as TextChannel;
        const playerEmbedMessage: Message | undefined = await textChannel.messages
            .fetch(serverQueue.playerMessageId)
            .catch(err => undefined);
        if (playerEmbedMessage) {
            playerEmbedMessage.edit(new Player());
        } // #todo if does not exist it should be created

        player.destroy();
    })
    .on('playerMove', (player, oldChannel, newChannel) => {
        if (!newChannel) player.destroy();
        player.voiceChannel = newChannel;
        console.log('magic code below');
        setTimeout(() => {
            player.pause(true);
            setTimeout(() => player.pause(false), client.ws.ping * 4);
        }, client.ws.ping * 4);
    });

const db = process.env.DB_CONNECTION;
let dbConnected = false;
if (!db) {
    throw 'chuju dawaj link do bazy';
}
const prefix = process.env.PREFIX;
if (!prefix) throw 'You have to set up the token in env file!';

connect(db, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('Database is connected');
        dbConnected = true;
    })
    .catch(err => {
        console.log(err);
    });

client.on('ready', async () => {
    console.log('I am ready to pop');
    client.manager.init(client.user?.id);
    const commandFiles = fs.readdirSync(__dirname + '/commands').filter(file => {
        if (file.endsWith('.js')) return file;
        if (file.endsWith('.ts')) return file;
    });
    for (const file of commandFiles) {
        const command = await import(`./commands/${file}`);
        client.commands.set(command.name, command);
    }
});
client.on('raw', d => client.manager.updateVoiceState(d));
client.on('guildCreate', (guild: Guild) => {
    if (!dbConnected) return;
    const infoChannel: TextChannel = guild.channels.cache
        .filter(channel => channel.permissionsFor(client.user as User)?.has('SEND_MESSAGES') as boolean)
        .filter(channel => channel.type === 'text')
        .first() as TextChannel;
    const helloMessage = new MessageEmbed()
        .setTitle('Helvete notifier')
        .setDescription(`Hello, I am here to play some good music but first, you need to type ${prefix}init`);
    infoChannel.send(helloMessage);
});

// updates bot's voiceChannelId inside database
client.on('voiceStateUpdate', async (oldState: VoiceState, newState: VoiceState) => {
    if (oldState.channelID === null || typeof oldState.channelID == 'undefined') return;
    if (newState.id !== client.user?.id) return;
    if (oldState.channelID === newState.channelID) {
        const player = client.manager.players.get(newState.guild.id);
        if (!player) return;
        setTimeout(() => {
            player.pause(true);
            setTimeout(() => player.pause(false), client.ws.ping * 4);
        }, client.ws.ping * 4);
    }

    if (!newState.channel) {
        await Queue.updateOne(
            { guildId: newState.guild.id },
            {
                //@ts-ignore
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
                queueEmbedMessage.delete();
            }
        });
        return;
    }

    const serverQueue = await Queue.findOne({ guildId: newState.guild.id });
    if (!serverQueue) return;
    const player = client.manager.players.get(newState.guild.id);
    if (!player) return;
    // when the bot is moved lines below update his voice channel inside databae

    serverQueue.voiceChannelId = newState.channel.id;
    // player.setVoiceChannel(newState.channel.id);
    return await serverQueue.save();
});
const initializedGuilds: string[] = [];
let textChannelId = new Map();
client.on('message', async (message: Message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    if (!initializedGuilds.includes(message.guild.id)) {
        const serverQueue = await Queue.findOne({ guildId: message.guild.id });
        if (serverQueue) initializedGuilds.push(message.guild.id);
    }
    const [command, ...args] = message.content.slice(prefix.length).split(/ +/);
    console.log(initializedGuilds);
    if (!initializedGuilds.includes(message.guild.id)) {
        if (!client.commands.has(command)) return;
        if (command != 'init') {
            return message.channel.send(`U have to use ${prefix}init first!`);
        }
        try {
            client.commands.get(command)?.execute(message, args, client);
        } catch (error) {
            console.error(error);
            message.reply('there was an error trying to execute that command!');
        }
    } else {
        if (!textChannelId.has(message.guild.id)) {
            const serverQueue = await Queue.findOne({
                guildId: message.guild.id,
            });
            if (!serverQueue) return;
            textChannelId.set(message.guild.id, {
                textChannel: serverQueue.textChannelId,
            });
        }
        const validTextChannel = textChannelId.get(message.guild.id);
        if (message.channel.id != validTextChannel.textChannel) {
            return;
        }
        const usersMap: Map<string, any> = new Map();
        const limit = 7;
        const diff = 5000;
        const time = 1000;
        antispam(message, usersMap, time, diff, limit);
        if (message.content.startsWith(prefix) && !message.content.includes('bmp')) {
            try {
                await message.delete();
                client.commands.get(command)?.execute(message, args, client);
            } catch (error) {
                return console.log(error);
            }
        } else {
            try {
                client.commands.get('play')?.execute(message, args, client);
            } catch (err) {
                return;
            }
        }
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    if (!reaction.message.guild) return;
    const serverQueue = await Queue.findOne({
        guildId: reaction.message.guild.id,
    });
    if (!serverQueue) return;
    if (reaction.message.id != serverQueue.playerMessageId) return;
    if (reaction.emoji.name == '⏹️') {
        console.log('stop');
        stop(reaction.message.channel as TextChannel, user as User);
    } else if (reaction.emoji.name == '⏭️') {
        console.log('skip');
        skip(reaction.message.channel as TextChannel, user as User, client);
    } else if (reaction.emoji.name == '⏯️') {
        console.log('pause');
        pause(reaction.message.channel as TextChannel, user as User, client);
    } else if (reaction.emoji.name == '🔀') {
        console.log('shuffle');
        shuffle(reaction.message.channel as TextChannel, user as User);
    } else if (reaction.emoji.name == '🔄') {
        console.log('loop');
        loop(reaction.message.channel as TextChannel, user as User, client);
    }
    reaction.users.remove(user as User);
});

client.start();

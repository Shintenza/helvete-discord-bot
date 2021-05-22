import {
    Message,
    StreamDispatcher,
    VoiceConnection,
    TextChannel,
    User,
    MessageEmbed,
    GuildMember,
    Client,
} from 'discord.js';
import Player from '../models/player_schema';
import ytdl = require('ytdl-core');
import ytsr = require('ytsr');
import ytpl = require('ytpl');
import CommandOptions from '../types';
import { Queue, IQueue } from './../models/queue_schema';
import updateQueueMesg from '../functions/updateQueueMsg';
import Song from '../models/song_schema';
const bannerLink = process.env.BANNER_LINK;
if(!bannerLink) throw "u have to change the banner env"
const initPlay: CommandOptions = {
    name: 'play',
    execute: async (message: Message, args, client) => {
        if (!message.guild) return;
        await message.delete();
        const serverQueue: IQueue | null = await Queue.findOne({
            guildId: message.guild!.id,
        });
        // general checking
        
        if (!serverQueue) return;
        if (message.channel.id !== serverQueue.textChannelId) return;

        if (!message.member?.voice.channel)
            return await message.channel
                .send('You have to join a voice channel in order to do this')
                .then(msg => setTimeout(() => msg.delete(), 4000));

        const voiceChannel = message.member.voice.channel;
        const permissions = voiceChannel.permissionsFor(
            message.client.user as User
        );
        if (!permissions!.has('CONNECT') || !permissions!.has('SPEAK')) {
            const errEmbed: MessageEmbed = new MessageEmbed().setDescription(
                'I need the permissions to join and speak in your voice channel!'
            );
            return await message.channel
                .send(errEmbed)
                .then(msg => setTimeout(() => msg.delete(), 4000));
        }
        if (serverQueue.voiceChannelId) {
            if (
                message.member.voice.channel.id !== serverQueue.voiceChannelId
            ) {
                await message.delete();
                return await message.channel
                    .send('You have to be in the same voice channel')
                    .then(msg => setTimeout(() => msg.delete(), 4000));
            }
        }
        if(!serverQueue.bannerMessageId) {
            const textChannel: TextChannel | undefined = message.guild.channels.cache.get(
                serverQueue.textChannelId
            ) as TextChannel;
            if(!textChannel) return;
            const playerEmbedMessage = await textChannel.messages.fetch(serverQueue.playerMessageId)
                .catch(err=>undefined);
            const queueEmbedMessage = await textChannel.messages.fetch(serverQueue.queueTextMessageId)
                .catch(err=>undefined);
            if(playerEmbedMessage && queueEmbedMessage) {
                serverQueue.set(' playerMessageId ', undefined);
                serverQueue.set(' queueTextMessage ', undefined);
                await playerEmbedMessage.delete()
                await queueEmbedMessage.delete()
                await textChannel.send(bannerLink)
                    .then(msg=>serverQueue.bannerMessageId=msg.id);
            }
        }

        //code's below purpose is to decide what user want to do (search a song, play a playlist etc.)
        let toPlay: string = '';
        let playListSongs: Array<Song> = [];
        if (message.content.includes('list')) {
            const playlist = await ytpl(message.content.split(' ')[0]).catch(
                err => undefined
            );
            if (!playlist) {
                return await message.channel
                    .send('Playlist not found')
                    .then(msg => setTimeout(() => msg.delete(), 4000));
            }
            playlist.items.map((element: any) => {
                playListSongs.push({
                    title: element.title,
                    url: element.url,
                    thumbnailUrl: element.bestThumbnail.url,
                    duration: parseInt(element.durationSec) * 1000,
                    author: element.author,
                    requestedBy: message.author.id,
                });
            });
        } else if (message.content.includes('https://')) {
            toPlay = message.content.split(' ')[0];
        } else {
            const search = await ytsr(message.content, { limit: 2 }).catch(
                err => undefined
            );
            if (!search) {
                return message.channel
                    .send('I have found nothing')
                    .then(msg => setTimeout(() => msg.delete(), 4000));
            }
            //@ts-ignore
            toPlay = search.items[0].url;
        }
        let ytdlInfo: ytdl.videoInfo | undefined;
        if (playListSongs.length < 1) {
            ytdlInfo = await ytdl.getInfo(toPlay).catch(err => undefined);
            if (!ytdlInfo)
                return await message.channel
                    .send("I haven't found that song")
                    .then(msg => setTimeout(() => msg.delete(), 4000));
            const song: Song = {
                title: ytdlInfo.videoDetails.title,
                url: ytdlInfo.videoDetails.video_url,
                thumbnailUrl:
                    ytdlInfo.videoDetails.thumbnails[
                        ytdlInfo.videoDetails.thumbnails.length - 1
                    ].url,
                duration: parseInt(ytdlInfo.videoDetails.lengthSeconds) * 1000,
                author: ytdlInfo.videoDetails.author,
                requestedBy: message.author.id,
            };
            serverQueue.queue.push(song);
        } else {
            ytdlInfo = await ytdl.getInfo(playListSongs[0].url);
            serverQueue.queue.push(...playListSongs);
            message.channel
                .send('Queue has been updated with the given playlist')
                .then(msg => setTimeout(() => msg.delete(), 4000));
        }
        const guildId = message.guild.id;
        if (serverQueue.queue.length > 1)
            await updateQueueMesg(message.channel as TextChannel, serverQueue);
        serverQueue.voiceChannelId = voiceChannel.id;
        await serverQueue.save();
        const connection: VoiceConnection = await voiceChannel.join();
        if (!connection.dispatcher) {
            play(guildId, client);
        }
    },
};
export = initPlay;

const play = async (
    guildId: string,
    client: Client,
    previousSong?: Song
): Promise<void> => {
    const serverQueue: IQueue | null = await Queue.findOne({
        guildId: guildId,
    });
    if (!serverQueue) return;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return console.log('guild not found');
    const textChannel: TextChannel | undefined = guild.channels.cache.get(
        serverQueue.textChannelId
    ) as TextChannel;

    const playerEmbedMessage: Message | undefined = await textChannel.messages
        .fetch(serverQueue.playerMessageId)
        .catch(err => undefined);
    const voiceConnection = guild.me!.voice;
    const bannerMessage = await textChannel.messages.fetch(serverQueue.bannerMessageId)
        .catch(err => undefined);
    if(!bannerMessage) {
        await textChannel
            .send(bannerLink)
            .then(msg => (serverQueue.bannerMessageId = msg.id));
        const queueEmbedMessage = await textChannel.messages
            .fetch(serverQueue.queueTextMessageId)
            .catch(err => undefined);
        const playerEmbedMessage = await textChannel.messages
            .fetch(serverQueue.playerMessageId)
            .catch(err => undefined);
        if (playerEmbedMessage && queueEmbedMessage) {
            serverQueue.set('playerMessageId', undefined);
            serverQueue.set('queueTextMessage', undefined);
            await queueEmbedMessage.delete()
            await playerEmbedMessage.delete()
        }
        await textChannel
            .send(new Player())
            .then(msg => (serverQueue.playerMessageId = msg.id));
        await serverQueue.save();
        return play(guildId, client);
    }
    //if playerEmbedMessage is deleted, this if brings it back
    if (!playerEmbedMessage) {
        await textChannel
            .send(new Player())
            .then(msg => (serverQueue.playerMessageId = msg.id));
        const queueEmbedMessage = await textChannel.messages
            .fetch(serverQueue.queueTextMessageId)
            .catch(err => undefined);
        if(queueEmbedMessage){
            await queueEmbedMessage.delete()
        }
        await serverQueue.save();
        return play(guildId, client);
    }
    // looping
    if (serverQueue.isLooped && previousSong) {
        serverQueue.queue.unshift(previousSong);
        await serverQueue.save();
    }
    //deletes queueEmbedMessage when queue is empty
    if (serverQueue.queue.length === 0) {
        voiceConnection.channel!.leave();
        playerEmbedMessage.edit(new Player());
        return;
    }
    //updates queue
    if (serverQueue.queue.length >= 1) {
        await updateQueueMesg(textChannel as TextChannel, serverQueue);
        await serverQueue.save();
    }
    //fetches user that requested a song
    if (!serverQueue.queue[0].requestedBy) {
        return;
    }
    const member: GuildMember | undefined = await guild.members.fetch(
        serverQueue.queue[0].requestedBy
    );
    if (!member) {
        return;
    }
    //sets player embed
    const playerEmbed: Player = new Player()
        .setImage(serverQueue.queue[0].thumbnailUrl)
        .setTitle(serverQueue.queue[0].title)
        .setDescription(`Uploaded by ${serverQueue.queue[0].author.name}`)
        .setFooter(
            `Requested by ${member.user.tag}`,
            `${member.user.displayAvatarURL()}`
        );
    playerEmbedMessage.edit(playerEmbed);
    playerEmbedMessage.react('⏯️');
    playerEmbedMessage.react('⏹️');
    playerEmbedMessage.react('⏭️');
    playerEmbedMessage.react('🔀');
    playerEmbedMessage.react('🔄');
    //plays a song

    let lastSong: Song = serverQueue.queue[0];
    const dispatcher: StreamDispatcher | undefined = voiceConnection.connection
        ?.play(ytdl(serverQueue.queue[0].url, { filter: 'audioonly' }))
        .on('finish', async () => {
            //@ts-ignore
            await Queue.updateOne(
                { guildId: guildId },
                { $pop: { queue: -1 } }
            );
            play(guildId, client, lastSong);
        });
    if (!dispatcher) return;
    dispatcher.setVolume(serverQueue.volume);
};

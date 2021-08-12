import { Message, StreamDispatcher, VoiceConnection, TextChannel, User, MessageEmbed, GuildMember } from 'discord.js';

import Client from '../classes/Client';
import CommandOptions from '../types';
import { Queue, IQueue } from './../models/queue_schema';
import updateQueueMesg from '../functions/updateQueueMsg';
import Track from '../models/track_schema';
import Song from '../models/song_schema';
import updatePlayer from '../functions/updatePlayer';
import { ShoukakuPlayer, ShoukakuSocket, ShoukakuTrack } from 'shoukaku';
const bannerLink = process.env.BANNER_LINK;
if (!bannerLink) throw 'u have to change the banner env';

const initPlay: CommandOptions = {
    name: 'play',
    execute: async (message, args, client, node: ShoukakuSocket) => {
        if (!message.guild) return;
        try {
            await message.delete();
        } catch (err) {
            console.log(err);
        }

        const serverQueue: IQueue | null = await Queue.findOne({
            guildId: message.guild!.id,
        });

        const prefix = process.env.PREFIX; //requires refactoring

        // general checking

        if (!serverQueue) return;
        if (message.channel.id !== serverQueue.textChannelId) return;

        const initialServerQueueLength = serverQueue.queue.length;

        if (!message.member?.voice.channel)
            return await message.channel
                .send('You have to join a voice channel in order to do this')
                .then(msg => setTimeout(() => msg.delete(), 4000));

        const voiceChannel = message.member.voice.channel;
        const permissions = voiceChannel.permissionsFor(message.client.user as User);
        if (!permissions!.has('CONNECT') || !permissions!.has('SPEAK')) {
            const errEmbed: MessageEmbed = new MessageEmbed().setDescription(
                'I need the permissions to join and speak in your voice channel!'
            );
            return await message.channel.send(errEmbed).then(msg => setTimeout(() => msg.delete(), 4000));
        }
        if (serverQueue.voiceChannelId && message.guild.me?.voice.channel) {
            if (message.member.voice.channel.id !== serverQueue.voiceChannelId) {
                return await message.channel
                    .send('You have to be in the same voice channel')
                    .then(msg => setTimeout(() => msg.delete(), 4000));
            }
        }
        if (!serverQueue.bannerMessageId) {
            const textChannel: TextChannel | undefined = message.guild.channels.cache.get(
                serverQueue.textChannelId
            ) as TextChannel;
            if (!textChannel) return;
            const playerEmbedMessage = await textChannel.messages
                .fetch(serverQueue.playerMessageId)
                .catch(err => undefined);
            const queueEmbedMessage = await textChannel.messages
                .fetch(serverQueue.queueTextMessageId)
                .catch(err => undefined);
            if (playerEmbedMessage && queueEmbedMessage) {
                serverQueue.set(' playerMessageId ', undefined);
                serverQueue.set(' queueTextMessage ', undefined);
                try {
                    await playerEmbedMessage.delete();
                    await queueEmbedMessage.delete();
                } catch (err) {
                    console.log(err);
                }

                await textChannel.send(bannerLink).then(msg => (serverQueue.bannerMessageId = msg.id));
            }
        }

        // player.on('end', async () => {

        // });
        //code's below purpose is to decide what user want to do (search a song, play a playlist etc.)
        let musicToPlay: Array<Song> = [];
        if (message.content.includes('penis') || message.content.split(' ')[0] == `${prefix}bmp`) {
        } else if (message.content.includes('https://www.chuj.com')) {
            // toPlay = message.content.split(' ')[0];
        } else {
            let data = await node.rest.resolve(message.content, 'youtube');
            if (!data) return;
            const resolvedTrack: any = data.tracks.shift();
            const song: Song = {
                author: resolvedTrack.info.author,
                duration: resolvedTrack.info.length,
                uri: resolvedTrack.info.uri,
                title: resolvedTrack.info.title,
                requester: message.author.id,
                thumbnail: `http://i3.ytimg.com/vi/${resolvedTrack.info.identifier}/maxresdefault.jpg`,
                track: resolvedTrack.track,
            };
            serverQueue.queue.push(song);
        }

        const guildId = message.guild.id;
        if (serverQueue.queue.length > 1) await updateQueueMesg(message.channel as TextChannel, serverQueue);
        serverQueue.voiceChannelId = voiceChannel.id;
        await serverQueue.save();
        if (!client.isPlayerActive(message.guild.id)) {
            const player = await node.joinVoiceChannel({
                guildID: message.guild.id,
                voiceChannelID: voiceChannel.id,
            });
            player.on('error', error => {
                console.error(error);
                player.disconnect();
            });
            player.on('end', async () => {
                const dbQueue = await Queue.findOne({ guildId: guildId });
                if (!dbQueue) return;
                const nowPlaying = dbQueue.queue[0];
                dbQueue.queue.shift();
                await dbQueue.save();
                play(player, guildId, client, nowPlaying);
            });
            play(player, message.guild.id, client);
        }
    },
};
export = initPlay;

const play = async (player: ShoukakuPlayer, guildId: string, client: Client, previousSong?: Song): Promise<any> => {
    const serverQueue: IQueue | null = await Queue.findOne({
        guildId: guildId,
    });

    if (!serverQueue) return;
    if (serverQueue.isLooped && previousSong) {
        serverQueue.queue.unshift(previousSong);
        await serverQueue.save();
    }
    updatePlayer(client, serverQueue, player);
    if (serverQueue.queue.length === 0) {
        player.disconnect();
        return;
    }
    await player.playTrack(serverQueue.queue[0].track);
};

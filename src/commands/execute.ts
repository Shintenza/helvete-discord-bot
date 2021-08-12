import { Message, StreamDispatcher, VoiceConnection, TextChannel, User, MessageEmbed, GuildMember } from 'discord.js';

import Client from '../classes/Client';
import CommandOptions from '../types';
import { Queue, IQueue } from './../models/queue_schema';
import updateQueueMesg from '../utils/updateQueueMsg';
import Track from '../models/track_schema';
import Song from '../models/song_schema';
import updatePlayer from '../utils/updatePlayer';
import { ShoukakuPlayer, ShoukakuSocket, ShoukakuTrack } from 'shoukaku';
import { getPreview } from 'spotify-url-info';
import updateQueue from '../utils/updateQueue';
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
        if (message.content.includes('list')) {
            const data = await node.rest.resolve(message.content.split(' ')[0]);
            if (!data) return;
            data.tracks.map((resolvedTrack: any) => {
                updateQueue(message, resolvedTrack, serverQueue);
            });
        } else if (message.content.includes('open.spotify.com/track')) {
            const spotifyTrack = await getPreview(message.content.split(' ')[0]).catch(_err => undefined);
            if (!spotifyTrack) {
                return message.channel
                    .send('Spotify song not found')
                    .then(msg => msg.delete({ timeout: 4000 }))
                    .catch(err => console.log(err));
            }
            const searchString = `${spotifyTrack.title} ${spotifyTrack.artist}`;
            const data = await node.rest.resolve(searchString, 'youtube');
            if (!data) return;
            const resolvedTrack: any = data.tracks.shift();
            updateQueue(message, resolvedTrack, serverQueue);
        } else {
            const data = await node.rest.resolve(message.content, 'youtube');
            if (!data) return;
            const resolvedTrack: any = data.tracks.shift();
            updateQueue(message, resolvedTrack, serverQueue);
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

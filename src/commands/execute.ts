import { TextChannel, User, MessageEmbed } from 'discord.js';
import { Command } from './../types';
import { Queue, IQueue } from './../models/queue_schema';
import updateQueueMesg from '../utils/updateQueueMsg';
import { ShoukakuSocket } from 'shoukaku';
import { getPreview, getTracks } from 'spotify-url-info';
import updateQueue from '../utils/updateQueue';
import play from './../utils/play';
import setPlayerEvents from '../utils/setPlayerEvents';

const initPlay: Command = {
    name: 'play',
    cooldown: 5,
    execute: async (message, args, client, node: ShoukakuSocket) => {
        if (!message.guild) return;

        const serverQueue: IQueue | null = await Queue.findOne({
            guildId: message.guild!.id,
        });

        if (!serverQueue) return;
        if (message.channel.id !== serverQueue.textChannelId) return;

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

                await textChannel.send(client.bannerUrl).then(msg => (serverQueue.bannerMessageId = msg.id));
            }
        }
        if (message.content.includes('list')) {
            const data = await node.rest.resolve(message.content.split(' ')[0]);
            if (!data) return;
            data.tracks.map((resolvedTrack: any) => {
                updateQueue(message, resolvedTrack, serverQueue);
            });
        } else if (message.content.includes('open.spotify.com/album')) {
            const spotifyTracks = await getTracks(message.content.split(' ')[0]).catch(_err => undefined);
            if (!spotifyTracks) {
                return message.channel
                    .send('Spotify album/playlist not found')
                    .then(msg => msg.delete({ timeout: 4000 }))
                    .catch(err => console.log(err));
            }
            spotifyTracks.map(track => {
                const songToResolve = {
                    title: track.name,
                    author: track.artists ? track.artists[0].name : '',
                    duration: track.duration_ms,
                    requester: message.author.id,
                    resolved: false,
                };
                serverQueue.queue.push(songToResolve);
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
            setPlayerEvents(player, message.guild.id, client, node);
            play(player, message.guild.id, client, node);
        }
    },
};
export = initPlay;

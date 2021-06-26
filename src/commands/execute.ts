import { Message, StreamDispatcher, VoiceConnection, TextChannel, User, MessageEmbed, GuildMember } from 'discord.js';

import Client from './../client/Client';
import CommandOptions from '../types';
import { Queue, IQueue } from './../models/queue_schema';
import updateQueueMesg from '../functions/updateQueueMsg';
import Track from '../models/track_schema';
import Song from '../models/song_schema';
import updatePlayer from '../functions/updatePlayer';
const bannerLink = process.env.BANNER_LINK;
if (!bannerLink) throw 'u have to change the banner env';
const initPlay: CommandOptions = {
    name: 'play',
    execute: async (message, args, client) => {
        if (!message.guild) return;
        await message.delete();
        const serverQueue: IQueue | null = await Queue.findOne({
            guildId: message.guild!.id,
        });
        const prefix = process.env.PREFIX;
        // general checking

        if (!serverQueue) return;
        const initialServerQueueLength = serverQueue.queue.length;
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
                await playerEmbedMessage.delete();
                await queueEmbedMessage.delete();
                await textChannel.send(bannerLink).then(msg => (serverQueue.bannerMessageId = msg.id));
            }
        }
        const player = client.manager.create({
            guild: message.guild.id,
            voiceChannel: message.member.voice.channel.id,
            textChannel: message.channel.id,
        });

        //code's below purpose is to decide what user want to do (search a song, play a playlist etc.)
        let musicToPlay = [];
        if (message.content.includes('list=') || message.content.split(' ')[0] == `${prefix}bmp`) {
            let songs: Array<Song> = [];
            const searchResult = await client.manager
                .search(message.content.split(' ')[0])
                .catch((err: Error) => undefined);
            if (searchResult.tracks) {
                searchResult.tracks.map((song: Track) => {
                    console.log(song.displayThumbnail);
                    songs.push({
                        title: song.title,
                        author: song.author,
                        duration: song.duration,
                        uri: song.uri,
                        thumbnail: song.displayThumbnail('hqdefault'),
                        requester: message.author.id,
                    });
                });
            }
            if (!songs) {
                return await message.channel.send('Playlist not found').then(msg => msg.delete({ timeout: 4000 }));
            }

            serverQueue.queue.push(...songs);
            message.channel
                .send('Queue has been updated with the given playlist')
                .then(msg => msg.delete({ timeout: 4000 }));
            musicToPlay.push(...searchResult.tracks);
        } else if (message.content.includes('https://www.chuj.com')) {
            // toPlay = message.content.split(' ')[0];
        } else {
            const search = await client.manager.search(message.content);
            if (!search) {
                return message.channel.send('I have found nothing').then(msg => msg.delete({ timeout: 4000 }));
            }
            const foundSong: Track = search.tracks[0];
            serverQueue.queue.push({
                title: foundSong.title,
                author: foundSong.author,
                duration: foundSong.duration,
                uri: foundSong.uri,
                thumbnail: foundSong.displayThumbnail('hqdefault'),
                requester: message.author.id,
            });
            musicToPlay.push(foundSong);
        }

        const guildId = message.guild.id;
        if (serverQueue.queue.length > 1) await updateQueueMesg(message.channel as TextChannel, serverQueue);
        serverQueue.voiceChannelId = voiceChannel.id;
        await serverQueue.save();
        player.queue.add(musicToPlay);

        if (!player.playing) {
            if (serverQueue.queue && initialServerQueueLength >= 1) {
                const dbSongs = [];
                player.queue.clear();
                const currentSong = player.queue.current;
                for (let i = 0; i < initialServerQueueLength; i++) {
                    const searchString: string = `${serverQueue.queue[i].title} ${serverQueue.queue[i].author}`;
                    const search = await client.manager.search(searchString);
                    if (search) {
                        if (i === 0) {
                            player.queue.current = search.tracks[0];
                        } else {
                            dbSongs.push(search.tracks[0]);
                        }
                    }
                }
                dbSongs.push(currentSong);
                musicToPlay.shift();
                player.queue.add(dbSongs.concat(musicToPlay));
            }
            player.connect();
            play(player, guildId, client);
        }
    },
};
export = initPlay;

const play = async (player: any, guildId: string, client: Client): Promise<void> => {
    const serverQueue: IQueue | null = await Queue.findOne({
        guildId: guildId,
    });
    if (!serverQueue) return;
    updatePlayer(client, serverQueue);

    if (!player.playing && !player.paused) {
        player.play();
    }
};

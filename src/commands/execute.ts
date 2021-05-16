import {
    Message,
    StreamDispatcher,
    VoiceConnection,
    TextChannel,
    User,
    MessageEmbed,
} from 'discord.js';
import Player from '../models/player_schema';
import ytdl = require('ytdl-core');
import CommandOptions from '../types';
import { Queue, IQueue } from './../models/queue_schema';
const initPlay: CommandOptions = {
    name: 'play',
    execute: async (message: Message) => {
        const queue: IQueue | null = await Queue.findOne({
            guildId: message.guild!.id,
        });

        if (!queue) return message.channel.send('nie znaleziono serwera');
        if (message.channel.id !== queue.textChannelId) return;

        if (!message.member?.voice.channel)
            return message.channel.send('You have to join a voice channel in order to do this');

        const voiceChannel = message.member.voice.channel;
        const permissions = voiceChannel.permissionsFor(
            message.client.user as User
        );
        if (!permissions!.has('CONNECT') || !permissions!.has('SPEAK')) {
            const errEmbed: MessageEmbed = new MessageEmbed().setDescription(
                'I need the permissions to join and speak in your voice channel!'
            );
            return message.channel.send(errEmbed);
        }
        // if(queue){
        //     if(message.member.voice.channel.id !== queue.voiceChannelId){
        //         return message.channel.send("You have to be in the same voice channel")
        //     }
        // }

        message.delete();
        const ytdlInfo = await ytdl.getInfo(message.content);
        const song = {
            title: ytdlInfo.videoDetails.title,
            url: ytdlInfo.videoDetails.video_url,
            thumbnail: ytdlInfo.videoDetails.thumbnails,
            duration: ytdlInfo.videoDetails.lengthSeconds,
            author: ytdlInfo.videoDetails.author,
            requestedBy: message.author.id,
        };
        queue.queue.push(song);
        await queue.save();
        const connection: VoiceConnection = await voiceChannel.join();
        if(!connection.dispatcher){
            console.log("before running play")
            play(message);
        }
        
    },
};
export = initPlay;

const play = async (message: Message) => {
    const serverQueue: IQueue | null = await Queue.findOne({
        guildId: message.guild!.id,
    });
    if (!serverQueue) return;
    const textChannel: TextChannel | undefined =
    message.guild!.channels.cache.get(
        serverQueue.textChannelId
    ) as TextChannel;
    const playerEmbedMessage = await textChannel.messages.fetch(
        serverQueue.playerMessageId
    );
    const voiceConnection = message.guild!.me!.voice;

    if (serverQueue.queue.length === 0) {
        voiceConnection.channel!.leave();
        playerEmbedMessage.edit(new Player());        
        return;
    }

    const playerEmbed = new Player()
    .setImage(serverQueue.queue[0].thumbnail[serverQueue.queue[0].thumbnail.length - 1].url)
    .setTitle(serverQueue.queue[0].title)
    .setDescription(`Uploaded by ${serverQueue.queue[0].author.name}`)
    .setFooter(`Requested by ${serverQueue.queue[0].requestedBy}`);
    playerEmbedMessage.edit(playerEmbed);
    console.log("before dispatcher")
    const dispatcher = voiceConnection.connection
        ?.play(ytdl(serverQueue.queue[0].url, { filter: 'audioonly' }))
        .on('finish', async () => {
            //@ts-ignore
            await Queue.updateOne({ guildId: message.guild!.id }, { $pop: { queue:-1 }});
            play(message)
        });
};


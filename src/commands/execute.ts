import {
    Message,
    StreamDispatcher,
    VoiceConnection,
    TextChannel,
    User,
    MessageEmbed,
    GuildMember,
} from 'discord.js';
import Player from '../models/player_schema';
import ytdl = require('ytdl-core');
import ytsr = require('ytsr');
import CommandOptions from '../types';
import { Queue, IQueue } from './../models/queue_schema';
import updateQueueMesg from '../functions/updateQueueMsg';
import Song from '../models/song_schema';

const initPlay: CommandOptions = {
    name: 'play',
    execute: async (message: Message) => {
        const queue: IQueue | null = await Queue.findOne({
            guildId: message.guild!.id,
        });
        // general checking
        if (!queue) return message.channel.send('nie znaleziono serwera');
        if (message.channel.id !== queue.textChannelId) return;

        if (!message.member?.voice.channel)
            return await message.channel.send('You have to join a voice channel in order to do this').then((msg)=> setTimeout(()=>msg.delete(),4000));

        const voiceChannel = message.member.voice.channel;
        const permissions = voiceChannel.permissionsFor(
            message.client.user as User
        );
        if (!permissions!.has('CONNECT') || !permissions!.has('SPEAK')) {
            const errEmbed: MessageEmbed = new MessageEmbed().setDescription(
                'I need the permissions to join and speak in your voice channel!'
            );
            return await message.channel.send(errEmbed).then((msg)=> setTimeout(()=>msg.delete(),4000));
        }
        if(queue.voiceChannelId){
            if(message.member.voice.channel.id !== queue.voiceChannelId){
                message.delete()
                return await message.channel.send("You have to be in the same voice channel").then((msg)=> setTimeout(()=>msg.delete(),4000))
            }
        }
        message.delete();

        //code's below purpose is to decide what user want to do (search a song, play a playlist etc.)
        let toPlay:string ="";
        if(message.content.includes('https://')){
            toPlay = message.content.split(" ")[0]
        } else{
            const search = await ytsr(message.content, {limit: 2})
            if(!search.items[0]){
                return message.channel.send("I have found nothing").then((msg)=> setTimeout(()=>msg.delete(),4000));
            }
            //@ts-ignore
            toPlay = search.items[0].url;
        }
        try {
            var ytdlInfo = await ytdl.getInfo(toPlay)
            
        } catch {
            return await message.channel.send("nie znaleziono tego filmu").then((msg)=> setTimeout(()=>msg.delete(),4000))
        }
        
        const song:Song = {
            title: ytdlInfo.videoDetails.title,
            url: ytdlInfo.videoDetails.video_url,
            thumbnailUrl: ytdlInfo.videoDetails.thumbnails[ytdlInfo.videoDetails.thumbnails.length -1].url,
            duration: parseInt(ytdlInfo.videoDetails.lengthSeconds),
            author: ytdlInfo.videoDetails.author,
            requestedBy: message.author.id,
        }
        queue.queue.push(song);
        if(queue.queue.length>1) await updateQueueMesg(message.channel as TextChannel, queue);
        queue.voiceChannelId = voiceChannel.id;
        await queue.save();
        const connection: VoiceConnection = await voiceChannel.join();
        if(!connection.dispatcher){
            play(message);
        }
        
    },
};
export = initPlay;

const play = async (message: Message): Promise<void> => {
    const serverQueue: IQueue | null = await Queue.findOne({
        guildId: message.guild!.id,
    });
    if (!serverQueue) return;
    const textChannel: TextChannel | undefined = message.guild!.channels.cache.get(
        serverQueue.textChannelId
    ) as TextChannel;

    const playerEmbedMessage:Message | undefined = await textChannel.messages.fetch(serverQueue.playerMessageId)
        .catch(err=>undefined)
    const voiceConnection = message.guild!.me!.voice;

    //if playerEmbedMessage is deleted, this if brings it back
    if(!playerEmbedMessage){
        await message.channel.send(new Player())
            .then(msg=>serverQueue.playerMessageId=msg.id)
        const queueEmbedMessage = await textChannel.messages.fetch(
                serverQueue.queueTextMessageId
        ).catch(err=> {throw `Ponowne dodanie playera zawiodło: ${err}`})
        await queueEmbedMessage.delete();
        await serverQueue.save();
        return play(message);
    }
    //deletes queueEmbedMessage when queue is empty
    if (serverQueue.queue.length === 0) {
        voiceConnection.channel!.leave();
        playerEmbedMessage.edit(new Player());     
        return;
    }
    //updates queue 
    if(serverQueue.queue.length>=1) {
        await updateQueueMesg(message.channel as TextChannel, serverQueue);
    }
    //fetches user that requested a song
    if(!serverQueue.queue[0].requestedBy){
        return
    }
    const member: GuildMember | undefined = await message.guild?.members.fetch(serverQueue.queue[0].requestedBy);
    if(!member){
        return
    }
    //sets player embed
    const playerEmbed:Player = new Player()
        .setImage(serverQueue.queue[0].thumbnailUrl)
        .setTitle(serverQueue.queue[0].title)
        .setDescription(`Uploaded by ${serverQueue.queue[0].author.name}`)
        .setFooter(`Requested by ${member.user.tag}`, `${member.user.displayAvatarURL()}`);
    playerEmbedMessage.edit(playerEmbed);
    playerEmbedMessage.react("⏯️");
    playerEmbedMessage.react("⏹️");
    playerEmbedMessage.react("⏭️");
    //plays a song
    const dispatcher: StreamDispatcher | undefined = voiceConnection.connection
        ?.play(ytdl(serverQueue.queue[0].url, { filter: 'audioonly' }))
        .on('finish', async () => {
            //@ts-ignore
            await Queue.updateOne({ guildId: message.guild!.id }, { $pop: { queue:-1 }});
            play(message)
            
        });
};


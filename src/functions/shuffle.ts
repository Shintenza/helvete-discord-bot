import {Queue, IQueue} from './../models/queue_schema';
import { TextChannel, User } from "discord.js";
import Song from './../models/song_schema';
import updateQueueMsg from './updateQueueMsg';

const shuffle = async (textChannel: TextChannel, user: User)=>{
    const serverQueue = await Queue.findOne({guildId: textChannel.guild.id});
    if(!serverQueue){
        return textChannel.send("Guild not found").then((msg)=> setTimeout(()=>msg.delete(),4000));
    }
    const member = await textChannel.guild.members.fetch(user);
    if(!member) return;
    if (!member?.voice.channel)
            return await textChannel.send('You have to join a voice channel in order to do this').then((msg)=> setTimeout(()=>msg.delete(),4000));
    if(serverQueue.voiceChannelId){
        if(member.voice.channel?.id !== serverQueue.voiceChannelId){
            return await textChannel.send("You have to be in the same voice channel").then((msg)=> setTimeout(()=>msg.delete(),4000))
        }
    }
    if(serverQueue.queue.length==1 || serverQueue.queue.length==2) return;
    console.log("chujowo ale stabilnie")
    const queue: Array<Song> = [...serverQueue.queue];
    const nowPlaying: Array<Song> = [queue[0]];
    queue.shift();
    queue.sort(() => Math.random() - 0.5);
    serverQueue.queue = nowPlaying.concat(queue);
    updateQueueMsg(textChannel, serverQueue);
    await serverQueue.save();
    return
}

export default shuffle;
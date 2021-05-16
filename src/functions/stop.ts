import { Message, TextChannel, User } from "discord.js"
import { Queue } from "../models/queue_schema"
import updateQueueMesg from "./updateQueueMsg";

const stop = async (textChannel: TextChannel, user: User)=>{
    const serverQueue = await Queue.findOne({guildId: textChannel.guild.id})
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
    const voiceConnection = textChannel.guild!.me!.voice;
    voiceConnection.connection?.dispatcher.end();
    serverQueue.queue = [];
    await serverQueue.save();
    voiceConnection.channel?.leave();
    await updateQueueMesg(textChannel, serverQueue, true);
    return;
}
export default stop
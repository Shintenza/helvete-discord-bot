import { Queue } from './../models/queue_schema';
import { TextChannel, User } from 'discord.js'
 
const loop = async (textChannel: TextChannel, user: User)=>{
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
    if(serverQueue.queue.length == 0 ) {
        return
    }
    serverQueue.isLooped = !serverQueue.isLooped;
    let status: string = serverQueue.isLooped ?  "on" : "off";
    await textChannel.send(`Looping is: ${status}`).then((msg)=> setTimeout(()=>msg.delete(),4000));
    await serverQueue.save();
    return
}
export default loop;
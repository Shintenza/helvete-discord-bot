import CommandOptions from './../types';
import { Queue } from './../models/queue_schema';
import { Message, TextChannel } from 'discord.js';
import updateQueueMsg from './../functions/updateQueueMsg';


const remove: CommandOptions = {
    name: "remove",
    execute: async(message: Message, args)=>{
        console.log(args)
        if(!message.guild) return;
        const serverQueue = await Queue.findOne({guildId: message.guild.id});
        if(!serverQueue) return
        if(serverQueue.textChannelId !== message.channel.id) return 
        const member = await message.guild.members.fetch(message.author);
        if(!member) return;
        if (!member?.voice.channel)
                return await message.channel.send('You have to join a voice channel in order to do this').then((msg)=> setTimeout(()=>msg.delete(),4000));
        if(serverQueue.voiceChannelId){
            if(member.voice.channel?.id !== serverQueue.voiceChannelId){
                return await message.channel.send("You have to be in the same voice channel").then((msg)=> msg.delete({timeout: 4000}));
            }
        }
        if(args[0]=="0") {
            return await message.channel.send("Wrong number of track").then((msg)=> msg.delete({timeout: 4000}));
        }
        if (!serverQueue || serverQueue.queue.length <= 1) {
            return await message.channel.send("There is nothing to remove").then((msg)=> msg.delete({timeout: 4000}));
        }
        if (!serverQueue.queue[args[0]]) {
            return await message.channel.send("Wrong number of track").then((msg)=> msg.delete({timeout: 4000}));
        }
        const voiceConnection = message.guild.me!.voice;
        if(!voiceConnection || !voiceConnection.connection?.dispatcher ) {
            return await message.channel.send("There is nothing playing right now").then((msg)=> msg.delete({timeout: 4000}));
        }

        if(serverQueue.queue.length==1) return;
        message.channel.send(
            `Song **${serverQueue.queue[args[0]].title}** has been deleted`
        ).then((msg)=> msg.delete({timeout: 4000}));
        serverQueue.queue.splice(args[0], 1);
        updateQueueMsg(message.channel as TextChannel, serverQueue);
        await serverQueue.save(); 
        return
    }
}

export = remove;
import { Command } from './../types';
import { Queue } from './../models/queue_schema';
import { Message, TextChannel } from 'discord.js';
import updateQueueMsg from '../utils/updateQueueMsg';
import { errorEmbed } from '../utils/infoEmbed';

const remove: Command = {
    name: 'remove',
    cooldown: 3,
    execute: async (message: Message, args, client) => {
        console.log(args);
        if (!message.guild) return;
        const serverQueue = await Queue.findOne({ guildId: message.guild.id });

        if (!serverQueue) return;
        if (serverQueue.textChannelId !== message.channel.id) return;
        const member = await message.guild.members.fetch(message.author);
        if (!member) return;
        if (!member?.voice.channel)
            return errorEmbed("You have to join a voice channel in order to do this", message.channel as TextChannel);
        if (serverQueue.voiceChannelId) 
            if (member.voice.channel?.id !== serverQueue.voiceChannelId) 
                return errorEmbed("You have to be in the same voice channel", message.channel as TextChannel);
        if (args[0] == '0') 
            return errorEmbed("Wrong number of track", message.channel as TextChannel);
        if (!serverQueue || serverQueue.queue.length <= 1) 
            return errorEmbed("There is nothing to remove", message.channel as TextChannel);
        if (!serverQueue.queue[args[0]]) 
            return errorEmbed("Wrong number of track", message.channel as TextChannel);
        const player = client.getPlayer(message.guild.id);
        if (!player || !player.track) 
            return errorEmbed("There is nothing playing right now", message.channel as TextChannel);

        if (serverQueue.queue.length == 1) return;
        message.channel
            .send(`Song **${serverQueue.queue[args[0]].title}** has been deleted`)
            .then(msg => setTimeout(() => msg.delete(), 4000));
        serverQueue.queue.splice(args[0], 1);
        updateQueueMsg(message.channel as TextChannel, serverQueue);
        await serverQueue.save();
        return;
    },
};

export = remove;

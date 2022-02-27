import { Command } from './../types';
import { Queue } from './../models/queue_schema';
import { Message, TextChannel } from 'discord.js';
import { errorEmbed, informEmbed } from '../utils/infoEmbed';

const setVolume: Command = {
    name: 'volume',
    cooldown: 1,
    execute: async (message: Message, args: string[], client) => {
        const serverQueue = await Queue.findOne({ guildId: message.guild?.id });
        if (!message.guild) return;
        if (!serverQueue) return;
        if (serverQueue.textChannelId !== message.channel.id) return;

        const member = await message.guild.members.fetch(message.author);
        if (!member) return;
        if (!member?.voice.channel)
            return errorEmbed("You have to join a voice channel in order to do this", message.channel as TextChannel);
        if (serverQueue.voiceChannelId) 
            if (member.voice.channel?.id !== serverQueue.voiceChannelId) 
                return errorEmbed("You have to be in the same voice channel", message.channel as TextChannel);
        if (!(parseInt(args[0]) >= 0 && parseInt(args[0]) <= 1)) 
            return errorEmbed('You have to use number bigger than 0 and smoller than 1 (for example 0.4)', message.channel as TextChannel)
        const volumeLevel = parseFloat(args[0]);
        serverQueue.volume = volumeLevel;
        const player = client.getPlayer(message.guild.id);
        if (!player) return;
        // player.setVolume(volumeLevel);
        informEmbed(`Volume has been changed to: ${args[0]}, kidding not supported yet!`, message.channel as TextChannel);
        await serverQueue.save();
    },
};
export = setVolume;

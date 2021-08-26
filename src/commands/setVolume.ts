import { Command } from './../types';
import { Queue } from './../models/queue_schema';
import { Message } from 'discord.js';

const setVolume: Command = {
    name: 'volume',
    cooldown: 1,
    execute: async (message: Message, args: string[], client) => {
        // const serverQueue = await Queue.findOne({ guildId: message.guild?.id });
        // if (!message.guild) return;
        // if (!serverQueue) return;
        // if (serverQueue.textChannelId !== message.channel.id) return;

        // const member = await message.guild.members.fetch(message.author);
        // if (!member) return;
        // if (!member?.voice.channel)
        //     return await message.channel
        //         .send('You have to join a voice channel in order to do this')
        //         .then(msg => msg.delete({ timeout: 4000 }));
        // if (serverQueue.voiceChannelId) {
        //     if (member.voice.channel?.id !== serverQueue.voiceChannelId) {
        //         return await message.channel
        //             .send('You have to be in the same voice channel')
        //             .then(msg => msg.delete({ timeout: 4000 }));
        //     }
        // }
        // if (!(parseInt(args[0]) >= 0 && parseInt(args[0]) <= 1)) {
        //     return await message.channel
        //         .send('You have to use number bigger than 0 and smoller than 1 (for example 0.4)')
        //         .then(msg => msg.delete({ timeout: 4000 }));
        // }
        // const volumeLevel = parseFloat(args[0]);
        // serverQueue.volume = volumeLevel;
        // const player = client.getPlayer(message.guild.id);
        // if (!player) return;
        // player.setVolume(0.2).then(player => console.log(player));
        // await message.channel.send(`Volume has been changed to: ${args[0]}`).then(msg => msg.delete({ timeout: 4000 }));
        // await serverQueue.save();
        return await message.channel.send('Not supported yet').then(msg => msg.delete({ timeout: 4000 }));
    },
};
export = setVolume;

import { Command } from './../types';
import { Queue } from './../models/queue_schema';
import { Message, TextChannel } from 'discord.js';
import updateQueueMsg from '../utils/updateQueueMsg';
import Song from '../models/song_schema';

const move: Command = {
    name: 'move',
    cooldown: 3,
    execute: async (message: Message, args: string[]) => {
        if (!message.guild) return;
        const serverQueue = await Queue.findOne({ guildId: message.guild?.id });
        if (!serverQueue) return;
        if (serverQueue.textChannelId !== message.channel.id) return;

        const member = await message.guild.members.fetch(message.author);
        if (!member) return;
        if (!member?.voice.channel)
            return await message.channel
                .send('You have to join a voice channel in order to do this')
                .then(msg => msg.delete({ timeout: 4000 }));
        if (serverQueue.voiceChannelId) {
            if (member.voice.channel?.id !== serverQueue.voiceChannelId) {
                return await message.channel
                    .send('You have to be in the same voice channel')
                    .then(msg => msg.delete({ timeout: 4000 }));
            }
        }
        if (serverQueue.queue.length <= 1) {
            return await message.channel.send('There is nothing to move').then(msg => msg.delete({ timeout: 4000 }));
        }
        if (parseInt(args[0]) >= serverQueue.queue.length || parseInt(args[0]) == 0) {
            return await message.channel
                .send('You have to type the right number')
                .then(msg => msg.delete({ timeout: 4000 }));
        }
        if (args[1]) {
            if (parseInt(args[1]) >= serverQueue.queue.length || parseInt(args[1]) == 0) {
                return await message.channel
                    .send('You have to type the right number')
                    .then(msg => msg.delete({ timeout: 4000 }));
            }
            const targetElement: Song = serverQueue.queue[args[0]];
            const position = args[1];
            serverQueue.queue.splice(args[0], 1);
            serverQueue.queue.splice(position, 0, targetElement);
        } else {
            const targetElement: Song = serverQueue.queue[args[0]];
            serverQueue.queue.splice(args[0], 1);
            serverQueue.queue.splice(1, 0, targetElement);
        }
        updateQueueMsg(message.channel as TextChannel, serverQueue);
        await serverQueue.save();
        return;
    },
};
export = move;

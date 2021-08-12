import { VoiceConnection } from 'discord.js';
import CommandOptions from '../types';
import { MessageEmbed } from 'discord.js';
import { Queue, IQueue } from './../models/queue_schema';
import durationHandler from './../functions/durationHandler';

const np: CommandOptions = {
    name: 'np',
    execute: async (message, args, client) => {
        if (!message.guild) return;
        const serverQueue = await Queue.findOne({ guildId: message.guild.id });
        if (!serverQueue) {
            return await message.channel
                .send('There is nothing in the queue!')
                .then(msg => msg.delete({ timeout: 4000 }));
        }
        if (serverQueue.queue.length === 0) {
            return await message.channel
                .send('There is nothing in the queue!')
                .then(msg => msg.delete({ timeout: 4000 }));
        }
        if (!message.guild.me?.voice) {
            return await message.channel
                .send('I am not connected to any voice channel!')
                .then(msg => msg.delete({ timeout: 4000 }));
        }
        const numberOfBars: number = 10;
        let barString = '▬'.repeat(numberOfBars);
        const replaceAt = (text: string, index: number, replacement: string) => {
            return text.substr(0, index) + replacement + text.substr(index + replacement.length);
        };

        const player = client.getPlayer(message.guild.id);
        if (!player) return;
        const durationOfSong: number = serverQueue.queue[0].duration;
        const durationOfStream: number = player.position;
        const positionOfIndicator = Math.floor((durationOfStream / serverQueue.queue[0].duration) * numberOfBars);

        const nowPlayingEmbed = new MessageEmbed()
            .setColor('#ff100c')
            .setDescription(
                `Timeline:\n${replaceAt(barString, positionOfIndicator, '●')}\n${durationHandler(
                    durationOfStream
                )}/${durationHandler(durationOfSong)}`
            );
        return await message.channel.send(nowPlayingEmbed).then(async msg => await msg.delete({ timeout: 4000 }));
    },
};
export = np;

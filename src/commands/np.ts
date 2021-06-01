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
            return message.channel
                .send('There is nothing in the queue!')
                .then(msg => msg.delete({ timeout: 4000 }));
        }
        if (serverQueue.queue.length === 0) {
            return message.channel
                .send('There is nothing in the queue!')
                .then(msg => msg.delete({ timeout: 4000 }));
        }
        if (!message.guild.me?.voice) {
            return message.channel
                .send('I am not connected to any voice channel!')
                .then(msg => msg.delete({ timeout: 4000 }));
        }
        const member = await message.guild.members.fetch(
            serverQueue.queue[0].requestedBy
        );
        if (!member) return;
        const numberOfBars: number = 10;
        const connection: VoiceConnection | null =
            message.guild.me.voice.connection;
        if (!connection) return;
        const positionOfIndicator = Math.floor(
            (connection.dispatcher.streamTime / serverQueue.queue[0].duration) *
                numberOfBars
        );
        let barString = '▬'.repeat(numberOfBars);
        const replaceAt = (
            text: string,
            index: number,
            replacement: string
        ) => {
            return (
                text.substr(0, index) +
                replacement +
                text.substr(index + replacement.length)
            );
        };
        const durationOfSong: number = serverQueue.queue[0].duration;
        const durationOfStream: number = connection.dispatcher.streamTime;

        const nowPlayingEmbed = new MessageEmbed()
            .setColor('#ff100c')
            .setDescription(
                `Timeline:\n${replaceAt(
                    barString,
                    positionOfIndicator,
                    '●'
                )}\n${durationHandler(durationOfStream)}/${durationHandler(
                    durationOfSong
                )}`
            );
        return await message.channel
            .send(nowPlayingEmbed)
            .then(async msg => await msg.delete({ timeout: 4000 }));
    },
};
export = np;

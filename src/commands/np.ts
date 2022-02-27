import { Command } from './../types';
import { MessageEmbed, TextChannel} from 'discord.js';
import { Queue, IQueue } from './../models/queue_schema';
import { errorEmbed } from '../utils/infoEmbed';
import durationHandler from '../utils/durationHandler';

const np: Command = {
    name: 'np',
    cooldown: 3,
    execute: async (message, args, client) => {
        if (!message.guild) return;
        const serverQueue = await Queue.findOne({ guildId: message.guild.id });
        if (!serverQueue) 
            return errorEmbed('There is nothing in the queue', message.channel as TextChannel);
        if (serverQueue.queue.length === 0) 
            return errorEmbed('There is nothing in the queue', message.channel as TextChannel);
        if (!message.guild.me?.voice) 
            return errorEmbed('I am not connected to any voice channel!', message.channel as TextChannel);
        const numberOfBars: number = 10;
        let barString = '▬'.repeat(numberOfBars);
        const replaceAt = (text: string, index: number, replacement: string) => {
            return text.substr(0, index) + replacement + text.substr(index + replacement.length);
        };

        const player = client.getPlayer(message.guild.id);
        if (!player) return;
        const durationOfSong: number = serverQueue.queue[0].duration;
        const durationOfStream: number = player.position as number;
        const positionOfIndicator = Math.floor((durationOfStream / serverQueue.queue[0].duration) * numberOfBars);

        const nowPlayingEmbed = new MessageEmbed()
            .setColor('#ff100c')
            .setDescription(
                `Timeline:\n${replaceAt(barString, positionOfIndicator, '●')}\n${durationHandler(
                    durationOfStream
                )}/${durationHandler(durationOfSong)}`
            );
        return await message.channel
            .send({ embeds: [nowPlayingEmbed] })
            .then(msg => setTimeout(() => msg.delete(), 4000));
    },
};
export = np;

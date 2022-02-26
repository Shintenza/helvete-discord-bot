import { Command } from './../types';
import { Guild, Message, MessageEmbed, TextChannel } from 'discord.js';
import { Queue, IQueue } from './../models/queue_schema';
import Player from '../models/player_schema';
const bannerLink = process.env.BANNER_LINK;
if (!bannerLink) throw 'you have to set the banner env variable';

const init: Command = {
    name: 'init',
    cooldown: 5,
    execute: async (message, args, client, optional) => {
        if (!message.guild) return;
        const guild: Guild = message.guild;
        const serverQueue = await Queue.findOne({ guildId: message.guild.id });
        if (!serverQueue || optional) {
            const newlyCreatedChannel = await guild.channels
                .create('helvete-beats', { type: 'GUILD_TEXT' })
                .then(channel => {
                    message.channel.send('Channel has been created!');
                    return channel;
                })
                .catch(err => {
                    message.channel.send('I was unable to create a text channel');
                });
            if (!newlyCreatedChannel) return message.reply('I was unable to create my text channel');

            const playerEmbed = new Player();

            if (!optional) {
                const newQueue = new Queue();
                newQueue.guildId = message.guild!.id;
                newQueue.textChannelId = newlyCreatedChannel.id;
                await newlyCreatedChannel
                    .send(bannerLink)
                    .then((message: Message) => (newQueue.bannerMessageId = message.id));
                await newlyCreatedChannel
                    .send({ embeds: [playerEmbed] })
                    .then((message: Message) => (newQueue.playerMessageId = message.id));
                await newQueue.save();
                client.initializedGuilds.push(message.guild.id);
            } else {
                if (serverQueue) {
                    serverQueue.textChannelId = newlyCreatedChannel.id;
                    await newlyCreatedChannel
                        .send(bannerLink)
                        .then((message: Message) => (serverQueue.bannerMessageId = message.id));
                    await newlyCreatedChannel
                        .send({ embeds: [playerEmbed] })
                        .then((message: Message) => (serverQueue.playerMessageId = message.id));
                    await serverQueue.save();
                }
            }
        }
    },
};
export = init;

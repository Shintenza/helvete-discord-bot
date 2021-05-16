import { Message, TextChannel } from 'discord.js';
import Player from '../models/player_schema';
import CommandOptions from '../types';
import { Queue, IQueue } from './../models/queue_schema';
const editPlayer: CommandOptions = {
    name: 'editplayer',
    execute: async (message: Message) => {
        if (!message.guild) return;
        const serverQueue: IQueue | null = await Queue.findOne({
            guildId: message.guild.id,
        });
        if (!serverQueue)
            return message.channel.send(
                'nie znaleziono tego serwera w bazie danych'
            );
        const textChannel:
            | TextChannel
            | undefined = message.guild!.channels.cache.get(
            serverQueue.textChannelId
        ) as TextChannel;
        const playerEmbed = await textChannel.messages.fetch(
            serverQueue.playerMessageId
        );
        const changedEmbed: Player = new Player();
        playerEmbed.edit(changedEmbed);
    },
};
export = editPlayer;

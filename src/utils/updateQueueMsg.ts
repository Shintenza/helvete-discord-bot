import { Message, MessageEmbed, TextChannel } from 'discord.js';
import { IQueue } from '../models/queue_schema';
import durationHandler from './durationHandler';

const updateQueueMesg = async (channel: TextChannel, serverQueue: IQueue, del?: boolean) => {
    if (serverQueue.queue.length > 1) {
        let songs = '';
        serverQueue.queue.map((song: any, key: number) => {
            if (key >= 1 && key <= 30) {
                songs += `${key} - ${song.title} [${durationHandler(song.duration)}]\n`;
            }
        });
        const queueEmbed = new MessageEmbed().setTitle('__Queue:__').setDescription(songs);
        if (serverQueue.queue.length > 30) {
            queueEmbed.setFooter({text: `And ${serverQueue.queue.length - 30} more...`})
        }
        if (!serverQueue.queueTextMessageId) {
            await channel.send({ embeds: [queueEmbed] }).then(msg => (serverQueue.queueTextMessageId = msg.id));
        } else {
            const textChannel: TextChannel | undefined = channel.guild!.channels.cache.get(
                serverQueue.textChannelId
            ) as TextChannel;
            const queueEmbedMessage = await textChannel.messages
                .fetch(serverQueue.queueTextMessageId)
                .catch(err => undefined);
            if (!queueEmbedMessage) {
                await channel.send({ embeds: [queueEmbed] }).then(msg => (serverQueue.queueTextMessageId = msg.id));
            } else {
                queueEmbedMessage.edit({ embeds: [queueEmbed] });
            }
        }
    } else if (serverQueue.queue.length == 1 || del) {
        const textChannel: TextChannel | undefined = channel.guild!.channels.cache.get(
            serverQueue.textChannelId
        ) as TextChannel;
        const queueEmbedMessage = await textChannel.messages
            .fetch(serverQueue.queueTextMessageId)
            .catch(err => undefined);
        await queueEmbedMessage?.delete();
    }
};
export default updateQueueMesg;

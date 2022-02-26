import { Client, TextChannel, Message, GuildMember } from 'discord.js';
import { IQueue } from '../models/queue_schema';
import Player from '../models/player_schema';
import updateQueueMesg from './updateQueueMsg';

const updatePlayer = async (client: Client, serverQueue: IQueue): Promise<void> => {
    const bannerLink = process.env.BANNER_LINK;
    if (!bannerLink) throw 'u have to change the banner env';
    const guild = client.guilds.cache.get(serverQueue.guildId);
    if (!guild) return console.log('guild not found');
    const textChannel: TextChannel | undefined = guild.channels.cache.get(serverQueue.textChannelId) as TextChannel;

    const playerEmbedMessage: Message | undefined = await textChannel.messages
        .fetch(serverQueue.playerMessageId)
        .catch(err => undefined);
    const bannerMessage = await textChannel.messages.fetch(serverQueue.bannerMessageId).catch(err => undefined);
    if (!bannerMessage) {
        await textChannel.send(bannerLink).then(msg => (serverQueue.bannerMessageId = msg.id));
        const queueEmbedMessage = await textChannel.messages
            .fetch(serverQueue.queueTextMessageId)
            .catch(err => undefined);
        const playerEmbedMessage = await textChannel.messages
            .fetch(serverQueue.playerMessageId)
            .catch(err => undefined);
        if (playerEmbedMessage && queueEmbedMessage) {
            serverQueue.set('playerMessageId', undefined);
            serverQueue.set('queueTextMessage', undefined);
            try {
                await queueEmbedMessage.delete();
                await playerEmbedMessage.delete();
            } catch (err) {
                console.log(err);
            }
        }
        await textChannel.send({ embeds: [new Player()] }).then(msg => (serverQueue.playerMessageId = msg.id));
        await serverQueue.save();
        return updatePlayer(client, serverQueue);
    }
    //if playerEmbedMessage is deleted, this if brings it back
    if (!playerEmbedMessage) {
        await textChannel.send({ embeds: [new Player()] }).then(msg => (serverQueue.playerMessageId = msg.id));
        const queueEmbedMessage = await textChannel.messages
            .fetch(serverQueue.queueTextMessageId)
            .catch(err => undefined);
        if (queueEmbedMessage) {
            try {
                await queueEmbedMessage.delete();
            } catch (err) {
                console.log(err);
            }
        }
        await serverQueue.save();
        return updatePlayer(client, serverQueue);
    }
    if (serverQueue.queue.length === 0) {
        playerEmbedMessage.edit({ embeds: [new Player()] });
        return;
    }
    //updates queue
    if (serverQueue.queue.length >= 1) {
        await updateQueueMesg(textChannel as TextChannel, serverQueue);
        await serverQueue.save();
    }
    //fetches user that requested a song
    if (!serverQueue.queue[0].requester) {
        return;
    }
    const member: GuildMember | undefined = await guild.members.fetch(serverQueue.queue[0].requester);
    if (!member) {
        return;
    }
    //sets player embed
    const playerEmbed: Player = new Player()
        .setImage(serverQueue.queue[0].thumbnail)
        .setTitle(serverQueue.queue[0].title)
        .setDescription(`Uploaded by ${serverQueue.queue[0].author}`)
        .setFooter(`Requested by ${member.user.tag}`, `${member.user.displayAvatarURL()}`);
    playerEmbedMessage.edit({ embeds: [playerEmbed] });
    playerEmbedMessage.react('⏯️');
    playerEmbedMessage.react('⏹️');
    playerEmbedMessage.react('⏭️');
    playerEmbedMessage.react('🔀');
    playerEmbedMessage.react('🔄');
};

export default updatePlayer;

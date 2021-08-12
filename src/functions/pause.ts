import { Message, TextChannel, User } from 'discord.js';
import { Queue } from '../models/queue_schema';
import updateQueueMesg from './updateQueueMsg';
import Client from '../classes/Client';

const pause = async (textChannel: TextChannel, user: User, client: Client) => {
    const serverQueue = await Queue.findOne({ guildId: textChannel.guild.id });
    if (!serverQueue) {
        return textChannel.send('Guild not found').then(msg => setTimeout(() => msg.delete(), 4000));
    }
    const member = await textChannel.guild.members.fetch(user);
    if (!member) return;

    const role = textChannel.guild.roles.cache.find(role => role.name == 'HelveteDJ');
    let isAllowed: boolean = false;
    if (
        member.permissions.has('MANAGE_ROLES') ||
        member.permissions.has('BAN_MEMBERS') ||
        member.permissions.has('KICK_MEMBERS')
    ) {
        isAllowed = true;
    }
    if (role) {
        if (member.roles.cache.has(role.id)) {
            isAllowed = true;
        }
    }
    if (!isAllowed) {
        return await textChannel
            .send('You are not allowed to do this!')
            .then(msg => setTimeout(() => msg.delete(), 4000));
    }

    if (!member?.voice.channel)
        return await textChannel
            .send('You have to join a voice channel in order to do this')
            .then(msg => setTimeout(() => msg.delete(), 4000));
    if (serverQueue.voiceChannelId) {
        if (member.voice.channel?.id !== serverQueue.voiceChannelId) {
            return await textChannel
                .send('You have to be in the same voice channel')
                .then(msg => setTimeout(() => msg.delete(), 4000));
        }
    }

    if (serverQueue.queue.length === 0) return;

    const player = client.getPlayer(textChannel.guild.id);
    if (!player) return;
    serverQueue.isPaused = !serverQueue.isPaused;
    if (serverQueue.isPaused) {
        await player.setPaused(true);
    } else {
        await player.setPaused(false);
    }

    await serverQueue.save();
    return;
};
export default pause;

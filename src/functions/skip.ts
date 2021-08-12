import { Message, TextChannel, User } from 'discord.js';
import { Queue } from '../models/queue_schema';
import Client from '../classes/Client';

const skip = async (textChannel: TextChannel, user: User, client: Client) => {
    const serverQueue = await Queue.findOne({ guildId: textChannel.guild.id });

    if (!serverQueue) {
        return textChannel.send('Guild not found').then(msg => setTimeout(() => msg.delete(), 4000));
    }

    const member = await textChannel.guild.members.fetch(user);
    if (!member) return;

    if (serverQueue.voiceChannelId) {
        if (member.voice.channel?.id !== serverQueue.voiceChannelId) return;
    }

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
    if (serverQueue.queue[0].requester === member.user.id) {
        isAllowed = true;
    }

    if (!isAllowed) {
        return await textChannel
            .send('You are not allowed to do this!')
            .then(msg => setTimeout(() => msg.delete(), 4000));
    }
    if (!member.voice.channel)
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

    const player = client.getPlayer(textChannel.guild.id);
    if (!player) return;
    await player.stopTrack();
    return;
};
export default skip;

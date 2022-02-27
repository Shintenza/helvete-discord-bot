import { TextChannel, User } from 'discord.js';
import { Queue } from '../models/queue_schema';
import Client from '../classes/Client';
import { errorEmbed, informEmbed } from '../utils/infoEmbed';

const pause = async (textChannel: TextChannel, user: User, client: Client) => {
    const serverQueue = await Queue.findOne({ guildId: textChannel.guild.id });
    if (!serverQueue) return errorEmbed('Guild is missing in the database!', textChannel);
    const member = await textChannel.guild.members.fetch(user);
    if (!member) return;

    if (!member?.voice.channel) return;
    if (serverQueue.voiceChannelId)
        if (member.voice.channel?.id !== serverQueue.voiceChannelId)
            return errorEmbed('You have to be in the same voice channel!', textChannel);

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
    if (!isAllowed) return errorEmbed('You are not allowed to do this!', textChannel);

    if (serverQueue.queue.length === 0) return;

    const player = client.getPlayer(textChannel.guild.id);
    if (!player) return;
    serverQueue.isPaused = !serverQueue.isPaused;

    if (serverQueue.isPaused) {
        await player.resume();
    } else {
        await player.pause();
    }
    informEmbed(`${serverQueue.isPaused ? "Music has been resumed": "Music has been paused"}`, textChannel);
    await serverQueue.save();
    return;
};
export default pause;

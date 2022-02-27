import { TextChannel, User } from 'discord.js';
import Client from './../classes/Client';
import { Queue } from '../models/queue_schema';
import updateQueueMesg from '../utils/updateQueueMsg';
import { errorEmbed } from '../utils/infoEmbed';

const stop = async (textChannel: TextChannel, user: User, client: Client) => {
    const serverQueue = await Queue.findOne({ guildId: textChannel.guild.id });
    if (!serverQueue) 
        return errorEmbed("Guild is missing in the database!", textChannel);

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
    if (!isAllowed) 
        return errorEmbed("You are not allowed to do this!", textChannel);

    const player = client.getPlayer(textChannel.guild.id);
    if (!player) return;
    serverQueue.queue = [];
    await updateQueueMesg(textChannel, serverQueue, true);
    await serverQueue.save();
    await player.stop();

    return;
};
export default stop;

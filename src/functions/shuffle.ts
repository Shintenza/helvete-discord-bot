import { Queue, IQueue } from './../models/queue_schema';
import { TextChannel, User } from 'discord.js';
import { Song } from '../types';
import updateQueueMsg from '../utils/updateQueueMsg';

const shuffle = async (textChannel: TextChannel, user: User) => {
    const serverQueue = await Queue.findOne({ guildId: textChannel.guild.id });

    if (!serverQueue) {
        return textChannel.send('Guild not found').then(msg => setTimeout(() => msg.delete(), 4000));
    }
    const member = await textChannel.guild.members.fetch(user);
    if (!member) return;

    if (!member?.voice.channel) return;
    if (serverQueue.voiceChannelId) {
        if (member.voice.channel?.id !== serverQueue.voiceChannelId) {
            return await textChannel
                .send('You have to be in the same voice channel')
                .then(msg => setTimeout(() => msg.delete(), 4000));
        }
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
    if (!isAllowed) {
        return await textChannel
            .send('You are not allowed to do this!')
            .then(msg => setTimeout(() => msg.delete(), 4000));
    }

    if (serverQueue.queue.length == 1 || serverQueue.queue.length == 2) return;
    console.log('chujowo ale stabilnie');
    const queue: Array<Song> = [...serverQueue.queue];
    const nowPlaying: Array<Song> = [queue[0]];
    queue.shift();
    queue.sort(() => Math.random() - 0.5);
    serverQueue.queue = nowPlaying.concat(queue);
    updateQueueMsg(textChannel, serverQueue);
    await serverQueue.save();
    return;
};

export default shuffle;

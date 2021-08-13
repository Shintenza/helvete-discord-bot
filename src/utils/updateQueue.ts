import { Message } from 'discord.js';
import { IQueue } from '../models/queue_schema';
import Song from '../models/song_schema';

const updateQueue = (message: Message, resolvedTrack: any, serverQueue: IQueue) => {
    const song: Song = {
        author: resolvedTrack.info.author,
        duration: resolvedTrack.info.length,
        uri: resolvedTrack.info.uri,
        title: resolvedTrack.info.title,
        requester: message.author.id,
        thumbnail: `http://i3.ytimg.com/vi/${resolvedTrack.info.identifier}/maxresdefault.jpg`,
        track: resolvedTrack.track,
        resolved: true,
    };
    serverQueue.queue.push(song);
};
export default updateQueue;

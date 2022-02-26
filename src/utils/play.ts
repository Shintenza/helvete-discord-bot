import Client from './../classes/Client';
import { Song } from './../types';
import { Queue } from './../models/queue_schema';
import updatePlayer from './updatePlayer';
import { Player } from "lavaclient";

const play = async (
    player: Player,
    guildId: string,
    client: Client,
    previousSong?: Song
): Promise<any> => {
    const serverQueue = await Queue.findOne({
        guildId: guildId,
    });

    if (!serverQueue) return;
    if (serverQueue.isLooped && previousSong) {
        serverQueue.queue.unshift(previousSong);
        await serverQueue.save();
    }
    if (serverQueue.queue.length > 0 && !serverQueue.queue[0].resolved) {
        const searchString = `${serverQueue.queue[0].title} ${serverQueue.queue[0].author}`;
        const data = await client.lavalink.rest.loadTracks(`ytsearch:${searchString}`);
        if (!data) return;
        const resolvedTrack: any = data.tracks.shift();
        serverQueue.queue[0].uri = resolvedTrack.info.uri;
        serverQueue.queue[0].thumbnail = `http://i3.ytimg.com/vi/${resolvedTrack.info.identifier}/maxresdefault.jpg`;
        serverQueue.queue[0].track = resolvedTrack.track;
        serverQueue.queue[0].resolved = true;
        serverQueue.queue[0].title = resolvedTrack.info.title;
        serverQueue.queue[0].duration = resolvedTrack.info.length;
    }

    updatePlayer(client, serverQueue);
    if (serverQueue.queue.length === 0) {
        player.disconnect();
        return;
    }
    await player.play(serverQueue.queue[0].track);
};
export default play;

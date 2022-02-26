import Client from './../classes/Client';
import { Player } from 'lavaclient';
import { Queue } from '../models/queue_schema';
import play from './play';

const setPlayerEvents = (player: Player, guildId: string, client: Client) => {
    player.on('trackEnd', async () => {
        const dbQueue = await Queue.findOne({ guildId: guildId });
        if (!dbQueue) return;
        const nowPlaying = dbQueue.queue[0];
        dbQueue.queue.shift();
        await dbQueue.save();
        play(player, guildId, client, nowPlaying);
    });
};

export default setPlayerEvents;

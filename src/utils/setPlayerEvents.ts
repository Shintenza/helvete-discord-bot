import Client from './../classes/Client';
import { ShoukakuPlayer, ShoukakuSocket } from 'shoukaku';
import { Queue } from '../models/queue_schema';
import play from './play';

const setPlayerEvents = (player: ShoukakuPlayer, guildId: string, client: Client, node: ShoukakuSocket) => {
    player.on('error', error => {
        console.error(error);
        player.disconnect();
    });
    player.on('end', async () => {
        const dbQueue = await Queue.findOne({ guildId: guildId });
        if (!dbQueue) return;
        const nowPlaying = dbQueue.queue[0];
        dbQueue.queue.shift();
        await dbQueue.save();
        play(player, guildId, client, node, nowPlaying);
    });
    player.on('closed', reason => {
        console.log('WebsocketClosedEvent', reason);
        player.disconnect();
    });
    player.on('nodeDisconnect', reason => {
        console.log('The node has disconnected', reason);
    });
};

export default setPlayerEvents;

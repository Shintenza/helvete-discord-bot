import Client from './../classes/Client';
import { Queue } from '../models/queue_schema';

const autoUnblock = async (client: Client) => {
    console.log('Auto unblock');
    client.guilds.cache.map(async guild => {
        const serverQueue = await Queue.findOneAndUpdate(
            { guildId: guild.id },
            { $pull: { blockedUsers: { date: { $lte: new Date() } } } }
        );
        if (!serverQueue) return;

        client.blockedUsers.map((blockedUser, key) => {
            const dbUser = serverQueue.blockedUsers.filter(dbBlockedUser => blockedUser.id == dbBlockedUser.id);
            if (!dbUser[0]) {
                return client.blockedUsers.splice(key, 1);
            }
            if (dbUser[0].date < new Date()) {
                return client.blockedUsers.splice(key, 1);
            }
        });
    });
};
export default autoUnblock;

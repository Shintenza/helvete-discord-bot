import Client from './classes/Client';

const client: Client = new Client({
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});

client.start();

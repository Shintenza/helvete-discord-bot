import { Command } from './../types';
import { Guild, Message, MessageEmbed, TextChannel } from 'discord.js';
import { Queue, IQueue } from './../models/queue_schema';
const bannerLink = process.env.BANNER_LINK;
if (!bannerLink) throw 'you have to set the banner env variable';

const init: Command = {
    name: 'init',
    cooldown: 5,
    execute: async message => {
        if (!message.guild) return;
        const guild: Guild = message.guild;
        const serverQueue = Queue.findOne({ guildId: message.guild.id }, async (err: Error, queue: IQueue) => {
            if (!queue) {
                await guild?.channels
                    .create('helvete-beats', { type: 'text' })
                    .then(() => message.channel.send('Channel has been created!'))
                    .catch(() => message.channel.send('I was unable to create a text channel'));
                const createdChannel: TextChannel = guild.channels.cache.find(
                    channel => channel.name === 'helvete-beats'
                ) as TextChannel;
                const newQueue = new Queue();

                const playerEmbed = new MessageEmbed()
                    .setTitle('Helvete music player')
                    .setImage(
                        'https://external-content.duckduckgo.com/iu/?u=http%3A%2F%2Fwonderfulengineering.com%2Fwp-content%2Fuploads%2F2015%2F07%2Fbrazil-flag-2.jpg&f=1&nofb=1'
                    );
                newQueue.guildId = message.guild!.id;
                newQueue.textChannelId = createdChannel?.id as string;
                await createdChannel
                    .send(bannerLink)
                    .then((message: Message) => (newQueue.bannerMessageId = message.id));
                await createdChannel
                    .send(playerEmbed)
                    .then((message: Message) => (newQueue.playerMessageId = message.id));

                newQueue.save();
            } else {
                return message.channel.send('kanał już został utworzony');
            }
        });
    },
};
export = init;

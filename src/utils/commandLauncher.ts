import Client from '../classes/Client';
import { GuildChannel, Message, MessageEmbed, User } from 'discord.js';
import { ShoukakuSocket } from 'shoukaku';
import { BlockedUser, Command } from '../types';
import { Queue } from '../models/queue_schema';

const commandLauncher = async (
    client: Client,
    message: Message,
    command: Command,
    node: ShoukakuSocket,
    args: string[],
    optional?: any
) => {
    if (!message.guild) return;
    if (message.author.bot) return;
    const textChannel = message.channel as GuildChannel;
    const permissions = textChannel.permissionsFor(message.client.user as User);
    if (!permissions) return;
    if (!permissions.has('SEND_MESSAGES')) return;
    try {
        message.delete();
    } catch (err) {
        console.log(err);
    }

    const guildCooldown = client.cooldowns.get(message.guild.id);
    if (!command) return;
    const userCooldown = guildCooldown ? guildCooldown.get(`${command.name}_${message.author.id}`) : undefined;
    console.log(userCooldown);
    try {
        if (guildCooldown && userCooldown && userCooldown.date.getTime() - Date.now() > 0) {
            if (userCooldown.count >= 1 && userCooldown.count <= 3) {
                const cooldownTime = Math.floor((userCooldown.date.getTime() - Date.now()) / 1000);
                if (!userCooldown.sentFirstWarn) {
                    message.channel
                        .send(
                            `<@${message.author.id}> you are on ${cooldownTime} seconds cooldown! Do not spam or you'll be blocked`
                        )
                        .then(msg => msg.delete({ timeout: cooldownTime * 1000 }));
                }
                return client.cooldowns.set(
                    message.guild.id,
                    new Map().set(`${command.name}_${message.author.id}`, {
                        date: userCooldown.date,
                        count: userCooldown.count + 1,
                        sentFirstWarn: true,
                    })
                );
            }
            if (userCooldown.count > 3) {
                console.log('more than 3');
                if (!userCooldown.sentSecondWarn) {
                    message.channel
                        .send(`<@${message.author.id}> you have been warned. You are blocked for 30 minutes`)
                        .then(msg => msg.delete({ timeout: 3000 }));
                    const serverQueue = await Queue.findOne({ guildId: message.guild.id });
                    if (serverQueue) {
                        const blockedUser: BlockedUser = {
                            id: message.author.id,
                            date: new Date(Date.now() + 1000 * 60 * 30),
                        };
                        serverQueue.blockedUsers.push(blockedUser);
                        serverQueue.save();
                        client.blockedUsers.push(blockedUser);
                    }
                }

                return client.cooldowns.set(
                    message.guild.id,
                    new Map().set(`${command.name}_${message.author.id}`, {
                        date: new Date(userCooldown.date.getTime() + command.cooldown * 1000),
                        count: userCooldown.count + 1,
                        sentSecondWarn: true,
                    })
                );
            }
        } else {
            if (command.cooldown) {
                console.log('cooldown set first time');
                client.cooldowns.set(
                    message.guild.id,
                    new Map().set(`${command.name}_${message.author.id}`, {
                        date: new Date(Date.now() + command.cooldown * 1000),
                        count: 1,
                    })
                );
            }
            if (userCooldown && userCooldown.count > 1) {
                console.log('cleared cooldown');
                client.cooldowns.set(
                    message.guild.id,
                    new Map().set(`${command.name}_${message.author.id}`, {
                        date: new Date(),
                        count: 0,
                    })
                );
            }
        }
        if (optional) {
            await command.execute(message, args, client, node, optional);
        }
        await command.execute(message, args, client, node);
    } catch (err) {
        console.log(err);
        return message.channel
            .send(new MessageEmbed().setTitle('Error!').setDescription(err).setColor('RED'))
            .then(msg => {
                msg.delete({ timeout: 10000 });
            });
    }
};
export default commandLauncher;

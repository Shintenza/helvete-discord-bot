import Client from '../classes/Client';
import { GuildChannel, Message, User, TextChannel } from 'discord.js';
import { BlockedUser, Command } from '../types';
import { Queue } from '../models/queue_schema';
import { errorEmbed } from './infoEmbed';

const commandLauncher = async (client: Client, message: Message, command: Command, args: string[], optional?: any) => {
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
                    errorEmbed(
                        `<@${message.author.id}> you are on ${cooldownTime} seconds cooldown! Do not spam or cipa huj!`,
                        message.channel as TextChannel,
                        cooldownTime * 1000
                    );
                    await message.channel.send('chuj');
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
                if (!userCooldown.sentSecondWarn) {
                    errorEmbed(
                        `<@${message.author.id}> you have been warned. You are blocked for 30 minutes!`,
                        message.channel as TextChannel,
                        3000
                    );

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
                client.cooldowns.set(
                    message.guild.id,
                    new Map().set(`${command.name}_${message.author.id}`, {
                        date: new Date(Date.now() + command.cooldown * 1000),
                        count: 1,
                    })
                );
            }
            if (userCooldown && userCooldown.count > 1) {
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
            await command.execute(message, args, client, optional);
        }
        await command.execute(message, args, client);
    } catch (err) {
        console.log(err);
        return errorEmbed(err as string, message.channel as TextChannel, 10000);
    }
};
export default commandLauncher;

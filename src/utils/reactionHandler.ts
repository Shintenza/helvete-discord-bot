import { Queue } from '../models/queue_schema';
import { MessageReaction, PartialUser, User, TextChannel } from 'discord.js';
import stop from './../functions/stop';
import skip from './../functions/skip';
import shuffle from './../functions/shuffle';
import pause from './../functions/pause';
import loop from './../functions/loop';
import Client from './../classes/Client';
import { BlockedUser } from '../types';
import { errorEmbed } from './infoEmbed';

const reactionHandler = async (client: Client, reaction: MessageReaction, user: User | PartialUser) => {
    if (user.bot) return;
    if (!reaction.message.guild) return;
    // TODO remove thaht db call
    const serverQueue = await Queue.findOne({
        guildId: reaction.message.guild.id,
    });
    if (!serverQueue) return;
    const isBlocked = client.blockedUsers.filter(blockedUser => blockedUser.id === user.id);

    const validTextChannel = client.textChannelId.get(reaction.message.guild.id);
    if (!validTextChannel) return;
    if (isBlocked.length >= 1 && reaction.message.channel.id === validTextChannel.textChannel) {
        try {
            reaction.users.remove(user as User);
        } catch (err) {
            console.log(err);
        }
        return;
    }
    if (reaction.message.channel.id === validTextChannel.textChannel) {
        try {
            reaction.users.remove(user as User);
        } catch (err) {
            console.log(err);
        }
    } else return;

    const guildCooldown = client.cooldowns.get(reaction.message.guild.id);
    const userCooldown = guildCooldown ? guildCooldown.get(`reaction_${user.id}`) : undefined;
    console.log(userCooldown);
    const reactionCooldown = 5;

    try {
        if (guildCooldown && userCooldown && userCooldown.date.getTime() - Date.now() > 0) {
            const cooldownTime = Math.floor((userCooldown.date.getTime() - Date.now()) / 1000);
            if (userCooldown.count >= 1 && userCooldown.count <= 3) {
                if (!userCooldown.sentFirstWarn) {
                    errorEmbed(
                        `<@${user.id}> you are on ${cooldownTime} seconds cooldown! Do not spam or you wll be blocked!`,
                        reaction.message.channel as TextChannel,
                        cooldownTime * 1000
                    );
                }
                return client.cooldowns.set(
                    reaction.message.guild.id,
                    new Map().set(`reaction_${user.id}`, {
                        date: userCooldown.date,
                        count: userCooldown.count + 1,
                        sentFirstWarn: true,
                    })
                );
            }
            if (userCooldown.count > 3) {
                if (!userCooldown.sentSecondWarn) {
                    errorEmbed(
                        `<@${user.id}> you have been warned. You are blocked for 30 minutes!`,
                        reaction.message.channel as TextChannel,
                        3000
                    );
                    const serverQueue = await Queue.findOne({ guildId: reaction.message.guild.id });
                    if (serverQueue) {
                        const blockedUser: BlockedUser = {
                            id: user.id,
                            date: new Date(Date.now() + 1000 * 60 * 30),
                        };
                        serverQueue.blockedUsers.push(blockedUser);
                        serverQueue.save();
                        client.blockedUsers.push(blockedUser);
                    }
                }

                return client.cooldowns.set(
                    reaction.message.guild.id,
                    new Map().set(`reaction_${user.id}`, {
                        date: new Date(userCooldown.date.getTime() + reactionCooldown * 1000),
                        count: userCooldown.count + 1,
                        sentSecondWarn: true,
                    })
                );
            }
        } else {
            client.cooldowns.set(
                reaction.message.guild.id,
                new Map().set(`reaction_${user.id}`, {
                    date: new Date(Date.now() + reactionCooldown * 1000),
                    count: 1,
                })
            );

            if (userCooldown && userCooldown.count > 1) {
                client.cooldowns.set(
                    reaction.message.guild.id,
                    new Map().set(`reaction_${user.id}`, {
                        date: new Date(),
                        count: 0,
                    })
                );
            }
        }

        if (reaction.message.id != serverQueue.playerMessageId) return;
        if (reaction.emoji.name == '⏹️') {
            stop(reaction.message.channel as TextChannel, user as User, client);
        } else if (reaction.emoji.name == '⏭️') {
            skip(reaction.message.channel as TextChannel, user as User, client);
        } else if (reaction.emoji.name == '⏯️') {
            pause(reaction.message.channel as TextChannel, user as User, client);
        } else if (reaction.emoji.name == '🔀') {
            shuffle(reaction.message.channel as TextChannel, user as User);
        } else if (reaction.emoji.name == '🔄') {
            loop(reaction.message.channel as TextChannel, user as User, client);
        }
    } catch (err) {
        console.log(err);
    }
};

export default reactionHandler;

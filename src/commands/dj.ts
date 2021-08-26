import { GuildMember, Role } from 'discord.js';
import { Command } from './../types';
const dj: Command = {
    name: 'dj',
    cooldown: 5,
    execute: async (message, args) => {
        if (!message.guild) return;
        const messageAuthorMember: GuildMember = await message.guild.members.fetch(message.author);
        if (!messageAuthorMember) return;
        if (!messageAuthorMember.permissions.has('MANAGE_ROLES')) {
            return await message.channel
                .send('You are not allowed to do this')
                .then(msg => setTimeout(() => msg.delete(), 4000));
        }
        const target = args[0];
        let targetMember: GuildMember | undefined;
        if (target.includes('<@!')) {
            targetMember = message.mentions.members?.first();
        } else {
            targetMember = await message.guild.members.fetch(args[0]);
        }
        if (!targetMember) {
            return await message.channel.send('User not found!').then(msg => setTimeout(() => msg.delete(), 4000));
        }
        let role: Role | undefined = message.guild.roles.cache.find(role => role.name == 'HelveteDJ');
        if (!role) {
            await message.guild.roles
                .create({
                    data: {
                        name: 'HelveteDJ',
                        color: 'BLACK',
                    },
                })
                .then(res => (role = res))
                .catch(err => console.log(err));
        }
        if (!role) {
            return await message.channel
                .send('Dj role has not been found')
                .then(msg => setTimeout(() => msg.delete(), 4000));
        }
        await targetMember.roles
            .add(role)
            .then(async () => {
                return await message.channel
                    .send('Dj role has been given to the user')
                    .then(msg => setTimeout(() => msg.delete(), 4000));
            })
            .catch(
                async err =>
                    await message.channel.send('Something went wrong').then(msg => setTimeout(() => msg.delete(), 4000))
            );
        return;
    },
};
export = dj;

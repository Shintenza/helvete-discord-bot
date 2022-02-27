import { GuildMember, Role, TextChannel } from 'discord.js';
import { Command } from './../types';
import { errorEmbed, successEmbed } from '../utils/infoEmbed';

const dj: Command = {
    name: 'dj',
    cooldown: 5,
    execute: async (message, args) => {
        if (!message.guild) return;

        const messageAuthorMember: GuildMember = await message.guild.members.fetch(message.author);
        if (!messageAuthorMember) return;

        if (!messageAuthorMember.permissions.has('MANAGE_ROLES')) {
            return errorEmbed("You are not allowed to do this!", message.channel as TextChannel);
        }
        const target = args[0];
        let targetMember: GuildMember | undefined;
        if (target.includes('<@!')) {
            targetMember = message.mentions.members?.first();
        } else {
            targetMember = await message.guild.members.fetch(args[0]);
        }
        if (!targetMember) {
            return errorEmbed('User not found', message.channel as TextChannel);
        }
        let role: Role | undefined = message.guild.roles.cache.find(role => role.name == 'HelveteDJ');
        if (!role) {
            await message.guild.roles
                .create({
                    name: 'HelveteDJ',
                    color: 'NOT_QUITE_BLACK',
                })
                .then(res => (role = res))
                .catch(err => console.log(err));
        }
        if (!role) {
            return errorEmbed('Dj role has not been found', message.channel as TextChannel);
        }
        try {
            await targetMember.roles.add(role).then(()=>{
                return successEmbed("DJ has been given to the selected user", message.channel as TextChannel);
            })
        } catch (err) {
            return errorEmbed("I am not allowed to do this.", message.channel as TextChannel) 
        }
    },
};
export = dj;

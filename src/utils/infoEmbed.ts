import { ColorResolvable, MessageEmbed, TextChannel } from 'discord.js';

const errorEmbed = async (message: string, channel: TextChannel, time?: number) => {
    const errorColor: ColorResolvable = '#e20300';
    const errorEmbedMessage = new MessageEmbed()
        .setColor(errorColor)
        .setTitle('Helvete error notifier')
        .setDescription(message);
    await channel.send({ embeds: [errorEmbedMessage] }).then(msg =>
        setTimeout(
            () => {
                try {
                    msg.delete();
                } catch (err) {
                    return console.log(err);
                }
            },
            time ? time : 4000
        )
    );
};
const successEmbed = async (message: string, channel: TextChannel, time?: number) => {
    const successColor: ColorResolvable = '#00ce1e';
    const successEmbedMessage = new MessageEmbed()
        .setColor(successColor)
        .setTitle('Helvete notifier')
        .setDescription(message);
    await channel.send({ embeds: [successEmbedMessage] }).then(msg =>
        setTimeout(
            () => {
                try {
                    msg.delete();
                } catch (err) {
                    return console.log(err);
                }
            },
            time ? time : 4000
        )
    );
};
const informEmbed = async (message: string, channel: TextChannel, time?: number) => {
    const infoColor: ColorResolvable = '#008bef';
    const infoEmbedMessage = new MessageEmbed()
        .setColor(infoColor)
        .setTitle('Helvete notifier')
        .setDescription(message);
    await channel.send({ embeds: [infoEmbedMessage] }).then(msg =>
        setTimeout(
            () => {
                try {
                    msg.delete();
                } catch (err) {
                    return console.log(err);
                }
            },
            time ? time : 4000
        )
    );
};
export { errorEmbed, successEmbed, informEmbed };

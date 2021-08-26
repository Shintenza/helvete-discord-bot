import { MessageEmbed } from 'discord.js';
class Player extends MessageEmbed {
    constructor(
        title = 'Helvete music player',
        description = 'I am playing nothing now',
        imageUrl = 'https://media.discordapp.net/attachments/669893606651199488/880097037473964082/Helveteplus_to2.png?width=633&height=475'
    ) {
        super();
        this.setTitle(title);
        this.setDescription(description);
        this.setImage(imageUrl);
    }
}
export = Player;

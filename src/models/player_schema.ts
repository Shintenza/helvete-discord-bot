import { MessageEmbed } from 'discord.js';

class Player extends MessageEmbed {
    constructor(
        title = 'Helvete music player',
        description = 'I am playing nothing now',
        imageUrl = process.env.PLAYER_URL
    ) {
        super();
        this.setTitle(title);
        this.setDescription(description);
        this.setImage(imageUrl!);
    }
}
export = Player;

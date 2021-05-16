import { MessageEmbed } from 'discord.js';
class Player extends MessageEmbed {
    constructor(
        title = 'Helvete music player',
        description = 'I am playing nothing now',
        imageUrl = 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fwww.publicdomainpictures.net%2Fpictures%2F340000%2Fvelka%2Fbrazil-flag-theme-idea-design-1588673822A7w.jpg&f=1&nofb=1'
    ) {
        super();
        this.setTitle(title);
        this.setDescription(description);
        this.setImage(imageUrl);
    }
}
export = Player;

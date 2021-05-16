import { Guild, Message, MessageEmbed, TextChannel, User, VoiceState } from 'discord.js';
import { Queue, IQueue } from './models/queue_schema';
import { connect } from 'mongoose';
import Client from './client/Client';
import * as fs from 'fs';
import stop from './functions/stop';
import skip from './functions/skip';
import pause from './functions/pause';
import Player from './models/player_schema';
const client: Client = new Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] });
const prefix = '!';
const db = process.env.DB_CONNECTION;
let dbConnected = false;
if (!db) {
    throw 'chuju dawaj link do bazy';
}
let isInitialized = false;
connect(db, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('Database is connected');
        dbConnected = true;
    })
    .catch(err => {
        console.log(err);
    });

client.on('ready', async () => {
    console.log('I am ready to pop');
    const commandFiles = fs
        .readdirSync(__dirname+ '/commands')
        .filter(file => {
            if(file.endsWith('.js')) return file;
            if(file.endsWith('.ts')) return file
        });
    for (const file of commandFiles) {
        const command = await import(`./commands/${file}`);
        client.commands.set(command.name, command);
    }
});
client.on('guildCreate', (guild: Guild) => {
    if(!dbConnected) return;
    const infoChannel: TextChannel = guild.channels.cache
        .filter(
            channel => channel
                .permissionsFor(client.user as User)
                ?.has('SEND_MESSAGES') as boolean
        )
        .filter(channel => channel.type === 'text')
        .first() as TextChannel;
    const helloMessage = new MessageEmbed()
        .setTitle('Helvete notifier')
        .setDescription(
            `Hello, I am here to play some good music but first, you need to type ${prefix}init`
        );
    infoChannel.send(helloMessage);
});


// updates bot's voiceChannelId inside database
client.on("voiceStateUpdate", async (oldState: VoiceState, newState:VoiceState)=>{
    if ( oldState.channelID === null || typeof oldState.channelID == 'undefined') return;
    if (newState.id !== client.user?.id) return;
    
    
    if (!newState.channel) {
        const voiceConnection = newState.guild!.me!.voice;
        await Queue.updateOne({guildId: newState.guild.id}, {
            //@ts-ignore
            $unset: { voiceChannelId:1 },
            queue: []
        });
        await Queue.findOne({guildId: newState.guild.id}, async (err: Error, serverQueue: IQueue)=>{
            if(serverQueue){
                const textChannel: TextChannel | undefined = newState.guild.channels.cache.get(
                    serverQueue.textChannelId
                ) as TextChannel;
                if(!textChannel) return;
                const playerEmbedMessage:Message | undefined = await textChannel.messages.fetch(serverQueue.playerMessageId)
                    .catch(err=>undefined)
                if(!playerEmbedMessage) return;
                playerEmbedMessage.edit(new Player());

                const queueEmbedMessage = await textChannel.messages.fetch(
                    serverQueue.queueTextMessageId
                ).catch(err=>undefined)
                if(!queueEmbedMessage) return;
                queueEmbedMessage.delete();
            }   
        })
        voiceConnection.connection?.dispatcher.end();
        return;
    }
    
    const serverQueue = await Queue.findOne({guildId: newState.guild.id});
    if (!serverQueue) return;

    // when the bot is moved lines below update his voice channel inside databae

    serverQueue.voiceChannelId = newState.channel.id;
    return await serverQueue.save();
})


client.on('message', async (message: Message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    if (!isInitialized) {
        const queue = await Queue.findOne({ guildId: message.guild.id });
        if (queue) isInitialized = true;
    }
    const [command, ...args] = message.content.slice(prefix.length).split(/ +/);

    if (!isInitialized) {
        if (!client.commands.has(command)) return;
        try {
            client.commands.get(command)?.execute(message, args, client);
        } catch (error) {
            console.error(error);
            message.reply('there was an error trying to execute that command!');
        }
    } else {
        try {
            client.commands.get('play')?.execute(message, args, client);
        } catch (err) {
            return;
        }
    }
});

client.on("messageReactionAdd", async (reaction, user)=>{
    if(user.bot) return;
    if(!reaction.message.guild) return;
    const serverQueue = await Queue.findOne({guildId: reaction.message.guild.id});
    if(!serverQueue) return;
    if(reaction.message.id != serverQueue.playerMessageId) return;
    if(reaction.emoji.name=="⏹️"){
        console.log("stop");
        stop(reaction.message.channel as TextChannel, user as User);
    } else if(reaction.emoji.name=="⏭️"){
        console.log("skip");
        skip(reaction.message.channel as TextChannel, user as User);
    } else if(reaction.emoji.name=="⏯️"){
        console.log("pause");
        pause(reaction.message.channel as TextChannel, user as User);
    }
    reaction.users.remove(user as User);
})



client.start();

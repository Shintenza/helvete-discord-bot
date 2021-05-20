import { Schema, Document, model } from 'mongoose';

interface IQueue extends Document {
    guildId: string;
    playerMessageId: string;
    textChannelId: string;
    voiceChannelId: string;
    queueTextMessageId: string;
    queue: any;
    volume: number;
    isPaused: boolean;
    isLooped: boolean;
}

const QueueSchema = new Schema({
    guildId: {
        type: String,
        required: true,
    },
    playerMessageId: {
        type: String,
        required: true,
    },
    textChannelId: {
        type: String,
        required: true,
    },
    queueTextMessageId:{
        type: String
    },
    voiceChannelId: {
        type: String,
    },
    queue: {
        type: Array,
        default: [],
        required: true,
    },
    volume: {
        type: Number,
        default: 1,
    },
    isPaused: {
        type:Boolean,
        default: false
    },
    isLooped: {
        type: Boolean,
        default: false
    }
});

const Queue = model<IQueue>('Queue', QueueSchema);
export { Queue, IQueue };

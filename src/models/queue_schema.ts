import { Schema, Document, model } from 'mongoose';

interface IQueue extends Document {
    guildId: string;
    playerMessageId: string;
    textChannelId: string;
    voiceChannelId: string;
    queue: any;
    volume: number;
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
});

const Queue = model<IQueue>('Queue', QueueSchema);
export { Queue, IQueue };

import { Schema, Document, model } from 'mongoose';
import { BlockedUser } from '../types';

interface IQueue extends Document {
    guildId: string;
    playerMessageId: string;
    textChannelId: string;
    voiceChannelId: string;
    queueTextMessageId: string;
    bannerMessageId: string;
    queue: any;
    volume: number;
    isPaused: boolean;
    isLooped: boolean;
    blockedUsers: Array<BlockedUser>;
}

const QueueSchema = new Schema({
    guildId: {
        type: String,
        required: true,
    },
    playerMessageId: {
        type: String,
    },
    textChannelId: {
        type: String,
        required: true,
    },
    queueTextMessageId: {
        type: String,
    },
    bannerMessageId: {
        type: String,
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
        type: Boolean,
        default: false,
    },
    isLooped: {
        type: Boolean,
        default: false,
    },
    blockedUsers: {
        type: Array,
        default: [],
    },
});

const Queue = model<IQueue>('Queue', QueueSchema);
export { Queue, IQueue };

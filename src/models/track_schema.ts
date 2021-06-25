interface Track {
    track: string;
    title: string;
    identifier: string;
    author: string;
    duration: number;
    isSeekable: boolean;
    isStream: boolean;
    uri: string;
    thumbnail: string;
    displayThumbnail: any;
    requester: string | undefined;
}
export default Track;

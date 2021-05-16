import ytdl = require("ytdl-core")
interface Song {
    title: string;
    url: string;
    thumbnailUrl: string;
    duration: number;
    author: ytdl.Author;
    requestedBy: string
}
export default Song
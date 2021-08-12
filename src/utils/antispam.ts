import { Message } from 'discord.js';
interface userData {
    msgCount: number;
    lastMessage: Message;
    timer: any;
}


const antispam = (message:Message, usersMap: Map<string, userData>, time: number, diff: number, limit: number)=>{
    if(usersMap.has(message.author.id)) {
        const userData = usersMap.get(message.author.id);
        if(!userData) return;
        const { lastMessage, timer } = userData;
        const difference = message.createdTimestamp - lastMessage.createdTimestamp;
        let msgCount = userData.msgCount;
        console.log(difference);

        if(difference > diff) {
            clearTimeout(timer);
            console.log('Cleared Timeout');
            userData.msgCount = 1;
            userData.lastMessage = message;
            userData.timer = setTimeout(() => {
                usersMap.delete(message.author.id);
                // console.log('Removed from map.')
            }, time);
            usersMap.set(message.author.id, userData)
        }
        else {
            ++msgCount;
            if(msgCount === limit) {
              //@ts-ignore
              message.channel.bulkDelete(limit);
              return
               
            } else {
                userData.msgCount = msgCount;
                usersMap.set(message.author.id, userData);
            }
        }
    }
    else {
        let fn = setTimeout(() => {
            usersMap.delete(message.author.id);
            // console.log('Removed from map.')
        }, time);
        usersMap.set(message.author.id, {
            msgCount: 1,
            lastMessage : message,
            timer : fn
        });
    }
}
export default antispam;
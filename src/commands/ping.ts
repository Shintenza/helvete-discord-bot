import CommandOptions from '../types'
const ping: CommandOptions = {
    name: 'ping',
    execute: (message)=>{
        message.channel.send('pong')
    }
}
export = ping;
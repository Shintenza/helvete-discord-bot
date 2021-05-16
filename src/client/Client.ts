import { Client, ClientOptions, Collection } from 'discord.js';
import CommandOptions from '../types'
import * as dotenv from 'dotenv';
dotenv.config();

class Bot extends Client{
    public token: string;
    public commands = new Collection<string, CommandOptions>();

    public constructor(options?: ClientOptions){
        super(options)
        this.token = process.env.DISCORD_TOKEN || "";
    }

    public start(): void{
        if(this.token==""){
            throw new Error('token in not provided');
        }
        super.login();
    }
}
export default Bot;
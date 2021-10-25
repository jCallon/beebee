//
// Welcome to Beebee's inner workings!
//

const { Client, Intents } = require('discord.js');
const { token }    = require('./config.json');
const { cmds }     = require('./commands.js');
const { read_csv } = require('./csv.js');

const black_list = //put annoying users here, use of roles may be more efficient if you have perms
  [];
const white_list = //if spam is an issue, use of roles may be more efficient if you have perms
  [];

const client = new Client({ intents: [
  Intents.FLAGS.GUILDS,
  Intents.FLAGS.GUILD_MESSAGES,
  Intents.FLAGS.DIRECT_MESSAGES
] }); client.once('ready', () => { console.log(`Ready!\nConnected as ${client.user.tag}.`); });
client.login(token);



//returns 0/false if a command ran successfully, 1/true if not
client.on('messageCreate', message =>
{
  //all commands are converted to lowercase, this is to be friendly to auto-correct users
  const cmd = message.content.trim().toLowerCase();

  //CASE: message is not meant for bot - abort
  if(cmd.startsWith('!bracket ') === false)                                  return 1;
  //CASE: author is in black_list - abort
  if(black_list.includes(message.author) === true)                           return 1;
  //CASE: there is a white_list and the author is not in it - abort
  if(white_list.length > 0 && white_list.includes(message.author) === false) return 1;

  //CASE: this is probably a properly formatted command - try to execute it
  //      no wonky names in this regex, just ascii, feel free to change that up if it doesn't work for you
  if(/^!bracket [\w_-\d]* -[\w_-]*$/.test(cmd) ||
     /^!bracket [\w_-\d]* -[\w_-]* [\w_-\d]*$/.test(cmd))
  {
    //log command
    console.log(`${new Date().toDateString()} ${message.author.tag}: ${cmd}`);

    //parse command
    const cmd_split = cmd.split(' ');
    const file = cmd_split[1];
    const flag = cmd_split[2];
    const arg  = (cmd_split.length === 4) ? cmd_split[3] : '';

    //CASE: this is a create command - it should not read file data, unlike the others
    if(flag === '-create')
    {
      const resp = cmds.get(flag)(file, undefined, arg);
      message.reply(resp.message);
      //message.author.send(resp.message);
      return resp.code;
    }

    let data = read_csv(file);
    //CASE: the csv could not be read
    if(data === undefined)
    {
      message.reply(`Could not find/read bracket ${file}.`);
      //message.author.send(`Could not find/read bracket ${file}.`);
      return 1;
    }

    //what command is this?
    if(cmds.has(flag))
    {
      const resp = cmds.get(flag)(file, data, arg);
      message.reply(resp.message);
      //message.author.send(resp.message);
      return resp.code;
    }
  }

  //CASE: the flag was unrecognised, no command run - tell user
  message.reply('Unrecognized command.\nFor usage, issue tracking, and feature requests see https://github.com/jCallon/beebee.');
  //message.author.send('Unrecognized command.\nFor usage, issue tracking, and feature requests see https://github.com/jCallon/beebee.');
  return 1;
});

const { Client, Intents } = require('discord.js');
const token        = require('./config.json');
const cmd          = require('./commands.js');
const { read_csv } = require('./csv.js');

const black_list = //put annoying users here, use of roles may be more efficient if you have perms
  [];
const white_list = //if spam is an issue... againm use of roles may be more efficient if you have perms
  [];

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
client.once('ready', () => { console.log('Ready!'); });
client.login(token);



//returns true if a command ran, successful or not
client.on('interactionCreate', async interaction =>
{
  //all commands are converted to lowercase, this is to be friendly to auto-correct users
  const cmd = message.content.trim().toLower();

  //CASE: message is not meant for bot - abort
  if(cmd.startsWith('!bracket ' === false)                                return false;
  //CASE: author is in black_list - abort
  if(black_list.has(message.author) === true)                             return false;
  //CASE: there is a white_list and the author is not in it - abort
  if(white_list.length() > 0 && white_list.has(message.author) === false) return false;

  //CASE: this is probably a properly formatted command - try to execute it
  //      no wonky names in this regex, just ascii, feel free to change that up if it doesn't work for you
  if(RegExp('!bracket [\w_-\d]* -[\w_-]*').match(cmd) ||
     RegExp('!bracket [\w_-\d]* -[\w_-]* [\w_-\d]*').match(cmd))
  {
    //parse command
    const cmd_split = cmd.split();
    const file = cmd_split[1];
    const flag = cmd_split[2];
    const arg  = cmd_split[3];

    //CASE: this is a create command - it should not read file data, unlike the others
    if(flag === '-create')
      cmd[flag](file, undefined, arg);

    let data = read_csv(file);
    //CASE: the csv could not be read
    if(data === undefined)
      message.channel.send(`Could not find/read bracket ${file}.`);
      return false;

    //what command is this?
    if(cmd.has(flag))
    {
      message.channel.send(cmd[flag](file, data, arg));
      return true;
    }
  }

  //CASE: the flag was unrecognised, no command run - tell user
  message.channel.respond('Unrecognized flag.\nFor usage, issue tracking, and feature requests see GITHUB_LINK TODO.');
  return false;
});

const fs = require('fs');
const { write_csv } = require('./csv.js');

const max_participants   = 50; //helps with file size and seed sanity
const max_handle_length  = 20; //helps with file size and displaying
const max_bracket_length = 30; //helps with file name sanity
const max_brackets       = 30; //helps with file number sanity
const archive = false;   //use this to have a backup copy of each day
const bot_owner = 'Kit'; //people can contact you for special requests

//raise or lower the rng factor to your liking, higher will make win rates matter less
//but DON'T make it 0, or that will break the choosing alrogithm
const rng_fac = 0.1;
const set_fac = 1.0 - rng_fac;

class User
{
  constructor(handle)
  {
    this.handle = handle;
    this.status = 'active';
    this.wins   = 0;
    this.losses = 0;
  }
}

class Resp{
  constructor(code, message)
  {
    this.code    = code;    //integer (0 for failure or 1 for success) to tell caller function
    this.message = message; //string to tell user
  }
}

//all commands:
//take - the arguments file, data, and arg, even if they do not use them
//return - Resp
//with the exception of create, 
//  are run after validating the csv, so they don't need to do so themselves
const cmds = new Map();
cmds.set('-create',  cmd_create );
cmds.set('-delete',  omitted_cmd);
cmds.set('-modify',  omitted_cmd);
cmds.set('-display', cmd_display);
cmds.set('-join',    cmd_join   );
cmds.set('-leave',   omitted_cmd);
cmds.set('-pause',   cmd_pause  );
cmds.set('-unpause', cmd_unpause);
cmds.set('-win',     cmd_win    );
cmds.set('-lose',    cmd_lose   );
cmds.set('-seed',    cmd_seed   );



function cmd_create(file, data, arg)
{
  //CASE: user entered bracket name longer than max_bracket_length - abort and tell user
  if(file.length > max_bracket_length)
    return new Resp(1, `Your bracket name exceeds the ${max_bracket_length} character limit.\nShorten the name, or if that's not practical, ask the bot owner, ${bot_owner}, to increase the limit.`);

  //CASE: file already exists - abort and tell user
  try
  { 
    fs.accessSync(`./brackets/${file}.csv`, fs.constants.R_OK);
    return new Resp(1, `Bracket ${file} already exists.`);
  }
  catch(e) { /*good to go*/ }

  //TODO
  //CASE: max_brackets have been reached - abort and tell user
  //if(fs.readdirSync(`./bracket/`, (err, files) => { return files.length; }) >= max_brackets)
  //  return Resp(1, `At max bracket count ${max_brackets}. Ask the bot owner, ${bot_owner} to increase the max or archive old brackets.`);

  //create file, arg will be its only participant
  const resp = cmd_join(file, [], arg);

  //CASE: for some reason making the 1-participant bracket failed - abort and tell user
  if(resp.code === 1)
    return resp;

  return new Resp(0, `Bracket ${file} with participant ${arg} created.`);
}



//cmd_delete is intentionally omitted
//
//function cmd_delete(file, data, arg)
//{
//}



//cmd_modify is intentionally omitted
//
//function cmd_modify(file, data, arg)
//{
//}



//could be optimized, but this is easy to read and understand
//TODO add arg to display just certain user
function cmd_display(file, data, arg)
{
  let max_col_length = 
  [
    6, //'HANDLE'.length(),
    6, //'STATUS'.length(),
    4, //'WINS'.  length(),
    6, //'LOSSES'.length()
  ];
  let handle_length, status_length, wins_length, losses_length;

  //find max column lengths for all of the csv
  for(let user of data)
  {
    handle_length = user.handle.length;
    status_length = user.status.length;
    win_length    = user.wins.toString().length;
    losses_length = user.losses.toString().length;

    if(handle_length > max_col_length[0]) max_col_length[0] = handle_length;
    if(status_length > max_col_length[1]) max_col_length[1] = status_length;
    if(wins_length   > max_col_length[2]) max_col_length[2] = wins_length;
    if(losses_length > max_col_length[3]) max_col_length[3] = losses_length;

    //CASE: participant has 0 wins or losses, which breaks calculation - assign them temp winrate
    if(user.losses === '0' && user.wins === '0') user.winrate = 0.5;
    else if(user.wins === '0')                   user.winrate = 0.0;
    else if(user.losses === '0')                 user.winrate = 1.0;
    else user.winrate = parseInt(user.wins, 10) / 
      (parseInt(user.wins, 10) + parseInt(user.losses, 10));
  }

  //attach headers
  let message = 
    'HANDLE'.padEnd  (max_col_length[0], ' ') + ' ' +
    'STATUS'.padEnd  (max_col_length[1], ' ') + ' ' +
    'WINS'.  padStart(max_col_length[2], ' ') + ' ' +
    'LOSSES'.padStart(max_col_length[3], ' ') + ' ' +
    'WINRATE';

  //attach participants
  for(const user of data)
    message += '\n' +
      user.handle.padEnd  (max_col_length[0], ' ') + ' ' +
      user.status.padEnd  (max_col_length[1], ' ') + ' ' +
      user.wins  .padStart(max_col_length[2], ' ') + ' ' +
      user.losses.padStart(max_col_length[3], ' ') + ' ' +
      user.winrate.toFixed(4).padStart(7, ' ');

  //return resuly in monospace
  return new Resp(0, `\`\`\`${message}\`\`\``);
}



function cmd_join(file, data, arg)
{
  //CASE: the bracket has reached max_participants - abort and tell user
  if(data.length >= max_participants)
    return new Resp(1, `The max number of participants, ${max_participants}, for the bracket has been reached.\nIf you feel you should be in, ask the bot owner, ${bot_owner}, to increase the max or find chronically inactive participants to kick.`);

  //CASE: user enterred handle name longer than max_handle_length - abort and tell user
  if(arg.length > max_handle_length)
    return new Resp(1, `The handle name exceeds the ${max_handle_length} max character limit.\nShorten the handle, or if that's not practical, ask the bot owner, ${bot_owner}, to increase the limit.`);

  //CASE: arg is already in bracket - abort and tell user
  if(data.findIndex(user => user.handle === arg) !== -1)
    return new Resp(1, `${arg} is already participating in bracket ${file}.`);

  //append arg to bracket
  data.push(new User(arg));
  write_csv(file, data, archive); //TODO add case for if file write fails for all
  return new Resp(0, `${arg} is now participating in bracket ${file}.`);
}



function cmd_pause(file, data, arg)
{
  //CASE: arg is not in bracket - abort and tell user
  if(data.findIndex(user => user.handle === arg) === -1)
    return new Resp(1, `${arg} is not participating in bracket ${file}.`);

  //CASE: arg is already paused - abort and tell user
  if(data.find(user => user.handle === arg).status === 'away')
    return new Resp(1, `${arg} is already paused.`);

  //pause user
  data.find(user => user.handle === arg).status = 'away';
  write_csv(file, data, archive);
  return new Resp(0, `${arg} paused in bracket ${file}.`);
}



function cmd_unpause(file, data, arg)
{
  //CASE: arg is not in bracket - abort and tell user
  if(data.findIndex(user => user.handle === arg) === -1)
    return new Resp(1, `${arg} is not participating in bracket ${file}.`);

  //CASE: arg is already unpaused - abort and tell user
  if(data.find(user => user.handle === arg).status === 'active')
    return new Resp(1, `${arg} is already unpaused.`);

  //unpause user
  data.find(user => user.handle === arg).status = 'active';
  write_csv(file, data, archive);
  return new Resp(0, `${arg} unpaused in bracket ${file}.`);
}



function cmd_win(file, data, arg)
{
  //CASE: arg is not in bracket - abort and tell user
  if(data.findIndex(user => user.handle === arg) === -1)
    return new Resp(1, `${arg} is not participating in bracket ${file}.`);

  //increment wins on arg
  ++data.find(user => user.handle === arg).wins;
  write_csv(file, data, archive);
  return new Resp(0, `${arg} now has one more win.`);
}



function cmd_lose(file, data, arg)
{
  //CASE: arg is not in bracket - abort and tell user
  if(data.findIndex(user => user.handle === arg) === -1)
    return new Resp(1, `${arg} is not participating in bracket ${file}.`);

  //increment losses on arg
  ++data.find(user => user.handle === arg).losses;
  write_csv(file, data, archive);
  return new Resp(0, `${arg} now has one more loss.`);
}



function cmd_seed(file, data, arg)
{
  //calculate winrates
  for(let user of data)
  {
    //CASE: participant has 0 wins or losses, breaks calculation - assign them temp winrate
    if(user.losses === '0' && user.wins === '0'){ user.ratio = (set_fac*0.5)+rng_fac; continue; }
    else if(user.wins === '0'){                   user.ratio = (set_fac*0.0)+rng_fac; continue; }
    else if(user.losses === '0'){                 user.ratio = (set_fac*1.0)+rng_fac; continue; }

    user.ratio = (set_fac*parseInt(user.wins, 10)) / 
      (parseInt(user.wins, 10) + parseInt(user.losses, 10)) + rng_fac;
  }

  //choose your fighter
  switch(arg)
  {
    case 'no_rng':   data = sort_no_rng(data);   break;
    case 'some_rng': data = sort_some_rng(data); break;
    case 'pure_rng': data = sort_pure_rng(data); break;
    default: 
      return new Resp(1, `RNG level not recognised. The options are no_rng, some_rng, or pure_rng.`);
      break;
  }

  let message = '';
  const length = data.length;
  for(let i = 0; i < length; i +=2)
    message += `${data[i].handle} - ${i + 1 < length ? data[i+1].handle : '???'}\n`;

  return new Resp(0, `\`\`\`${message}\`\`\``);
}



//
// Helpers
//



function omitted_cmd(file, data, arg)
{
  return `That operation is left out easy reach intentionally. Ask the bot owner, ${bot_owner}, to do it.`;
}



function sort_no_rng(data)
{
  return data.sort((user_1, user_2) => user_2.ratio - user_1.ratio);
}



//TODO idk why this isn't working
function sort_some_rng(data)
{
  let user_ratio_total = 0.0;
  for(const user of data)
    user_ratio_total += user.ratio;

  let user_index = 0;
  let list = [];
  let length = data.length;

  for(let run = 0; run < length; ++run)
  {
    //users with higher win ratios are more likely to get picked next (as they subtract more),
    //inducing some kind of order
    //JS random goes from 0 to 1 in float, not 0 to INT_MAX in integer
    for(let rng = Math.random() * user_ratio_total, user_index = 0;
      rng > data[user_index].ratio;
      rng -= data[user_index].ratio, ++user_index);

    user_ratio_total -= data[user_index].ratio;

    list.push(data[user_index]);
    data.splice(user_index, 1);
  }

  return list;
}



function sort_pure_rng(data)
{
  let rng = undefined;
  let list = [];
  let length = data.length;

  for(let i = 0; i < length; ++i)
  {
    //JS random goes from 0 to 1 in float, not 0 to INT_MAX in integer
    rng = Math.floor(Math.random() * data.length);
    list.push(data[rng]);
    data.splice(rng, 1);
  }

  return list;
}



/*
//can be optimized by first modding by the total of user's ratios then doing the minus stuff
function sort_some_rng(data)
{
  let rng = undefined;
  let list = [];
  let length = data.length();
  let user_index = 0;
  let num_available_users = length;

  for(let i = 0; i < length; ++i)
  {
    rng = Math.Random() % (max_entrants * 7);

    while(rng > 0.0)
    {
      ++user_index;
      user_index %= num_available_users;

      //users with higher win ratios are more likely to get picked next (as they subtract more),
      //inducing some kind of order
      rng -= user.ratio;
    }
    --num_available_users;

    list.append(data[user_index]);
    data.splice(user_index, 1);
  }

  return list;
}
*/

exports.cmds = cmds;
